import { supabase } from './supabase';
import { facebookAdsService } from './facebookAds';
import type { AdPlatform } from '@/types/ads';

export interface PlatformMetric {
  platform: AdPlatform;
  spend: number;
  revenue: number;
  conversions: number;
  impressions: number;
  clicks: number;
  roas: number;
  cpa: number;
  ctr: number;
  cvr: number;
  profit: number;
  profitMargin: number;
}

export interface PlatformTimeSeriesData {
  date: string;
  facebook?: number;
  google?: number;
  tiktok?: number;
}

export interface PlatformComparisonMetrics {
  platforms: PlatformMetric[];
  timeSeries: {
    spend: PlatformTimeSeriesData[];
    roas: PlatformTimeSeriesData[];
    conversions: PlatformTimeSeriesData[];
    ctr: PlatformTimeSeriesData[];
    cpa: PlatformTimeSeriesData[];
  };
  totals: {
    totalSpend: number;
    totalRevenue: number;
    totalConversions: number;
    avgRoas: number;
    avgCpa: number;
  };
  insights: PlatformInsight[];
}

export interface PlatformInsight {
  type: 'best_performer' | 'opportunity' | 'warning' | 'comparison';
  platform?: AdPlatform;
  metric: string;
  title: string;
  description: string;
  value?: number;
  percentageDiff?: number;
}

export const PLATFORM_COLORS = {
  facebook: {
    primary: '#1877F2',
    secondary: '#0668E1',
    tertiary: '#4299E1',
    gradient: 'from-[#1877F2] via-[#0668E1] to-[#4299E1]',
    chartGradient: ['#1877F2', '#0668E1', '#4299E1'],
    bgLight: 'bg-blue-50',
    bgDark: 'dark:bg-blue-900/20',
    textLight: 'text-blue-600',
    textDark: 'dark:text-blue-400',
    name: 'Meta',
    fullName: 'Meta Ads'
  },
  google: {
    primary: '#34A853',
    secondary: '#4CAF50',
    tertiary: '#81C784',
    gradient: 'from-[#34A853] via-[#4CAF50] to-[#81C784]',
    chartGradient: ['#34A853', '#4CAF50', '#81C784'],
    bgLight: 'bg-green-50',
    bgDark: 'dark:bg-green-900/20',
    textLight: 'text-green-600',
    textDark: 'dark:text-green-400',
    name: 'Google',
    fullName: 'Google Ads'
  },
  tiktok: {
    primary: '#EE1D52',
    secondary: '#69C9D0',
    tertiary: '#000000',
    gradient: 'from-[#EE1D52] via-[#69C9D0] to-[#000000]',
    chartGradient: ['#EE1D52', '#FF6B8A', '#69C9D0'],
    bgLight: 'bg-rose-50',
    bgDark: 'dark:bg-rose-900/20',
    textLight: 'text-rose-600',
    textDark: 'dark:text-rose-400',
    name: 'TikTok',
    fullName: 'TikTok Ads'
  }
} as const;

