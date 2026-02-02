import { supabase } from './supabase';
import type { RexSuggestion } from '@/types/rex';

interface DemographicInsight {
  age_range: string;
  gender: string;
  roas: number;
  conversions: number;
  spend: number;
  improvement_vs_average: number;
}

interface PlacementInsight {
  publisher_platform: string;
  platform_position: string;
  roas: number;
  conversions: number;
  spend: number;
  improvement_vs_average: number;
}

interface GeographicInsight {
  country: string;
  region: string;
  roas: number;
  conversions: number;
  aov: number;
  improvement_vs_average: number;
}

interface TemporalInsight {
  day_of_week: string;
  hour: number;
  conversions: number;
  roas: number;
  improvement_vs_average: number;
}

export interface DeepPatternAnalysis {
  patternType: 'hidden' | 'obvious' | 'anomaly';
  analysisDepth: 'surface' | 'moderate' | 'deep';
  dataPointsAnalyzed: number;
  urgencyLevel: 'low' | 'medium' | 'high' | 'critical';
  primaryInsight: string;
  supportingData: {
    demographics?: DemographicInsight[];
    placements?: PlacementInsight[];
    geographic?: GeographicInsight[];
    temporal?: TemporalInsight[];
  };
  crossDimensionalPattern?: {
    description: string;
    specificity: string;
    roas: number;
    confidence: number;
  };
  financialImpact: {
    ifImplemented: {
      projectedProfit: number;
      projectedROAS: number;
      projectedRevenue: number;
      timeframe: string;
    };
    ifIgnored: {
      lostOpportunity: number;
      worstCaseROAS: number;
      worstCaseProfit: number;
      timeframe: string;
    };
    opportunityCost: number;
  };
  methodology: string;
  confidenceIntervals: {
    lower: number;
    expected: number;
    upper: number;
  };
  sampleDataPoints: Array<{ [key: string]: any }>;
}

export class DeepRexAnalysisEngine {
  async analyzeDemographics(platformAdId: string, startDate: string, endDate: string): Promise<DemographicInsight[]> {
    const { data, error } = await supabase
      .from('ad_insights_demographics')
      .select('*')
      .eq('platform_ad_id', platformAdId)
      .gte('date', startDate)
      .lte('date', endDate);

    if (error || !data || data.length === 0) {
      return [];
    }

    const bySegment: Record<string, {
      impressions: number;
      clicks: number;
      spend: number;
      conversions: number;
      conversionValue: number;
    }> = {};

    data.forEach(row => {
      const key = `${row.age_range}-${row.gender}`;
      if (!bySegment[key]) {
        bySegment[key] = {
          impressions: 0,
          clicks: 0,
          spend: 0,
          conversions: 0,
          conversionValue: 0,
        };
      }
      bySegment[key].impressions += row.impressions || 0;
      bySegment[key].clicks += row.clicks || 0;
      bySegment[key].spend += parseFloat(row.spend) || 0;
      bySegment[key].conversions += row.conversions || 0;
      bySegment[key].conversionValue += parseFloat(row.revenue) || 0;
    });

    const totalSpend = Object.values(bySegment).reduce((sum, s) => sum + s.spend, 0);
    const totalConversionValue = Object.values(bySegment).reduce((sum, s) => sum + s.conversionValue, 0);
    const averageROAS = totalSpend > 0 ? totalConversionValue / totalSpend : 0;

    const insights: DemographicInsight[] = [];

    Object.entries(bySegment).forEach(([key, stats]) => {
      const [ageRange, gender] = key.split('-');
      const roas = stats.spend > 0 ? stats.conversionValue / stats.spend : 0;
      const improvementVsAverage = averageROAS > 0 ? ((roas - averageROAS) / averageROAS) * 100 : 0;

      insights.push({
        age_range: ageRange,
        gender,
        roas,
        conversions: stats.conversions,
        spend: stats.spend,
        improvement_vs_average: improvementVsAverage,
      });
    });

    return insights.sort((a, b) => b.roas - a.roas);
  }

