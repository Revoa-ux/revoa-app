import { supabase } from './supabase';
import { facebookAdsService } from './facebookAds';
import { googleAdsService } from './googleAds';
import { tiktokAdsService } from './tiktokAds';
import { getAdConversionMetrics, syncShopifyOrders } from './attributionService';
import { calculateProfitMetrics } from './profitCalculationService';
import { resolveConversionValues, type ConversionSource } from './conversionValueResolver';
import { getTrackingStatus, getCogsDataQuality, type TrackingStatus } from './trackingStatusService';
import type { AdPlatform } from '../types/ads';

// Function to return Facebook thumbnail URLs without modification
// Facebook CDN URLs are signed and must be used exactly as provided
function getHighQualityFacebookImageUrl(url: string): string {
  // Return URL as-is - Facebook CDN URLs are signed and any modification breaks them
  return url;
}

// Export sync function for UI to call
export { syncShopifyOrders };

// Export tracking status functions for UI
export { getTrackingStatus, getCogsDataQuality };
export type { TrackingStatus };

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
    conversion_value?: number;
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
  conversionSource?: ConversionSource;
  pageProfile: {
    name: string;
    imageUrl: string;
  };
}

/**
 * Fetch ad performance metrics for reports
 */
export async function getAllPlatformAccounts(): Promise<{ platform: AdPlatform; accounts: any[] }[]> {
  console.log('[AdReportsService] getAllPlatformAccounts: Fetching accounts from all platforms...');

  const [facebookAccounts, googleAccounts, tiktokAccounts] = await Promise.allSettled([
    facebookAdsService.getAdAccounts('facebook'),
    googleAdsService.getAdAccounts(),
    tiktokAdsService.getAdAccounts(),
  ]);

  console.log('[AdReportsService] Account fetch results:', {
    facebook: facebookAccounts.status === 'fulfilled' ? facebookAccounts.value.length : `Error: ${(facebookAccounts as PromiseRejectedResult).reason}`,
    google: googleAccounts.status === 'fulfilled' ? googleAccounts.value.length : `Error: ${(googleAccounts as PromiseRejectedResult).reason}`,
    tiktok: tiktokAccounts.status === 'fulfilled' ? tiktokAccounts.value.length : `Error: ${(tiktokAccounts as PromiseRejectedResult).reason}`,
  });

  const results: { platform: AdPlatform; accounts: any[] }[] = [];

  if (facebookAccounts.status === 'fulfilled' && facebookAccounts.value.length > 0) {
    results.push({ platform: 'facebook', accounts: facebookAccounts.value });
  }
  if (googleAccounts.status === 'fulfilled' && googleAccounts.value.length > 0) {
    console.log('[AdReportsService] Google accounts found:', googleAccounts.value.map(a => ({ id: a.id, name: a.account_name })));
    results.push({ platform: 'google', accounts: googleAccounts.value });
  }
  if (tiktokAccounts.status === 'fulfilled' && tiktokAccounts.value.length > 0) {
    results.push({ platform: 'tiktok', accounts: tiktokAccounts.value });
  }

  console.log('[AdReportsService] Total platforms with accounts:', results.length);
  return results;
}

