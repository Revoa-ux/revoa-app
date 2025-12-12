import { supabase } from './supabase';
import { facebookAdsService } from './facebookAds';
import { calculateProfitMetrics } from './profitCalculationService';
import type { AdPlatform } from '../types/ads';

export interface PlatformMetricData {
  date: string;
  value: number;
}

export interface PlatformMetrics {
  platform: AdPlatform;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  conversionValue: number;
  ctr: number;
  cpa: number;
  roas: number;
  profit: number;
  netROAS: number;
  profitMargin: number;
  change: number;
  data: PlatformMetricData[];
}

export interface PlatformComparison {
  platforms: PlatformMetrics[];
  totalSpend: number;
  totalProfit: number;
  topPerformer: AdPlatform | null;
  dateRange: {
    start: string;
    end: string;
  };
}

export interface MetricByPlatform {
  metricId: string;
  metricName: string;
  platforms: {
    platform: AdPlatform;
    value: number;
    change: number;
    data: PlatformMetricData[];
  }[];
}

const PLATFORM_COLORS = {
  facebook: {
    primary: '#1877F2',
    secondary: '#4267B2',
    gradient: ['#1877F2', '#4267B2'],
  },
  google: {
    primary: '#34A853',
    secondary: '#0F9D58',
    gradient: ['#34A853', '#0F9D58'],
  },
  tiktok: {
    primary: '#FF0050',
    secondary: '#EE1D52',
    gradient: ['#FF0050', '#EE1D52'],
  },
};

export const getPlatformColors = (platform: AdPlatform) => {
  return PLATFORM_COLORS[platform] || PLATFORM_COLORS.facebook;
};

export const getPlatformDisplayName = (platform: AdPlatform): string => {
  const names: Record<AdPlatform, string> = {
    facebook: 'Meta',
    google: 'Google',
    tiktok: 'TikTok',
  };
  return names[platform] || platform;
};

export async function getMetricsByPlatform(
  startDate: string,
  endDate: string
): Promise<PlatformComparison> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    const { data: adAccounts, error: accountsError } = await supabase
      .from('ad_accounts')
      .select('id, platform, platform_account_id')
      .eq('user_id', user.id)
      .eq('status', 'active');

    if (accountsError) throw accountsError;

    if (!adAccounts || adAccounts.length === 0) {
      return {
        platforms: [],
        totalSpend: 0,
        totalProfit: 0,
        topPerformer: null,
        dateRange: { start: startDate, end: endDate },
      };
    }

    const platformAccountsMap = new Map<AdPlatform, string[]>();
    adAccounts.forEach(acc => {
      const platform = acc.platform as AdPlatform;
      const existing = platformAccountsMap.get(platform) || [];
      existing.push(acc.id);
      platformAccountsMap.set(platform, existing);
    });

    const profitMetrics = await calculateProfitMetrics(user.id, startDate, endDate);
    const cogsRatio = profitMetrics.totalRevenue > 0
      ? profitMetrics.totalCOGS / profitMetrics.totalRevenue
      : 0.4;

    const platformMetrics: PlatformMetrics[] = [];

    for (const [platform, accountIds] of platformAccountsMap) {
      const { data: campaigns, error: campaignsError } = await supabase
        .from('ad_campaigns')
        .select('id')
        .in('ad_account_id', accountIds);

      if (campaignsError) {
        console.error(`Error fetching campaigns for ${platform}:`, campaignsError);
        continue;
      }

      if (!campaigns || campaigns.length === 0) continue;

      const campaignIds = campaigns.map(c => c.id);

      const { data: metrics, error: metricsError } = await supabase
        .from('ad_metrics')
        .select('*')
        .eq('entity_type', 'campaign')
        .in('entity_id', campaignIds)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: true });

      if (metricsError) {
        console.error(`Error fetching metrics for ${platform}:`, metricsError);
        continue;
      }

      if (!metrics || metrics.length === 0) continue;

      const totalSpend = metrics.reduce((sum, m) => sum + (m.spend || 0), 0);
      const totalImpressions = metrics.reduce((sum, m) => sum + (m.impressions || 0), 0);
      const totalClicks = metrics.reduce((sum, m) => sum + (m.clicks || 0), 0);
      const totalConversions = metrics.reduce((sum, m) => sum + (m.conversions || 0), 0);
      const totalConversionValue = metrics.reduce((sum, m) => sum + (m.conversion_value || 0), 0);

      const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
      const cpa = totalConversions > 0 ? totalSpend / totalConversions : 0;
      const roas = totalSpend > 0 ? totalConversionValue / totalSpend : 0;

      const estimatedCOGS = totalConversionValue * cogsRatio;
      const profit = totalConversionValue - estimatedCOGS - totalSpend;
      const profitMargin = totalConversionValue > 0 ? (profit / totalConversionValue) * 100 : 0;
      const netROAS = totalSpend > 0 ? profit / totalSpend : 0;

      const dateMetrics = new Map<string, { spend: number; value: number }>();
      metrics.forEach(m => {
        const existing = dateMetrics.get(m.date) || { spend: 0, value: 0 };
        dateMetrics.set(m.date, {
          spend: existing.spend + (m.spend || 0),
          value: existing.value + (m.conversion_value || 0),
        });
      });

      const spendData = Array.from(dateMetrics.entries()).map(([date, m]) => ({
        date,
        value: m.spend,
      }));

      platformMetrics.push({
        platform,
        spend: totalSpend,
        impressions: totalImpressions,
        clicks: totalClicks,
        conversions: totalConversions,
        conversionValue: totalConversionValue,
        ctr,
        cpa,
        roas,
        profit,
        netROAS,
        profitMargin,
        change: 0,
        data: spendData,
      });
    }

    const totalSpend = platformMetrics.reduce((sum, p) => sum + p.spend, 0);
    const totalProfit = platformMetrics.reduce((sum, p) => sum + p.profit, 0);

    let topPerformer: AdPlatform | null = null;
    let highestNetROAS = -Infinity;
    platformMetrics.forEach(p => {
      if (p.netROAS > highestNetROAS && p.spend > 0) {
        highestNetROAS = p.netROAS;
        topPerformer = p.platform;
      }
    });

    return {
      platforms: platformMetrics,
      totalSpend,
      totalProfit,
      topPerformer,
      dateRange: { start: startDate, end: endDate },
    };
  } catch (error) {
    console.error('[PlatformComparisonService] Error:', error);
    return {
      platforms: [],
      totalSpend: 0,
      totalProfit: 0,
      topPerformer: null,
      dateRange: { start: startDate, end: endDate },
    };
  }
}