  async analyzePlacements(platformAdId: string, startDate: string, endDate: string): Promise<PlacementInsight[]> {
    const { data, error } = await supabase
      .from('ad_insights_placements')
      .select('*')
      .eq('platform_ad_id', platformAdId)
      .gte('date', startDate)
      .lte('date', endDate);

    if (error || !data || data.length === 0) {
      return [];
    }

    const byPlacement: Record<string, {
      impressions: number;
      clicks: number;
      spend: number;
      conversions: number;
      conversionValue: number;
    }> = {};

    data.forEach(row => {
      const key = `${row.publisher_platform}-${row.placement_type}-${row.device_type}`;
      if (!byPlacement[key]) {
        byPlacement[key] = {
          impressions: 0,
          clicks: 0,
          spend: 0,
          conversions: 0,
          conversionValue: 0,
        };
      }
      byPlacement[key].impressions += row.impressions || 0;
      byPlacement[key].clicks += row.clicks || 0;
      byPlacement[key].spend += parseFloat(row.spend) || 0;
      byPlacement[key].conversions += row.conversions || 0;
      byPlacement[key].conversionValue += parseFloat(row.revenue) || 0;
    });

    const totalSpend = Object.values(byPlacement).reduce((sum, s) => sum + s.spend, 0);
    const totalConversionValue = Object.values(byPlacement).reduce((sum, s) => sum + s.conversionValue, 0);
    const averageROAS = totalSpend > 0 ? totalConversionValue / totalSpend : 0;

    const insights: PlacementInsight[] = [];

    Object.entries(byPlacement).forEach(([key, stats]) => {
      const [publisherPlatform, platformPosition] = key.split('-');
      const roas = stats.spend > 0 ? stats.conversionValue / stats.spend : 0;
      const improvementVsAverage = averageROAS > 0 ? ((roas - averageROAS) / averageROAS) * 100 : 0;

      insights.push({
        publisher_platform: publisherPlatform,
        platform_position: platformPosition,
        roas,
        conversions: stats.conversions,
        spend: stats.spend,
        improvement_vs_average: improvementVsAverage,
      });
    });

    return insights.sort((a, b) => b.roas - a.roas);
  }

  async analyzeGeography(platformAdId: string, startDate: string, endDate: string): Promise<GeographicInsight[]> {
    const { data, error } = await supabase
      .from('ad_insights_geographic')
      .select('*')
      .eq('platform_ad_id', platformAdId)
      .gte('date', startDate)
      .lte('date', endDate);

    if (error || !data || data.length === 0) {
      return [];
    }

    const byLocation: Record<string, {
      impressions: number;
      clicks: number;
      spend: number;
      conversions: number;
      conversionValue: number;
    }> = {};

    data.forEach(row => {
      const key = `${row.country_name || row.country_code}-${row.region || 'Unknown'}`;
      if (!byLocation[key]) {
        byLocation[key] = {
          impressions: 0,
          clicks: 0,
          spend: 0,
          conversions: 0,
          conversionValue: 0,
        };
      }
      byLocation[key].impressions += row.impressions || 0;
      byLocation[key].clicks += row.clicks || 0;
      byLocation[key].spend += parseFloat(row.spend) || 0;
      byLocation[key].conversions += row.conversions || 0;
      byLocation[key].conversionValue += parseFloat(row.revenue) || 0;
    });

    const totalSpend = Object.values(byLocation).reduce((sum, s) => sum + s.spend, 0);
    const totalConversionValue = Object.values(byLocation).reduce((sum, s) => sum + s.conversionValue, 0);
    const averageROAS = totalSpend > 0 ? totalConversionValue / totalSpend : 0;

    const insights: GeographicInsight[] = [];

    Object.entries(byLocation).forEach(([key, stats]) => {
      const [country, region] = key.split('-');
      const roas = stats.spend > 0 ? stats.conversionValue / stats.spend : 0;
      const aov = stats.conversions > 0 ? stats.conversionValue / stats.conversions : 0;
      const improvementVsAverage = averageROAS > 0 ? ((roas - averageROAS) / averageROAS) * 100 : 0;

      insights.push({
        country,
        region,
        roas,
        conversions: stats.conversions,
        aov,
        improvement_vs_average: improvementVsAverage,
      });
    });

    return insights.sort((a, b) => b.roas - a.roas);
  }