export async function getAdReportsMetrics(
  startDate: string,
  endDate: string
): Promise<AdReportMetrics> {
  console.log('[adReportsService] getAdReportsMetrics called with:', { startDate, endDate });

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    const platformAccounts = await getAllPlatformAccounts();
    const allAccountIds: string[] = [];

    for (const { accounts } of platformAccounts) {
      allAccountIds.push(...accounts.map(acc => acc.id));
    }

    if (allAccountIds.length === 0) {
      return getEmptyMetrics();
    }

    const { data: campaigns, error: campaignsError } = await supabase
      .from('ad_campaigns')
      .select('id')
      .in('ad_account_id', allAccountIds);

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
    console.log('[AdReportsService] User ID:', user.id);

    // Get user's ad accounts from all connected platforms
    const platformAccounts = await getAllPlatformAccounts();
    const allAccountIds: string[] = [];

    for (const { accounts } of platformAccounts) {
      allAccountIds.push(...accounts.map(acc => acc.id));
    }

    if (allAccountIds.length === 0) {
      console.log('[AdReportsService] ❌ No ad accounts found');
      return [];
    }

    const accountIds = allAccountIds;
    console.log('[AdReportsService] ✓ Found', accountIds.length, 'ad accounts');
    console.log('[AdReportsService] Account IDs:', accountIds);

    // Get campaigns for these accounts (high limit to get all)
    const { data: campaigns, error: campaignsError } = await supabase
      .from('ad_campaigns')
      .select('id, name, platform')
      .in('ad_account_id', accountIds)
      .limit(100000);

    if (campaignsError) {
      console.error('[AdReportsService] ❌ Error fetching campaigns:', campaignsError);
      throw campaignsError;
    }

    if (!campaigns || campaigns.length === 0) {
      console.log('[AdReportsService] ❌ No campaigns found for account IDs:', accountIds);
      // Check if campaigns exist at all
      const { data: allCampaigns } = await supabase
        .from('ad_campaigns')
        .select('id, ad_account_id')
        .limit(5);
      console.log('[AdReportsService] Sample campaigns in DB:', allCampaigns);
      return [];
    }

    console.log('[AdReportsService] ✓ Found', campaigns.length, 'campaigns');
    console.log('[AdReportsService] Sample campaigns:', campaigns.slice(0, 3).map(c => ({ id: c.id, name: c.name })));
    const campaignIds = campaigns.map(c => c.id);

    // Batch ad sets query to avoid URL length limit with many campaigns (351 campaigns = very long URL)
    const ADSETS_BATCH_SIZE = 100;
    let allAdSets: any[] = [];

    console.log('[AdReportsService] Fetching ad sets in batches of', ADSETS_BATCH_SIZE);

    for (let i = 0; i < campaignIds.length; i += ADSETS_BATCH_SIZE) {
      const batch = campaignIds.slice(i, i + ADSETS_BATCH_SIZE);
      const { data: batchAdSets, error: adSetsError } = await supabase
        .from('ad_sets')
        .select('id, name, ad_campaign_id')
        .in('ad_campaign_id', batch)
        .limit(100000);

      if (adSetsError) {
        console.error(`[AdReportsService] ❌ Error fetching ad sets batch ${i / ADSETS_BATCH_SIZE + 1}:`, adSetsError);
        throw adSetsError;
      }

      if (batchAdSets) {
        console.log(`[AdReportsService] Ad Sets Batch ${i / ADSETS_BATCH_SIZE + 1}: Found ${batchAdSets.length} ad sets`);
        allAdSets = allAdSets.concat(batchAdSets);
      }
    }

    const adSets = allAdSets;

    if (!adSets || adSets.length === 0) {
      console.log('[AdReportsService] ❌ No ad sets found for campaign IDs');
      console.log('[AdReportsService] Sample campaign IDs:', campaignIds.slice(0, 5));
      // Check if ad sets exist at all
      const { data: allAdSetsCheck } = await supabase
        .from('ad_sets')
        .select('id, ad_campaign_id')
        .limit(5);
      console.log('[AdReportsService] Sample ad sets in DB:', allAdSetsCheck);
      return [];
    }

    console.log('[AdReportsService] ✓ Found', adSets.length, 'total ad sets across all batches');
    console.log('[AdReportsService] Sample ad sets:', adSets.slice(0, 3).map(s => ({ id: s.id, name: s.name, campaign_id: s.ad_campaign_id })));
    const adSetIds = adSets.map(s => s.id);

    // Batch ads query to avoid URL length limit (700 ad sets = very long URL)
    const ADS_BATCH_SIZE = 100;
    let allAds: any[] = [];

    console.log('[AdReportsService] Fetching ads in batches of', ADS_BATCH_SIZE);

    for (let i = 0; i < adSetIds.length; i += ADS_BATCH_SIZE) {
      const batch = adSetIds.slice(i, i + ADS_BATCH_SIZE);
      const { data: batchAds, error: adsError } = await supabase
        .from('ads')
        .select('*')
        .in('ad_set_id', batch)
        .limit(100000);

      if (adsError) {
        console.error(`[AdReportsService] ❌ Error fetching ads batch ${i / ADS_BATCH_SIZE + 1}:`, adsError);
        throw adsError;
      }

      if (batchAds) {
        console.log(`[AdReportsService] Ads Batch ${i / ADS_BATCH_SIZE + 1}: Found ${batchAds.length} ads`);
        allAds = allAds.concat(batchAds);
      }
    }

    const ads = allAds;

    if (!ads || ads.length === 0) {
      console.log('[AdReportsService] ❌ No ads found for ad set IDs');
      console.log('[AdReportsService] Ad set IDs sample:', adSetIds.slice(0, 5));
      // Check if ads exist at all in database
      const { data: allAdsCheck } = await supabase
        .from('ads')
        .select('id, ad_set_id, name')
        .limit(10);
      console.log('[AdReportsService] Sample ads in DB:', allAdsCheck);

      // Check for foreign key mismatch
      if (allAdsCheck && allAdsCheck.length > 0 && adSetIds.length > 0) {
        console.log('[AdReportsService] ⚠️ FOREIGN KEY MISMATCH DETECTED!');
        console.log('[AdReportsService] DB has ads but none match our ad_set_ids');
        console.log('[AdReportsService] Expected ad_set_ids:', adSetIds.slice(0, 3));
        console.log('[AdReportsService] Actual ad_set_ids in DB:', allAdsCheck.slice(0, 3).map(a => a.ad_set_id));
      }
      return [];
    }

    console.log('[AdReportsService] ✓ Found', ads.length, 'total ads across all batches');
    console.log('[AdReportsService] Sample ads:', ads.slice(0, 3).map(a => ({ id: a.id, name: a.name, ad_set_id: a.ad_set_id })));

    // Fetch metrics for these ads (clicks, impressions, spend from Facebook)
    // IMPORTANT: entity_id in ad_metrics stores our internal UUID, not platform_ad_id
    const adUuids = ads.map(ad => ad.id);

    console.log('[AdReportsService] Ad UUIDs to query:', adUuids.length);

    if (adUuids.length === 0) {
      console.log('[AdReportsService] No valid ad UUIDs found');
      return [];
    }

    // Batch queries if we have too many IDs (Supabase .in() has limits)
    const BATCH_SIZE = 100;
    let allMetrics: any[] = [];

    console.log('[AdReportsService] Querying ad metrics:', {
      adCount: adUuids.length,
      dateRange: { startDate, endDate },
      sampleAdUuid: adUuids[0]
    });

    for (let i = 0; i < adUuids.length; i += BATCH_SIZE) {
      const batch = adUuids.slice(i, i + BATCH_SIZE);
      const { data: metrics, error: metricsError } = await supabase
        .from('ad_metrics')
        .select('*')
        .eq('entity_type', 'ad')
        .in('entity_id', batch)
        .gte('date', startDate)
        .lte('date', endDate);

      if (metricsError) {
        console.error('[AdReportsService] Error fetching metrics batch:', metricsError);
        throw metricsError;
      }

      if (metrics) {
        console.log(`[AdReportsService] Ad Batch ${i / BATCH_SIZE + 1}: Found ${metrics.length} metrics`);
        allMetrics = allMetrics.concat(metrics);
      }
    }

    const metrics = allMetrics;

    console.log('[AdReportsService] Total ad metrics fetched:', metrics?.length || 0);
    if (metrics && metrics.length > 0) {
      console.log('[AdReportsService] First metric sample:', {
        entity_id: metrics[0].entity_id,
        entity_type: metrics[0].entity_type,
        date: metrics[0].date,
        spend: metrics[0].spend,
        impressions: metrics[0].impressions,
        clicks: metrics[0].clicks
      });
    } else {
      console.warn('[AdReportsService] NO AD METRICS FOUND! Checking why...');
      // Query without filters to see if any metrics exist
      const { data: anyMetrics } = await supabase
        .from('ad_metrics')
        .select('entity_type, entity_id, date')
        .eq('entity_type', 'ad')
        .limit(5);
      console.log('[AdReportsService] Sample of ANY ad metrics in DB:', anyMetrics);
    }

    // IMPORTANT: Get conversion data using priority-based resolver
    // Priority: 1. Revoa Pixel, 2. UTM Attribution, 3. Platform Pixel
    console.log('[AdReportsService] Fetching conversion data with priority resolver...');
    const adUuidsForResolver = ads.map(ad => ad.id);
    const conversionData = await resolveConversionValues(
      user.id,
      accountIds,
      adUuidsForResolver,
      startDate,
      endDate
    );

    console.log('[AdReportsService] Conversion resolver returned data for', conversionData.size, 'ads');

    // Aggregate metrics by ad (using platform_ad_id as key)
    const adMetricsMap = new Map<string, typeof metrics[0][]>();
    metrics?.forEach(m => {
      const existing = adMetricsMap.get(m.entity_id) || [];
      existing.push(m);
      adMetricsMap.set(m.entity_id, existing);
    });

    console.log('[AdReportsService] Aggregated metrics for', adMetricsMap.size, 'unique ads');
    console.log('[AdReportsService] Conversion data for', conversionData.size, 'unique ads');

    // Transform to creative performance format
    const creatives: CreativePerformance[] = ads.map((ad, index) => {
      // Use internal UUID to look up metrics (entity_id stores UUID)
      const adMetrics = adMetricsMap.get(ad.id) || [];
      const totalSpend = adMetrics.reduce((sum, m) => sum + (m.spend || 0), 0);
      const totalImpressions = adMetrics.reduce((sum, m) => sum + (m.impressions || 0), 0);
      const totalClicks = adMetrics.reduce((sum, m) => sum + (m.clicks || 0), 0);

      // Get platform pixel data directly from ad_metrics (like campaigns do)
      const platformConversions = adMetrics.reduce((sum, m) => sum + (m.conversions || 0), 0);
      const platformConversionValue = adMetrics.reduce((sum, m) => sum + (m.conversion_value || 0), 0);

      // DEBUG: Log first ad to see what's happening including creative data
      if (index === 0) {
        console.log('[AdReportsService] First ad debug:', {
          adId: ad.id,
          adName: ad.name,
          metricsFound: adMetrics.length,
          totalSpend,
          totalImpressions,
          totalClicks,
          platformConversions,
          platformConversionValue,
          creativeData: ad.creative_data,
          creativeThumbnailUrl: ad.creative_thumbnail_url,
          creativeType: ad.creative_type
        });
      }

      // Use conversion data from priority-based resolver if available
      // Otherwise fall back to platform pixel data from ad_metrics
      const resolvedData = conversionData.get(ad.id);
      const hasResolvedData = resolvedData?.hasData && (resolvedData.conversions > 0 || resolvedData.conversionValue > 0);

      // Priority: Resolved data (Revoa/UTM) > Platform Pixel from ad_metrics
      const totalConversions = hasResolvedData ? resolvedData.conversions : platformConversions;
      const totalValue = hasResolvedData ? resolvedData.conversionValue : platformConversionValue;
      const conversionRate = hasResolvedData ? resolvedData.conversionRate : (totalClicks > 0 ? (platformConversions / totalClicks) * 100 : 0);
      const totalCOGS = resolvedData?.totalCogs || 0;
      const conversionSource: ConversionSource = hasResolvedData ? resolvedData.source : (platformConversions > 0 || platformConversionValue > 0 ? 'platform_pixel' : 'none');

      const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
      const cpa = totalConversions > 0 ? totalSpend / totalConversions : 0;
      const cpc = totalClicks > 0 ? totalSpend / totalClicks : 0;
      const roas = totalSpend > 0 ? totalValue / totalSpend : 0;

      // Calculate profit metrics using ACTUAL COGS from our system (not estimated!)
      // If COGS not available, profit will be calculated without costs (showing higher values than reality, but not estimated)
      const actualCOGS = totalCOGS;
      const profit = totalValue - actualCOGS - totalSpend;
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

      // DEBUG: Log ad set relationship and image data for first few ads
      if (index < 3) {
        console.log(`[AdReportsService] Ad #${index}:`, {
          ad_id: ad.id,
          platform_ad_id: ad.platform_ad_id,
          ad_set_id: ad.ad_set_id,
          name: ad.name,
          creative_thumbnail_url: ad.creative_thumbnail_url,
          creative_data_keys: ad.creative_data ? Object.keys(ad.creative_data) : [],
          hasImage: !!thumbnailUrl,
          thumbnailUrl: thumbnailUrl?.substring(0, 100),
          imageUrl: imageUrl?.substring(0, 100)
        });
      }

      return {
        id: ad.id, // Internal UUID for database queries (Rex AI)
        platformId: ad.platform_ad_id, // External platform ID for Facebook API calls
        adSetId: ad.ad_set_id, // UUID reference to ad_sets table
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
          conversions: totalConversions,
          conversion_value: totalValue,
          cvr: conversionRate,
          roas,
          cpc,
          cogs: actualCOGS,
          profit,
          profitMargin,
          netROAS,
          linkedProductCount: resolvedData?.linkedProductCount
        },
        performance,
        fatigueScore,
        status: ad.status || 'UNKNOWN',
        adName: ad.name,
        platform: ad.platform || 'facebook',
        adAccountId: undefined,
        hasRealConversionData: resolvedData?.hasData || false,
        conversionSource: conversionSource,
        pageProfile: {
          name: 'Facebook Page',
          imageUrl: ''
        }
      };
    });

    // Sort by spend descending, then by name
    const sortedCreatives = creatives.sort((a, b) => {
      if (b.metrics.spend !== a.metrics.spend) {
        return b.metrics.spend - a.metrics.spend;
      }
      return a.adName.localeCompare(b.adName);
    });

    const adsWithRealData = sortedCreatives.filter(c => c.hasRealConversionData).length;
    const adsWithMetrics = sortedCreatives.filter(c => c.metrics.spend > 0).length;
    const sourceBreakdown = {
      revoa_pixel: sortedCreatives.filter(c => c.conversionSource === 'revoa_pixel').length,
      utm_attribution: sortedCreatives.filter(c => c.conversionSource === 'utm_attribution').length,
      platform_pixel: sortedCreatives.filter(c => c.conversionSource === 'platform_pixel').length,
      none: sortedCreatives.filter(c => c.conversionSource === 'none').length,
    };
    console.log('[AdReportsService] Returning', sortedCreatives.length, 'ads');
    console.log('[AdReportsService]   - With metrics (spend > 0):', adsWithMetrics);
    console.log('[AdReportsService]   - With conversion data:', adsWithRealData);
    console.log('[AdReportsService]   - Conversion sources:', sourceBreakdown);

    return sortedCreatives;
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
  console.log('[adReportsService] getCampaignPerformance called with:', { startDate, endDate });

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Get user's ad accounts from all connected platforms
    const platformAccounts = await getAllPlatformAccounts();
    const allAccountIds: string[] = [];

    for (const { accounts } of platformAccounts) {
      allAccountIds.push(...accounts.map(acc => acc.id));
    }

    if (allAccountIds.length === 0) {
      return [];
    }

    const accountIds = allAccountIds;

    // Get all campaigns for these accounts (high limit to get all)
    const { data: campaigns, error: campaignsError } = await supabase
      .from('ad_campaigns')
      .select('*')
      .in('ad_account_id', accountIds)
      .limit(100000);

    if (campaignsError) throw campaignsError;

    if (!campaigns || campaigns.length === 0) {
      return [];
    }

    console.log('[AdReportsService] getCampaignPerformance: Found', campaigns.length, 'campaigns');

    // Use internal UUID for metrics lookup (entity_id is UUID type)
    const campaignUuids = campaigns.map(c => c.id);

    if (campaignUuids.length === 0) {
      console.log('[AdReportsService] No valid campaign UUIDs found');
      return [];
    }

    // Batch queries if we have too many IDs (Supabase .in() has limits)
    const BATCH_SIZE = 100;
    let allMetrics: any[] = [];

    for (let i = 0; i < campaignUuids.length; i += BATCH_SIZE) {
      const batch = campaignUuids.slice(i, i + BATCH_SIZE);
      const { data: batchMetrics, error: metricsError } = await supabase
        .from('ad_metrics')
        .select('*')
        .eq('entity_type', 'campaign')
        .in('entity_id', batch)
        .gte('date', startDate)
        .lte('date', endDate);

      if (metricsError) {
        console.error('[adReportsService] Error fetching campaign performance:', metricsError);
        throw metricsError;
      }

      if (batchMetrics) {
        allMetrics = allMetrics.concat(batchMetrics);
      }
    }

    const metrics = allMetrics;

    console.log('[AdReportsService] Campaign metrics query returned:', metrics.length, 'rows');
    if (metrics.length > 0) {
      console.log('[AdReportsService] Sample metric:', {
        entity_id: metrics[0].entity_id,
        spend: metrics[0].spend,
        date: metrics[0].date
      });
    }

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

    console.log('[AdReportsService] Grouped into', campaignMetrics.size, 'unique campaigns');
    console.log('[AdReportsService] Total campaigns to map:', campaigns.length);

    // Log first few campaigns and their metrics
    campaigns.slice(0, 3).forEach(c => {
      const m = campaignMetrics.get(c.id);
      console.log('[AdReportsService] Campaign lookup:', {
        name: c.name,
        id: c.id,
        hasMetrics: !!m,
        spend: m?.spend || 0
      });
    });

    // Map campaigns with their metrics (using internal UUID)
    // NOTE: Campaigns don't have real COGS data - only individual ads with UTM attribution do
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

      // Determine performance rating based on ROAS (not netROAS since we don't have real COGS)
      let performance: 'high' | 'medium' | 'low' = 'medium';
      if (roas > 2) performance = 'high';
      else if (roas < 1) performance = 'low';

      return {
        id: campaign.id,
        name: campaign.name,
        adName: campaign.name,
        status: campaign.status,
        platform: campaign.platform || 'facebook',
        platformId: campaign.platform_campaign_id,
        objective: campaign.objective,
        budget: campaign.daily_budget || campaign.lifetime_budget || 0,
        dailyBudget: campaign.daily_budget || null,
        lifetimeBudget: campaign.lifetime_budget || null,
        budgetType: campaign.budget_type || (campaign.daily_budget ? 'daily' : campaign.lifetime_budget ? 'lifetime' : null),
        campaignId: campaign.id,
        metrics: {
          impressions: Math.round(m.impressions),
          clicks: Math.round(m.clicks),
          ctr: parseFloat(ctr.toFixed(2)),
          spend: parseFloat(m.spend.toFixed(2)),
          conversions: Math.round(m.conversions),
          conversion_value: parseFloat(m.conversion_value.toFixed(2)),
          revenue: parseFloat(m.conversion_value.toFixed(2)),
          cpa: parseFloat(cpa.toFixed(2)),
          roas: parseFloat(roas.toFixed(2)),
          cogs: 0,
          profit: 0,
          profitMargin: 0,
          netROAS: 0,
          linkedProductCount: undefined
        },
        performance,
        fatigueScore: 0
      };
    });

    // Sort by spend descending, then by name
    const sortedCampaigns = campaignsWithMetrics.sort((a, b) => {
      if (b.metrics.spend !== a.metrics.spend) {
        return b.metrics.spend - a.metrics.spend;
      }
      return a.name.localeCompare(b.name);
    });

    console.log('[AdReportsService] ✓ Returning', sortedCampaigns.length, 'campaigns');

    return sortedCampaigns;
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

    // Get user's ad accounts from all connected platforms
    const platformAccounts = await getAllPlatformAccounts();
    const allAccountIds: string[] = [];

    for (const { accounts } of platformAccounts) {
      allAccountIds.push(...accounts.map(acc => acc.id));
    }

    if (allAccountIds.length === 0) {
      return [];
    }

    const accountIds = allAccountIds;

    // Get all campaigns for these accounts (high limit to get all)
    const { data: campaigns, error: campaignsError } = await supabase
      .from('ad_campaigns')
      .select('id')
      .in('ad_account_id', accountIds)
      .limit(100000);

    if (campaignsError) throw campaignsError;

    if (!campaigns || campaigns.length === 0) {
      return [];
    }

    console.log('[AdReportsService] getAdSetPerformance: Found', campaigns.length, 'campaigns');
    const campaignIds = campaigns.map(c => c.id);

    // Batch ad sets query to avoid URL length limit with many campaigns
    const ADSETS_BATCH_SIZE = 100;
    let allAdSets: any[] = [];

    console.log('[AdReportsService] Fetching ad sets in batches of', ADSETS_BATCH_SIZE);

    for (let i = 0; i < campaignIds.length; i += ADSETS_BATCH_SIZE) {
      const batch = campaignIds.slice(i, i + ADSETS_BATCH_SIZE);
      const { data: batchAdSets, error: adSetsError } = await supabase
        .from('ad_sets')
        .select('*')
        .in('ad_campaign_id', batch)
        .limit(100000);

      if (adSetsError) {
        console.error(`[AdReportsService] ❌ Error fetching ad sets batch ${i / ADSETS_BATCH_SIZE + 1}:`, adSetsError);
        throw adSetsError;
      }

      if (batchAdSets) {
        console.log(`[AdReportsService] Ad Sets Batch ${i / ADSETS_BATCH_SIZE + 1}: Found ${batchAdSets.length} ad sets`);
        allAdSets = allAdSets.concat(batchAdSets);
      }
    }

    const adSets = allAdSets;

    if (!adSets || adSets.length === 0) {
      return [];
    }

    console.log('[AdReportsService] getAdSetPerformance: Found', adSets.length, 'total ad sets across all batches');

    // Use internal UUID for metrics lookup (entity_id is UUID type)
    const adSetUuids = adSets.map(a => a.id);

    if (adSetUuids.length === 0) {
      console.log('[AdReportsService] No valid ad set UUIDs found');
      return [];
    }

    // Batch queries if we have too many IDs (Supabase .in() has limits)
    const BATCH_SIZE = 100;
    let allMetrics: any[] = [];

    console.log('[AdReportsService] Querying ad set metrics:', {
      adSetCount: adSetUuids.length,
      dateRange: { startDate, endDate },
      sampleAdSetUuid: adSetUuids[0]
    });

    for (let i = 0; i < adSetUuids.length; i += BATCH_SIZE) {
      const batch = adSetUuids.slice(i, i + BATCH_SIZE);
      const { data: batchMetrics, error: metricsError} = await supabase
        .from('ad_metrics')
        .select('*')
        .eq('entity_type', 'adset')
        .in('entity_id', batch)
        .gte('date', startDate)
        .lte('date', endDate);

      if (metricsError) {
        console.error('[adReportsService] Error fetching ad set performance:', metricsError);
        throw metricsError;
      }

      if (batchMetrics) {
        console.log(`[AdReportsService] Batch ${i / BATCH_SIZE + 1}: Found ${batchMetrics.length} metrics`);
        if (batchMetrics.length > 0) {
          console.log('[AdReportsService] Sample metric:', batchMetrics[0]);
        }
        allMetrics = allMetrics.concat(batchMetrics);
      }
    }

    const metrics = allMetrics;
    console.log(`[AdReportsService] Total ad set metrics found: ${metrics.length}`);

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

    console.log(`[AdReportsService] Metrics grouped for ${adSetMetrics.size} ad sets`);

    // Map ad sets with their metrics (using internal UUID)
    // NOTE: Ad sets don't have real COGS data - only individual ads with UTM attribution do
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

      // Determine performance rating based on ROAS (not netROAS since we don't have real COGS)
      let performance: 'high' | 'medium' | 'low' = 'medium';
      if (roas > 2) performance = 'high';
      else if (roas < 1) performance = 'low';

      // DEBUG: Log first few ad sets with their metrics
      const adSetIndex = adSets.indexOf(adSet);
      if (adSetIndex < 5) {
        console.log(`[AdReportsService] Ad Set #${adSetIndex}:`, {
          id: adSet.id,
          platform_adset_id: adSet.platform_adset_id,
          name: adSet.name,
          campaign_id: adSet.ad_campaign_id,
          hasMetrics: !!m && m.spend > 0,
          metricsSpend: m.spend,
          metricsImpressions: m.impressions
        });
      }

      return {
        id: adSet.id,
        name: adSet.name,
        adName: adSet.name,
        status: adSet.status,
        platform: adSet.platform || 'facebook',
        platformId: adSet.platform_ad_set_id,
        campaignId: adSet.ad_campaign_id,
        targeting: adSet.targeting,
        budget: adSet.daily_budget || adSet.lifetime_budget || 0,
        dailyBudget: adSet.daily_budget || null,
        lifetimeBudget: adSet.lifetime_budget || null,
        budgetType: adSet.budget_type || (adSet.daily_budget ? 'daily' : adSet.lifetime_budget ? 'lifetime' : null),
        adSetId: adSet.id,
        metrics: {
          impressions: Math.round(m.impressions),
          clicks: Math.round(m.clicks),
          ctr: parseFloat(ctr.toFixed(2)),
          spend: parseFloat(m.spend.toFixed(2)),
          conversions: Math.round(m.conversions),
          conversion_value: parseFloat(m.conversion_value.toFixed(2)),
          revenue: parseFloat(m.conversion_value.toFixed(2)),
          cpa: parseFloat(cpa.toFixed(2)),
          roas: parseFloat(roas.toFixed(2)),
          cogs: 0,
          profit: 0,
          profitMargin: 0,
          netROAS: 0,
          linkedProductCount: undefined
        },
        performance,
        fatigueScore: 0
      };
    });

    // Sort by spend descending, then by name
    const sortedAdSets = adSetsWithMetrics.sort((a, b) => {
      if (b.metrics.spend !== a.metrics.spend) {
        return b.metrics.spend - a.metrics.spend;
      }
      return a.name.localeCompare(b.name);
    });

    console.log('[AdReportsService] ✓ Returning', sortedAdSets.length, 'ad sets');

    return sortedAdSets;
  } catch (error) {
    console.error('[adReportsService] Error fetching ad set performance:', error);
    return [];
  }
}
