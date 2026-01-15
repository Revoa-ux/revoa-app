import type {
  AdPlatform,
  CrossPlatformMetric,
  DayOfWeekPattern,
  TimeOfDayPattern,
  WeekOverWeekTrend,
  BudgetCorrelation,
  CrossPlatformCorrelation,
  DataAvailability,
  DataAvailabilityLevel,
  CrossPlatformSuggestion,
  CrossPlatformSuggestionType,
  PlatformAllocation
} from '@/types/crossPlatform';

function aggregateByPlatform(
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

function calculatePlatformAllocation(
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

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const HOUR_BUCKETS = [
  { label: '12am-6am', start: 0, end: 6 },
  { label: '6am-12pm', start: 6, end: 12 },
  { label: '12pm-6pm', start: 12, end: 18 },
  { label: '6pm-12am', start: 18, end: 24 }
];

export class CrossPlatformPatternAnalyzer {
  private data: CrossPlatformMetric[];
  private userId: string;

  constructor(data: CrossPlatformMetric[], userId: string) {
    this.data = data;
    this.userId = userId;
  }

  analyzeDataAvailability(): DataAvailability {
    if (this.data.length === 0) {
      return {
        level: 'minimal',
        daysAvailable: 0,
        oldestDataDate: '',
        newestDataDate: '',
        platformBreakdown: { facebook: 0, google: 0, tiktok: 0 },
        availableAnalyses: [],
        unavailableAnalyses: [
          'Day of Week Patterns',
          'Week over Week Trends',
          'Month over Month Analysis',
          'Seasonal Patterns',
          'Time of Day Optimization',
          'Budget Correlation',
          'Cross-Platform Correlation'
        ]
      };
    }

    const dates = this.data.map(d => d.date).sort();
    const uniqueDates = [...new Set(dates)];
    const daysAvailable = uniqueDates.length;

    const platformCounts: Record<AdPlatform, number> = { facebook: 0, google: 0, tiktok: 0 };
    for (const item of this.data) {
      platformCounts[item.platform]++;
    }

    let level: DataAvailabilityLevel;
    const availableAnalyses: string[] = [];
    const unavailableAnalyses: string[] = [];

    if (daysAvailable >= 90) {
      level = 'comprehensive';
      availableAnalyses.push(
        'Day of Week Patterns',
        'Week over Week Trends',
        'Month over Month Analysis',
        'Seasonal Patterns',
        'Time of Day Optimization',
        'Budget Correlation',
        'Cross-Platform Correlation'
      );
    } else if (daysAvailable >= 30) {
      level = 'moderate';
      availableAnalyses.push(
        'Day of Week Patterns',
        'Week over Week Trends',
        'Month over Month Analysis',
        'Time of Day Optimization',
        'Budget Correlation',
        'Cross-Platform Correlation'
      );
      unavailableAnalyses.push('Seasonal Patterns');
    } else if (daysAvailable >= 7) {
      level = 'basic';
      availableAnalyses.push(
        'Day of Week Patterns (limited)',
        'Week over Week Trends',
        'Time of Day Optimization (limited)'
      );
      unavailableAnalyses.push(
        'Month over Month Analysis',
        'Seasonal Patterns',
        'Budget Correlation',
        'Cross-Platform Correlation'
      );
    } else {
      level = 'minimal';
      availableAnalyses.push('Basic Metrics Only');
      unavailableAnalyses.push(
        'Day of Week Patterns',
        'Week over Week Trends',
        'Month over Month Analysis',
        'Seasonal Patterns',
        'Time of Day Optimization',
        'Budget Correlation',
        'Cross-Platform Correlation'
      );
    }

    return {
      level,
      daysAvailable,
      oldestDataDate: uniqueDates[0],
      newestDataDate: uniqueDates[uniqueDates.length - 1],
      platformBreakdown: platformCounts,
      availableAnalyses,
      unavailableAnalyses
    };
  }

  analyzeDayOfWeekPatterns(platform?: AdPlatform): DayOfWeekPattern[] {
    const filteredData = platform
      ? this.data.filter(d => d.platform === platform)
      : this.data;

    const platforms = platform ? [platform] : ['facebook', 'google', 'tiktok'] as AdPlatform[];
    const patterns: DayOfWeekPattern[] = [];

    for (const plat of platforms) {
      const platformData = filteredData.filter(d => d.platform === plat);

      for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
        const dayData = platformData.filter(d => {
          const date = new Date(d.date);
          return date.getDay() === dayIndex;
        });

        if (dayData.length === 0) continue;

        const totalNetProfit = dayData.reduce((sum, d) => sum + d.netProfit, 0);
        const totalSpend = dayData.reduce((sum, d) => sum + d.adSpend, 0);
        const totalConversions = dayData.reduce((sum, d) => sum + d.conversions, 0);

        patterns.push({
          dayIndex,
          dayName: DAY_NAMES[dayIndex],
          avgNetProfit: totalNetProfit / dayData.length,
          avgSpend: totalSpend / dayData.length,
          avgConversions: totalConversions / dayData.length,
          profitPerDollar: totalSpend > 0 ? totalNetProfit / totalSpend : 0,
          dataPoints: dayData.length,
          platform: plat
        });
      }
    }

    return patterns;
  }

  analyzeTimeOfDayPatterns(platform?: AdPlatform): TimeOfDayPattern[] {
    const filteredData = platform
      ? this.data.filter(d => d.platform === platform)
      : this.data;

    const platforms = platform ? [platform] : ['facebook', 'google', 'tiktok'] as AdPlatform[];
    const patterns: TimeOfDayPattern[] = [];

    for (const plat of platforms) {
      const platformData = filteredData.filter(d => d.platform === plat);

      if (platformData.length === 0) continue;

      for (const bucket of HOUR_BUCKETS) {
        let totalNetProfit = 0;
        let totalSpend = 0;
        let totalDailySpend = 0;
        let count = 0;

        for (const day of platformData) {
          let bucketNetProfit = 0;
          let bucketSpend = 0;

          for (let h = bucket.start; h < bucket.end; h++) {
            bucketNetProfit += day.hourlyNetProfit[h] || 0;
            bucketSpend += day.hourlySpend[h] || 0;
          }

          totalNetProfit += bucketNetProfit;
          totalSpend += bucketSpend;
          totalDailySpend += day.adSpend;
          count++;
        }

        if (count === 0) continue;

        patterns.push({
          hourBucket: bucket.label,
          startHour: bucket.start,
          endHour: bucket.end,
          avgNetProfit: totalNetProfit / count,
          avgSpend: totalSpend / count,
          percentOfDailySpend: totalDailySpend > 0 ? (totalSpend / totalDailySpend) * 100 : 0,
          profitPerDollar: totalSpend > 0 ? totalNetProfit / totalSpend : 0,
          platform: plat
        });
      }
    }

    return patterns;
  }

  analyzeWeekOverWeekTrends(): WeekOverWeekTrend[] {
    const trends: WeekOverWeekTrend[] = [];
    const platforms = ['facebook', 'google', 'tiktok'] as AdPlatform[];

    const sortedDates = [...new Set(this.data.map(d => d.date))].sort();
    if (sortedDates.length < 14) return trends;

    const latestDate = new Date(sortedDates[sortedDates.length - 1]);

    for (const platform of platforms) {
      const platformData = this.data.filter(d => d.platform === platform);

      const currentWeekData = platformData.filter(d => {
        const date = new Date(d.date);
        const diffDays = Math.floor((latestDate.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
        return diffDays >= 0 && diffDays < 7;
      });

      const previousWeekData = platformData.filter(d => {
        const date = new Date(d.date);
        const diffDays = Math.floor((latestDate.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
        return diffDays >= 7 && diffDays < 14;
      });

      const fourWeekData = platformData.filter(d => {
        const date = new Date(d.date);
        const diffDays = Math.floor((latestDate.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
        return diffDays >= 0 && diffDays < 28;
      });

      if (currentWeekData.length === 0 || previousWeekData.length === 0) continue;

      const sumMetrics = (data: CrossPlatformMetric[]) => ({
        netProfit: data.reduce((sum, d) => sum + d.netProfit, 0),
        spend: data.reduce((sum, d) => sum + d.adSpend, 0),
        conversions: data.reduce((sum, d) => sum + d.conversions, 0),
        netRoas: data.reduce((sum, d) => sum + d.adSpend, 0) > 0
          ? data.reduce((sum, d) => sum + d.netProfit, 0) / data.reduce((sum, d) => sum + d.adSpend, 0)
          : 0
      });

      const current = sumMetrics(currentWeekData);
      const previous = sumMetrics(previousWeekData);
      const fourWeekSum = sumMetrics(fourWeekData);
      const fourWeekAvg = {
        netProfit: fourWeekSum.netProfit / 4,
        spend: fourWeekSum.spend / 4,
        conversions: fourWeekSum.conversions / 4,
        netRoas: fourWeekSum.netRoas
      };

      const profitChange = current.netProfit - previous.netProfit;
      const spendChange = current.spend - previous.spend;

      const currentEfficiency = current.spend > 0 ? current.netProfit / current.spend : 0;
      const previousEfficiency = previous.spend > 0 ? previous.netProfit / previous.spend : 0;
      const efficiencyChange = currentEfficiency - previousEfficiency;

      let momentum: 'accelerating' | 'stable' | 'declining';
      if (profitChange > 0 && efficiencyChange > 0) {
        momentum = 'accelerating';
      } else if (profitChange < -previous.netProfit * 0.1) {
        momentum = 'declining';
      } else {
        momentum = 'stable';
      }

      trends.push({
        platform,
        currentWeek: current,
        previousWeek: previous,
        fourWeekAverage: fourWeekAvg,
        profitChange,
        profitChangePercent: previous.netProfit !== 0 ? (profitChange / Math.abs(previous.netProfit)) * 100 : 0,
        spendChange,
        spendChangePercent: previous.spend > 0 ? (spendChange / previous.spend) * 100 : 0,
        efficiencyChange,
        momentum
      });
    }

    return trends;
  }

  analyzeBudgetCorrelation(platform: AdPlatform): BudgetCorrelation | null {
    const platformData = this.data.filter(d => d.platform === platform && d.adSpend > 0);

    if (platformData.length < 20) return null;

    const sorted = [...platformData].sort((a, b) => a.adSpend - b.adSpend);
    const bucketSize = Math.ceil(sorted.length / 10);

    const buckets: Array<{
      minSpend: number;
      maxSpend: number;
      avgNetProfit: number;
      marginalReturn: number;
      dataPoints: number;
    }> = [];

    for (let i = 0; i < 10; i++) {
      const start = i * bucketSize;
      const end = Math.min(start + bucketSize, sorted.length);
      const bucketData = sorted.slice(start, end);

      if (bucketData.length === 0) continue;

      const totalSpend = bucketData.reduce((sum, d) => sum + d.adSpend, 0);
      const totalProfit = bucketData.reduce((sum, d) => sum + d.netProfit, 0);

      buckets.push({
        minSpend: Math.min(...bucketData.map(d => d.adSpend)),
        maxSpend: Math.max(...bucketData.map(d => d.adSpend)),
        avgNetProfit: totalProfit / bucketData.length,
        marginalReturn: totalSpend > 0 ? totalProfit / totalSpend : 0,
        dataPoints: bucketData.length
      });
    }

    let diminishingThreshold = buckets[buckets.length - 1]?.maxSpend || 0;
    let peakReturn = -Infinity;

    for (const bucket of buckets) {
      if (bucket.marginalReturn > peakReturn) {
        peakReturn = bucket.marginalReturn;
      } else if (bucket.marginalReturn < peakReturn * 0.8) {
        diminishingThreshold = bucket.minSpend;
        break;
      }
    }

    const optimalBuckets = buckets.filter(b => b.marginalReturn >= peakReturn * 0.9);

    return {
      platform,
      spendBuckets: buckets,
      optimalSpendRange: {
        min: optimalBuckets.length > 0 ? Math.min(...optimalBuckets.map(b => b.minSpend)) : 0,
        max: optimalBuckets.length > 0 ? Math.max(...optimalBuckets.map(b => b.maxSpend)) : 0
      },
      diminishingReturnsThreshold: diminishingThreshold
    };
  }

  analyzeCrossPlatformCorrelation(): CrossPlatformCorrelation[] {
    const platforms = ['facebook', 'google', 'tiktok'] as AdPlatform[];
    const correlations: CrossPlatformCorrelation[] = [];

    const dateMap = new Map<string, Record<AdPlatform, number>>();

    for (const item of this.data) {
      if (!dateMap.has(item.date)) {
        dateMap.set(item.date, {} as Record<AdPlatform, number>);
      }
      dateMap.get(item.date)![item.platform] = item.netProfit;
    }

    for (let i = 0; i < platforms.length; i++) {
      for (let j = i + 1; j < platforms.length; j++) {
        const platformA = platforms[i];
        const platformB = platforms[j];

        const pairData: Array<{ a: number; b: number }> = [];

        for (const [, profits] of dateMap) {
          if (profits[platformA] !== undefined && profits[platformB] !== undefined) {
            pairData.push({ a: profits[platformA], b: profits[platformB] });
          }
        }

        if (pairData.length < 14) continue;

        const meanA = pairData.reduce((sum, d) => sum + d.a, 0) / pairData.length;
        const meanB = pairData.reduce((sum, d) => sum + d.b, 0) / pairData.length;

        let numerator = 0;
        let denomA = 0;
        let denomB = 0;

        for (const d of pairData) {
          const diffA = d.a - meanA;
          const diffB = d.b - meanB;
          numerator += diffA * diffB;
          denomA += diffA * diffA;
          denomB += diffB * diffB;
        }

        const correlation = Math.sqrt(denomA * denomB) > 0
          ? numerator / Math.sqrt(denomA * denomB)
          : 0;

        let relationship: 'synergistic' | 'independent' | 'cannibalistic';
        let recommendation: string;

        if (correlation > 0.5) {
          relationship = 'synergistic';
          recommendation = `${platformA} and ${platformB} perform well together. Consider scaling both simultaneously.`;
        } else if (correlation < -0.3) {
          relationship = 'cannibalistic';
          recommendation = `${platformA} and ${platformB} may be competing for the same audience. Consider staggering campaigns.`;
        } else {
          relationship = 'independent';
          recommendation = `${platformA} and ${platformB} operate independently. Optimize each separately.`;
        }

        correlations.push({
          platformA,
          platformB,
          correlationCoefficient: Math.round(correlation * 100) / 100,
          relationship,
          recommendation
        });
      }
    }

    return correlations;
  }

  generateCrossPlatformSuggestions(): CrossPlatformSuggestion[] {
    const suggestions: CrossPlatformSuggestion[] = [];
    const availability = this.analyzeDataAvailability();

    if (availability.daysAvailable < 7) {
      return suggestions;
    }

    const allocation = calculatePlatformAllocation(this.data);
    const significantReallocation = allocation.filter(
      p => Math.abs(p.recommendedPct - p.currentPct) > 10
    );

    if (significantReallocation.length > 0) {
      const totalGain = significantReallocation.reduce((sum, p) => sum + Math.max(0, p.projectedGain), 0);
      const bestPlatform = allocation[0];
      const worstPlatform = allocation[allocation.length - 1];

      suggestions.push({
        id: `realloc-${Date.now()}`,
        type: 'cross_platform_budget_reallocation',
        title: 'Optimize Budget Distribution Across Platforms',
        message: `${bestPlatform.platform} generates $${bestPlatform.netProfitPerDollar.toFixed(2)} net profit per dollar spent, while ${worstPlatform.platform} returns only $${worstPlatform.netProfitPerDollar.toFixed(2)}. Your current budget split is suboptimal. Reallocating to ${allocation.map(p => `${p.platform}: ${p.recommendedPct}%`).join(', ')} would increase monthly net profit by an estimated $${(totalGain * 30 / availability.daysAvailable).toFixed(0)}.`,
        platforms: allocation.map(p => p.platform),
        priority: 90,
        confidence: Math.min(95, 60 + availability.daysAvailable * 0.3),
        dataConfidence: {
          level: availability.level,
          daysAnalyzed: availability.daysAvailable,
          dataPointsUsed: this.data.length
        },
        estimatedImpact: {
          monthlyNetProfitChange: totalGain * 30 / availability.daysAvailable,
          percentageChange: 15,
          timeframeDays: 30
        },
        actionable: true,
        actions: allocation.map(p => ({
          id: `realloc-${p.platform}`,
          type: 'reallocate_budget' as const,
          platform: p.platform,
          entityType: 'campaign' as const,
          entityId: 'all',
          entityName: `All ${p.platform} campaigns`,
          description: `Adjust ${p.platform} budget from ${p.currentPct}% to ${p.recommendedPct}%`,
          parameters: {
            currentAllocation: p.currentPct,
            recommendedAllocation: p.recommendedPct,
            currentSpend: p.currentSpend
          },
          estimatedImpact: p.projectedGain,
          requiresConfirmation: true
        })),
        patternEvidence: { allocation }
      });
    }

    const timePatterns = this.analyzeTimeOfDayPatterns();
    for (const platform of ['facebook', 'google', 'tiktok'] as AdPlatform[]) {
      const platformPatterns = timePatterns.filter(p => p.platform === platform);
      const unprofitableBuckets = platformPatterns.filter(p => p.profitPerDollar < 0);

      if (unprofitableBuckets.length > 0) {
        const totalWastedSpend = unprofitableBuckets.reduce((sum, b) => sum + Math.abs(b.avgSpend * b.profitPerDollar), 0);
        const monthlyWaste = totalWastedSpend * 30 / availability.daysAvailable;

        suggestions.push({
          id: `time-opt-${platform}-${Date.now()}`,
          type: 'cross_platform_time_optimization',
          title: `Optimize ${platform} Ad Schedule`,
          message: `Your ${unprofitableBuckets.map(b => b.hourBucket).join(' and ')} window${unprofitableBuckets.length > 1 ? 's' : ''} on ${platform} ${unprofitableBuckets.length > 1 ? 'are' : 'is'} generating negative returns. These time slots consume ${unprofitableBuckets.reduce((sum, b) => sum + b.percentOfDailySpend, 0).toFixed(0)}% of your daily budget but lose money. Scheduling ads to exclude these windows could save approximately $${monthlyWaste.toFixed(0)}/month.`,
          platforms: [platform],
          priority: 75,
          confidence: Math.min(90, 55 + availability.daysAvailable * 0.25),
          dataConfidence: {
            level: availability.level,
            daysAnalyzed: availability.daysAvailable,
            dataPointsUsed: platformPatterns.length * availability.daysAvailable
          },
          estimatedImpact: {
            monthlyNetProfitChange: monthlyWaste,
            percentageChange: 8,
            timeframeDays: 30
          },
          actionable: true,
          actions: [{
            id: `schedule-${platform}`,
            type: 'update_schedule',
            platform,
            entityType: 'ad_set',
            entityId: 'top_spenders',
            entityName: 'Top spending ad sets',
            description: `Apply optimized schedule excluding ${unprofitableBuckets.map(b => b.hourBucket).join(', ')}`,
            parameters: {
              excludedHours: unprofitableBuckets.flatMap(b => {
                const hours = [];
                for (let h = b.startHour; h < b.endHour; h++) hours.push(h);
                return hours;
              })
            },
            estimatedImpact: monthlyWaste,
            requiresConfirmation: true
          }],
          patternEvidence: { unprofitableBuckets, platformPatterns }
        });
      }
    }

    const trends = this.analyzeWeekOverWeekTrends();
    for (const trend of trends) {
      if (trend.momentum === 'declining' && trend.profitChangePercent < -15) {
        suggestions.push({
          id: `trend-alert-${trend.platform}-${Date.now()}`,
          type: 'cross_platform_trend_alert',
          title: `${trend.platform} Performance Declining`,
          message: `Week-over-week: ${trend.platform} net profit is down ${Math.abs(trend.profitChangePercent).toFixed(0)}% (${trend.spendChangePercent > 0 ? 'despite' : 'with'} ${Math.abs(trend.spendChangePercent).toFixed(0)}% ${trend.spendChangePercent > 0 ? 'increased' : 'decreased'} spend). ${trend.efficiencyChange < 0 ? 'Efficiency has dropped significantly.' : ''} Consider pausing underperforming campaigns or shifting budget to better-performing platforms.`,
          platforms: [trend.platform],
          priority: 85,
          confidence: Math.min(88, 65 + availability.daysAvailable * 0.2),
          dataConfidence: {
            level: availability.level,
            daysAnalyzed: 14,
            dataPointsUsed: 14
          },
          estimatedImpact: {
            monthlyNetProfitChange: -trend.profitChange * 4,
            percentageChange: trend.profitChangePercent,
            timeframeDays: 7
          },
          actionable: true,
          patternEvidence: { trend }
        });
      }
    }

    return suggestions.sort((a, b) => b.priority - a.priority);
  }
}

export function createPatternAnalyzer(
  data: CrossPlatformMetric[],
  userId: string
): CrossPlatformPatternAnalyzer {
  return new CrossPlatformPatternAnalyzer(data, userId);
}
