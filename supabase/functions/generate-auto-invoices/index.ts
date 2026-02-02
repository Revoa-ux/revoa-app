import { createClient } from 'npm:@supabase/supabase-js@2.39.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface LineItem {
  sku: string;
  product_name: string;
  quantity: number;
  cost_per_item: number;
  shipping_cost: number;
  shipping_country: string;
  total_cost: number;
  quote_id: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Get all users with auto-generation enabled
    const { data: settings, error: settingsError } = await supabase
      .from('invoice_generation_settings')
      .select('user_id, auto_generate_enabled, minimum_amount')
      .eq('auto_generate_enabled', true);

    if (settingsError) throw settingsError;

    const results = {
      processed: 0,
      generated: 0,
      skipped: 0,
      errors: [] as string[],
    };

    for (const setting of settings || []) {
      try {
        // Get unprocessed fulfilled orders
        const { data: orders, error: ordersError } = await supabase
          .from('shopify_order_fulfillment')
          .select('*')
          .eq('user_id', setting.user_id)
          .eq('processed_for_invoice', false)
          .eq('fulfillment_status', 'fulfilled');

        if (ordersError) throw ordersError;

        if (!orders || orders.length === 0) {
          results.skipped++;
          continue;
        }

        // Aggregate line items
        const allLineItems: LineItem[] = [];
        const orderIds: string[] = [];

        for (const order of orders) {
          orderIds.push(order.shopify_order_id);
          if (order.line_items && Array.isArray(order.line_items)) {
            allLineItems.push(...order.line_items);
          }
        }

        if (allLineItems.length === 0) {
          results.skipped++;
          continue;
        }

        // Calculate totals
        const totalQuantity = allLineItems.reduce(
          (sum: number, item: LineItem) => sum + item.quantity,
          0
        );
        const productCosts = allLineItems.reduce(
          (sum: number, item: LineItem) => sum + item.cost_per_item * item.quantity,
          0
        );
        const shippingCosts = allLineItems.reduce(
          (sum: number, item: LineItem) => sum + item.shipping_cost * item.quantity,
          0
        );

        const subtotal = productCosts + shippingCosts;
        const commission = subtotal * 0.02;
        const totalAmount = subtotal + commission;

        // Check minimum amount
        if (totalAmount < setting.minimum_amount) {
          results.skipped++;
          continue;
        }

        // Check user balance
        const { data: balanceData } = await supabase
          .from('user_balances')
          .select('balance')
          .eq('user_id', setting.user_id)
          .single();

        const currentBalance = balanceData?.balance || 0;

        // Create invoice
        const { data: invoice, error: invoiceError } = await supabase
          .from('invoices')
          .insert({
            user_id: setting.user_id,
            amount: totalAmount,
            status: 'pending',
            due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            line_items: allLineItems,
            auto_generated: true,
            generation_date: new Date().toISOString(),
            shopify_order_ids: orderIds,
            breakdown: {
              productCosts,
              shippingCosts,
              commission,
            },
          })
          .select('id')
          .single();

        if (invoiceError) throw invoiceError;

        // Mark orders as processed
        await supabase
          .from('shopify_order_fulfillment')
          .update({ processed_for_invoice: true, invoice_id: invoice.id })
          .in('shopify_order_id', orderIds)
          .eq('user_id', setting.user_id);

        // Log success
        await supabase.from('invoice_generation_logs').insert({
          user_id: setting.user_id,
          invoice_id: invoice.id,
          status: 'success',
          line_items_count: allLineItems.length,
          total_amount: totalAmount,
          orders_processed: orderIds.length,
        });

        // Auto-pay if balance sufficient
        if (currentBalance >= totalAmount) {
          const newBalance = currentBalance - totalAmount;

          await supabase
            .from('user_balances')
            .update({ balance: newBalance, updated_at: new Date().toISOString() })
            .eq('user_id', setting.user_id);

          await supabase
            .from('invoices')
            .update({ status: 'paid', paid_at: new Date().toISOString() })
            .eq('id', invoice.id);

          await supabase.from('balance_transactions').insert({
            user_id: setting.user_id,
            type: 'debit',
            amount: totalAmount,
            balance_after: newBalance,
            description: `Auto-payment for invoice ${invoice.id}`,
            invoice_id: invoice.id,
          });
        }

        results.generated++;
      } catch (error) {
        results.errors.push(`User ${setting.user_id}: ${error.message}`);
      }

      results.processed++;
    }

    return new Response(
      JSON.stringify(results),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Auto-invoice generation error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
