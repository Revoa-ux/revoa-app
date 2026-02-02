import { supabase } from './supabase';
import { deepRexEngine, type DeepPatternAnalysis } from './deepRexAnalysisEngine';
import type { RexEntityType, CreateRexSuggestionParams, RexSuggestionReasoning } from '@/types/rex';

interface AdWithMetrics {
  id: string;
  name: string;
  platform: string;
  platform_ad_id: string;
  ad_account_id: string;
  total_spend: number;
  total_revenue: number;
  total_conversions: number;
  roas: number;
  profit: number;
}

export class IntelligentRexService {
  async generateIntelligentSuggestions(userId: string): Promise<CreateRexSuggestionParams[]> {
    console.log('[IntelligentRex] Generating intelligent suggestions for user:', userId);

    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const { data: adAccounts, error: accountsError } = await supabase
      .from('ad_accounts')
      .select('id')
      .eq('user_id', userId)
      .eq('status', 'active');

    if (accountsError || !adAccounts || adAccounts.length === 0) {
      console.log('[IntelligentRex] No active ad accounts found');
      return [];
    }

    const accountIds = adAccounts.map(a => a.id);

    const { data: adsWithMetrics, error: adsError } = await supabase
      .from('ads')
      .select(`
        id,
        name,
        platform,
        platform_ad_id,
        ad_account_id,
        ad_metrics!inner(
          spend,
          conversion_value,
          conversions
        )
      `)
      .in('ad_account_id', accountIds)
      .gte('ad_metrics.date', startDate)
      .lte('ad_metrics.date', endDate);

    if (adsError || !adsWithMetrics) {
      console.log('[IntelligentRex] Error fetching ads:', adsError);
      return [];
    }

    const adMetricsMap: Record<string, AdWithMetrics> = {};

    (adsWithMetrics as any[]).forEach((row: any) => {
      if (!adMetricsMap[row.id]) {
        adMetricsMap[row.id] = {
          id: row.id,
          name: row.name,
          platform: row.platform,
          platform_ad_id: row.platform_ad_id,
          ad_account_id: row.ad_account_id,
          total_spend: 0,
          total_revenue: 0,
          total_conversions: 0,
          roas: 0,
          profit: 0,
        };
      }

      const metrics = row.ad_metrics;
      adMetricsMap[row.id].total_spend += metrics.spend || 0;
      adMetricsMap[row.id].total_revenue += metrics.conversion_value || 0;
      adMetricsMap[row.id].total_conversions += metrics.conversions || 0;
    });

    Object.values(adMetricsMap).forEach(ad => {
      ad.roas = ad.total_spend > 0 ? ad.total_revenue / ad.total_spend : 0;
      ad.profit = ad.total_revenue - ad.total_spend;
    });

    const suggestions: CreateRexSuggestionParams[] = [];

    const topPerformers = Object.values(adMetricsMap)
      .filter(ad => ad.roas > 3 && ad.total_spend > 100)
      .sort((a, b) => b.roas - a.roas)
      .slice(0, 3);

    console.log('[IntelligentRex] Analyzing', topPerformers.length, 'top performers with deep intelligence');

    for (const ad of topPerformers) {
      const deepAnalysis = await deepRexEngine.generateDeepAnalysis(ad.id, startDate, endDate);

      if (!deepAnalysis) {
        console.log('[IntelligentRex] No deep analysis available for ad:', ad.name);
        continue;
      }

      const suggestion = this.createIntelligentSuggestion(
        userId,
        ad,
        deepAnalysis,
        startDate,
        endDate
      );

      if (suggestion) {
        suggestions.push(suggestion);
      }
    }

    console.log('[IntelligentRex] Generated', suggestions.length, 'intelligent suggestions');
    return suggestions;
  }