export async function getPlatformComparisonMetrics(
  startDate: string,
  endDate: string
): Promise<PlatformComparisonMetrics> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    const accounts = await facebookAdsService.getAdAccounts('facebook');

    const platformMetrics: PlatformMetric[] = [];
    const timeSeriesData: Record<string, Record<string, Record<string, number>>> = {
      spend: {},
      roas: {},
      conversions: {},
      ctr: {},
      cpa: {}
    };

    const platformsWithData: AdPlatform[] = [];

    for (const account of accounts) {
      const platform = (account.platform || 'facebook') as AdPlatform;

      const { data: campaigns } = await supabase
        .from('ad_campaigns')
        .select('id')
        .eq('ad_account_id', account.id);

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

      platformsWithData.push(platform);

      const totalSpend = metrics.reduce((sum, m) => sum + (m.spend || 0), 0);
      const totalRevenue = metrics.reduce((sum, m) => sum + (m.conversion_value || 0), 0);
      const totalConversions = metrics.reduce((sum, m) => sum + (m.conversions || 0), 0);
      const totalImpressions = metrics.reduce((sum, m) => sum + (m.impressions || 0), 0);
      const totalClicks = metrics.reduce((sum, m) => sum + (m.clicks || 0), 0);

      const roas = totalSpend > 0 ? totalRevenue / totalSpend : 0;
      const cpa = totalConversions > 0 ? totalSpend / totalConversions : 0;
      const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
      const cvr = totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0;

      const estimatedCOGS = totalRevenue * 0.4;
      const profit = totalRevenue - estimatedCOGS - totalSpend;
      const profitMargin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;

      const existingPlatformIndex = platformMetrics.findIndex(p => p.platform === platform);
      if (existingPlatformIndex >= 0) {
        platformMetrics[existingPlatformIndex].spend += totalSpend;
        platformMetrics[existingPlatformIndex].revenue += totalRevenue;
        platformMetrics[existingPlatformIndex].conversions += totalConversions;
        platformMetrics[existingPlatformIndex].impressions += totalImpressions;
        platformMetrics[existingPlatformIndex].clicks += totalClicks;
      } else {
        platformMetrics.push({
          platform,
          spend: totalSpend,
          revenue: totalRevenue,
          conversions: totalConversions,
          impressions: totalImpressions,
          clicks: totalClicks,
          roas,
          cpa,
          ctr,
          cvr,
          profit,
          profitMargin
        });
      }

      metrics.forEach(m => {
        const date = m.date;

        if (!timeSeriesData.spend[date]) {
          timeSeriesData.spend[date] = {};
          timeSeriesData.roas[date] = {};
          timeSeriesData.conversions[date] = {};
          timeSeriesData.ctr[date] = {};
          timeSeriesData.cpa[date] = {};
        }

        const daySpend = m.spend || 0;
        const dayRevenue = m.conversion_value || 0;
        const dayConversions = m.conversions || 0;
        const dayImpressions = m.impressions || 0;
        const dayClicks = m.clicks || 0;

        timeSeriesData.spend[date][platform] = (timeSeriesData.spend[date][platform] || 0) + daySpend;
        timeSeriesData.conversions[date][platform] = (timeSeriesData.conversions[date][platform] || 0) + dayConversions;

        const dailyRoas = daySpend > 0 ? dayRevenue / daySpend : 0;
        timeSeriesData.roas[date][platform] = dailyRoas;

        const dailyCtr = dayImpressions > 0 ? (dayClicks / dayImpressions) * 100 : 0;
        timeSeriesData.ctr[date][platform] = dailyCtr;

        const dailyCpa = dayConversions > 0 ? daySpend / dayConversions : 0;
        timeSeriesData.cpa[date][platform] = dailyCpa;
      });
    }

    platformMetrics.forEach(pm => {
      pm.roas = pm.spend > 0 ? pm.revenue / pm.spend : 0;
      pm.cpa = pm.conversions > 0 ? pm.spend / pm.conversions : 0;
      pm.ctr = pm.impressions > 0 ? (pm.clicks / pm.impressions) * 100 : 0;
      pm.cvr = pm.clicks > 0 ? (pm.conversions / pm.clicks) * 100 : 0;
      const estimatedCOGS = pm.revenue * 0.4;
      pm.profit = pm.revenue - estimatedCOGS - pm.spend;
      pm.profitMargin = pm.revenue > 0 ? (pm.profit / pm.revenue) * 100 : 0;
    });

    const formatTimeSeries = (data: Record<string, Record<string, number>>): PlatformTimeSeriesData[] => {
      return Object.entries(data)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, platforms]) => ({
          date,
          facebook: platforms.facebook,
          google: platforms.google,
          tiktok: platforms.tiktok
        }));
    };

    const totalSpend = platformMetrics.reduce((sum, p) => sum + p.spend, 0);
    const totalRevenue = platformMetrics.reduce((sum, p) => sum + p.revenue, 0);
    const totalConversions = platformMetrics.reduce((sum, p) => sum + p.conversions, 0);
    const avgRoas = totalSpend > 0 ? totalRevenue / totalSpend : 0;
    const avgCpa = totalConversions > 0 ? totalSpend / totalConversions : 0;

    const insights = generatePlatformInsights(platformMetrics);

    return {
      platforms: platformMetrics,
      timeSeries: {
        spend: formatTimeSeries(timeSeriesData.spend),
        roas: formatTimeSeries(timeSeriesData.roas),
        conversions: formatTimeSeries(timeSeriesData.conversions),
        ctr: formatTimeSeries(timeSeriesData.ctr),
        cpa: formatTimeSeries(timeSeriesData.cpa)
      },
      totals: {
        totalSpend,
        totalRevenue,
        totalConversions,
        avgRoas,
        avgCpa
      },
      insights
    };
  } catch (error) {
    console.error('[PlatformMetricsService] Error:', error);
    return {
      platforms: [],
      timeSeries: {
        spend: [],
        roas: [],
        conversions: [],
        ctr: [],
        cpa: []
      },
      totals: {
        totalSpend: 0,
        totalRevenue: 0,
        totalConversions: 0,
        avgRoas: 0,
        avgCpa: 0
      },
      insights: []
    };
  }
}

