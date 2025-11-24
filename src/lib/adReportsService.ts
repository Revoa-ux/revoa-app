import { supabase } from './supabase';
import { facebookAdsService } from './facebookAds';
import { getAdConversionMetrics, syncShopifyOrders } from './attributionService';
import { calculateProfitMetrics } from './profitCalculationService';

// Function to return Facebook thumbnail URLs without modification
// Facebook CDN URLs are signed and must be used exactly as provided
function getHighQualityFacebookImageUrl(url: string): string {
  // Return URL as-is - Facebook CDN URLs are signed and any modification breaks them
  return url;
}

// Export sync function for UI to call
export { syncShopifyOrders };

export interface AdReportMetrics {
  roas: {
    name: string;
    value: number;
    change: number;
    data: Array<{ date: string; value: number }>;
  };
  cpa: {
    name: string;
    value: number;
    change: number;
    data: Array<{ date: string; value: number }>;
  };
  ctr: {
    name: string;
    value: number;
    change: number;
    data: Array<{ date: string; value: number }>;
  };
  spend: {
    name: string;
    value: number;
    change: number;
    data: Array<{ date: string; value: number }>;
  };
  conversions: {
    name: string;
    value: number;
    change: number;
    data: Array<{ date: string; value: number }>;
  };
  cvr: {
    name: string;
    value: number;
    change: number;
    data: Array<{ date: string; value: number }>;
  };
  profit: {
    name: string;
    value: number;
    change: number;
    data: Array<{ date: string; value: number }>;
  };
  netROAS: {
    name: string;
    value: number;
    change: number;
    data: Array<{ date: string; value: number }>;
  };
}

export interface CreativePerformance {
  id: string;
  type: 'image' | 'video';
  url: string;
  thumbnail?: string;
  videoUrl?: string;
  videoId?: string;
  headline: string;
  description: string;
  adCopy: string;
  ctaText: string;
  metrics: {
    impressions: number;
    clicks: number;
    ctr: number;
    cpa: number;
    spend: number;
    conversions: number;
    cvr?: number;
    roas: number;
    cpc: number;
    profit?: number;
    profitMargin?: number;
    netROAS?: number;
  };
  performance: 'high' | 'medium' | 'low';
  fatigueScore: number;
  adName: string;
  platform: string;
  adAccountId?: string;
  hasRealConversionData?: boolean;
  pageProfile: {
    name: string;
    imageUrl: string;
  };
}

/**
 * Fetch ad performance metrics for reports
 */