  private createIntelligentSuggestion(
    userId: string,
    ad: AdWithMetrics,
    analysis: DeepPatternAnalysis,
    startDate: string,
    endDate: string
  ): CreateRexSuggestionParams | null {
    const reasoning: RexSuggestionReasoning = {
      triggeredBy: ['deep_pattern_analysis', 'multi_dimensional_insights'],
      metrics: {
        roas: ad.roas,
        spend: ad.total_spend,
        revenue: ad.total_revenue,
        conversions: ad.total_conversions,
        profit: ad.profit,
        data_points_analyzed: analysis.dataPointsAnalyzed,
      },
      analysis: analysis.primaryInsight,
      riskLevel: analysis.urgencyLevel === 'critical' ? 'high' : analysis.urgencyLevel === 'high' ? 'medium' : 'low',
      supportingData: {
        demographics: analysis.supportingData.demographics,
        placements: analysis.supportingData.placements,
        geographic: analysis.supportingData.geographic,
        temporal: analysis.supportingData.temporal,
        crossDimensionalPattern: analysis.crossDimensionalPattern,
        methodology: analysis.methodology,
        confidenceIntervals: analysis.confidenceIntervals,
        sampleDataPoints: analysis.sampleDataPoints,
      },
    };

    const priorityScore = Math.min(
      100,
      50 +
        (analysis.urgencyLevel === 'critical' ? 40 : analysis.urgencyLevel === 'high' ? 30 : 20) +
        (analysis.patternType === 'hidden' ? 10 : 0)
    );

    const confidenceScore = Math.min(
      100,
      70 + (analysis.dataPointsAnalyzed > 50 ? 20 : analysis.dataPointsAnalyzed > 20 ? 10 : 5) +
        (analysis.crossDimensionalPattern ? 10 : 0)
    );

    let title = '';
    let message = '';
    let suggestionType = 'increase_budget';

    if (analysis.crossDimensionalPattern) {
      title = `Hidden Pattern Discovered: Scale "${ad.name}"`;
      message = `I found something incredible! ${analysis.primaryInsight}\n\nI analyzed ${analysis.dataPointsAnalyzed} data points and discovered this specific pattern: ${analysis.crossDimensionalPattern.specificity}. This is your golden combination with ${analysis.crossDimensionalPattern.roas.toFixed(1)}x ROAS.\n\nIf you scale this now, you could generate an additional $${analysis.financialImpact.ifImplemented.projectedProfit.toFixed(2)} in profit over the next ${analysis.financialImpact.ifImplemented.timeframe}. If you ignore it, you're leaving $${analysis.financialImpact.ifIgnored.lostOpportunity.toFixed(2)} on the table.`;
      suggestionType = 'scale_high_performer';
    } else if (analysis.urgencyLevel === 'high' || analysis.urgencyLevel === 'critical') {
      title = `Major Opportunity: Optimize "${ad.name}"`;
      message = `${analysis.primaryInsight}\n\nBased on deep analysis of ${analysis.dataPointsAnalyzed} data points, I've identified specific segments and placements that are crushing it. Your best performers are generating ${ad.roas.toFixed(1)}x ROAS.\n\nAction now could generate $${analysis.financialImpact.ifImplemented.projectedProfit.toFixed(2)} in additional profit. Waiting means missing out on $${analysis.financialImpact.ifIgnored.lostOpportunity.toFixed(2)}.`;
      suggestionType = 'optimize_targeting';
    } else {
      title = `Insights Available for "${ad.name}"`;
      message = `${analysis.primaryInsight}\n\nI've analyzed ${analysis.dataPointsAnalyzed} data points across demographics, placements, geography, and timing to understand what's working best.`;
      suggestionType = 'review_performance';
    }

    return {
      user_id: userId,
      entity_type: 'ad',
      entity_id: ad.id,
      entity_name: ad.name,
      platform: ad.platform,
      suggestion_type: suggestionType,
      priority_score: priorityScore,
      confidence_score: confidenceScore,
      title,
      message,
      reasoning,
      estimated_impact: {
        expectedRevenue: analysis.financialImpact.ifImplemented.projectedRevenue,
        expectedProfit: analysis.financialImpact.ifImplemented.projectedProfit,
        timeframeDays: 30,
        confidence: analysis.urgencyLevel === 'critical' ? 'high' : 'medium',
        breakdown: `Based on multi-dimensional pattern analysis across ${analysis.dataPointsAnalyzed} data points. If you implement this optimization, projections show ${analysis.financialImpact.ifImplemented.projectedROAS.toFixed(1)}x ROAS. If ignored, you risk settling for ${analysis.financialImpact.ifIgnored.worstCaseROAS.toFixed(1)}x ROAS.`,
      },
      recommended_rule: {
        name: `Rex: Smart Scale for ${ad.name}`,
        description: `Automatically scale budget when this ad hits optimal performance patterns`,
        entity_type: 'ad',
        condition_logic: 'AND',
        check_frequency_minutes: 360,
        max_daily_actions: 2,
        require_approval: true,
        dry_run: false,
        conditions: [
          {
            metric_type: 'roas',
            operator: 'greater_than',
            threshold_value: ad.roas * 0.9,
            time_window_days: 3,
          },
          {
            metric_type: 'conversions',
            operator: 'greater_than',
            threshold_value: 2,
            time_window_days: 1,
          },
        ],
        actions: [
          {
            action_type: 'increase_budget',
            parameters: {
              amount: 25,
              unit: 'percent',
              reason: 'Rex detected optimal performance patterns',
            },
          },
        ],
      },
    };
  }
}

export const intelligentRexService = new IntelligentRexService();
