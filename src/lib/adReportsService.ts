import { supabase } from './supabase';
import { facebookAdsService } from './facebookAds';

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
}

export interface CreativePerformance {
  id: string;
  type: 'image' | 'video';
  url: string;
  thumbnail?: string;
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
    roas: number;
    cpc: number;
  };
  performance: 'high' | 'medium' | 'low';
  fatigueScore: number;
  adName: string;
  platform: string;
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

    // Fetch aggregated metrics from database
    const { data: metrics, error } = await supabase
      .from('ad_metrics')
      .select('*')
      .in('ad_account_id', accountIds)
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
      }
    };
  } catch (error) {
    console.error('[AdReportsService] Error fetching metrics:', error);
    return getEmptyMetrics();
  }
}

/**
 * Fetch creative performance data
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

    // Get user's ad accounts
    const accounts = await facebookAdsService.getAdAccounts('facebook');
    if (accounts.length === 0) {
      return [];
    }

    const accountIds = accounts.map(acc => acc.id);

    // Fetch ads with their metrics
    const { data: ads, error } = await supabase
      .from('ads')
      .select(`
        *,
        ad_sets!inner(
          campaign_id,
          ad_campaigns!inner(
            ad_account_id
          )
        )
      `)
      .in('ad_sets.ad_campaigns.ad_account_id', accountIds);

    if (error) throw error;

    if (!ads || ads.length === 0) {
      return [];
    }

    // Fetch metrics for these ads
    const adIds = ads.map(ad => ad.platform_ad_id);
    const { data: metrics, error: metricsError } = await supabase
      .from('ad_metrics')
      .select('*')
      .in('entity_id', adIds)
      .eq('entity_type', 'ad')
      .gte('date', startDate)
      .lte('date', endDate);

    if (metricsError) throw metricsError;

    // Aggregate metrics by ad
    const adMetricsMap = new Map<string, typeof metrics[0][]>();
    metrics?.forEach(m => {
      const existing = adMetricsMap.get(m.entity_id) || [];
      existing.push(m);
      adMetricsMap.set(m.entity_id, existing);
    });

    // Transform to creative performance format
    const creatives: CreativePerformance[] = ads.map(ad => {
      const adMetrics = adMetricsMap.get(ad.platform_ad_id) || [];
      const totalSpend = adMetrics.reduce((sum, m) => sum + (m.spend || 0), 0);
      const totalImpressions = adMetrics.reduce((sum, m) => sum + (m.impressions || 0), 0);
      const totalClicks = adMetrics.reduce((sum, m) => sum + (m.clicks || 0), 0);
      const totalConversions = adMetrics.reduce((sum, m) => sum + (m.conversions || 0), 0);
      const totalValue = adMetrics.reduce((sum, m) => sum + (m.conversion_value || 0), 0);

      const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
      const cpa = totalConversions > 0 ? totalSpend / totalConversions : 0;
      const cpc = totalClicks > 0 ? totalSpend / totalClicks : 0;
      const roas = totalSpend > 0 ? totalValue / totalSpend : 0;

      // Determine performance level based on ROAS
      let performance: 'high' | 'medium' | 'low' = 'low';
      if (roas >= 2.5) performance = 'high';
      else if (roas >= 1.5) performance = 'medium';

      // Calculate fatigue score (0-100, higher = more fatigued)
      // Based on declining CTR over time
      const fatigueScore = Math.min(100, Math.max(0, 100 - (ctr * 20)));

      return {
        id: ad.id,
        type: ad.creative_video_url ? 'video' : 'image',
        url: ad.creative_image_url || ad.creative_video_url || '',
        thumbnail: ad.creative_video_url ? ad.creative_image_url : undefined,
        headline: ad.creative_title || ad.name,
        description: ad.creative_body || '',
        adCopy: ad.creative_body || '',
        ctaText: ad.call_to_action || 'Learn More',
        metrics: {
          impressions: totalImpressions,
          clicks: totalClicks,
          ctr,
          cpa,
          spend: totalSpend,
          conversions: totalConversions,
          roas,
          cpc
        },
        performance,
        fatigueScore,
        adName: ad.name,
        platform: 'facebook',
        pageProfile: {
          name: 'Facebook Page',
          imageUrl: ''
        }
      };
    });

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
    }
  };
}