export async function getPlatformTimeSeriesData(
  startDate: string,
  endDate: string,
  metricKey: 'spend' | 'roas' | 'profit' | 'conversions' | 'ctr' | 'cpa'
): Promise<MetricByPlatform> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    const { data: adAccounts, error: accountsError } = await supabase
      .from('ad_accounts')
      .select('id, platform')
      .eq('user_id', user.id)
      .eq('status', 'active');

    if (accountsError) throw accountsError;

    if (!adAccounts || adAccounts.length === 0) {
      return {
        metricId: metricKey,
        metricName: metricKey.toUpperCase(),
        platforms: [],
      };
    }

    const platformAccountsMap = new Map<AdPlatform, string[]>();
    adAccounts.forEach(acc => {
      const platform = acc.platform as AdPlatform;
      const existing = platformAccountsMap.get(platform) || [];
      existing.push(acc.id);
      platformAccountsMap.set(platform, existing);
    });

    const profitMetrics = await calculateProfitMetrics(user.id, startDate, endDate);
    const cogsRatio = profitMetrics.totalRevenue > 0
      ? profitMetrics.totalCOGS / profitMetrics.totalRevenue
      : 0.4;

    const result: MetricByPlatform = {
      metricId: metricKey,
      metricName: getMetricDisplayName(metricKey),
      platforms: [],
    };

    for (const [platform, accountIds] of platformAccountsMap) {
      const { data: campaigns } = await supabase
        .from('ad_campaigns')
        .select('id')
        .in('ad_account_id', accountIds);

      if (!campaigns || campaigns.length === 0) continue;

      const campaignIds = campaigns.map(c => c.id);

      const { data: metrics } = await supabase
        .from('ad_metrics')
        .select('*')
        .eq('entity_type', 'campaign')
        .in('entity_id', campaignIds)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: true });

      if (!metrics || metrics.length === 0) continue;

      const dateMetrics = new Map<string, {
        spend: number;
        impressions: number;
        clicks: number;
        conversions: number;
        conversionValue: number;
      }>();

      metrics.forEach(m => {
        const existing = dateMetrics.get(m.date) || {
          spend: 0,
          impressions: 0,
          clicks: 0,
          conversions: 0,
          conversionValue: 0,
        };
        dateMetrics.set(m.date, {
          spend: existing.spend + (m.spend || 0),
          impressions: existing.impressions + (m.impressions || 0),
          clicks: existing.clicks + (m.clicks || 0),
          conversions: existing.conversions + (m.conversions || 0),
          conversionValue: existing.conversionValue + (m.conversion_value || 0),
        });
      });

      const timeSeriesData: PlatformMetricData[] = Array.from(dateMetrics.entries()).map(([date, m]) => {
        let value = 0;
        switch (metricKey) {
          case 'spend':
            value = m.spend;
            break;
          case 'roas':
            value = m.spend > 0 ? m.conversionValue / m.spend : 0;
            break;
          case 'profit':
            const cogs = m.conversionValue * cogsRatio;
            value = m.conversionValue - cogs - m.spend;
            break;
          case 'conversions':
            value = m.conversions;
            break;
          case 'ctr':
            value = m.impressions > 0 ? (m.clicks / m.impressions) * 100 : 0;
            break;
          case 'cpa':
            value = m.conversions > 0 ? m.spend / m.conversions : 0;
            break;
        }
        return { date, value };
      });

      const totalValue = timeSeriesData.reduce((sum, d) => sum + d.value, 0);
      const avgValue = timeSeriesData.length > 0 ? totalValue / timeSeriesData.length : 0;

      result.platforms.push({
        platform,
        value: metricKey === 'spend' || metricKey === 'conversions' ? totalValue : avgValue,
        change: 0,
        data: timeSeriesData,
      });
    }

    return result;
  } catch (error) {
    console.error('[PlatformComparisonService] Error getting time series:', error);
    return {
      metricId: metricKey,
      metricName: getMetricDisplayName(metricKey),
      platforms: [],
    };
  }
}

function getMetricDisplayName(key: string): string {
  const names: Record<string, string> = {
    spend: 'Ad Spend',
    roas: 'ROAS',
    profit: 'Net Profit',
    conversions: 'Conversions',
    ctr: 'CTR',
    cpa: 'CPA',
  };
  return names[key] || key.toUpperCase();
}

export function calculatePlatformShare(platforms: PlatformMetrics[], metric: keyof PlatformMetrics): Map<AdPlatform, number> {
  const total = platforms.reduce((sum, p) => sum + (Number(p[metric]) || 0), 0);
  const shares = new Map<AdPlatform, number>();

  platforms.forEach(p => {
    const value = Number(p[metric]) || 0;
    shares.set(p.platform, total > 0 ? (value / total) * 100 : 0);
  });

  return shares;
}
