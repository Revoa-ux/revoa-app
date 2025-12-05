import { createClient } from 'npm:@supabase/supabase-js@2.39.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface ShopifyOrder {
  id: number;
  name: string;
  created_at: string;
  financial_status: string;
  fulfillment_status: string | null;
  total_price: string;
  currency: string;
  line_items: Array<{
    id: number;
    sku: string;
    name: string;
    quantity: number;
    price: string;
  }>;
  shipping_address: {
    country_code: string;
  } | null;
  customer: {
    id: number;
    email: string;
  };
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

    const { userId, storeUrl, accessToken } = await req.json();

    if (!userId || !storeUrl || !accessToken) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get orders from last 3 years
    const threeYearsAgo = new Date();
    threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);

    const ordersUrl = `https://${storeUrl}/admin/api/2024-01/orders.json?status=any&financial_status=paid&created_at_min=${threeYearsAgo.toISOString()}&limit=250`;

    const shopifyResponse = await fetch(ordersUrl, {
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json',
      },
    });

    if (!shopifyResponse.ok) {
      throw new Error(`Shopify API error: ${shopifyResponse.statusText}`);
    }

    const { orders } = await shopifyResponse.json() as { orders: ShopifyOrder[] };

    let processedCount = 0;
    let skippedCount = 0;
    const errors: string[] = [];

    for (const order of orders) {
      try {
        // First, insert/update in shopify_orders table for chat threads
        const { error: orderInsertError } = await supabase
          .from('shopify_orders')
          .upsert({
            user_id: userId,
            shopify_order_id: order.id.toString(),
            order_number: order.name,
            total_price: parseFloat(order.total_price || '0'),
            currency: order.currency || 'USD',
            customer_email: order.customer?.email || null,
            ordered_at: order.created_at,
          }, {
            onConflict: 'user_id,shopify_order_id',
            ignoreDuplicates: false
          });

        if (orderInsertError) {
          console.error('Error inserting order:', orderInsertError);
        }

        // Check if we already processed this order for fulfillment
        const { data: existingFulfillment } = await supabase
          .from('shopify_order_fulfillment')
          .select('id')
          .eq('shopify_order_id', order.id.toString())
          .eq('user_id', userId)
          .maybeSingle();

        if (existingFulfillment) {
          skippedCount++;
          continue;
        }

        // Get active quotes for this user
        const { data: activeQuotes } = await supabase
          .from('product_quotes')
          .select('id, variants')
          .eq('user_id', userId)
          .eq('status', 'accepted');

        if (!activeQuotes || activeQuotes.length === 0) {
          skippedCount++;
          continue;
        }

        // Build SKU to quote mapping
        const skuToQuoteMap = new Map<string, { quoteId: string; variant: any }>();
        activeQuotes.forEach(quote => {
          if (quote.variants && Array.isArray(quote.variants)) {
            quote.variants.forEach(variant => {
              if (variant.sku) {
                skuToQuoteMap.set(variant.sku.toLowerCase(), {
                  quoteId: quote.id,
                  variant
                });
              }
            });
          }
        });

        // Process line items
        const matchedItems: any[] = [];
        for (const item of order.line_items) {
          if (!item.sku) continue;

          const quoteMatch = skuToQuoteMap.get(item.sku.toLowerCase());
          if (!quoteMatch) continue;

          const shippingCountry = order.shipping_address?.country_code || 'US';
          const shippingCost = quoteMatch.variant.shippingCosts?.[shippingCountry]
            || quoteMatch.variant.shippingCosts?._default
            || 0;

          const costPerItem = quoteMatch.variant.costPerItem || 0;
          const totalCost = (costPerItem + shippingCost) * item.quantity;

          matchedItems.push({
            sku: item.sku,
            product_name: item.name,
            quantity: item.quantity,
            cost_per_item: costPerItem,
            shipping_cost: shippingCost,
            shipping_country: shippingCountry,
            total_cost: totalCost,
            quote_id: quoteMatch.quoteId,
          });
        }

        if (matchedItems.length === 0) {
          skippedCount++;
          continue;
        }

        // Calculate totals
        const totalCost = matchedItems.reduce((sum, item) => sum + item.total_cost, 0);
        const totalQuantity = matchedItems.reduce((sum, item) => sum + item.quantity, 0);

        // Insert fulfillment record
        const { error: insertError } = await supabase
          .from('shopify_order_fulfillment')
          .insert({
            user_id: userId,
            shopify_order_id: order.id.toString(),
            shopify_order_name: order.name,
            order_date: order.created_at,
            fulfillment_status: order.fulfillment_status || 'unfulfilled',
            line_items: matchedItems,
            total_quantity: totalQuantity,
            total_cost: totalCost,
            processed_for_invoice: false,
          });

        if (insertError) {
          errors.push(`Order ${order.name}: ${insertError.message}`);
          continue;
        }

        processedCount++;
      } catch (error) {
        errors.push(`Order ${order.name}: ${error.message}`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processedCount: orders.length - skippedCount,
        totalOrders: orders.length,
        fulfillmentsProcessed: processedCount,
        skipped: skippedCount,
        errors: errors.length > 0 ? errors : undefined,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Sync error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
