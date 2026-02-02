import { createClient } from 'npm:@supabase/supabase-js@2.39.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { orderNumber } = await req.json();

    const { data: installation } = await supabase
      .from('shopify_installations')
      .select('store_url, access_token')
      .eq('user_id', user.id)
      .eq('status', 'installed')
      .maybeSingle();

    if (!installation) {
      return new Response(
        JSON.stringify({ error: 'Shopify installation not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: order } = await supabase
      .from('shopify_orders')
      .select('shopify_order_id')
      .eq('user_id', user.id)
      .eq('order_number', orderNumber)
      .maybeSingle();

    if (!order) {
      return new Response(
        JSON.stringify({ error: 'Order not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const url = `https://${installation.store_url}/admin/api/2026-01/orders/${order.shopify_order_id}.json`;
    const response = await fetch(url, {
      headers: {
        'X-Shopify-Access-Token': installation.access_token,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      return new Response(
        JSON.stringify({ error: `Shopify API error: ${response.status}` }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { order: fullOrder } = await response.json();

    return new Response(
      JSON.stringify({
        order_number: fullOrder.name,
        has_customer: !!fullOrder.customer,
        customer: fullOrder.customer,
        email: fullOrder.email,
        contact_email: fullOrder.contact_email,
        shipping_address: fullOrder.shipping_address,
        billing_address: fullOrder.billing_address,
        phone: fullOrder.phone,
        financial_status: fullOrder.financial_status,
        fulfillment_status: fullOrder.fulfillment_status,
        tags: fullOrder.tags
      }, null, 2),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[Debug] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});