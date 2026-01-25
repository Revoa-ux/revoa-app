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

    const userId = user.id;
    console.log('[Backfill] Starting customer data backfill for user:', userId);

    const { data: installation, error: installError } = await supabase
      .from('shopify_installations')
      .select('store_url, access_token')
      .eq('user_id', userId)
      .eq('status', 'installed')
      .maybeSingle();

    if (installError || !installation) {
      return new Response(
        JSON.stringify({ error: 'Shopify installation not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: ordersWithoutCustomer } = await supabase
      .from('shopify_orders')
      .select('id, shopify_order_id, order_number')
      .eq('user_id', userId)
      .or('customer_email.is.null,customer_first_name.is.null')
      .limit(50);

    if (!ordersWithoutCustomer || ordersWithoutCustomer.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'All orders already have customer data',
          updated: 0
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[Backfill] Found ${ordersWithoutCustomer.length} orders missing customer data`);

    let updated = 0;
    let failed = 0;

    for (const order of ordersWithoutCustomer) {
      try {
        const url = `https://${installation.store_url}/admin/api/2026-01/orders/${order.shopify_order_id}.json`;
        const response = await fetch(url, {
          headers: {
            'X-Shopify-Access-Token': installation.access_token,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          console.error(`[Backfill] Failed to fetch order ${order.order_number}:`, response.status);
          failed++;
          continue;
        }

        const { order: fullOrder } = await response.json();

        console.log(`[Backfill] Order ${order.order_number} raw data:`, {
          has_customer: !!fullOrder.customer,
          customer_email: fullOrder.customer?.email,
          order_email: fullOrder.email,
          contact_email: fullOrder.contact_email,
          has_shipping: !!fullOrder.shipping_address,
          shipping_first: fullOrder.shipping_address?.first_name,
          shipping_last: fullOrder.shipping_address?.last_name,
          has_billing: !!fullOrder.billing_address,
          billing_first: fullOrder.billing_address?.first_name,
          billing_last: fullOrder.billing_address?.last_name,
          financial_status: fullOrder.financial_status,
          tags: fullOrder.tags
        });

        const customerEmail = fullOrder.email || fullOrder.customer?.email || fullOrder.contact_email;
        const customerFirstName = fullOrder.customer?.first_name ||
                                 fullOrder.shipping_address?.first_name ||
                                 fullOrder.billing_address?.first_name;
        const customerLastName = fullOrder.customer?.last_name ||
                                fullOrder.shipping_address?.last_name ||
                                fullOrder.billing_address?.last_name;
        const customerPhone = fullOrder.customer?.phone ||
                             fullOrder.shipping_address?.phone ||
                             fullOrder.billing_address?.phone ||
                             fullOrder.phone;

        const updateData: any = {};
        if (customerEmail) updateData.customer_email = customerEmail;
        if (customerFirstName) updateData.customer_first_name = customerFirstName;
        if (customerLastName) updateData.customer_last_name = customerLastName;
        if (customerPhone) updateData.customer_phone = customerPhone;

        console.log(`[Backfill] Update data for ${order.order_number}:`, updateData);

        if (Object.keys(updateData).length > 0) {
          const { error: updateError } = await supabase
            .from('shopify_orders')
            .update(updateData)
            .eq('id', order.id);

          if (updateError) {
            console.error(`[Backfill] Error updating order ${order.order_number}:`, updateError);
            failed++;
          } else {
            console.log(`[Backfill] Updated order ${order.order_number} with:`, updateData);
            updated++;
          }
        } else {
          console.log(`[Backfill] No customer data available for order ${order.order_number}`);
          failed++;
        }

        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`[Backfill] Error processing order ${order.order_number}:`, error);
        failed++;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Backfill completed`,
        updated,
        failed,
        total: ordersWithoutCustomer.length
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[Backfill] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});