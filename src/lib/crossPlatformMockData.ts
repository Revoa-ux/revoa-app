import type { AdPlatform, CrossPlatformMetric } from '@/types/crossPlatform';

interface PlatformProfile {
  baseSpend: number;
  spendVariance: number;
  baseConversionRate: number;
  conversionRateVariance: number;
  averageOrderValue: number;
  aovVariance: number;
  cogsRate: number;
  dayOfWeekMultipliers: number[];
  hourlyDistribution: number[];
  seasonalTrend: number;
}

const PLATFORM_PROFILES: Record<AdPlatform, PlatformProfile> = {
  facebook: {
    baseSpend: 450,
    spendVariance: 0.25,
    baseConversionRate: 0.028,
    conversionRateVariance: 0.15,
    averageOrderValue: 85,
    aovVariance: 0.20,
    cogsRate: 0.35,
    dayOfWeekMultipliers: [0.85, 1.0, 1.05, 1.1, 1.15, 1.2, 0.95],
    hourlyDistribution: [
      0.01, 0.008, 0.005, 0.004, 0.006, 0.015,
      0.035, 0.055, 0.065, 0.07, 0.075, 0.08,
      0.085, 0.08, 0.075, 0.07, 0.065, 0.06,
      0.055, 0.05, 0.045, 0.035, 0.025, 0.015
    ],
    seasonalTrend: 0.02
  },
  google: {
    baseSpend: 380,
    spendVariance: 0.20,
    baseConversionRate: 0.035,
    conversionRateVariance: 0.12,
    averageOrderValue: 95,
    aovVariance: 0.18,
    cogsRate: 0.32,
    dayOfWeekMultipliers: [0.75, 1.1, 1.15, 1.1, 1.05, 0.95, 0.80],
    hourlyDistribution: [
      0.008, 0.005, 0.003, 0.003, 0.008, 0.02,
      0.04, 0.06, 0.075, 0.085, 0.09, 0.085,
      0.08, 0.075, 0.07, 0.065, 0.055, 0.05,
      0.045, 0.04, 0.035, 0.025, 0.015, 0.01
    ],
    seasonalTrend: 0.015
  },
  tiktok: {
    baseSpend: 280,
    spendVariance: 0.35,
    baseConversionRate: 0.022,
    conversionRateVariance: 0.25,
    averageOrderValue: 65,
    aovVariance: 0.25,
    cogsRate: 0.38,
    dayOfWeekMultipliers: [1.15, 0.9, 0.85, 0.9, 1.0, 1.25, 1.3],
    hourlyDistribution: [
      0.025, 0.02, 0.015, 0.012, 0.01, 0.012,
      0.018, 0.025, 0.035, 0.04, 0.045, 0.05,
      0.055, 0.055, 0.05, 0.055, 0.06, 0.07,
      0.085, 0.095, 0.085, 0.06, 0.045, 0.035
    ],
    seasonalTrend: 0.035
  }
};

function randomVariance(base: number, variance: number): number {
  return base * (1 + (Math.random() - 0.5) * 2 * variance);
}

