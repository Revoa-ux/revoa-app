import { createClient } from 'npm:@supabase/supabase-js@2.39.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface ShopifyOrder {
  id: number;
  name: string;
  order_number?: string;
  created_at: string;
  processed_at?: string;
  cancelled_at?: string;
  cancel_reason?: string;
  financial_status: string;
  fulfillment_status: string | null;
  total_price: string;
  subtotal_price?: string;
  total_tax?: string;
  total_discounts?: string;
  currency: string;
  email?: string;
  phone?: string;
  note?: string;
  tags?: string;
  landing_site?: string;
  referring_site?: string;
  order_status_url?: string;
  discount_codes?: Array<{ code: string }>;
  total_shipping_price_set?: {
    shop_money?: {
      amount: string;
    };
  };
  shipping_lines?: Array<{ price: string }>;
  line_items: Array<{
    id: number;
    product_id?: number;
    sku?: string;
    name?: string;
    title?: string;
    variant_title?: string;
    quantity: number;
    price: string;
  }>;
  shipping_address: {
    address1?: string;
    address2?: string;
    city?: string;
    province?: string;
    province_code?: string;
    zip?: string;
    country?: string;
    country_code?: string;
    first_name?: string;
    last_name?: string;
    phone?: string;
  } | null;
  billing_address: {
    address1?: string;
    address2?: string;
    city?: string;
    province?: string;
    province_code?: string;
    zip?: string;
    country?: string;
    country_code?: string;
    first_name?: string;
    last_name?: string;
    phone?: string;
  } | null;
  customer: {
    id: number;
    email: string;
    first_name?: string;
    last_name?: string;
    phone?: string;
  } | null;
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

function parseNextPageInfo(linkHeader: string | null): string | null {
  if (!linkHeader) return null;

  const links = linkHeader.split(',');
  for (const link of links) {
    const [url, rel] = link.split(';').map(s => s.trim());
    if (rel === 'rel="next"') {
      const match = url.match(/page_info=([^&>]+)/);
      return match ? match[1] : null;
    }
  }
  return null;
}

