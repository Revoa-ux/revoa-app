import { supabase } from './supabase';

/**
 * Attribution Service
 *
 * Handles UTM tracking, conversion matching, and attribution logic for Revoa.
 * This service connects Shopify order data with ad platform data to provide
 * accurate creative-level conversion tracking.
 */

// ============================================================================
// TYPES
// ============================================================================

export interface UTMParameters {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
}

export interface ClickIDs {
  fbclid?: string;
  gclid?: string;
  ttclid?: string;
}

export interface ShopifyOrderData {
  shopify_order_id: string;
  order_number: string;
  total_price: number;
  currency: string;
  customer_email?: string;
  landing_site?: string;
  referring_site?: string;
  ordered_at: string;
}

export interface TrackedOrder extends ShopifyOrderData, UTMParameters, ClickIDs {}

export interface ConversionMatch {
  order_id: string;
  ad_id: string;
  confidence_score: number;
  attribution_method: 'utm_match' | 'fbclid' | 'ad_name_match' | 'manual';
}

export interface AdConversionMetrics {
  ad_id: string;
  ad_name: string;
  platform_ad_id: string;
  total_conversions: number;
  conversion_value: number;
  total_cogs: number;
  average_order_value: number;
  conversion_rate: number;
  total_clicks: number;
  total_spend: number;
  cost_per_acquisition: number;
  return_on_ad_spend: number;
}

// ============================================================================
// UTM EXTRACTION
// ============================================================================

/**
 * Parse UTM parameters from a URL
 */
export function parseUTMFromURL(url: string): UTMParameters {
  if (!url) return {};

  try {
    const urlObj = new URL(url);
    const params = urlObj.searchParams;

    return {
      utm_source: params.get('utm_source') || undefined,
      utm_medium: params.get('utm_medium') || undefined,
      utm_campaign: params.get('utm_campaign') || undefined,
      utm_term: params.get('utm_term') || undefined,
      utm_content: params.get('utm_content') || undefined,
    };
  } catch (error) {
    console.warn('[Attribution] Failed to parse URL:', url, error);
    return {};
  }
}

/**
 * Parse click IDs from a URL
 */
export function parseClickIDsFromURL(url: string): ClickIDs {
  if (!url) return {};

  try {
    const urlObj = new URL(url);
    const params = urlObj.searchParams;

    return {
      fbclid: params.get('fbclid') || undefined,
      gclid: params.get('gclid') || undefined,
      ttclid: params.get('ttclid') || undefined,
    };
  } catch (error) {
    console.warn('[Attribution] Failed to parse click IDs:', url, error);
    return {};
  }
}

/**
 * Store a Shopify order with UTM tracking data
 */
