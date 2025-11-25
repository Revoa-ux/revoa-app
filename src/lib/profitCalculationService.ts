import { supabase } from './supabase';

export interface ProfitMetrics {
  totalRevenue: number;
  totalCOGS: number;
  totalAdSpend: number;
  totalProfit: number;
  profitMargin: number;
  roas: number;
  netROAS: number;
}

export interface AdProfitBreakdown {
  adId: string;
  adName: string;
  platform: string;
  revenue: number;
  cogs: number;
  adSpend: number;
  profit: number;
  profitMargin: number;
  roas: number;
  netROAS: number;
  conversions: number;
}

/**
 * Calculate profit metrics by integrating Shopify COGS with ad performance
 */
export async function calculateProfitMetrics(
  userId: string,
  startDate: string,
  endDate: string
): Promise<ProfitMetrics> {
  try {
    // Get all ad accounts for the user
    const { data: adAccounts, error: accountsError } = await supabase
      .from('ad_accounts')
      .select('id')
      .eq('user_id', userId);

    if (accountsError) throw accountsError;

    if (!adAccounts || adAccounts.length === 0) {
      return getEmptyProfitMetrics();
    }

    const accountIds = adAccounts.map(acc => acc.id);

    // Get ad campaigns for these accounts
    const { data: campaigns, error: campaignsError } = await supabase
      .from('ad_campaigns')
      .select('id')
      .in('ad_account_id', accountIds);

    if (campaignsError) throw campaignsError;

    if (!campaigns || campaigns.length === 0) {
      return getEmptyProfitMetrics();
    }

    const campaignIds = campaigns.map(c => c.id);

    // Get campaign-level metrics for ad spend
    const { data: metrics, error: metricsError } = await supabase
      .from('ad_metrics')
      .select('spend, conversions, conversion_value')
      .eq('entity_type', 'campaign')
      .in('entity_id', campaignIds)
      .gte('date', startDate)
      .lte('date', endDate);

    if (metricsError) throw metricsError;

    const totalAdSpend = metrics?.reduce((sum, m) => sum + (m.spend || 0), 0) || 0;
    const totalConversions = metrics?.reduce((sum, m) => sum + (m.conversions || 0), 0) || 0;
    const totalRevenue = metrics?.reduce((sum, m) => sum + (m.conversion_value || 0), 0) || 0;

    // Get COGS from attributed orders via ad_conversions
    const { data: attributedOrders, error: ordersError } = await supabase
      .from('ad_conversions')
      .select(`
        conversion_value,
        shopify_orders!inner(
          shopify_order_id
        )
      `)
      .eq('user_id', userId)
      .gte('converted_at', startDate)
      .lte('converted_at', endDate);

    if (ordersError) {
      console.error('[ProfitService] Error fetching attributed orders:', ordersError);
    }

    // Calculate COGS from line items
    let totalCOGS = 0;
    if (attributedOrders && attributedOrders.length > 0) {
      // Get unique Shopify order IDs
      const shopifyOrderIds = [...new Set(
        attributedOrders
          .map(conv => conv.shopify_orders?.shopify_order_id)
          .filter(Boolean)
      )];

      if (shopifyOrderIds.length > 0) {
        // Fetch line items for these orders
        const { data: lineItems } = await supabase
          .from('order_line_items')
          .select('shopify_order_id, unit_cost, quantity')
          .in('shopify_order_id', shopifyOrderIds);

        if (lineItems) {
          lineItems.forEach((item: any) => {
            const unitCost = item.unit_cost || 0;
            const quantity = item.quantity || 1;
            totalCOGS += unitCost * quantity;
          });
        }
      }
    }

    // Calculate profit metrics
    const totalProfit = totalRevenue - totalCOGS - totalAdSpend;
    const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
    const roas = totalAdSpend > 0 ? totalRevenue / totalAdSpend : 0;
    const netROAS = totalAdSpend > 0 ? totalProfit / totalAdSpend : 0;

    return {
      totalRevenue,
      totalCOGS,
      totalAdSpend,
      totalProfit,
      profitMargin,
      roas,
      netROAS
    };
  } catch (error) {
    console.error('[ProfitService] Error calculating profit metrics:', error);
    return getEmptyProfitMetrics();
  }
}

/**
 * Calculate profit breakdown per ad creative
 */