function generatePlatformInsights(platforms: PlatformMetric[]): PlatformInsight[] {
  if (platforms.length < 2) return [];

  const insights: PlatformInsight[] = [];

  const bestRoas = platforms.reduce((best, p) => p.roas > best.roas ? p : best, platforms[0]);
  const worstRoas = platforms.reduce((worst, p) => p.roas < worst.roas ? p : worst, platforms[0]);

  if (bestRoas.roas > 0) {
    insights.push({
      type: 'best_performer',
      platform: bestRoas.platform,
      metric: 'ROAS',
      title: `${PLATFORM_COLORS[bestRoas.platform].name} leads in ROAS`,
      description: `${PLATFORM_COLORS[bestRoas.platform].name} is delivering ${bestRoas.roas.toFixed(2)}x return on ad spend`,
      value: bestRoas.roas
    });
  }

  if (platforms.length >= 2 && bestRoas.roas > 0 && worstRoas.roas > 0) {
    const roasDiff = ((bestRoas.roas - worstRoas.roas) / worstRoas.roas) * 100;
    if (roasDiff > 20) {
      insights.push({
        type: 'opportunity',
        platform: worstRoas.platform,
        metric: 'ROAS',
        title: `Optimize ${PLATFORM_COLORS[worstRoas.platform].name} campaigns`,
        description: `${PLATFORM_COLORS[bestRoas.platform].name} ROAS is ${roasDiff.toFixed(0)}% higher than ${PLATFORM_COLORS[worstRoas.platform].name}`,
        percentageDiff: roasDiff
      });
    }
  }

  const lowestCpa = platforms.filter(p => p.cpa > 0).reduce((best, p) => p.cpa < best.cpa ? p : best, platforms[0]);
  if (lowestCpa && lowestCpa.cpa > 0) {
    insights.push({
      type: 'best_performer',
      platform: lowestCpa.platform,
      metric: 'CPA',
      title: `${PLATFORM_COLORS[lowestCpa.platform].name} has lowest CPA`,
      description: `Acquiring customers for $${lowestCpa.cpa.toFixed(2)} on ${PLATFORM_COLORS[lowestCpa.platform].name}`,
      value: lowestCpa.cpa
    });
  }

  const totalSpend = platforms.reduce((sum, p) => sum + p.spend, 0);
  platforms.forEach(p => {
    const spendShare = (p.spend / totalSpend) * 100;
    const conversionShare = (p.conversions / platforms.reduce((sum, pm) => sum + pm.conversions, 0)) * 100;

    if (spendShare > 40 && conversionShare < spendShare - 15) {
      insights.push({
        type: 'warning',
        platform: p.platform,
        metric: 'efficiency',
        title: `Review ${PLATFORM_COLORS[p.platform].name} spend allocation`,
        description: `${spendShare.toFixed(0)}% of budget but only ${conversionShare.toFixed(0)}% of conversions`,
        percentageDiff: spendShare - conversionShare
      });
    }
  });

  return insights.slice(0, 4);
}

export function getPlatformIcon(platform: AdPlatform): string {
  switch (platform) {
    case 'facebook':
      return 'M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z';
    case 'google':
      return 'M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z';
    case 'tiktok':
      return 'M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z';
    default:
      return '';
  }
}
