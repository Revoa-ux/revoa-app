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
 * Match orders to ads based on UTM term
 *
 * This is the core matching logic. We try multiple strategies:
 * 1. Exact match on utm_term = platform_ad_id
 * 2. Exact match on utm_term = ad name
 * 3. Partial match on ad name contains utm_term
 * 4. Facebook click ID (fbclid) matching via CAPI data
 */
export async function matchOrdersToAds(
  userId: string,
  startDate?: string,
  endDate?: string
): Promise<{ success: boolean; matches: number; error?: string }> {
  try {
    console.log('[Attribution] Starting conversion matching for user:', userId);

    // Get unmatched orders in date range
    let ordersQuery = supabase
      .from('shopify_orders')
      .select('*')
      .eq('user_id', userId)
      .is('utm_source', 'facebook') // Start with Facebook ads only
      .not('utm_term', 'is', null);

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

    // Get all ads for this user
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

      // Try to find matching ad
      let matchedAd = null;
      let attributionMethod: ConversionMatch['attribution_method'] = 'utm_match';
      let confidenceScore = 0;

      // Strategy 1: Exact match on platform_ad_id
      matchedAd = ads.find(
        (ad) => ad.platform_ad_id === order.utm_term
      );
      if (matchedAd) {
        confidenceScore = 1.0;
        attributionMethod = 'utm_match';
        console.log('[Attribution] Exact ID match:', order.order_number, '→', matchedAd.name);
      }

      // Strategy 2: Exact match on ad name
      if (!matchedAd) {
        matchedAd = ads.find(
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
        matchedAd = ads.find(
          (ad) => ad.name.toLowerCase().includes(utmTerm)
        );
        if (matchedAd) {
          confidenceScore = 0.8;
          attributionMethod = 'ad_name_match';
          console.log('[Attribution] Partial name match:', order.order_number, '→', matchedAd.name);
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
              platform: 'facebook',
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
        ad_conversions!inner (
          id,
          conversion_value,
          converted_at
        ),
        ad_sets!inner (
          campaign_id,
          ad_campaigns!inner (
            ad_account_id
          )
        )
      `
      )
      .in('ad_sets.ad_campaigns.ad_account_id', accountIds)
      .gte('ad_conversions.converted_at', startDate)
      .lte('ad_conversions.converted_at', endDate);

    if (error) {
      console.error('[Attribution] Error fetching ad conversions:', error);
      return [];
    }

    if (!adsWithConversions || adsWithConversions.length === 0) {
      console.log('[Attribution] No ads with conversions found');
      return [];
    }

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

    // Calculate conversion metrics for each ad
    const results: AdConversionMetrics[] = adsWithConversions.map((ad) => {
      const conversions = ad.ad_conversions || [];
      const adMetrics = metricsMap.get(ad.id) || { clicks: 0, spend: 0 };

      const totalConversions = conversions.length;
      const conversionValue = conversions.reduce(
        (sum: number, c: any) => sum + parseFloat(c.conversion_value || 0),
        0
      );
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
        average_order_value: averageOrderValue,
        conversion_rate: conversionRate,
        total_clicks: adMetrics.clicks,
        total_spend: adMetrics.spend,
        cost_per_acquisition: costPerAcquisition,
        return_on_ad_spend: returnOnAdSpend,
      };
    });

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
 * Fetch orders from Shopify REST API
 * The REST API includes landing_site and referring_site which contain UTM parameters
 */
async function fetchShopifyOrdersREST(
  limit = 250,
  createdAtMin?: string
): Promise<any[]> {
  try {
    // Build query parameters
    const params = new URLSearchParams({
      limit: Math.min(limit, 250).toString(),
      status: 'any',
      fields: 'id,name,created_at,total_price,currency,customer,landing_site,referring_site,email',
    });

    if (createdAtMin) {
      params.append('created_at_min', createdAtMin);
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error('Not authenticated');
    }

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const url = `${supabaseUrl}/functions/v1/shopify-proxy?endpoint=/admin/api/2024-01/orders.json&${params.toString()}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Shopify API error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    return data.orders || [];
  } catch (error) {
    console.error('[Attribution] Error fetching Shopify orders:', error);
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

    // Fetch orders from Shopify REST API
    const orders = await fetchShopifyOrdersREST(250, createdAtMin);
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