export async function trackShopifyOrder(
  userId: string,
  orderData: ShopifyOrderData
): Promise<{ success: boolean; order_id?: string; error?: string }> {
  try {
    // Parse UTM parameters from landing site
    const utmParams = parseUTMFromURL(orderData.landing_site || '');
    const clickIDs = parseClickIDsFromURL(orderData.landing_site || '');

    console.log('[Attribution] Tracking order:', {
      order_number: orderData.order_number,
      has_utm_source: !!utmParams.utm_source,
      has_utm_term: !!utmParams.utm_term,
      has_fbclid: !!clickIDs.fbclid,
    });

    const { data, error } = await supabase
      .from('shopify_orders')
      .upsert(
        {
          user_id: userId,
          shopify_order_id: orderData.shopify_order_id,
          order_number: orderData.order_number,
          total_price: orderData.total_price,
          currency: orderData.currency,
          customer_email: orderData.customer_email,
          landing_site: orderData.landing_site,
          referring_site: orderData.referring_site,
          ordered_at: orderData.ordered_at,
          ...utmParams,
          ...clickIDs,
        },
        {
          onConflict: 'user_id,shopify_order_id',
          ignoreDuplicates: false,
        }
      )
      .select('id')
      .single();

    if (error) {
      console.error('[Attribution] Error storing order:', error);
      return { success: false, error: error.message };
    }

    console.log('[Attribution] Order tracked successfully:', data.id);
    return { success: true, order_id: data.id };
  } catch (error) {
    console.error('[Attribution] Exception tracking order:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// ============================================================================
// CONVERSION MATCHING
// ============================================================================

/**
 * Match orders to ads based on UTM parameters and click IDs
 *
 * This is the core matching logic. We try multiple strategies:
 * 1. Exact match on utm_term = platform_ad_id (confidence: 1.0)
 * 2. Exact match on utm_term = ad name (confidence: 0.95)
 * 3. Partial match on ad name contains utm_term (confidence: 0.8)
 * 4. Facebook click ID (fbclid) matching (confidence: 0.75)
 *
 * Supports all ad platforms: Facebook, Google Ads, TikTok, Microsoft Ads
 */
export async function matchOrdersToAds(
  userId: string,
  startDate?: string,
  endDate?: string
): Promise<{ success: boolean; matches: number; error?: string }> {
  try {
    console.log('[Attribution] Starting conversion matching for user:', userId);

    // Get unmatched orders in date range with UTM tracking
    let ordersQuery = supabase
      .from('shopify_orders')
      .select('*')
      .eq('user_id', userId)
      .not('utm_term', 'is', null)
      .not('utm_source', 'is', null);

    if (startDate) ordersQuery = ordersQuery.gte('ordered_at', startDate);
    if (endDate) ordersQuery = ordersQuery.lte('ordered_at', endDate);

    const { data: orders, error: ordersError } = await ordersQuery;

    if (ordersError) {
      console.error('[Attribution] Error fetching orders:', ordersError);
      return { success: false, matches: 0, error: ordersError.message };
    }

    if (!orders || orders.length === 0) {
      console.log('[Attribution] No orders with UTM data found');
      return { success: true, matches: 0 };
    }

    console.log('[Attribution] Found', orders.length, 'orders to match');

    // Get all ads for this user with platform info
    const { data: ads, error: adsError } = await supabase
      .from('ads')
      .select(
        `
        id,
        platform_ad_id,
        name,
        ad_set_id,
        ad_sets!inner (
          campaign_id,
          ad_campaigns!inner (
            ad_account_id,
            platform,
            ad_accounts!inner (
              user_id
            )
          )
        )
      `
      )
      .eq('ad_sets.ad_campaigns.ad_accounts.user_id', userId);

    if (adsError) {
      console.error('[Attribution] Error fetching ads:', adsError);
      return { success: false, matches: 0, error: adsError.message };
    }

    if (!ads || ads.length === 0) {
      console.log('[Attribution] No ads found for user');
      return { success: true, matches: 0 };
    }

    console.log('[Attribution] Found', ads.length, 'ads for matching');

    let matchCount = 0;

    for (const order of orders) {
      const utmTerm = order.utm_term?.toLowerCase().trim();
      if (!utmTerm) continue;

      // Map utm_source to platform names
      const platformMap: Record<string, string> = {
        'facebook': 'facebook',
        'fb': 'facebook',
        'instagram': 'facebook',
        'ig': 'facebook',
        'google': 'google',
        'googleads': 'google',
        'tiktok': 'tiktok',
        'tt': 'tiktok'
      };

      const orderPlatform = platformMap[order.utm_source?.toLowerCase()] || order.utm_source?.toLowerCase();

      // Filter ads by matching platform
      const platformAds = ads.filter(
        (ad) => ad.ad_sets?.ad_campaigns?.platform?.toLowerCase() === orderPlatform
      );

      if (platformAds.length === 0) {
        console.log(`[Attribution] No ${orderPlatform} ads found for order ${order.order_number}`);
        continue;
      }

      // Try to find matching ad
      let matchedAd = null;
      let attributionMethod: ConversionMatch['attribution_method'] = 'utm_match';
      let confidenceScore = 0;

      // Strategy 1: Exact match on platform_ad_id
      matchedAd = platformAds.find(
        (ad) => ad.platform_ad_id === order.utm_term
      );
      if (matchedAd) {
        confidenceScore = 1.0;
        attributionMethod = 'utm_match';
        console.log('[Attribution] Exact ID match:', order.order_number, '→', matchedAd.name);
      }

      // Strategy 2: Exact match on ad name
      if (!matchedAd) {
        matchedAd = platformAds.find(
          (ad) => ad.name.toLowerCase().trim() === utmTerm
        );
        if (matchedAd) {
          confidenceScore = 0.95;
          attributionMethod = 'ad_name_match';
          console.log('[Attribution] Exact name match:', order.order_number, '→', matchedAd.name);
        }
      }

      // Strategy 3: Partial match on ad name
      if (!matchedAd) {
        matchedAd = platformAds.find(
          (ad) => ad.name.toLowerCase().includes(utmTerm)
        );
        if (matchedAd) {
          confidenceScore = 0.8;
          attributionMethod = 'ad_name_match';
          console.log('[Attribution] Partial name match:', order.order_number, '→', matchedAd.name);
        }
      }

      // Strategy 4: Facebook Click ID (fbclid) matching
      // If order has fbclid but no match yet, use it as utm_term
      if (!matchedAd && order.fbclid && orderPlatform === 'facebook') {
        const fbclid = order.fbclid.toLowerCase().trim();
        matchedAd = platformAds.find(
          (ad) => ad.platform_ad_id === fbclid || ad.name.toLowerCase().includes(fbclid)
        );
        if (matchedAd) {
          confidenceScore = 0.75;
          attributionMethod = 'fbclid';
          console.log('[Attribution] Facebook Click ID match:', order.order_number, '→', matchedAd.name);
        }
      }

      // If we found a match, create the conversion record
      if (matchedAd) {
        const { error: conversionError } = await supabase
          .from('ad_conversions')
          .upsert(
            {
              user_id: userId,
              ad_id: matchedAd.id,
              order_id: order.id,
              platform: orderPlatform,
              conversion_value: order.total_price,
              attribution_method: attributionMethod,
              confidence_score: confidenceScore,
              converted_at: order.ordered_at,
            },
            {
              onConflict: 'order_id,ad_id',
              ignoreDuplicates: true,
            }
          );

        if (!conversionError) {
          matchCount++;
        } else {
          console.error('[Attribution] Error creating conversion:', conversionError);
        }
      } else {
        console.log('[Attribution] No match found for order:', order.order_number, 'utm_term:', utmTerm);
      }
    }

    console.log('[Attribution] Matched', matchCount, 'of', orders.length, 'orders to ads');
    return { success: true, matches: matchCount };
  } catch (error) {
    console.error('[Attribution] Exception in matching:', error);
    return {
      success: false,
      matches: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// ============================================================================
// METRICS CALCULATION
// ============================================================================

/**
 * Get conversion metrics for ads with real Shopify data
 */
export async function getAdConversionMetrics(
  userId: string,
  accountIds: string[],
  startDate: string,
  endDate: string
): Promise<AdConversionMetrics[]> {
  try {
    console.log('[Attribution] Calculating conversion metrics:', {
      userId,
      accountIds: accountIds.length,
      startDate,
      endDate,
    });

    // Get all ads for these accounts with their conversions
    const { data: adsWithConversions, error } = await supabase
      .from('ads')
      .select(
        `
        id,
        platform_ad_id,
        name,
        ad_conversions (
          id,
          conversion_value,
          converted_at,
          shopify_orders!inner (
            shopify_order_id
          )
        ),
        ad_sets!inner (
          campaign_id,
          ad_campaigns!ad_sets_campaign_id_fkey!inner (
            ad_account_id
          )
        )
      `
      )
      .in('ad_sets.ad_campaigns.ad_account_id', accountIds);

    if (error) {
      console.error('[Attribution] Error fetching ad conversions:', error);
      return [];
    }

    if (!adsWithConversions || adsWithConversions.length === 0) {
      console.log('[Attribution] No ads found');
      return [];
    }

    console.log('[Attribution] Found', adsWithConversions.length, 'ads to process');

    // Get ad metrics (clicks, spend, etc.) from ad_metrics table
    const adIds = adsWithConversions.map((ad) => ad.id);
    const { data: metrics, error: metricsError } = await supabase
      .from('ad_metrics')
      .select('entity_id, clicks, spend')
      .in('entity_id', adIds)
      .eq('entity_type', 'ad')
      .gte('date', startDate.split('T')[0])
      .lte('date', endDate.split('T')[0]);

    if (metricsError) {
      console.error('[Attribution] Error fetching ad metrics:', metricsError);
    }

    // Build metrics map
    const metricsMap = new Map<string, { clicks: number; spend: number }>();
    metrics?.forEach((m) => {
      const existing = metricsMap.get(m.entity_id) || { clicks: 0, spend: 0 };
      metricsMap.set(m.entity_id, {
        clicks: existing.clicks + (m.clicks || 0),
        spend: existing.spend + (m.spend || 0),
      });
    });

    // Calculate conversion metrics for each ad (with COGS from line items)
    const results: AdConversionMetrics[] = await Promise.all(
      adsWithConversions.map(async (ad) => {
        // Filter conversions to date range
        const allConversions = ad.ad_conversions || [];
        const conversions = allConversions.filter((c: any) => {
          const convertedAt = new Date(c.converted_at);
          const start = new Date(startDate);
          const end = new Date(endDate);
          return convertedAt >= start && convertedAt <= end;
        });

        const adMetrics = metricsMap.get(ad.id) || { clicks: 0, spend: 0 };

        const totalConversions = conversions.length;
        const conversionValue = conversions.reduce(
          (sum: number, c: any) => sum + parseFloat(c.conversion_value || 0),
          0
        );

        // Calculate COGS from attributed orders
        let totalCOGS = 0;
        const shopifyOrderIds = conversions
          .map((c: any) => c.shopify_orders?.shopify_order_id)
          .filter(Boolean);

        if (shopifyOrderIds.length > 0) {
          const { data: lineItems } = await supabase
            .from('order_line_items')
            .select('unit_cost, quantity')
            .in('shopify_order_id', shopifyOrderIds);

          if (lineItems) {
            totalCOGS = lineItems.reduce(
              (sum, item) => sum + (item.unit_cost || 0) * (item.quantity || 1),
              0
            );
          }
        }

        const averageOrderValue = totalConversions > 0 ? conversionValue / totalConversions : 0;
        const conversionRate = adMetrics.clicks > 0 ? (totalConversions / adMetrics.clicks) * 100 : 0;
        const costPerAcquisition = totalConversions > 0 ? adMetrics.spend / totalConversions : 0;
        const returnOnAdSpend = adMetrics.spend > 0 ? conversionValue / adMetrics.spend : 0;

        return {
          ad_id: ad.id,
          ad_name: ad.name,
          platform_ad_id: ad.platform_ad_id,
          total_conversions: totalConversions,
          conversion_value: conversionValue,
          total_cogs: totalCOGS,
          average_order_value: averageOrderValue,
          conversion_rate: conversionRate,
          total_clicks: adMetrics.clicks,
          total_spend: adMetrics.spend,
          cost_per_acquisition: costPerAcquisition,
          return_on_ad_spend: returnOnAdSpend,
        };
      })
    );

    console.log('[Attribution] Calculated metrics for', results.length, 'ads');
    return results;
  } catch (error) {
    console.error('[Attribution] Exception calculating metrics:', error);
    return [];
  }
}

// ============================================================================
// BULK SYNC
// ============================================================================

/**
 * GraphQL query for orders with UTM tracking data
 * Includes customer email and customAttributes which may contain UTM parameters
 */
const ORDERS_WITH_UTM_QUERY = `
  query GetOrdersWithUTM($first: Int!, $after: String, $query: String) {
    orders(first: $first, after: $after, query: $query) {
      edges {
        node {
          id
          name
          createdAt
          totalPriceSet {
            shopMoney {
              amount
              currencyCode
            }
          }
          customer {
            id
            email
          }
          customAttributes {
            key
            value
          }
          customerJourneySummary {
            firstVisit {
              landingPage
              referrerUrl
              source
              sourceType
              utmParameters {
                campaign
                content
                medium
                source
                term
              }
            }
          }
        }
        cursor
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

interface OrderWithUTM {
  id: string;
  name: string;
  createdAt: string;
  totalPriceSet: {
    shopMoney: {
      amount: string;
      currencyCode: string;
    };
  };
  customer?: {
    id: string;
    email: string;
  };
  customAttributes: Array<{
    key: string;
    value: string;
  }>;
  customerJourneySummary?: {
    firstVisit?: {
      landingPage?: string;
      referrerUrl?: string;
      source?: string;
      sourceType?: string;
      utmParameters?: {
        campaign?: string;
        content?: string;
        medium?: string;
        source?: string;
        term?: string;
      };
    };
  };
}

/**
 * Execute GraphQL query for orders with UTM data
 */
async function executeOrdersGraphQL(
  query: string,
  variables: Record<string, any>
): Promise<{ orders: { edges: Array<{ node: OrderWithUTM; cursor: string }>; pageInfo: { hasNextPage: boolean; endCursor: string } } }> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('Not authenticated');
  }

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const url = `${supabaseUrl}/functions/v1/shopify-proxy?endpoint=/graphql.json`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query,
      variables,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`GraphQL request failed (${response.status}): ${errorText}`);
  }

  const result = await response.json();

  if (result.errors) {
    throw new Error(`GraphQL error: ${result.errors[0].message}`);
  }

  if (!result.data) {
    throw new Error('No data returned from GraphQL query');
  }

  return result.data;
}

/**
 * Fetch orders from Shopify using GraphQL
 * Now uses GraphQL API instead of deprecated REST API
 */
async function fetchShopifyOrdersGraphQL(
  limit = 250,
  createdAtMin?: string
): Promise<any[]> {
  try {
    console.log('[Attribution] Fetching orders via GraphQL');

    const allOrders: any[] = [];
    let hasNextPage = true;
    let cursor: string | null = null;

    // Build query string for date filtering
    let queryString = '';
    if (createdAtMin) {
      const minDate = new Date(createdAtMin).toISOString().split('T')[0];
      queryString = `created_at:>='${minDate}'`;
    }

    while (hasNextPage && allOrders.length < limit) {
      const variables: any = {
        first: Math.min(250, limit - allOrders.length),
        after: cursor,
      };

      if (queryString) {
        variables.query = queryString;
      }

      const response = await executeOrdersGraphQL(ORDERS_WITH_UTM_QUERY, variables);

      const orders = response.orders.edges.map(edge => {
        const node = edge.node;

        // Extract UTM parameters from customerJourneySummary if available
        const utmParams = node.customerJourneySummary?.firstVisit?.utmParameters || {};
        const landingPage = node.customerJourneySummary?.firstVisit?.landingPage || '';
        const referrerUrl = node.customerJourneySummary?.firstVisit?.referrerUrl || '';

        // Also check customAttributes for UTM data (fallback)
        const customAttrs: Record<string, string> = {};
        node.customAttributes?.forEach(attr => {
          if (attr.key.startsWith('utm_')) {
            customAttrs[attr.key] = attr.value;
          }
        });

        return {
          id: node.id.replace('gid://shopify/Order/', ''),
          name: node.name,
          created_at: node.createdAt,
          total_price: node.totalPriceSet.shopMoney.amount,
          currency: node.totalPriceSet.shopMoney.currencyCode,
          customer: node.customer,
          email: node.customer?.email,
          landing_site: landingPage,
          referring_site: referrerUrl,
          // Combine UTM from journey summary and custom attributes
          utm_source: utmParams.source || customAttrs.utm_source,
          utm_medium: utmParams.medium || customAttrs.utm_medium,
          utm_campaign: utmParams.campaign || customAttrs.utm_campaign,
          utm_term: utmParams.term || customAttrs.utm_term,
          utm_content: utmParams.content || customAttrs.utm_content,
        };
      });

      allOrders.push(...orders);
      hasNextPage = response.orders.pageInfo.hasNextPage;
      cursor = response.orders.pageInfo.endCursor;
    }

    console.log('[Attribution] Fetched', allOrders.length, 'orders via GraphQL');
    return allOrders;
  } catch (error) {
    console.error('[Attribution] Error fetching Shopify orders via GraphQL:', error);
    throw error;
  }
}

/**
 * Sync all Shopify orders for a user
 * This should be called periodically or when user clicks "Sync"
 */
export async function syncShopifyOrders(
  userId: string,
  daysBack = 30
): Promise<{ success: boolean; synced: number; matched: number; error?: string }> {
  try {
    console.log('[Attribution] Starting Shopify orders sync for user:', userId);
    console.log('[Attribution] Syncing orders from last', daysBack, 'days');

    // Calculate date range
    const now = new Date();
    const startDate = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);
    const createdAtMin = startDate.toISOString();

    // Fetch orders from Shopify using GraphQL
    const orders = await fetchShopifyOrdersGraphQL(250, createdAtMin);
    console.log('[Attribution] Fetched', orders.length, 'orders from Shopify');

    if (orders.length === 0) {
      return { success: true, synced: 0, matched: 0 };
    }

    let syncedCount = 0;

    // Process each order
    for (const order of orders) {
      const orderData: ShopifyOrderData = {
        shopify_order_id: order.id.toString(),
        order_number: order.name,
        total_price: parseFloat(order.total_price),
        currency: order.currency,
        customer_email: order.customer?.email || order.email,
        landing_site: order.landing_site,
        referring_site: order.referring_site,
        ordered_at: order.created_at,
      };

      const result = await trackShopifyOrder(userId, orderData);
      if (result.success) {
        syncedCount++;
      }
    }

    console.log('[Attribution] Synced', syncedCount, 'orders');

    // Now match orders to ads
    const endDate = now.toISOString();
    const matchResult = await matchOrdersToAds(userId, createdAtMin, endDate);

    console.log('[Attribution] Matched', matchResult.matches, 'orders to ads');

    return {
      success: true,
      synced: syncedCount,
      matched: matchResult.matches,
    };
  } catch (error) {
    console.error('[Attribution] Exception syncing orders:', error);
    return {
      success: false,
      synced: 0,
      matched: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
