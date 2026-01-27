import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ShopifyOrderMutationRequest {
  operation: 'cancel' | 'refund' | 'update_shipping' | 'update_billing' | 'update_email';
  orderId: string; // Internal Supabase order ID
  data?: {
    // For refund
    amount?: number;
    reason?: string;
    note?: string;

    // For address updates
    shipping_address?: {
      address1?: string;
      address2?: string;
      city?: string;
      province?: string;
      zip?: string;
      country?: string;
      phone?: string;
    };
    billing_address?: {
      address1?: string;
      address2?: string;
      city?: string;
      province?: string;
      zip?: string;
      country?: string;
    };

    // For email update
    email?: string;
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Get authenticated user
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const body: ShopifyOrderMutationRequest = await req.json();
    const { operation, orderId, data } = body;

    // Validate operation
    if (!operation || !orderId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: operation, orderId' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Fetch order and verify ownership
    const { data: order, error: orderError } = await supabaseClient
      .from('shopify_orders')
      .select('*, user_id, shopify_order_id, fulfillment_status')
      .eq('id', orderId)
      .maybeSingle();

    if (orderError || !order) {
      return new Response(
        JSON.stringify({ error: 'Order not found' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Verify user owns this order
    if (order.user_id !== user.id) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: You do not own this order' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Fetch Shopify access token
    const { data: installation, error: installError } = await supabaseClient
      .from('shopify_installations')
      .select('shop_domain, access_token')
      .eq('user_id', user.id)
      .eq('status', 'installed')
      .is('uninstalled_at', null)
      .maybeSingle();

    if (installError || !installation) {
      return new Response(
        JSON.stringify({ error: 'Shopify store not connected. This may occur with test or draft orders that were not created through a connected Shopify store.' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { shop_domain, access_token } = installation;
    const apiVersion = '2026-01';

    // Execute operation
    let shopifyResponse;
    let updateData: any = {};

    switch (operation) {
      case 'cancel':
        // Validate order can be cancelled
        if (order.fulfillment_status === 'fulfilled') {
          return new Response(
            JSON.stringify({ error: 'Cannot cancel fulfilled order. Please issue a refund instead.' }),
            {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        }

        shopifyResponse = await fetch(
          `https://${shop_domain}/admin/api/${apiVersion}/orders/${order.shopify_order_id}/cancel.json`,
          {
            method: 'POST',
            headers: {
              'X-Shopify-Access-Token': access_token,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              reason: data?.reason || 'customer',
              email: true,
              refund: true,
            }),
          }
        );

        if (!shopifyResponse.ok) {
          const errorText = await shopifyResponse.text();
          throw new Error(`Shopify API error: ${errorText}`);
        }

        updateData = {
          fulfillment_status: 'cancelled',
          financial_status: 'refunded',
        };
        break;

      case 'refund':
        const refundAmount = data?.amount || order.total_price;

        shopifyResponse = await fetch(
          `https://${shop_domain}/admin/api/${apiVersion}/orders/${order.shopify_order_id}/refunds.json`,
          {
            method: 'POST',
            headers: {
              'X-Shopify-Access-Token': access_token,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              refund: {
                currency: order.currency || 'USD',
                notify: true,
                note: data?.note || '',
                transactions: [
                  {
                    parent_id: order.shopify_order_id,
                    amount: refundAmount,
                    kind: 'refund',
                    gateway: 'manual',
                  },
                ],
              },
            }),
          }
        );

        if (!shopifyResponse.ok) {
          const errorText = await shopifyResponse.text();
          throw new Error(`Shopify refund error: ${errorText}`);
        }

        updateData = {
          financial_status: refundAmount >= order.total_price ? 'refunded' : 'partially_refunded',
        };
        break;

      case 'update_shipping':
        // Validate order hasn't shipped
        if (order.fulfillment_status === 'fulfilled' || order.fulfillment_status === 'shipped') {
          return new Response(
            JSON.stringify({ error: 'Cannot update shipping address for orders that have already shipped' }),
            {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        }

        if (!data?.shipping_address) {
          return new Response(
            JSON.stringify({ error: 'Shipping address data required' }),
            {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        }

        shopifyResponse = await fetch(
          `https://${shop_domain}/admin/api/${apiVersion}/orders/${order.shopify_order_id}.json`,
          {
            method: 'PUT',
            headers: {
              'X-Shopify-Access-Token': access_token,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              order: {
                shipping_address: data.shipping_address,
              },
            }),
          }
        );

        if (!shopifyResponse.ok) {
          const errorText = await shopifyResponse.text();
          throw new Error(`Shopify update error: ${errorText}`);
        }

        updateData = {
          shipping_address_line1: data.shipping_address.address1,
          shipping_address_line2: data.shipping_address.address2,
          shipping_city: data.shipping_address.city,
          shipping_state: data.shipping_address.province,
          shipping_zip: data.shipping_address.zip,
          shipping_country: data.shipping_address.country,
        };
        break;

      case 'update_billing':
        if (!data?.billing_address) {
          return new Response(
            JSON.stringify({ error: 'Billing address data required' }),
            {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        }

        shopifyResponse = await fetch(
          `https://${shop_domain}/admin/api/${apiVersion}/orders/${order.shopify_order_id}.json`,
          {
            method: 'PUT',
            headers: {
              'X-Shopify-Access-Token': access_token,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              order: {
                billing_address: data.billing_address,
              },
            }),
          }
        );

        if (!shopifyResponse.ok) {
          const errorText = await shopifyResponse.text();
          throw new Error(`Shopify update error: ${errorText}`);
        }

        updateData = {
          billing_address_line1: data.billing_address.address1,
          billing_address_line2: data.billing_address.address2,
          billing_city: data.billing_address.city,
          billing_state: data.billing_address.province,
          billing_zip: data.billing_address.zip,
          billing_country: data.billing_address.country,
        };
        break;

      case 'update_email':
        if (!data?.email) {
          return new Response(
            JSON.stringify({ error: 'Email required' }),
            {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        }

        // First, get customer ID from order
        const customerResponse = await fetch(
          `https://${shop_domain}/admin/api/${apiVersion}/orders/${order.shopify_order_id}.json`,
          {
            method: 'GET',
            headers: {
              'X-Shopify-Access-Token': access_token,
              'Content-Type': 'application/json',
            },
          }
        );

        if (!customerResponse.ok) {
          throw new Error('Failed to fetch order details');
        }

        const orderDetails = await customerResponse.json();
        const customerId = orderDetails.order?.customer?.id;

        if (!customerId) {
          return new Response(
            JSON.stringify({ error: 'No customer associated with this order' }),
            {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        }

        // Update customer email
        shopifyResponse = await fetch(
          `https://${shop_domain}/admin/api/${apiVersion}/customers/${customerId}.json`,
          {
            method: 'PUT',
            headers: {
              'X-Shopify-Access-Token': access_token,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              customer: {
                email: data.email,
              },
            }),
          }
        );

        if (!shopifyResponse.ok) {
          const errorText = await shopifyResponse.text();
          throw new Error(`Shopify customer update error: ${errorText}`);
        }

        updateData = {
          customer_email: data.email,
        };
        break;

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid operation' }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
    }

    // Update local database
    if (Object.keys(updateData).length > 0) {
      const { error: updateError } = await supabaseClient
        .from('shopify_orders')
        .update(updateData)
        .eq('id', orderId);

      if (updateError) {
        console.error('Error updating local database:', updateError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Order ${operation} successful`,
        data: updateData,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in shopify-order-mutations:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'An error occurred',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

// Import createClient
import { createClient } from 'jsr:@supabase/supabase-js@2';
