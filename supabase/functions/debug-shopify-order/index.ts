import { createClient } from 'npm:@supabase/supabase-js@2.39.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { userId, orderNumber } = await req.json();

    if (!userId || !orderNumber) {
      return new Response(
        JSON.stringify({ error: 'Missing userId or orderNumber' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Get Shopify installation
    const { data: installation } = await supabase
      .from('shopify_installations')
      .select('store_url, access_token')
      .eq('user_id', userId)
      .eq('status', 'installed')
      .is('uninstalled_at', null)
      .single();

    if (!installation) {
      return new Response(
        JSON.stringify({ error: 'No Shopify installation found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get order ID from database
    const { data: dbOrder } = await supabase
      .from('shopify_orders')
      .select('shopify_order_id')
      .eq('user_id', userId)
      .eq('order_number', orderNumber)
      .single();

    if (!dbOrder) {
      return new Response(
        JSON.stringify({ error: 'Order not found in database' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch order from Shopify
    const url = `https://${installation.store_url}/admin/api/2024-01/orders/${dbOrder.shopify_order_id}.json`;
    const response = await fetch(url, {
      headers: {
        'X-Shopify-Access-Token': installation.access_token,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Shopify API error: ${response.status}`);
    }

    const data = await response.json();
    const order = data.order;

    // Extract relevant customer data
    const debugInfo = {
      order_id: order.id,
      order_number: order.name,
      created_at: order.created_at,

      // Email at order level
      order_email: order.email,
      order_phone: order.phone,

      // Customer object
      has_customer: !!order.customer,
      customer: order.customer ? {
        id: order.customer.id,
        email: order.customer.email,
        first_name: order.customer.first_name,
        last_name: order.customer.last_name,
        phone: order.customer.phone,
      } : null,

      // Shipping address
      has_shipping_address: !!order.shipping_address,
      shipping_address: order.shipping_address ? {
        first_name: order.shipping_address.first_name,
        last_name: order.shipping_address.last_name,
        address1: order.shipping_address.address1,
        address2: order.shipping_address.address2,
        city: order.shipping_address.city,
        province: order.shipping_address.province,
        zip: order.shipping_address.zip,
        country: order.shipping_address.country,
        phone: order.shipping_address.phone,
      } : null,

      // Billing address
      has_billing_address: !!order.billing_address,
      billing_address: order.billing_address ? {
        first_name: order.billing_address.first_name,
        last_name: order.billing_address.last_name,
        address1: order.billing_address.address1,
        address2: order.billing_address.address2,
        city: order.billing_address.city,
        province: order.billing_address.province,
        zip: order.billing_address.zip,
        country: order.billing_address.country,
        phone: order.billing_address.phone,
      } : null,

      // Contact info
      contact_email: order.contact_email,

      // Line items
      line_items_count: order.line_items?.length || 0,
      line_items_sample: order.line_items?.[0] ? {
        name: order.line_items[0].name,
        quantity: order.line_items[0].quantity,
        price: order.line_items[0].price,
      } : null,
    };

    return new Response(
      JSON.stringify(debugInfo, null, 2),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('[Debug] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