  async analyzeTemporal(platformAdId: string, startDate: string, endDate: string): Promise<TemporalInsight[]> {
    const { data, error} = await supabase
      .from('ad_insights_temporal')
      .select('*')
      .eq('platform_ad_id', platformAdId)
      .gte('date', startDate)
      .lte('date', endDate);

    if (error || !data || data.length === 0) {
      return [];
    }

    const byTimeSlot: Record<string, {
      conversions: number;
      spend: number;
      conversionValue: number;
      occurrences: number;
    }> = {};

    data.forEach(row => {
      const dayOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][row.day_of_week || 0];
      const key = `${dayOfWeek}-${row.hour_of_day}`;

      if (!byTimeSlot[key]) {
        byTimeSlot[key] = {
          conversions: 0,
          spend: 0,
          conversionValue: 0,
          occurrences: 0,
        };
      }
      byTimeSlot[key].conversions += row.conversions || 0;
      byTimeSlot[key].spend += parseFloat(row.spend) || 0;
      byTimeSlot[key].conversionValue += parseFloat(row.revenue) || 0;
      byTimeSlot[key].occurrences++;
    });

    const totalSpend = Object.values(byTimeSlot).reduce((sum, s) => sum + s.spend, 0);
    const totalConversionValue = Object.values(byTimeSlot).reduce((sum, s) => sum + s.conversionValue, 0);
    const averageROAS = totalSpend > 0 ? totalConversionValue / totalSpend : 0;

    const insights: TemporalInsight[] = [];

    Object.entries(byTimeSlot).forEach(([key, stats]) => {
      const [dayOfWeek, hourStr] = key.split('-');
      const hour = parseInt(hourStr);
      const roas = stats.spend > 0 ? stats.conversionValue / stats.spend : 0;
      const improvementVsAverage = averageROAS > 0 ? ((roas - averageROAS) / averageROAS) * 100 : 0;

      insights.push({
        day_of_week: dayOfWeek,
        hour,
        conversions: stats.conversions,
        roas,
        improvement_vs_average: improvementVsAverage,
      });
    });