async function fetchShopifyOrders(
  storeUrl: string,
  accessToken: string,
  createdAtMin?: string,
  pageInfo?: string,
  limit = 250,
  isInitialSync = false
): Promise<{ orders: ShopifyOrder[]; nextPageInfo: string | null }> {
  let url = `https://${storeUrl}/admin/api/2024-01/orders.json?status=any&limit=${limit}`;
  if (!isInitialSync) {
    url += '&financial_status=paid';
  }

  if (pageInfo) {
    url += `&page_info=${pageInfo}`;
  } else if (createdAtMin) {
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

    const { data: installation, error: installError } = await supabase
      .from('shopify_installations')
      .select('id, store_url, access_token, last_synced_at, orders_synced_count')
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

    const isInitialSync = !installation.last_synced_at || (installation.orders_synced_count === 0);
    let createdAtMin: string;
    if (installation.last_synced_at && !isInitialSync) {
      createdAtMin = installation.last_synced_at;
      console.log('[Sync] Incremental sync from:', createdAtMin);
    } else {
      const threeYearsAgo = new Date();
      threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);
      createdAtMin = threeYearsAgo.toISOString();
      console.log('[Sync] Initial sync from:', createdAtMin);
    }

    const MAX_PAGES = 40;
    const MAX_DURATION_MS = 110000;

    let allOrders: ShopifyOrder[] = [];
    let pageCount = 0;
    let nextPageInfo: string | null = null;
    let hasMore = true;

    while (hasMore && pageCount < MAX_PAGES) {
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
        nextPageInfo,
        250,
        isInitialSync
      );

      console.log(`[Sync] Page ${pageCount}: ${orders.length} orders`);
      allOrders.push(...orders);

      nextPageInfo = next;
      hasMore = nextPageInfo !== null;

      if (orders.length === 0) {
        hasMore = false;
      }
    }

    console.log(`[Sync] Fetched ${allOrders.length} total orders across ${pageCount} pages`);

    const { data: activeQuotes } = await supabase
      .from('product_quotes')
      .select('id, variants')
      .eq('user_id', userId)
      .eq('status', 'accepted');

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

    let processedCount = 0;
    let fulfillmentsCreated = 0;
    let skippedCount = 0;
    const errors: string[] = [];

    const BATCH_SIZE = 100;
    for (let i = 0; i < allOrders.length; i += BATCH_SIZE) {
      const batch = allOrders.slice(i, i + BATCH_SIZE);

      for (const order of batch) {
        try {
          const customerEmail = order.email || order.customer?.email || null;
          const billingAddress = order.billing_address || {};
          const shippingAddress = order.shipping_address || {};
          const discountCodes = (order.discount_codes || []).map((dc: any) => dc.code);

          let isRepeatCustomer = false;
          let orderCount = 1;
          if (customerEmail) {
            const { data: existingOrders } = await supabase
              .from('shopify_orders')
              .select('id')
              .eq('user_id', userId)
              .eq('customer_email', customerEmail);

            if (existingOrders && existingOrders.length > 0) {
              isRepeatCustomer = true;
              orderCount = existingOrders.length + 1;
            }
          }

          const { data: storedOrder, error: orderInsertError } = await supabase
            .from('shopify_orders')
            .upsert({
              user_id: userId,
              shopify_order_id: order.id.toString(),
              order_number: order.name || order.order_number,
              total_price: parseFloat(order.total_price || '0'),
              currency: order.currency || 'USD',
              customer_email: customerEmail,
              customer_first_name: order.customer?.first_name || shippingAddress.first_name || billingAddress.first_name || null,
              customer_last_name: order.customer?.last_name || shippingAddress.last_name || billingAddress.last_name || null,
              customer_phone: order.customer?.phone || shippingAddress.phone || billingAddress.phone || order.phone || null,
              shipping_address_line1: shippingAddress.address1 || null,
              shipping_address_line2: shippingAddress.address2 || null,
              shipping_city: shippingAddress.city || null,
              shipping_state: shippingAddress.province || shippingAddress.province_code || null,
              shipping_zip: shippingAddress.zip || null,
              shipping_country: shippingAddress.country || shippingAddress.country_code || null,
              billing_address_line1: billingAddress.address1 || null,
              billing_address_line2: billingAddress.address2 || null,
              billing_city: billingAddress.city || null,
              billing_state: billingAddress.province || billingAddress.province_code || null,
              billing_zip: billingAddress.zip || null,
              billing_country: billingAddress.country || billingAddress.country_code || null,
              subtotal_price: parseFloat(order.subtotal_price || '0'),
              total_tax: parseFloat(order.total_tax || '0'),
              total_shipping: parseFloat(order.total_shipping_price_set?.shop_money?.amount || order.shipping_lines?.[0]?.price || '0'),
              total_discounts: parseFloat(order.total_discounts || '0'),
              discount_codes: discountCodes,
              note: order.note || null,
              tags: order.tags || null,
              financial_status: order.financial_status || null,
              fulfillment_status: order.fulfillment_status || null,
              order_status_url: order.order_status_url || null,
              is_repeat_customer: isRepeatCustomer,
              order_count: orderCount,
              cancelled_at: order.cancelled_at || null,
              cancel_reason: order.cancel_reason || null,
              processed_at: order.processed_at || null,
              ordered_at: order.created_at,
            }, {
              onConflict: 'user_id,shopify_order_id',
              ignoreDuplicates: false
            })
            .select('id')
            .single();

          if (orderInsertError) {
            console.error('[Sync] Error inserting order:', orderInsertError);
            errors.push(`Order ${order.name}: ${orderInsertError.message}`);
            continue;
          }

          if (order.line_items && order.line_items.length > 0) {
            const orderLineItems = [];
            for (const item of order.line_items) {
              const { data: product } = await supabase
                .from('products')
                .select('id, cogs_cost')
                .or(`shopify_product_id.eq.${item.product_id},sku.eq.${item.sku}`)
                .maybeSingle();

              const unitCost = product?.cogs_cost || 0;
              const unitPrice = parseFloat(item.price || '0');

              orderLineItems.push({
                user_id: userId,
                shopify_order_id: order.id.toString(),
                product_id: product?.id || null,
                product_name: item.name || item.title || 'Unknown Product',
                variant_name: item.variant_title || null,
                quantity: item.quantity,
                unit_cost: unitCost,
                total_cost: unitCost * item.quantity,
                unit_price: unitPrice,
                fulfillment_status: 'pending'
              });
            }

            if (orderLineItems.length > 0) {
              const { error: lineItemsError } = await supabase
                .from('order_line_items')
                .upsert(orderLineItems, {
                  onConflict: 'shopify_order_id,product_name,variant_name',
                  ignoreDuplicates: false
                });

              if (lineItemsError) {
                console.error('[Sync] Error inserting line items:', lineItemsError);
              } else {
                console.log(`[Sync] Inserted ${orderLineItems.length} line items for order ${order.name}`);
              }
            }
          }

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

          const totalCost = matchedItems.reduce((sum, item) => sum + item.total_cost, 0);
          const totalQuantity = matchedItems.reduce((sum, item) => sum + item.quantity, 0);

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
      errors: errors.length > 0 ? errors.slice(0, 10) : undefined,
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