export async function getAdReportsMetrics(
  startDate: string,
  endDate: string
): Promise<AdReportMetrics> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Get user's ad accounts
    const accounts = await facebookAdsService.getAdAccounts('facebook');
    if (accounts.length === 0) {
      return getEmptyMetrics();
    }

    const accountIds = accounts.map(acc => acc.id);

    // Get all campaigns for these accounts
    const { data: campaigns, error: campaignsError } = await supabase
      .from('ad_campaigns')
      .select('id')
      .in('ad_account_id', accountIds);

    if (campaignsError) throw campaignsError;

    if (!campaigns || campaigns.length === 0) {
      return getEmptyMetrics();
    }

    const campaignIds = campaigns.map(c => c.id);

    // Fetch campaign-level metrics (to avoid double-counting from ad sets)
    const { data: metrics, error } = await supabase
      .from('ad_metrics')
      .select('*')
      .eq('entity_type', 'campaign')
      .in('entity_id', campaignIds)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: true });

    if (error) throw error;

    if (!metrics || metrics.length === 0) {
      return getEmptyMetrics();
    }

    // Calculate aggregated metrics
    const totalSpend = metrics.reduce((sum, m) => sum + (m.spend || 0), 0);
    const totalConversions = metrics.reduce((sum, m) => sum + (m.conversions || 0), 0);
    const totalConversionValue = metrics.reduce((sum, m) => sum + (m.conversion_value || 0), 0);
    const totalClicks = metrics.reduce((sum, m) => sum + (m.clicks || 0), 0);
    const totalImpressions = metrics.reduce((sum, m) => sum + (m.impressions || 0), 0);

    const avgROAS = totalSpend > 0 ? totalConversionValue / totalSpend : 0;
    const avgCPA = totalConversions > 0 ? totalSpend / totalConversions : 0;
    const avgCTR = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;

    // Group by date for time series
    const dateMetrics = new Map<string, { spend: number; conversions: number; value: number; clicks: number; impressions: number }>();
    metrics.forEach(m => {
      const existing = dateMetrics.get(m.date) || { spend: 0, conversions: 0, value: 0, clicks: 0, impressions: 0 };
      dateMetrics.set(m.date, {
        spend: existing.spend + (m.spend || 0),
        conversions: existing.conversions + (m.conversions || 0),
        value: existing.value + (m.conversion_value || 0),
        clicks: existing.clicks + (m.clicks || 0),
        impressions: existing.impressions + (m.impressions || 0)
      });
    });

    const roasData = Array.from(dateMetrics.entries()).map(([date, m]) => ({
      date,
      value: m.spend > 0 ? m.value / m.spend : 0
    }));

    const cpaData = Array.from(dateMetrics.entries()).map(([date, m]) => ({
      date,
      value: m.conversions > 0 ? m.spend / m.conversions : 0
    }));

    const ctrData = Array.from(dateMetrics.entries()).map(([date, m]) => ({
      date,
      value: m.impressions > 0 ? (m.clicks / m.impressions) * 100 : 0
    }));

    const spendData = Array.from(dateMetrics.entries()).map(([date, m]) => ({
      date,
      value: m.spend
    }));

    const conversionsData = Array.from(dateMetrics.entries()).map(([date, m]) => ({
      date,
      value: m.conversions
    }));

    const cvrData = Array.from(dateMetrics.entries()).map(([date, m]) => ({
      date,
      value: m.clicks > 0 ? (m.conversions / m.clicks) * 100 : 0
    }));

    const avgCVR = totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0;

    // Get profit metrics
    const profitMetrics = await calculateProfitMetrics(user.id, startDate, endDate);

    // Calculate profit data points by date
    const profitData = Array.from(dateMetrics.entries()).map(([date, m]) => {
      const dayRevenue = m.value;
      const daySpend = m.spend;
      const dayCOGS = dayRevenue * (profitMetrics.totalCOGS / profitMetrics.totalRevenue || 0);
      return {
        date,
        value: dayRevenue - dayCOGS - daySpend
      };
    });

    const netROASData = Array.from(dateMetrics.entries()).map(([date, m]) => {
      const dayRevenue = m.value;
      const daySpend = m.spend;
      const dayCOGS = dayRevenue * (profitMetrics.totalCOGS / profitMetrics.totalRevenue || 0);
      const dayProfit = dayRevenue - dayCOGS - daySpend;
      return {
        date,
        value: daySpend > 0 ? dayProfit / daySpend : 0
      };
    });

    return {
      roas: {
        name: 'ROAS',
        value: avgROAS,
        change: 0, // TODO: Calculate vs previous period
        data: roasData
      },
      cpa: {
        name: 'CPA',
        value: avgCPA,
        change: 0, // TODO: Calculate vs previous period
        data: cpaData
      },
      ctr: {
        name: 'CTR',
        value: avgCTR,
        change: 0, // TODO: Calculate vs previous period
        data: ctrData
      },
      spend: {
        name: 'Spend',
        value: totalSpend,
        change: 0, // TODO: Calculate vs previous period
        data: spendData
      },
      conversions: {
        name: 'Conversions',
        value: totalConversions,
        change: 0, // TODO: Calculate vs previous period
        data: conversionsData
      },
      cvr: {
        name: 'CVR',
        value: avgCVR,
        change: 0, // TODO: Calculate vs previous period
        data: cvrData
      },
      profit: {
        name: 'Profit',
        value: profitMetrics.totalProfit,
        change: 0, // TODO: Calculate vs previous period
        data: profitData
      },
      netROAS: {
        name: 'Net ROAS',
        value: profitMetrics.netROAS,
        change: 0, // TODO: Calculate vs previous period
        data: netROASData
      }
    };
  } catch (error) {
    console.error('[AdReportsService] Error fetching metrics:', error);
    return getEmptyMetrics();
  }
}

/**
 * Fetch creative performance data with REAL conversion data from Shopify
 */
