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

    // Fetch order #1024 directly
    const url = `https://${installation.store_url}/admin/api/2026-01/orders/6910526587187.json`;
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

    const data = await response.json();

    const order = data.order;
    const customer = order.customer || {};
    const shipping = order.shipping_address || {};
    const billing = order.billing_address || {};

    return new Response(
      JSON.stringify({
        summary: {
          order_name: order.name,
          financial_status: order.financial_status,
          fulfillment_status: order.fulfillment_status,
          has_customer_object: !!order.customer,
          customer_populated: !!(customer.first_name || customer.last_name || customer.email),
          shipping_populated: !!(shipping.first_name || shipping.last_name),
          billing_populated: !!(billing.first_name || billing.last_name),
          order_email: order.email || null,
          contact_email: order.contact_email || null
        },
        extracted_data: {
          has_customer: !!order.customer,
          customer: order.customer,
          email: order.email,
          contact_email: order.contact_email,
          shipping_address: order.shipping_address,
          billing_address: order.billing_address,
          source_name: order.source_name,
          source_identifier: order.source_identifier,
          source_url: order.source_url,
          phone: order.phone,
          customer_phone: customer.phone
        },
        raw_order: order
      }, null, 2),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[Test] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});