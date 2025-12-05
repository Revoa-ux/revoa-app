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

interface SyncResult {
  success: boolean;
  totalOrders: number;
  processedCount: number;
  fulfillmentsCreated: number;
  skipped: number;
  pages: number;
  errors?: string[];
  error?: string;
}

/**
 * Parse Link header to extract next page cursor
 * Shopify uses Link headers with rel="next" for pagination
 */
function parseNextPageInfo(linkHeader: string | null): string | null {
  if (!linkHeader) return null;

  const links = linkHeader.split(',');
  for (const link of links) {
    const [url, rel] = link.split(';').map(s => s.trim());
    if (rel === 'rel="next"') {
      // Extract page_info from URL
      const match = url.match(/page_info=([^&>]+)/);
      return match ? match[1] : null;
    }
  }
  return null;
}

/**
 * Fetch orders from Shopify with pagination support
 */
async function fetchShopifyOrders(
  storeUrl: string,
  accessToken: string,
  createdAtMin?: string,
  pageInfo?: string,
  limit = 250
): Promise<{ orders: ShopifyOrder[]; nextPageInfo: string | null }> {
  let url = `https://${storeUrl}/admin/api/2024-01/orders.json?status=any&financial_status=paid&limit=${limit}`;

  if (pageInfo) {
    // Use page_info for pagination
    url += `&page_info=${pageInfo}`;
  } else if (createdAtMin) {
    // Only use created_at_min on first request
    url += `&created_at_min=${createdAtMin}`;
  }

  const response = await fetch(url, {
    headers: {
      'X-Shopify-Access-Token': accessToken,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Shopify API error: ${response.status} ${response.statusText}`);
  }

  const linkHeader = response.headers.get('Link');
  const nextPageInfo = parseNextPageInfo(linkHeader);

  const { orders } = await response.json() as { orders: ShopifyOrder[] };

  return { orders, nextPageInfo };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { userId } = await req.json();

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'Missing userId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[Sync] Starting order sync for user:', userId);

    // Fetch installation with access_token from database (secure)
    const { data: installation, error: installError } = await supabase
      .from('shopify_installations')
      .select('id, store_url, access_token, last_synced_at')
      .eq('user_id', userId)
      .eq('status', 'installed')
      .is('uninstalled_at', null)
      .maybeSingle();

    if (installError || !installation) {
      console.error('[Sync] Installation not found:', installError);
      return new Response(
        JSON.stringify({ error: 'Shopify installation not found or inactive' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!installation.access_token) {
      return new Response(
        JSON.stringify({ error: 'Access token not found for installation' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Determine sync date range (incremental vs full sync)
    let createdAtMin: string;
    if (installation.last_synced_at) {
      // Incremental sync: only fetch orders since last sync
      createdAtMin = installation.last_synced_at;
      console.log('[Sync] Incremental sync from:', createdAtMin);
    } else {
      // First sync: fetch last 3 years
      const threeYearsAgo = new Date();
      threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);
      createdAtMin = threeYearsAgo.toISOString();
      console.log('[Sync] First sync from:', createdAtMin);
    }

    // Pagination loop with safety limit
    const MAX_PAGES = 40; // Max 10,000 orders (250 per page)
    const MAX_DURATION_MS = 110000; // 110 seconds (leave buffer before 120s timeout)

    let allOrders: ShopifyOrder[] = [];
    let pageCount = 0;
    let nextPageInfo: string | null = null;
    let hasMore = true;

    while (hasMore && pageCount < MAX_PAGES) {
      // Check timeout
      if (Date.now() - startTime > MAX_DURATION_MS) {
        console.warn('[Sync] Approaching timeout, stopping pagination');
        break;
      }

      pageCount++;
      console.log(`[Sync] Fetching page ${pageCount}...`);

      const { orders, nextPageInfo: next } = await fetchShopifyOrders(
        installation.store_url,
        installation.access_token,
        pageCount === 1 ? createdAtMin : undefined,
        nextPageInfo
      );

      console.log(`[Sync] Page ${pageCount}: ${orders.length} orders`);
      allOrders.push(...orders);

      nextPageInfo = next;
      hasMore = nextPageInfo !== null;

      // Break if no more orders
      if (orders.length === 0) {
        hasMore = false;
      }
    }

    console.log(`[Sync] Fetched ${allOrders.length} total orders across ${pageCount} pages`);

    // Get active quotes for matching
    const { data: activeQuotes } = await supabase
      .from('product_quotes')
      .select('id, variants')
      .eq('user_id', userId)
      .eq('status', 'accepted');

    // Build SKU to quote mapping (once for performance)
    const skuToQuoteMap = new Map<string, { quoteId: string; variant: any }>();
    activeQuotes?.forEach(quote => {
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

    console.log(`[Sync] Mapped ${skuToQuoteMap.size} SKUs from ${activeQuotes?.length || 0} quotes`);

    // Process orders
    let processedCount = 0;
    let fulfillmentsCreated = 0;
    let skippedCount = 0;
    const errors: string[] = [];

    // Batch processing for better performance
    const BATCH_SIZE = 100;
    for (let i = 0; i < allOrders.length; i += BATCH_SIZE) {
      const batch = allOrders.slice(i, i + BATCH_SIZE);

      for (const order of batch) {
        try {
          // Insert/update in shopify_orders table for chat threads and attribution
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
            console.error('[Sync] Error inserting order:', orderInsertError);
          }

          // Check if fulfillment already exists
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

          // Match line items to quotes
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

          fulfillmentsCreated++;
          processedCount++;
        } catch (error) {
          errors.push(`Order ${order.name}: ${error.message}`);
        }
      }
    }

    // Update last_synced_at and orders_synced_count
    const { error: updateError } = await supabase
      .from('shopify_installations')
      .update({
        last_synced_at: new Date().toISOString(),
        orders_synced_count: allOrders.length,
      })
      .eq('id', installation.id);

    if (updateError) {
      console.error('[Sync] Error updating last_synced_at:', updateError);
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`[Sync] Completed in ${duration}s: ${processedCount} processed, ${fulfillmentsCreated} fulfillments, ${skippedCount} skipped`);

    const result: SyncResult = {
      success: true,
      totalOrders: allOrders.length,
      processedCount,
      fulfillmentsCreated,
      skipped: skippedCount,
      pages: pageCount,
      errors: errors.length > 0 ? errors.slice(0, 10) : undefined, // Return first 10 errors only
    };

    return new Response(
      JSON.stringify(result),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('[Sync] Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Unknown error occurred',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