export async function getCreativePerformance(
  startDate: string,
  endDate: string
): Promise<CreativePerformance[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    console.log('[AdReportsService] === FETCHING CREATIVE PERFORMANCE WITH ATTRIBUTION ===');
    console.log('[AdReportsService] Date range:', { startDate, endDate });

    // Get user's ad accounts
    const accounts = await facebookAdsService.getAdAccounts('facebook');
    if (accounts.length === 0) {
      console.log('[AdReportsService] No ad accounts found');
      return [];
    }

    const accountIds = accounts.map(acc => acc.id);
    console.log('[AdReportsService] Found', accountIds.length, 'ad accounts');

    // Get campaigns for these accounts
    const { data: campaigns, error: campaignsError } = await supabase
      .from('ad_campaigns')
      .select('id')
      .in('ad_account_id', accountIds);

    if (campaignsError) throw campaignsError;

    if (!campaigns || campaigns.length === 0) {
      console.log('[AdReportsService] No campaigns found');
      return [];
    }

    const campaignIds = campaigns.map(c => c.id);

    // Get ad sets for these campaigns
    const { data: adSets, error: adSetsError } = await supabase
      .from('ad_sets')
      .select('id')
      .in('campaign_id', campaignIds);

    if (adSetsError) throw adSetsError;

    if (!adSets || adSets.length === 0) {
      console.log('[AdReportsService] No ad sets found');
      return [];
    }

    const adSetIds = adSets.map(s => s.id);

    // Fetch ads for these ad sets with ad account info
    const { data: ads, error } = await supabase
      .from('ads')
      .select(`
        *,
        ad_account:ad_accounts!ad_account_id(platform_account_id)
      `)
      .in('ad_set_id', adSetIds);

    if (error) throw error;

    if (!ads || ads.length === 0) {
      console.log('[AdReportsService] No ads found');
      return [];
    }

    console.log('[AdReportsService] Found', ads.length, 'ads');

    // Fetch metrics for these ads (clicks, impressions, spend from Facebook)
    const adIds = ads.map(ad => ad.id);
    const { data: metrics, error: metricsError } = await supabase
      .from('ad_metrics')
      .select('*')
      .eq('entity_type', 'ad')
      .in('entity_id', adIds)
      .gte('date', startDate)
      .lte('date', endDate);

    if (metricsError) throw metricsError;

    // IMPORTANT: Get REAL conversion data from our attribution system
    console.log('[AdReportsService] Fetching real conversion data from attribution system...');
    const attributionMetrics = await getAdConversionMetrics(
      user.id,
      accountIds,
      startDate,
      endDate
    );

    console.log('[AdReportsService] Attribution system returned', attributionMetrics.length, 'ads with conversions');

    // Create a map of attribution metrics by ad_id
    const attributionMap = new Map(
      attributionMetrics.map(m => [m.ad_id, m])
    );

    // Aggregate metrics by ad
    const adMetricsMap = new Map<string, typeof metrics[0][]>();
    metrics?.forEach(m => {
      const existing = adMetricsMap.get(m.entity_id) || [];
      existing.push(m);
      adMetricsMap.set(m.entity_id, existing);
    });

    // Transform to creative performance format
    const creatives: CreativePerformance[] = ads.map(ad => {
      const adMetrics = adMetricsMap.get(ad.id) || [];
      const totalSpend = adMetrics.reduce((sum, m) => sum + (m.spend || 0), 0);
      const totalImpressions = adMetrics.reduce((sum, m) => sum + (m.impressions || 0), 0);
      const totalClicks = adMetrics.reduce((sum, m) => sum + (m.clicks || 0), 0);

      // Use REAL conversion data from attribution system if available
      const attribution = attributionMap.get(ad.id);
      const totalConversions = attribution?.total_conversions || 0;
      const totalValue = attribution?.conversion_value || 0;
      const conversionRate = attribution?.conversion_rate || 0;

      const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
      const cpa = totalConversions > 0 ? totalSpend / totalConversions : 0;
      const cpc = totalClicks > 0 ? totalSpend / totalClicks : 0;
      const roas = totalSpend > 0 ? totalValue / totalSpend : 0;

      // Calculate profit metrics (revenue - COGS - ad spend)
      // Estimate COGS at 40% of revenue if not available
      const estimatedCOGS = totalValue * 0.4;
      const profit = totalValue - estimatedCOGS - totalSpend;
      const profitMargin = totalValue > 0 ? (profit / totalValue) * 100 : 0;
      const netROAS = totalSpend > 0 ? profit / totalSpend : 0;

      // Determine performance level based on ROAS
      let performance: 'high' | 'medium' | 'low' = 'low';
      if (roas >= 2.5) performance = 'high';
      else if (roas >= 1.5) performance = 'medium';

      // Calculate fatigue score (0-100, higher = more fatigued)
      // Based on declining CTR over time
      const fatigueScore = Math.min(100, Math.max(0, 100 - (ctr * 20)));

      // Extract creative info from creative_data if available
      const creativeData = ad.creative_data || {};
      const isVideo = ad.creative_type === 'video' || creativeData.video_id;

      // Get high-quality URLs by removing Facebook's size parameters
      const rawThumbnail = creativeData.video_thumbnail || creativeData.thumbnail_url || ad.creative_thumbnail_url || '';
      const thumbnailUrl = getHighQualityFacebookImageUrl(rawThumbnail);

      const rawImageUrl = creativeData.image_url || ad.creative_thumbnail_url || '';
      const imageUrl = getHighQualityFacebookImageUrl(rawImageUrl);

      // Build proper media URL
      // For videos: use video_url if available, fallback to high-quality thumbnail
      // For images: use image_url or thumbnail
      const mediaUrl = isVideo
        ? (creativeData.video_url || thumbnailUrl)
        : imageUrl;

      return {
        id: ad.platform_ad_id,
        type: isVideo ? 'video' : 'image',
        url: mediaUrl,
        videoUrl: creativeData.video_url || undefined,
        videoId: creativeData.video_id || undefined,
        thumbnail: thumbnailUrl,
        headline: creativeData.title || '',
        description: creativeData.body || '',
        adCopy: creativeData.body || '',
        ctaText: creativeData.call_to_action || '',
        metrics: {
          impressions: totalImpressions,
          clicks: totalClicks,
          ctr,
          cpa,
          spend: totalSpend,
          conversions: totalConversions, // REAL DATA from Shopify!
          cvr: conversionRate, // REAL CVR from Shopify!
          roas,  // REAL ROAS based on actual order values!
          cpc,
          profit, // Net profit after COGS and ad spend
          profitMargin, // Profit margin percentage
          netROAS // Profit / Ad Spend ratio
        },
        performance,
        fatigueScore,
        adName: ad.name,
        platform: ad.platform || 'facebook',
        adAccountId: ad.ad_account?.platform_account_id || undefined,
        hasRealConversionData: !!attribution, // Flag to show user which ads have real data
        pageProfile: {
          name: 'Facebook Page',
          imageUrl: ''
        }
      };
    });

    const adsWithRealData = creatives.filter(c => c.hasRealConversionData).length;
    console.log('[AdReportsService] ✓ Returned', creatives.length, 'ads (' + adsWithRealData + ' with real conversion data)');

    return creatives;
  } catch (error) {
    console.error('[AdReportsService] Error fetching creative performance:', error);
    return [];
  }
}

