import { createClient } from 'npm:@supabase/supabase-js@2.39.7';
import { checkSubscription, createSubscriptionRequiredResponse } from '../_shared/subscription-check.ts';

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
  contact_email?: string;
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
  trackingRecordsCreated: number;
  skipped: number;
  pages: number;
  errors?: string[];
  error?: string;
}

interface ShopifyFulfillment {
  id: number;
  order_id: number;
  status: string;
  tracking_number?: string;
  tracking_company?: string;
  tracking_url?: string;
  tracking_numbers?: string[];
  tracking_urls?: string[];
  shipment_status?: string;
  created_at: string;
  updated_at: string;
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
  let url = `https://${storeUrl}/admin/api/2025-01/orders.json?status=any&limit=${limit}`;
  if (!isInitialSync) {
    url += '&financial_status=paid';
  }

  if (pageInfo) {
    url += `&page_info=${pageInfo}`;
  } else if (createdAtMin) {
    url += `&created_at_min=${createdAtMin}`;
  }

  // Explicitly request customer and address fields for better data completeness
  url += '&fields=id,name,order_number,created_at,processed_at,cancelled_at,cancel_reason,financial_status,fulfillment_status,total_price,subtotal_price,total_tax,total_discounts,currency,email,phone,note,tags,landing_site,referring_site,order_status_url,discount_codes,total_shipping_price_set,shipping_lines,line_items,shipping_address,billing_address,customer,contact_email';

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

  const data = await response.json();
  return { orders: data.orders || [], nextPageInfo };
}

