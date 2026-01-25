import { createClient } from 'npm:@supabase/supabase-js@2.39.7';
import { checkSubscription, createSubscriptionRequiredResponse } from '../_shared/subscription-check.ts';
import { shopifyGraphQL, QUERIES } from '../_shared/shopify-graphql.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

// GraphQL order node interface
interface GraphQLOrderNode {
  id: string; // GID format
  name: string;
  createdAt: string;
  processedAt?: string;
  cancelledAt?: string;
  cancelReason?: string;
  displayFinancialStatus: string;
  displayFulfillmentStatus: string;
  totalPriceSet: {
    shopMoney: {
      amount: string;
      currencyCode: string;
    };
  };
  subtotalPriceSet?: {
    shopMoney: {
      amount: string;
    };
  };
  totalTaxSet?: {
    shopMoney: {
      amount: string;
    };
  };
  totalDiscountsSet?: {
    shopMoney: {
      amount: string;
    };
  };
  email?: string;
  phone?: string;
  note?: string;
  tags: string[];
  customAttributes?: Array<{ key: string; value: string }>;
  shippingAddress?: {
    address1?: string;
    address2?: string;
    city?: string;
    province?: string;
    provinceCode?: string;
    zip?: string;
    country?: string;
    countryCode?: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
  };
  billingAddress?: {
    address1?: string;
    address2?: string;
    city?: string;
    province?: string;
    provinceCode?: string;
    zip?: string;
    country?: string;
    countryCode?: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
  };
  customer?: {
    id: string; // GID format
    email: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
  };
  lineItems: {
    edges: Array<{
      node: {
        id: string; // GID format
        name?: string;
        title?: string;
        variantTitle?: string;
        sku?: string;
        quantity: number;
        originalUnitPriceSet: {
          shopMoney: {
            amount: string;
          };
        };
        product?: {
          id: string; // GID format
        };
      };
    }>;
  };
  shippingLines: {
    edges: Array<{
      node: {
        title: string;
        originalPriceSet?: {
          shopMoney: {
            amount: string;
          };
        };
      };
    }>;
  };
}

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

/**
 * Extract numeric ID from Shopify GID (e.g., "gid://shopify/Order/12345" -> 12345)
 */
function extractIdFromGid(gid: string): number {
  const match = gid.match(/\/(\d+)$/);
  return match ? parseInt(match[1]) : 0;
}

/**
 * Convert GraphQL order node to REST-compatible format
 */
function convertGraphQLOrderToRest(node: GraphQLOrderNode): ShopifyOrder {
  const shippingPrice = node.shippingLines.edges[0]?.node.originalPriceSet?.shopMoney.amount || '0';

  return {
    id: extractIdFromGid(node.id),
    name: node.name,
    order_number: node.name,
    created_at: node.createdAt,
    processed_at: node.processedAt || undefined,
    cancelled_at: node.cancelledAt || undefined,
    cancel_reason: node.cancelReason || undefined,
    financial_status: node.displayFinancialStatus.toLowerCase(),
    fulfillment_status: node.displayFulfillmentStatus ? node.displayFulfillmentStatus.toLowerCase() : null,
    total_price: node.totalPriceSet.shopMoney.amount,
    subtotal_price: node.subtotalPriceSet?.shopMoney.amount || '0',
    total_tax: node.totalTaxSet?.shopMoney.amount || '0',
    total_discounts: node.totalDiscountsSet?.shopMoney.amount || '0',
    currency: node.totalPriceSet.shopMoney.currencyCode,
    email: node.email,
    phone: node.phone,
    note: node.note,
    tags: node.tags.join(', '),
    line_items: node.lineItems.edges.map(edge => ({
      id: extractIdFromGid(edge.node.id),
      product_id: edge.node.product ? extractIdFromGid(edge.node.product.id) : undefined,
      sku: edge.node.sku,
      name: edge.node.name,
      title: edge.node.title,
      variant_title: edge.node.variantTitle,
      quantity: edge.node.quantity,
      price: edge.node.originalUnitPriceSet.shopMoney.amount,
    })),
    shipping_lines: node.shippingLines.edges.map(edge => ({
      price: edge.node.originalPriceSet?.shopMoney.amount || '0',
    })),
    total_shipping_price_set: {
      shop_money: {
        amount: shippingPrice,
      },
    },
    shipping_address: node.shippingAddress ? {
      address1: node.shippingAddress.address1,
      address2: node.shippingAddress.address2,
      city: node.shippingAddress.city,
      province: node.shippingAddress.province,
      province_code: node.shippingAddress.provinceCode,
      zip: node.shippingAddress.zip,
      country: node.shippingAddress.country,
      country_code: node.shippingAddress.countryCode,
      first_name: node.shippingAddress.firstName,
      last_name: node.shippingAddress.lastName,
      phone: node.shippingAddress.phone,
    } : null,
    billing_address: node.billingAddress ? {
      address1: node.billingAddress.address1,
      address2: node.billingAddress.address2,
      city: node.billingAddress.city,
      province: node.billingAddress.province,
      province_code: node.billingAddress.provinceCode,
      zip: node.billingAddress.zip,
      country: node.billingAddress.country,
      country_code: node.billingAddress.countryCode,
      first_name: node.billingAddress.firstName,
      last_name: node.billingAddress.lastName,
      phone: node.billingAddress.phone,
    } : null,
    customer: node.customer ? {
      id: extractIdFromGid(node.customer.id),
      email: node.customer.email,
      first_name: node.customer.firstName,
      last_name: node.customer.lastName,
      phone: node.customer.phone,
    } : null,
  };
}