function getEmptyMetrics(): AdReportMetrics {
  return {
    roas: {
      name: 'ROAS',
      value: 0,
      change: 0,
      data: []
    },
    cpa: {
      name: 'CPA',
      value: 0,
      change: 0,
      data: []
    },
    ctr: {
      name: 'CTR',
      value: 0,
      change: 0,
      data: []
    },
    spend: {
      name: 'Spend',
      value: 0,
      change: 0,
      data: []
    },
    conversions: {
      name: 'Conversions',
      value: 0,
      change: 0,
      data: []
    },
    cvr: {
      name: 'CVR',
      value: 0,
      change: 0,
      data: []
    },
    profit: {
      name: 'Profit',
      value: 0,
      change: 0,
      data: []
    },
    netROAS: {
      name: 'Net ROAS',
      value: 0,
      change: 0,
      data: []
    }
  };
}

/**
 * Fetch campaigns with aggregated metrics
 */
export async function getCampaignPerformance(
  startDate: string,
  endDate: string
): Promise<any[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Get user's ad accounts
    const accounts = await facebookAdsService.getAdAccounts('facebook');
    if (accounts.length === 0) {
      return [];
    }

    const accountIds = accounts.map(acc => acc.id);

    // Get all campaigns for these accounts
    const { data: campaigns, error: campaignsError } = await supabase
      .from('ad_campaigns')
      .select('*')
      .in('ad_account_id', accountIds);

    if (campaignsError) throw campaignsError;

    if (!campaigns || campaigns.length === 0) {
      return [];
    }

    const campaignIds = campaigns.map(c => c.id);

    // Fetch campaign-level metrics
    const { data: metrics, error: metricsError } = await supabase
      .from('ad_metrics')
      .select('*')
      .eq('entity_type', 'campaign')
      .in('entity_id', campaignIds)
      .gte('date', startDate)
      .lte('date', endDate);

    if (metricsError) throw metricsError;

    // Group metrics by campaign
    const campaignMetrics = new Map<string, any>();

    metrics?.forEach(m => {
      const existing = campaignMetrics.get(m.entity_id) || {
        spend: 0,
        impressions: 0,
        clicks: 0,
        conversions: 0,
        conversion_value: 0
      };

      campaignMetrics.set(m.entity_id, {
        spend: existing.spend + (m.spend || 0),
        impressions: existing.impressions + (m.impressions || 0),
        clicks: existing.clicks + (m.clicks || 0),
        conversions: existing.conversions + (m.conversions || 0),
        conversion_value: existing.conversion_value + (m.conversion_value || 0)
      });
    });

    // Get profit data for conversion tracking
    const profitMetrics = await calculateProfitMetrics(user.id, startDate, endDate);
    const cogsRatio = profitMetrics.totalRevenue > 0 ? profitMetrics.totalCOGS / profitMetrics.totalRevenue : 0;

    // Map campaigns with their metrics
    const campaignsWithMetrics = campaigns.map(campaign => {
      const m = campaignMetrics.get(campaign.id) || {
        spend: 0,
        impressions: 0,
        clicks: 0,
        conversions: 0,
        conversion_value: 0
      };

      const ctr = m.impressions > 0 ? (m.clicks / m.impressions) * 100 : 0;
      const cpa = m.conversions > 0 ? m.spend / m.conversions : 0;
      const roas = m.spend > 0 ? m.conversion_value / m.spend : 0;
      const cogs = m.conversion_value * cogsRatio;
      const profit = m.conversion_value - cogs - m.spend;
      const profitMargin = m.conversion_value > 0 ? (profit / m.conversion_value) * 100 : 0;
      const netROAS = m.spend > 0 ? profit / m.spend : 0;

      // Determine performance rating
      let performance: 'high' | 'medium' | 'low' = 'medium';
      if (netROAS > 1) performance = 'high';
      else if (netROAS < 0) performance = 'low';

      return {
        id: campaign.id,
        name: campaign.name,
        adName: campaign.name, // Add for table compatibility
        status: campaign.status,
        platform: campaign.platform || 'facebook',
        objective: campaign.objective,
        budget: campaign.daily_budget || campaign.lifetime_budget,
        campaignId: campaign.id,
        metrics: {
          impressions: Math.round(m.impressions),
          clicks: Math.round(m.clicks),
          ctr: parseFloat(ctr.toFixed(2)),
          spend: parseFloat(m.spend.toFixed(2)),
          conversions: Math.round(m.conversions),
          cpa: parseFloat(cpa.toFixed(2)),
          roas: parseFloat(roas.toFixed(2)),
          profit: parseFloat(profit.toFixed(2)),
          profitMargin: parseFloat(profitMargin.toFixed(2)),
          netROAS: parseFloat(netROAS.toFixed(2))
        },
        performance,
        fatigueScore: 0 // Campaigns don't have fatigue scores
      };
    });

    return campaignsWithMetrics;
  } catch (error) {
    console.error('[adReportsService] Error fetching campaign performance:', error);
    return [];
  }
}