async function fetchFulfillments(
  storeUrl: string,
  accessToken: string,
  orderId: number
): Promise<ShopifyFulfillment[]> {
  const url = `https://${storeUrl}/admin/api/2025-01/orders/${orderId}/fulfillments.json`;
  const response = await fetch(url, {
    headers: {
      'X-Shopify-Access-Token': accessToken,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    console.error(`Failed to fetch fulfillments for order ${orderId}:`, response.status);
    return [];
  }

  const data = await response.json();
  return data.fulfillments || [];
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

    const { userId } = await req.json();

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'Missing userId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check subscription status before allowing sync
    const subscriptionCheck = await checkSubscription(supabase, userId);
    if (!subscriptionCheck.isActive) {
      console.log('[Sync] Subscription check failed:', subscriptionCheck.status);
      return createSubscriptionRequiredResponse(
        subscriptionCheck.status,
        subscriptionCheck.pricingUrl,
        corsHeaders
      );
    }

    const { data: installation, error: installError } = await supabase
      .from('shopify_installations')
      .select('store_url, access_token, last_synced_at')
      .eq('user_id', userId)
      .eq('status', 'installed')
      .maybeSingle();

    if (installError || !installation) {
      return new Response(
        JSON.stringify({ error: 'Shopify installation not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const isInitialSync = !installation.last_synced_at;
    const createdAtMin = installation.last_synced_at
      ? new Date(new Date(installation.last_synced_at).getTime() - 5 * 60 * 1000).toISOString()
      : undefined;

    console.log('[Sync] Starting order sync:', {
      userId,
      storeUrl: installation.store_url,
      isInitialSync,
      createdAtMin
    });

    let allOrders: ShopifyOrder[] = [];
    let currentPageInfo: string | null = null;
    let pageCount = 0;

    do {
      pageCount++;
      console.log(`[Sync] Fetching page ${pageCount}${currentPageInfo ? ` with pageInfo` : ''}`);

      const { orders, nextPageInfo } = await fetchShopifyOrders(
        installation.store_url,
        installation.access_token,
        createdAtMin,
        currentPageInfo || undefined,
        250,
        isInitialSync
      );

      allOrders = allOrders.concat(orders);
      currentPageInfo = nextPageInfo;

      console.log(`[Sync] Page ${pageCount}: fetched ${orders.length} orders (total: ${allOrders.length})`);

      if (pageCount >= 10) {
        console.log('[Sync] Reached max page limit (10 pages)');
        break;
      }
    } while (currentPageInfo);

    console.log(`[Sync] Total orders fetched: ${allOrders.length} across ${pageCount} pages`);

    if (allOrders.length === 0) {
      await supabase
        .from('shopify_installations')
        .update({ last_synced_at: new Date().toISOString() })
        .eq('user_id', userId);

      return new Response(
        JSON.stringify({
          success: true,
          totalOrders: 0,
          processedCount: 0,
          fulfillmentsCreated: 0,
          trackingRecordsCreated: 0,
          skipped: 0,
          pages: pageCount
        } as SyncResult),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let processedCount = 0;
    let fulfillmentsCreated = 0;
    let trackingRecordsCreated = 0;
    let skipped = 0;
    const errors: string[] = [];

    const BATCH_SIZE = 100;
    for (let i = 0; i < allOrders.length; i += BATCH_SIZE) {
      const batch = allOrders.slice(i, i + BATCH_SIZE);

      for (const order of batch) {
        try {
          const customerEmail = order.email || order.customer?.email || order.contact_email || null;
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
              total_discounts: parseFloat(order.total_discounts || '0'),
              total_shipping: order.total_shipping_price_set?.shop_money?.amount
                ? parseFloat(order.total_shipping_price_set.shop_money.amount)
                : (order.shipping_lines && order.shipping_lines[0] ? parseFloat(order.shipping_lines[0].price) : 0),
              financial_status: order.financial_status || 'unknown',
              fulfillment_status: order.fulfillment_status || 'unfulfilled',
              ordered_at: order.created_at,
              processed_at: order.processed_at || null,
              cancelled_at: order.cancelled_at || null,
              cancel_reason: order.cancel_reason || null,
              tags: order.tags || null,
              discount_codes: discountCodes.length > 0 ? discountCodes : null,
              landing_site: order.landing_site || null,
              referring_site: order.referring_site || null,
              order_status_url: order.order_status_url || null,
              is_repeat_customer: isRepeatCustomer,
              customer_order_count: orderCount,
              note: order.note || null
            }, {
              onConflict: 'user_id,shopify_order_id',
              ignoreDuplicates: false
            })
            .select('id')
            .maybeSingle();

          if (orderInsertError) {
            errors.push(`Order ${order.name}: ${orderInsertError.message}`);
            console.error(`[Sync] Error upserting order ${order.name}:`, orderInsertError);
            skipped++;
            continue;
          }

          if (!storedOrder) {
            errors.push(`Order ${order.name}: No data returned after upsert`);
            skipped++;
            continue;
          }

          for (const item of order.line_items) {
            await supabase
              .from('shopify_line_items')
              .upsert({
                shopify_order_id: storedOrder.id,
                shopify_line_item_id: item.id.toString(),
                product_id: item.product_id?.toString() || null,
                sku: item.sku || null,
                product_name: item.name || item.title || 'Unknown Product',
                variant_title: item.variant_title || null,
                quantity: item.quantity,
                unit_price: parseFloat(item.price || '0'),
                total_price: parseFloat(item.price || '0') * item.quantity
              }, {
                onConflict: 'shopify_order_id,shopify_line_item_id',
                ignoreDuplicates: false
              });
          }

          const fulfillments = await fetchFulfillments(
            installation.store_url,
            installation.access_token,
            order.id
          );

          if (fulfillments && fulfillments.length > 0) {
            for (const fulfillment of fulfillments) {
              const { error: fulfillmentError } = await supabase
                .from('shopify_fulfillments')
                .upsert({
                  shopify_order_id: storedOrder.id,
                  shopify_fulfillment_id: fulfillment.id.toString(),
                  status: fulfillment.status,
                  tracking_number: fulfillment.tracking_number || (fulfillment.tracking_numbers && fulfillment.tracking_numbers[0]) || null,
                  tracking_company: fulfillment.tracking_company || null,
                  tracking_url: fulfillment.tracking_url || (fulfillment.tracking_urls && fulfillment.tracking_urls[0]) || null,
                  shipment_status: fulfillment.shipment_status || null,
                  created_at: fulfillment.created_at,
                  updated_at: fulfillment.updated_at
                }, {
                  onConflict: 'shopify_order_id,shopify_fulfillment_id',
                  ignoreDuplicates: false
                });

              if (!fulfillmentError) {
                fulfillmentsCreated++;
              }
            }
          }

          processedCount++;
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          errors.push(`Order ${order.name}: ${errorMsg}`);
          console.error(`[Sync] Error processing order ${order.name}:`, error);
          skipped++;
        }
      }
    }

    await supabase
      .from('shopify_installations')
      .update({ last_synced_at: new Date().toISOString() })
      .eq('user_id', userId);

    console.log('[Sync] Complete:', {
      totalOrders: allOrders.length,
      processedCount,
      fulfillmentsCreated,
      trackingRecordsCreated,
      skipped,
      errors: errors.length
    });

    return new Response(
      JSON.stringify({
        success: true,
        totalOrders: allOrders.length,
        processedCount,
        fulfillmentsCreated,
        trackingRecordsCreated,
        skipped,
        pages: pageCount,
        errors: errors.length > 0 ? errors.slice(0, 10) : undefined
      } as SyncResult),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[Sync] Fatal error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        totalOrders: 0,
        processedCount: 0,
        fulfillmentsCreated: 0,
        trackingRecordsCreated: 0,
        skipped: 0,
        pages: 0
      } as SyncResult),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});