export async function calculateAdProfitBreakdown(
  userId: string,
  startDate: string,
  endDate: string
): Promise<AdProfitBreakdown[]> {
  try {
    // Get all ad accounts for the user
    const { data: adAccounts, error: accountsError } = await supabase
      .from('ad_accounts')
      .select('id, platform')
      .eq('user_id', userId);

    if (accountsError) throw accountsError;

    if (!adAccounts || adAccounts.length === 0) {
      return [];
    }

    const accountIds = adAccounts.map(acc => acc.id);

    // Get campaigns
    const { data: campaigns, error: campaignsError } = await supabase
      .from('ad_campaigns')
      .select('id, ad_account_id')
      .in('ad_account_id', accountIds);

    if (campaignsError) throw campaignsError;

    if (!campaigns || campaigns.length === 0) {
      return [];
    }

    const campaignIds = campaigns.map(c => c.id);

    // Get ad sets
    const { data: adSets, error: adSetsError } = await supabase
      .from('ad_sets')
      .select('id, campaign_id')
      .in('campaign_id', campaignIds);

    if (adSetsError) throw adSetsError;

    if (!adSets || adSets.length === 0) {
      return [];
    }

    const adSetIds = adSets.map(s => s.id);

    // Get ads
    const { data: ads, error: adsError } = await supabase
      .from('ads')
      .select('id, name, ad_set_id, platform')
      .in('ad_set_id', adSetIds);

    if (adsError) throw adsError;

    if (!ads || ads.length === 0) {
      return [];
    }

    // Get ad-level metrics
    const adIds = ads.map(a => a.id);
    const { data: metrics, error: metricsError } = await supabase
      .from('ad_metrics')
      .select('entity_id, spend, conversions, conversion_value')
      .eq('entity_type', 'ad')
      .in('entity_id', adIds)
      .gte('date', startDate)
      .lte('date', endDate);

    if (metricsError) throw metricsError;

    // Aggregate metrics by ad
    const adMetricsMap = new Map<string, { spend: number; conversions: number; revenue: number }>();
    metrics?.forEach(m => {
      const existing = adMetricsMap.get(m.entity_id) || { spend: 0, conversions: 0, revenue: 0 };
      adMetricsMap.set(m.entity_id, {
        spend: existing.spend + (m.spend || 0),
        conversions: existing.conversions + (m.conversions || 0),
        revenue: existing.revenue + (m.conversion_value || 0)
      });
    });

    // Get COGS for each ad from attributed orders
    const adCOGSMap = new Map<string, number>();

    for (const ad of ads) {
      const { data: attributions, error: attribError } = await supabase
        .from('ad_conversions')
        .select(`
          conversion_value,
          shopify_orders!inner(
            shopify_order_id
          )
        `)
        .eq('ad_id', ad.id)
        .gte('converted_at', startDate)
        .lte('converted_at', endDate);

      if (!attribError && attributions && attributions.length > 0) {
        let adCOGS = 0;

        // Get unique Shopify order IDs
        const shopifyOrderIds = [...new Set(
          attributions
            .map(conv => conv.shopify_orders?.shopify_order_id)
            .filter(Boolean)
        )];

        if (shopifyOrderIds.length > 0) {
          // Fetch line items for these orders
          const { data: lineItems } = await supabase
            .from('order_line_items')
            .select('shopify_order_id, unit_cost, quantity')
            .in('shopify_order_id', shopifyOrderIds);

          if (lineItems) {
            lineItems.forEach((item: any) => {
              const unitCost = item.unit_cost || 0;
              const quantity = item.quantity || 1;
              adCOGS += unitCost * quantity;
            });
          }
        }

        adCOGSMap.set(ad.id, adCOGS);
      }
    }

    // Build profit breakdown
    const profitBreakdown: AdProfitBreakdown[] = ads.map(ad => {
      const adMetrics = adMetricsMap.get(ad.id) || { spend: 0, conversions: 0, revenue: 0 };
      const cogs = adCOGSMap.get(ad.id) || 0;
      const profit = adMetrics.revenue - cogs - adMetrics.spend;
      const profitMargin = adMetrics.revenue > 0 ? (profit / adMetrics.revenue) * 100 : 0;
      const roas = adMetrics.spend > 0 ? adMetrics.revenue / adMetrics.spend : 0;
      const netROAS = adMetrics.spend > 0 ? profit / adMetrics.spend : 0;

      return {
        adId: ad.id,
        adName: ad.name,
        platform: ad.platform || 'facebook',
        revenue: adMetrics.revenue,
        cogs,
        adSpend: adMetrics.spend,
        profit,
        profitMargin,
        roas,
        netROAS,
        conversions: adMetrics.conversions
      };
    });

    return profitBreakdown.filter(p => p.adSpend > 0 || p.conversions > 0);
  } catch (error) {
    console.error('[ProfitService] Error calculating ad profit breakdown:', error);
    return [];
  }
}

/**
 * Update ad_metrics table with profit calculations
 */
export async function updateAdMetricsWithProfit(
  userId: string,
  startDate: string,
  endDate: string
): Promise<{ updated: number; error?: string }> {
  try {
    const profitBreakdown = await calculateAdProfitBreakdown(userId, startDate, endDate);

    let updated = 0;
    for (const breakdown of profitBreakdown) {
      const { error } = await supabase
        .from('ad_metrics')
        .update({
          profit: breakdown.profit,
          profit_margin: breakdown.profitMargin,
          cogs: breakdown.cogs
        })
        .eq('entity_type', 'ad')
        .eq('entity_id', breakdown.adId)
        .gte('date', startDate)
        .lte('date', endDate);

      if (!error) {
        updated++;
      }
    }

    return { updated };
  } catch (error: any) {
    console.error('[ProfitService] Error updating ad metrics with profit:', error);
    return { updated: 0, error: error.message };
  }
}

function getEmptyProfitMetrics(): ProfitMetrics {
  return {
    totalRevenue: 0,
    totalCOGS: 0,
    totalAdSpend: 0,
    totalProfit: 0,
    profitMargin: 0,
    roas: 0,
    netROAS: 0
  };
}