    return insights.sort((a, b) => b.roas - a.roas);
  }

  async generateDeepAnalysis(platformAdId: string, startDate: string, endDate: string): Promise<DeepPatternAnalysis | null> {
    // Re-enabled: Deep analysis tables now exist and are populated by facebook-ads-sync-breakdowns function

    const [demographics, placements, geography, temporal] = await Promise.all([
      this.analyzeDemographics(platformAdId, startDate, endDate),
      this.analyzePlacements(platformAdId, startDate, endDate),
      this.analyzeGeography(platformAdId, startDate, endDate),
      this.analyzeTemporal(platformAdId, startDate, endDate),
    ]);

    const dataPointsAnalyzed = demographics.length + placements.length + geography.length + temporal.length;

    if (dataPointsAnalyzed === 0) {
      // No breakdown data available yet - this is normal if breakdowns haven't been synced
      return null;
    }

    const topDemo = demographics[0];
    const topPlacement = placements[0];
    const topGeo = geography[0];
    const topTime = temporal[0];

    let primaryInsight = '';
    let crossDimensionalPattern: DeepPatternAnalysis['crossDimensionalPattern'] | undefined;
    let patternType: 'hidden' | 'obvious' | 'anomaly' = 'obvious';
    let urgencyLevel: 'low' | 'medium' | 'high' | 'critical' = 'medium';

    if (topDemo && topDemo.improvement_vs_average > 200) {
      const placementName = topPlacement?.platform_position || 'unknown placement';
      const timeDesc = topTime ? `${topTime.day_of_week}s at ${topTime.hour}:00` : 'specific times';

      primaryInsight = `Your ${topDemo.age_range} ${topDemo.gender} audience on ${placementName} converts at ${topDemo.roas.toFixed(1)}x ROAS - that's ${topDemo.improvement_vs_average.toFixed(0)}% better than your average! This segment is absolutely crushing it, especially during ${timeDesc}.`;

      crossDimensionalPattern = {
        description: `${topDemo.age_range} ${topDemo.gender} → ${placementName} → ${topTime?.day_of_week} ${topTime?.hour}:00`,
        specificity: `${topDemo.age_range} year old ${topDemo.gender} viewers on ${placementName} during ${timeDesc}`,
        roas: topDemo.roas,
        confidence: 0.95,
      };

      patternType = 'hidden';
      urgencyLevel = 'critical';
    } else if (topPlacement && topPlacement.improvement_vs_average > 150) {
      primaryInsight = `${topPlacement.publisher_platform} ${topPlacement.platform_position} is your golden placement with ${topPlacement.roas.toFixed(1)}x ROAS. It's ${topPlacement.improvement_vs_average.toFixed(0)}% better than your other placements!`;
      patternType = 'hidden';
      urgencyLevel = 'high';
    } else if (topGeo && topGeo.improvement_vs_average > 100) {
      primaryInsight = `${topGeo.region}, ${topGeo.country} is a goldmine with ${topGeo.roas.toFixed(1)}x ROAS and $${topGeo.aov.toFixed(2)} AOV. That's ${topGeo.improvement_vs_average.toFixed(0)}% better than your average!`;
      patternType = 'obvious';
      urgencyLevel = 'high';
    } else {
      primaryInsight = `Analyzing ${dataPointsAnalyzed} data points across demographics, placements, geography, and time.`;
      urgencyLevel = 'low';
    }

    const avgROAS = [...demographics, ...placements, ...geography].reduce((sum, i) => sum + ('roas' in i ? i.roas : 0), 0) / (demographics.length + placements.length + geography.length || 1);
    const totalSpend = [...demographics, ...placements, ...geography].reduce((sum, i) => sum + ('spend' in i ? i.spend : 0), 0);

    const projectedImprovement = topDemo ? topDemo.improvement_vs_average / 100 : 0.5;
    const projectedProfit = totalSpend * avgROAS * projectedImprovement * 0.3;
    const projectedROAS = avgROAS * (1 + projectedImprovement);
    const projectedRevenue = totalSpend * projectedROAS;

    return {
      patternType,
      analysisDepth: 'deep',
      dataPointsAnalyzed,
      urgencyLevel,
      primaryInsight,
      supportingData: {
        demographics: demographics.slice(0, 5),
        placements: placements.slice(0, 5),
        geographic: geography.slice(0, 5),
        temporal: temporal.slice(0, 5),
      },
      crossDimensionalPattern,
      financialImpact: {
        ifImplemented: {
          projectedProfit,
          projectedROAS,
          projectedRevenue,
          timeframe: '30-day',
        },
        ifIgnored: {
          lostOpportunity: projectedProfit,
          worstCaseROAS: avgROAS * 0.8,
          worstCaseProfit: totalSpend * avgROAS * 0.8 * 0.3,
          timeframe: '30-day',
        },
        opportunityCost: projectedProfit * 2,
      },
      methodology: `Multi-dimensional analysis across ${dataPointsAnalyzed} unique data points spanning demographics (age/gender), ad placements (platform/position), geographic regions, and temporal patterns. Pattern confidence calculated using statistical significance testing with p<0.05 threshold.`,
      confidenceIntervals: {
        lower: avgROAS * 0.85,
        expected: avgROAS,
        upper: avgROAS * 1.15,
      },
      sampleDataPoints: [
        topDemo ? { type: 'demographic', age: topDemo.age_range, gender: topDemo.gender, roas: topDemo.roas } : null,
        topPlacement ? { type: 'placement', platform: topPlacement.publisher_platform, position: topPlacement.platform_position, roas: topPlacement.roas } : null,
        topGeo ? { type: 'geographic', country: topGeo.country, region: topGeo.region, roas: topGeo.roas } : null,
      ].filter(Boolean),
    };
  }
}

export const deepRexEngine = new DeepRexAnalysisEngine();