/**
 * Fetch orders using GraphQL Admin API
 */
async function fetchShopifyOrders(
  storeUrl: string,
  accessToken: string,
  createdAtMin?: string,
  cursor?: string,
  limit = 250,
  isInitialSync = false
): Promise<{ orders: ShopifyOrder[]; nextPageInfo: string | null }> {
  console.log('[Sync GraphQL] Fetching orders with GraphQL API 2026-01');

  // Build query string for filtering
  // Always fetch all orders regardless of financial status to support:
  // - Test stores with unpaid orders
  // - Tracking orders before payment completion
  // - Refunds, cancellations, etc.
  let queryString = 'status:any';
  if (createdAtMin) {
    queryString += ` AND created_at:>='${createdAtMin}'`;
  }

  const result = await shopifyGraphQL<{ orders: { edges: Array<{ node: GraphQLOrderNode; cursor: string }>; pageInfo: { hasNextPage: boolean; endCursor: string } } }>(
    storeUrl,
    accessToken,
    QUERIES.GET_ORDERS,
    {
      first: limit,
      after: cursor || null,
      query: queryString,
    }
  );

  const orders = result.orders.edges.map(edge => convertGraphQLOrderToRest(edge.node));
  const nextPageInfo = result.orders.pageInfo.hasNextPage ? result.orders.pageInfo.endCursor : null;

  console.log(`[Sync GraphQL] Fetched ${orders.length} orders, hasNextPage: ${result.orders.pageInfo.hasNextPage}`);

  return { orders, nextPageInfo };
}

/**
 * Fetch fulfillments for an order using GraphQL Admin API
 */
async function fetchFulfillments(
  storeUrl: string,
  accessToken: string,
  orderId: number
): Promise<ShopifyFulfillment[]> {
  console.log('[Sync GraphQL] Fetching fulfillments with GraphQL API 2026-01');

  try {
    const result = await shopifyGraphQL<{ order: { id: string; fulfillments: { edges: Array<{ node: { id: string; status: string; trackingInfo: Array<{ number?: string; company?: string; url?: string }>; createdAt: string; updatedAt: string } }> } } }>(
      storeUrl,
      accessToken,
      QUERIES.GET_FULFILLMENTS,
      {
        id: `gid://shopify/Order/${orderId}`,
      }
    );

    if (!result.order || !result.order.fulfillments) {
      return [];
    }

    return result.order.fulfillments.edges.map(edge => {
      const trackingInfo = edge.node.trackingInfo[0] || {};
      return {
        id: extractIdFromGid(edge.node.id),
        order_id: orderId,
        status: edge.node.status.toLowerCase(),
        tracking_number: trackingInfo.number,
        tracking_company: trackingInfo.company,
        tracking_url: trackingInfo.url,
        created_at: edge.node.createdAt,
        updated_at: edge.node.updatedAt,
      };
    });
  } catch (error) {
    console.error(`[Sync GraphQL] Failed to fetch fulfillments for order ${orderId}:`, error);
    return [];
  }
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
              order_count: orderCount,
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