/**
 * Fetch ad sets with aggregated metrics
 */
export async function getAdSetPerformance(
  startDate: string,
  endDate: string
): Promise<any[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Get user's ad accounts
    const accounts = await facebookAdsService.getAdAccounts('facebook');
    if (accounts.length === 0) {
      return [];
    }

    const accountIds = accounts.map(acc => acc.id);

    // Get all campaigns for these accounts
    const { data: campaigns, error: campaignsError } = await supabase
      .from('ad_campaigns')
      .select('id')
      .in('ad_account_id', accountIds);

    if (campaignsError) throw campaignsError;

    if (!campaigns || campaigns.length === 0) {
      return [];
    }

    const campaignIds = campaigns.map(c => c.id);

    // Get all ad sets for these campaigns
    const { data: adSets, error: adSetsError } = await supabase
      .from('ad_sets')
      .select('*')
      .in('campaign_id', campaignIds);

    if (adSetsError) throw adSetsError;

    if (!adSets || adSets.length === 0) {
      return [];
    }

    const adSetIds = adSets.map(a => a.id);

    // Fetch ad set-level metrics
    const { data: metrics, error: metricsError } = await supabase
      .from('ad_metrics')
      .select('*')
      .eq('entity_type', 'ad_set')
      .in('entity_id', adSetIds)
      .gte('date', startDate)
      .lte('date', endDate);

    if (metricsError) throw metricsError;

    // Group metrics by ad set
    const adSetMetrics = new Map<string, any>();

    metrics?.forEach(m => {
      const existing = adSetMetrics.get(m.entity_id) || {
        spend: 0,
        impressions: 0,
        clicks: 0,
        conversions: 0,
        conversion_value: 0
      };

      adSetMetrics.set(m.entity_id, {
        spend: existing.spend + (m.spend || 0),
        impressions: existing.impressions + (m.impressions || 0),
        clicks: existing.clicks + (m.clicks || 0),
        conversions: existing.conversions + (m.conversions || 0),
        conversion_value: existing.conversion_value + (m.conversion_value || 0)
      });
    });

    // Get profit data
    const profitMetrics = await calculateProfitMetrics(user.id, startDate, endDate);
    const cogsRatio = profitMetrics.totalRevenue > 0 ? profitMetrics.totalCOGS / profitMetrics.totalRevenue : 0;

    // Map ad sets with their metrics
    const adSetsWithMetrics = adSets.map(adSet => {
      const m = adSetMetrics.get(adSet.id) || {
        spend: 0,
        impressions: 0,
        clicks: 0,
        conversions: 0,
        conversion_value: 0
      };

      const ctr = m.impressions > 0 ? (m.clicks / m.impressions) * 100 : 0;
      const cpa = m.conversions > 0 ? m.spend / m.conversions : 0;
      const roas = m.spend > 0 ? m.conversion_value / m.spend : 0;
      const cogs = m.conversion_value * cogsRatio;
      const profit = m.conversion_value - cogs - m.spend;
      const profitMargin = m.conversion_value > 0 ? (profit / m.conversion_value) * 100 : 0;
      const netROAS = m.spend > 0 ? profit / m.spend : 0;

      // Determine performance rating
      let performance: 'high' | 'medium' | 'low' = 'medium';
      if (netROAS > 1) performance = 'high';
      else if (netROAS < 0) performance = 'low';

      return {
        id: adSet.id,
        name: adSet.name,
        status: adSet.status,
        platform: adSet.platform || 'facebook',
        campaignId: adSet.campaign_id,
        targeting: adSet.targeting,
        budget: adSet.daily_budget || adSet.lifetime_budget,
        adSetId: adSet.id,
        metrics: {
          impressions: Math.round(m.impressions),
          clicks: Math.round(m.clicks),
          ctr: parseFloat(ctr.toFixed(2)),
          spend: parseFloat(m.spend.toFixed(2)),
          conversions: Math.round(m.conversions),
          cpa: parseFloat(cpa.toFixed(2)),
          roas: parseFloat(roas.toFixed(2)),
          profit: parseFloat(profit.toFixed(2)),
          profitMargin: parseFloat(profitMargin.toFixed(2)),
          netROAS: parseFloat(netROAS.toFixed(2))
        },
        performance,
        fatigueScore: 0 // Ad sets don't have fatigue scores
      };
    });

    return adSetsWithMetrics;
  } catch (error) {
    console.error('[adReportsService] Error fetching ad set performance:', error);
    return [];
  }
}