function generateDayData(
  platform: AdPlatform,
  date: Date,
  dayIndex: number
): Omit<CrossPlatformMetric, 'id' | 'userId'> {
  const profile = PLATFORM_PROFILES[platform];
  const dayMultiplier = profile.dayOfWeekMultipliers[date.getDay()];

  const dayOfYear = Math.floor((date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
  const seasonalMultiplier = 1 + Math.sin((dayOfYear / 365) * 2 * Math.PI) * profile.seasonalTrend;

  const trendMultiplier = 1 + (dayIndex / 100) * 0.05;

  const dailySpend = randomVariance(
    profile.baseSpend * dayMultiplier * seasonalMultiplier * trendMultiplier,
    profile.spendVariance
  );

  const conversionRate = randomVariance(profile.baseConversionRate, profile.conversionRateVariance);
  const clicks = Math.round(dailySpend / randomVariance(0.8, 0.3));
  const impressions = Math.round(clicks / randomVariance(0.015, 0.3));
  const conversions = Math.round(clicks * conversionRate);

  const aov = randomVariance(profile.averageOrderValue, profile.aovVariance);
  const revenue = conversions * aov;
  const cogs = revenue * profile.cogsRate;
  const netProfit = revenue - cogs - dailySpend;

  const hourlySpend: number[] = [];
  const hourlyConversions: number[] = [];
  const hourlyNetProfit: number[] = [];

  for (let hour = 0; hour < 24; hour++) {
    const hourlyPct = profile.hourlyDistribution[hour];
    const hourSpend = dailySpend * hourlyPct * randomVariance(1, 0.15);
    const hourConversions = Math.round(conversions * hourlyPct * randomVariance(1, 0.2));
    const hourRevenue = hourConversions * aov;
    const hourCogs = hourRevenue * profile.cogsRate;

    hourlySpend.push(Math.round(hourSpend * 100) / 100);
    hourlyConversions.push(hourConversions);
    hourlyNetProfit.push(Math.round((hourRevenue - hourCogs - hourSpend) * 100) / 100);
  }

  return {
    platform,
    date: date.toISOString().split('T')[0],
    revenue: Math.round(revenue * 100) / 100,
    cogs: Math.round(cogs * 100) / 100,
    adSpend: Math.round(dailySpend * 100) / 100,
    netProfit: Math.round(netProfit * 100) / 100,
    profitMargin: revenue > 0 ? Math.round((netProfit / revenue) * 10000) / 100 : 0,
    roas: dailySpend > 0 ? Math.round((revenue / dailySpend) * 100) / 100 : 0,
    netRoas: dailySpend > 0 ? Math.round((netProfit / dailySpend) * 100) / 100 : 0,
    impressions,
    clicks,
    conversions,
    ctr: impressions > 0 ? Math.round((clicks / impressions) * 10000) / 100 : 0,
    cpc: clicks > 0 ? Math.round((dailySpend / clicks) * 100) / 100 : 0,
    cpa: conversions > 0 ? Math.round((dailySpend / conversions) * 100) / 100 : 0,
    hourlyNetProfit,
    hourlySpend,
    hourlyConversions,
    dataQualityScore: 95 + Math.random() * 5
  };
}

export function generateCrossPlatformMockData(
  userId: string,
  days: number = 90,
  platforms: AdPlatform[] = ['facebook', 'google', 'tiktok']
): CrossPlatformMetric[] {
  const data: CrossPlatformMetric[] = [];
  const endDate = new Date();

  for (let dayIndex = 0; dayIndex < days; dayIndex++) {
    const date = new Date(endDate);
    date.setDate(date.getDate() - (days - 1 - dayIndex));

    for (const platform of platforms) {
      const dayData = generateDayData(platform, date, dayIndex);
      data.push({
        id: `${platform}-${dayData.date}-${userId}`,
        userId,
        ...dayData
      });
    }
  }

  return data;
}

export function generateTimeSeriesForChart(
  data: CrossPlatformMetric[],
  metric: 'netProfit' | 'adSpend' | 'netRoas' | 'profitMargin' = 'netProfit'
): Array<{
  date: string;
  facebook?: number;
  google?: number;
  tiktok?: number;
}> {
  const dateMap = new Map<string, { facebook?: number; google?: number; tiktok?: number }>();

  for (const item of data) {
    if (!dateMap.has(item.date)) {
      dateMap.set(item.date, {});
    }
    const entry = dateMap.get(item.date)!;
    entry[item.platform] = item[metric];
  }

  return Array.from(dateMap.entries())
    .map(([date, values]) => ({ date, ...values }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function aggregateByPlatform(
  data: CrossPlatformMetric[]
): Record<AdPlatform, {
  totalRevenue: number;
  totalCogs: number;
  totalSpend: number;
  totalNetProfit: number;
  avgProfitMargin: number;
  avgRoas: number;
  avgNetRoas: number;
  totalConversions: number;
  daysOfData: number;
}> {
  const result: Record<string, {
    totalRevenue: number;
    totalCogs: number;
    totalSpend: number;
    totalNetProfit: number;
    avgProfitMargin: number;
    avgRoas: number;
    avgNetRoas: number;
    totalConversions: number;
    daysOfData: number;
  }> = {};

  for (const item of data) {
    if (!result[item.platform]) {
      result[item.platform] = {
        totalRevenue: 0,
        totalCogs: 0,
        totalSpend: 0,
        totalNetProfit: 0,
        avgProfitMargin: 0,
        avgRoas: 0,
        avgNetRoas: 0,
        totalConversions: 0,
        daysOfData: 0
      };
    }

    const p = result[item.platform];
    p.totalRevenue += item.revenue;
    p.totalCogs += item.cogs;
    p.totalSpend += item.adSpend;
    p.totalNetProfit += item.netProfit;
    p.totalConversions += item.conversions;
    p.daysOfData++;
  }

  for (const platform of Object.keys(result)) {
    const p = result[platform];
    p.avgProfitMargin = p.totalRevenue > 0
      ? (p.totalNetProfit / p.totalRevenue) * 100
      : 0;
    p.avgRoas = p.totalSpend > 0
      ? p.totalRevenue / p.totalSpend
      : 0;
    p.avgNetRoas = p.totalSpend > 0
      ? p.totalNetProfit / p.totalSpend
      : 0;
  }

  return result as Record<AdPlatform, typeof result[string]>;
}

export function calculatePlatformAllocation(
  data: CrossPlatformMetric[]
): Array<{
  platform: AdPlatform;
  currentPct: number;
  currentSpend: number;
  netProfitPerDollar: number;
  recommendedPct: number;
  projectedGain: number;
}> {
  const aggregated = aggregateByPlatform(data);
  const platforms = Object.keys(aggregated) as AdPlatform[];

  const totalSpend = platforms.reduce((sum, p) => sum + aggregated[p].totalSpend, 0);

  const platformMetrics = platforms.map(platform => ({
    platform,
    currentSpend: aggregated[platform].totalSpend,
    currentPct: totalSpend > 0 ? (aggregated[platform].totalSpend / totalSpend) * 100 : 0,
    netProfitPerDollar: aggregated[platform].totalSpend > 0
      ? aggregated[platform].totalNetProfit / aggregated[platform].totalSpend
      : 0,
    totalNetProfit: aggregated[platform].totalNetProfit
  }));

  const totalEfficiency = platformMetrics.reduce((sum, p) => sum + Math.max(0.1, p.netProfitPerDollar), 0);

  return platformMetrics.map(p => {
    const rawRecommended = totalEfficiency > 0
      ? (Math.max(0.1, p.netProfitPerDollar) / totalEfficiency) * 100
      : 100 / platforms.length;

    const recommendedPct = Math.max(10, Math.min(60, rawRecommended));
    const spendDiff = (recommendedPct - p.currentPct) / 100 * totalSpend;
    const projectedGain = spendDiff * p.netProfitPerDollar;

    return {
      platform: p.platform,
      currentPct: Math.round(p.currentPct * 10) / 10,
      currentSpend: Math.round(p.currentSpend * 100) / 100,
      netProfitPerDollar: Math.round(p.netProfitPerDollar * 100) / 100,
      recommendedPct: Math.round(recommendedPct * 10) / 10,
      projectedGain: Math.round(projectedGain * 100) / 100
    };
  }).sort((a, b) => b.netProfitPerDollar - a.netProfitPerDollar);
}
