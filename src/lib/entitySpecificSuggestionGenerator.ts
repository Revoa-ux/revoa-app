import type { RexSuggestionWithPerformance, RexSuggestionReasoning, RexRecommendedRule, RexEstimatedImpact, RexEntityType } from '@/types/rex';

interface EntityMetrics {
  id: string;
  name: string;
  platform: string;
  status: string;
  spend: number;
  revenue: number;
  roas: number;
  profit?: number;
  conversions: number;
  cpa?: number;
  ctr?: number;
  impressions?: number;
  clicks?: number;
}

interface Benchmarks {
  avgRoas: number;
  avgCpa?: number;
  avgCtr?: number;
  profitMarginTarget: number;
}

/**
 * Generates entity-specific suggestions in real-time based on current performance
 * This is used when clicking on a specific row to get immediate, tailored recommendations
 */
export class EntitySpecificSuggestionGenerator {

  /**
   * Generate a real-time suggestion for a specific entity
   */
  generateSuggestion(
    entityMetrics: EntityMetrics,
    entityType: RexEntityType,
    benchmarks: Benchmarks,
    accountBenchmarks?: Record<string, number>
  ): RexSuggestionWithPerformance | null {
    const { spend, revenue, roas, profit, conversions, cpa, ctr } = entityMetrics;

    // Determine suggestion type based on performance
    if (roas >= 2.5 && spend >= 50) {
      return this.generateScaleOpportunity(entityMetrics, entityType, benchmarks);
    } else if (roas < 1 && spend >= 100) {
      return this.generatePauseRecommendation(entityMetrics, entityType, benchmarks);
    } else if (roas < benchmarks.avgRoas * 0.7 && spend >= 50) {
      return this.generateUnderperformerAlert(entityMetrics, entityType, benchmarks);
    } else if (profit && profit < 0 && spend >= 100) {
      return this.generateNegativeROIAlert(entityMetrics, entityType, benchmarks);
    } else if (cpa && benchmarks.avgCpa && cpa > benchmarks.avgCpa * 1.5) {
      return this.generateHighCPAAlert(entityMetrics, entityType, benchmarks);
    } else if (ctr && benchmarks.avgCtr && ctr < benchmarks.avgCtr * 0.5) {
      return this.generateLowCTRAlert(entityMetrics, entityType, benchmarks);
    } else if (roas >= 1.5 && roas < 2.5 && spend >= 50) {
      return this.generateOptimizeOpportunity(entityMetrics, entityType, benchmarks);
    }

    return null;
  }

  private generateScaleOpportunity(
    metrics: EntityMetrics,
    entityType: RexEntityType,
    benchmarks: Benchmarks
  ): RexSuggestionWithPerformance {
    const roasVsBenchmark = ((metrics.roas / benchmarks.avgRoas) - 1) * 100;
    const currentProfit = metrics.profit || (metrics.revenue - metrics.spend);
    const profitMargin = (currentProfit / metrics.revenue) * 100;

    const suggestedBudgetIncrease = metrics.spend * 0.50; // 50% increase
    const projectedRevenue = suggestedBudgetIncrease * metrics.roas;
    const projectedProfit = projectedRevenue - suggestedBudgetIncrease;

    const reasoning: RexSuggestionReasoning = {
      triggeredBy: ['high_roas', 'profitable_performance'],
      metrics: {
        roas: metrics.roas,
        spend: metrics.spend,
        revenue: metrics.revenue,
        conversions: metrics.conversions,
        profit: currentProfit,
      },
      primaryInsight: `This ${entityType.replace('_', ' ')} is a strong performer with ${metrics.roas.toFixed(2)}x ROAS—${roasVsBenchmark >= 0 ? roasVsBenchmark.toFixed(0) + '%' : ''} ${roasVsBenchmark >= 0 ? 'above' : 'below'} your account average. With ${metrics.conversions} conversions and a ${profitMargin.toFixed(1)}% profit margin, it has room to scale.`,
      analysis: `Based on current performance metrics, this entity is delivering consistent returns. The ${metrics.roas.toFixed(2)}x ROAS indicates strong product-market fit with your audience. At $${metrics.spend.toFixed(2)} in spend generating $${metrics.revenue.toFixed(2)}, you're seeing efficient customer acquisition.`,
      riskLevel: 'low',
      urgency: 'medium',
      patternType: 'obvious',
      analysisDepth: 'standard',
      dataPointsAnalyzed: Math.floor(metrics.conversions * 12),
      methodology: 'Performance-based analysis comparing current metrics against account benchmarks and profitability thresholds.',
    };

    const recommendedRule: RexRecommendedRule = {
      name: `Protect High Performer: ${metrics.name}`,
      description: `Automatically monitor this ${entityType.replace('_', ' ')}'s performance and protect your profits. If ROAS drops below ${(metrics.roas * 0.75).toFixed(2)}x or spend exceeds targets, you'll be alerted immediately.`,
      entity_type: entityType,
      condition_logic: 'OR',
      check_frequency_minutes: 360,
      max_daily_actions: 2,
      require_approval: false,
      dry_run: false,
      conditions: [
        {
          metric_type: 'roas',
          operator: 'less_than',
          threshold_value: metrics.roas * 0.75,
          time_window_days: 3
        },
        {
          metric_type: 'cpa',
          operator: 'greater_than',
          threshold_value: (metrics.cpa || 50) * 1.3,
          time_window_days: 3
        }
      ],
      actions: [
        {
          action_type: 'reduce_budget',
          parameters: { reduction_percentage: 30 }
        },
        {
          action_type: 'send_notification',
          parameters: {
            message: `Performance alert: ${metrics.name} ROAS dropped below threshold`,
            channel: 'email'
          }
        }
      ]
    };

    const estimatedImpact: RexEstimatedImpact = {
      revenueImpact: `+$${projectedRevenue.toFixed(2)}/day`,
      profitImpact: `+$${projectedProfit.toFixed(2)}/day`,
      timeframeWeeks: 2,
      confidenceLevel: metrics.conversions >= 20 ? 'high' : metrics.conversions >= 10 ? 'medium' : 'moderate'
    };

    return {
      id: `temp-${metrics.id}-${Date.now()}`,
      user_id: 'temp',
      entity_type: entityType,
      entity_id: metrics.id,
      entity_name: metrics.name,
      platform: metrics.platform as any,
      platform_entity_id: metrics.id,
      suggestion_type: 'scale_high_performer',
      priority_score: 85,
      confidence_score: 85,
      status: 'viewed',
      title: `Scale This High Performer`,
      message: `${metrics.name} is delivering ${metrics.roas.toFixed(2)}x ROAS with strong profit margins. Consider increasing budget by 50% to $${(metrics.spend * 1.5).toFixed(2)}/day to capture more high-quality conversions while maintaining efficiency.`,
      reasoning,
      recommended_rule: recommendedRule,
      estimated_impact: estimatedImpact,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      viewed_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      performance: {
        current_roas: metrics.roas,
        current_spend: metrics.spend,
        current_conversions: metrics.conversions,
        performance_change_percent: roasVsBenchmark
      }
    };
  }

  private generatePauseRecommendation(
    metrics: EntityMetrics,
    entityType: RexEntityType,
    benchmarks: Benchmarks
  ): RexSuggestionWithPerformance {
    const lossAmount = metrics.revenue - metrics.spend;
    const dailyLoss = lossAmount / 30;

    const reasoning: RexSuggestionReasoning = {
      triggeredBy: ['negative_roi', 'inefficient_spend'],
      metrics: {
        roas: metrics.roas,
        spend: metrics.spend,
        revenue: metrics.revenue,
        conversions: metrics.conversions,
        profit: lossAmount,
      },
      primaryInsight: `This ${entityType.replace('_', ' ')} is burning money at ${metrics.roas.toFixed(2)}x ROAS. With $${metrics.spend.toFixed(2)} spent generating only $${metrics.revenue.toFixed(2)} in revenue, you're losing $${Math.abs(lossAmount).toFixed(2)} (~$${Math.abs(dailyLoss).toFixed(2)}/day).`,
      analysis: `After ${metrics.conversions} conversions, the data is clear: this isn't working. Every dollar spent returns only ${metrics.roas.toFixed(2)} cents. Continuing to run this means throwing money away.`,
      riskLevel: 'high',
      urgency: 'critical',
      patternType: 'obvious',
      analysisDepth: 'standard',
      dataPointsAnalyzed: Math.floor(metrics.conversions * 12),
      methodology: 'ROI analysis with profitability assessment against minimum viability thresholds.',
    };

    const recommendedRule: RexRecommendedRule = {
      name: `Auto-Pause Underperformers Like ${metrics.name}`,
      description: `Automatically pause ${entityType.replace('_', ' ')}s when ROAS falls below 1.0x for more than 3 days. This prevents wasted spend on unprofitable traffic.`,
      entity_type: entityType,
      condition_logic: 'AND',
      check_frequency_minutes: 240,
      max_daily_actions: 3,
      require_approval: false,
      dry_run: false,
      conditions: [
        {
          metric_type: 'roas',
          operator: 'less_than',
          threshold_value: 1.0,
          time_window_days: 3
        },
        {
          metric_type: 'spend',
          operator: 'greater_than',
          threshold_value: 50,
          time_window_days: 3
        }
      ],
      actions: [
        {
          action_type: 'pause',
          parameters: {}
        },
        {
          action_type: 'send_notification',
          parameters: {
            message: `Auto-paused: ${metrics.name} - ROAS below 1.0x`,
            channel: 'email'
          }
        }
      ]
    };

    const estimatedImpact: RexEstimatedImpact = {
      revenueImpact: `-$${metrics.revenue.toFixed(2)}/month`,
      profitImpact: `+$${Math.abs(dailyLoss * 30).toFixed(2)}/month (savings)`,
      timeframeWeeks: 1,
      confidenceLevel: 'high'
    };

    return {
      id: `temp-${metrics.id}-${Date.now()}`,
      user_id: 'temp',
      entity_type: entityType,
      entity_id: metrics.id,
      entity_name: metrics.name,
      platform: metrics.platform as any,
      platform_entity_id: metrics.id,
      suggestion_type: 'pause_underperforming',
      priority_score: 95,
      confidence_score: 90,
      status: 'viewed',
      title: `Pause This Money Burner`,
      message: `${metrics.name} is losing $${Math.abs(dailyLoss).toFixed(2)}/day with ${metrics.roas.toFixed(2)}x ROAS. Pausing immediately would save $${Math.abs(dailyLoss * 30).toFixed(2)}/month while you fix the targeting, creative, or offer.`,
      reasoning,
      recommended_rule: recommendedRule,
      estimated_impact: estimatedImpact,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      viewed_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      performance: {
        current_roas: metrics.roas,
        current_spend: metrics.spend,
        current_conversions: metrics.conversions,
        performance_change_percent: ((metrics.roas / benchmarks.avgRoas) - 1) * 100
      }
    };
  }

  private generateUnderperformerAlert(
    metrics: EntityMetrics,
    entityType: RexEntityType,
    benchmarks: Benchmarks
  ): RexSuggestionWithPerformance {
    const performanceGap = ((metrics.roas / benchmarks.avgRoas) - 1) * 100;

    const reasoning: RexSuggestionReasoning = {
      triggeredBy: ['below_benchmark_performance'],
      metrics: {
        roas: metrics.roas,
        spend: metrics.spend,
        revenue: metrics.revenue,
        conversions: metrics.conversions,
      },
      primaryInsight: `This ${entityType.replace('_', ' ')} is underperforming your account average by ${Math.abs(performanceGap).toFixed(0)}%. At ${metrics.roas.toFixed(2)}x ROAS vs your ${benchmarks.avgRoas.toFixed(2)}x average, it's dragging down overall performance.`,
      analysis: `With ${metrics.conversions} conversions and $${metrics.spend.toFixed(2)} spent, there's enough data to see the pattern. While not a total loss, this is inefficient compared to your better performers.`,
      riskLevel: 'medium',
      urgency: 'medium',
      patternType: 'obvious',
      analysisDepth: 'standard',
      dataPointsAnalyzed: Math.floor(metrics.conversions * 10),
      methodology: 'Comparative analysis against account benchmarks and peer performance.',
    };

    const recommendedRule: RexRecommendedRule = {
      name: `Monitor Underperformer: ${metrics.name}`,
      description: `Watch this ${entityType.replace('_', ' ')} and reduce budget if performance doesn't improve. If ROAS stays below ${(benchmarks.avgRoas * 0.8).toFixed(2)}x for 5 days, automatically cut spend by 40%.`,
      entity_type: entityType,
      condition_logic: 'AND',
      check_frequency_minutes: 480,
      max_daily_actions: 1,
      require_approval: false,
      dry_run: false,
      conditions: [
        {
          metric_type: 'roas',
          operator: 'less_than',
          threshold_value: benchmarks.avgRoas * 0.8,
          time_window_days: 5
        }
      ],
      actions: [
        {
          action_type: 'reduce_budget',
          parameters: { reduction_percentage: 40 }
        }
      ]
    };

    const estimatedImpact: RexEstimatedImpact = {
      revenueImpact: `Reallocate $${(metrics.spend * 0.5).toFixed(2)} to better performers`,
      profitImpact: `+$${((benchmarks.avgRoas - metrics.roas) * metrics.spend * 0.5).toFixed(2)}/month`,
      timeframeWeeks: 2,
      confidenceLevel: 'medium'
    };

    return {
      id: `temp-${metrics.id}-${Date.now()}`,
      user_id: 'temp',
      entity_type: entityType,
      entity_id: metrics.id,
      entity_name: metrics.name,
      platform: metrics.platform as any,
      platform_entity_id: metrics.id,
      suggestion_type: 'review_underperformer',
      priority_score: 70,
      confidence_score: 75,
      status: 'viewed',
      title: `Review This Underperformer`,
      message: `${metrics.name} is delivering ${metrics.roas.toFixed(2)}x ROAS—${Math.abs(performanceGap).toFixed(0)}% below your ${benchmarks.avgRoas.toFixed(2)}x average. Consider reducing budget by 50% and reallocating to higher performers, or testing new creative/targeting.`,
      reasoning,
      recommended_rule: recommendedRule,
      estimated_impact: estimatedImpact,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      viewed_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      performance: {
        current_roas: metrics.roas,
        current_spend: metrics.spend,
        current_conversions: metrics.conversions,
        performance_change_percent: performanceGap
      }
    };
  }

  private generateNegativeROIAlert(
    metrics: EntityMetrics,
    entityType: RexEntityType,
    benchmarks: Benchmarks
  ): RexSuggestionWithPerformance {
    const profit = metrics.profit || 0;

    const reasoning: RexSuggestionReasoning = {
      triggeredBy: ['negative_profit'],
      metrics: {
        roas: metrics.roas,
        spend: metrics.spend,
        revenue: metrics.revenue,
        conversions: metrics.conversions,
        profit,
      },
      primaryInsight: `Despite ${metrics.conversions} conversions, this ${entityType.replace('_', ' ')} is losing $${Math.abs(profit).toFixed(2)}. The math doesn't work—you need ${((metrics.spend / metrics.revenue) * 100).toFixed(0)}% better ROAS just to break even.`,
      analysis: `At ${metrics.roas.toFixed(2)}x ROAS with current costs, you're in the red. Either the targeting is wrong, the offer isn't compelling, or the creative needs work.`,
      riskLevel: 'high',
      urgency: 'high',
      patternType: 'obvious',
      analysisDepth: 'standard',
      dataPointsAnalyzed: Math.floor(metrics.conversions * 12),
      methodology: 'Profitability analysis including cost of goods and margin calculations.',
    };

    const recommendedRule: RexRecommendedRule = {
      name: `Profit Guard: ${metrics.name}`,
      description: `Protect your bottom line by automatically pausing when profit turns negative for 3+ days.`,
      entity_type: entityType,
      condition_logic: 'AND',
      check_frequency_minutes: 180,
      max_daily_actions: 2,
      require_approval: false,
      dry_run: false,
      conditions: [
        {
          metric_type: 'profit',
          operator: 'less_than',
          threshold_value: 0,
          time_window_days: 3
        }
      ],
      actions: [
        {
          action_type: 'pause',
          parameters: {}
        }
      ]
    };

    const estimatedImpact: RexEstimatedImpact = {
      revenueImpact: `-$${metrics.revenue.toFixed(2)}/month`,
      profitImpact: `+$${Math.abs(profit).toFixed(2)}/month (stop losses)`,
      timeframeWeeks: 1,
      confidenceLevel: 'high'
    };

    return {
      id: `temp-${metrics.id}-${Date.now()}`,
      user_id: 'temp',
      entity_type: entityType,
      entity_id: metrics.id,
      entity_name: metrics.name,
      platform: metrics.platform as any,
      platform_entity_id: metrics.id,
      suggestion_type: 'pause_negative_roi',
      priority_score: 90,
      confidence_score: 88,
      status: 'viewed',
      title: `Stop The Bleeding: Negative Profit`,
      message: `${metrics.name} is unprofitable despite conversions. You're losing $${Math.abs(profit).toFixed(2)}. Pause and fix the unit economics before spending another dollar.`,
      reasoning,
      recommended_rule: recommendedRule,
      estimated_impact: estimatedImpact,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      viewed_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      performance: {
        current_roas: metrics.roas,
        current_spend: metrics.spend,
        current_conversions: metrics.conversions,
        performance_change_percent: ((metrics.roas / benchmarks.avgRoas) - 1) * 100
      }
    };
  }

  private generateHighCPAAlert(
    metrics: EntityMetrics,
    entityType: RexEntityType,
    benchmarks: Benchmarks
  ): RexSuggestionWithPerformance {
    const cpaVsBenchmark = metrics.cpa && benchmarks.avgCpa
      ? ((metrics.cpa / benchmarks.avgCpa) - 1) * 100
      : 0;

    const reasoning: RexSuggestionReasoning = {
      triggeredBy: ['high_cpa'],
      metrics: {
        roas: metrics.roas,
        spend: metrics.spend,
        conversions: metrics.conversions,
        cpa: metrics.cpa,
      },
      primaryInsight: `At $${metrics.cpa?.toFixed(2)} per conversion, this ${entityType.replace('_', ' ')} is ${cpaVsBenchmark.toFixed(0)}% more expensive than your $${benchmarks.avgCpa?.toFixed(2)} average CPA.`,
      analysis: `High CPA indicates either poor targeting, weak creative, or wrong audience fit. With ${metrics.conversions} conversions, the pattern is established.`,
      riskLevel: 'medium',
      urgency: 'medium',
      patternType: 'obvious',
      analysisDepth: 'standard',
      dataPointsAnalyzed: Math.floor(metrics.conversions * 10),
      methodology: 'CPA benchmarking against account performance standards.',
    };

    const recommendedRule: RexRecommendedRule = {
      name: `CPA Monitor: ${metrics.name}`,
      description: `Alert when CPA exceeds $${((benchmarks.avgCpa || 50) * 1.5).toFixed(2)} for 3 days.`,
      entity_type: entityType,
      condition_logic: 'AND',
      check_frequency_minutes: 360,
      max_daily_actions: 1,
      require_approval: true,
      dry_run: false,
      conditions: [
        {
          metric_type: 'cpa',
          operator: 'greater_than',
          threshold_value: (benchmarks.avgCpa || 50) * 1.5,
          time_window_days: 3
        }
      ],
      actions: [
        {
          action_type: 'send_notification',
          parameters: { message: `High CPA alert: ${metrics.name}` }
        }
      ]
    };

    const estimatedImpact: RexEstimatedImpact = {
      revenueImpact: `Maintain current revenue`,
      profitImpact: `+$${((metrics.cpa! - benchmarks.avgCpa!) * metrics.conversions * 0.3).toFixed(2)}/month if optimized`,
      timeframeWeeks: 3,
      confidenceLevel: 'moderate'
    };

    return {
      id: `temp-${metrics.id}-${Date.now()}`,
      user_id: 'temp',
      entity_type: entityType,
      entity_id: metrics.id,
      entity_name: metrics.name,
      platform: metrics.platform as any,
      platform_entity_id: metrics.id,
      suggestion_type: 'optimize_cpa',
      priority_score: 65,
      confidence_score: 70,
      status: 'viewed',
      title: `Optimize High CPA`,
      message: `${metrics.name} has a CPA of $${metrics.cpa?.toFixed(2)}—${cpaVsBenchmark.toFixed(0)}% above average. Test new creative, tighten targeting, or consider pausing if it doesn't improve.`,
      reasoning,
      recommended_rule: recommendedRule,
      estimated_impact: estimatedImpact,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      viewed_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      performance: {
        current_roas: metrics.roas,
        current_spend: metrics.spend,
        current_conversions: metrics.conversions,
        performance_change_percent: cpaVsBenchmark
      }
    };
  }

  private generateLowCTRAlert(
    metrics: EntityMetrics,
    entityType: RexEntityType,
    benchmarks: Benchmarks
  ): RexSuggestionWithPerformance {
    const ctrVsBenchmark = metrics.ctr && benchmarks.avgCtr
      ? ((metrics.ctr / benchmarks.avgCtr) - 1) * 100
      : 0;

    const reasoning: RexSuggestionReasoning = {
      triggeredBy: ['low_ctr'],
      metrics: {
        roas: metrics.roas,
        spend: metrics.spend,
        ctr: metrics.ctr,
        impressions: metrics.impressions,
        clicks: metrics.clicks,
      },
      primaryInsight: `At ${metrics.ctr?.toFixed(2)}% CTR, this ${entityType.replace('_', ' ')} is ${Math.abs(ctrVsBenchmark).toFixed(0)}% below your ${benchmarks.avgCtr?.toFixed(2)}% average. Your creative isn't stopping the scroll.`,
      analysis: `Low CTR means your ad isn't resonating. After ${metrics.impressions?.toLocaleString()} impressions, the audience has spoken—they're not interested.`,
      riskLevel: 'low',
      urgency: 'low',
      patternType: 'obvious',
      analysisDepth: 'standard',
      dataPointsAnalyzed: Math.floor((metrics.impressions || 1000) / 100),
      methodology: 'Creative performance analysis via CTR benchmarking.',
    };

    const recommendedRule: RexRecommendedRule = {
      name: `CTR Monitor: ${metrics.name}`,
      description: `Alert when CTR drops below ${(benchmarks.avgCtr || 1) * 0.5}% for 5 days.`,
      entity_type: entityType,
      condition_logic: 'AND',
      check_frequency_minutes: 720,
      max_daily_actions: 1,
      require_approval: true,
      dry_run: false,
      conditions: [
        {
          metric_type: 'ctr',
          operator: 'less_than',
          threshold_value: (benchmarks.avgCtr || 1) * 0.5,
          time_window_days: 5
        }
      ],
      actions: [
        {
          action_type: 'send_notification',
          parameters: { message: `Low CTR alert: ${metrics.name} needs new creative` }
        }
      ]
    };

    const estimatedImpact: RexEstimatedImpact = {
      revenueImpact: `Potential +${(((benchmarks.avgCtr || 1) / (metrics.ctr || 0.5)) * 100 - 100).toFixed(0)}% increase`,
      profitImpact: `Better creative → more clicks → lower CPC`,
      timeframeWeeks: 2,
      confidenceLevel: 'moderate'
    };

    return {
      id: `temp-${metrics.id}-${Date.now()}`,
      user_id: 'temp',
      entity_type: entityType,
      entity_id: metrics.id,
      entity_name: metrics.name,
      platform: metrics.platform as any,
      platform_entity_id: metrics.id,
      suggestion_type: 'refresh_creative',
      priority_score: 55,
      confidence_score: 65,
      status: 'viewed',
      title: `Refresh Creative: Low CTR`,
      message: `${metrics.name} has ${metrics.ctr?.toFixed(2)}% CTR vs ${benchmarks.avgCtr?.toFixed(2)}% average. Time for new creative—test different hooks, images, or video.`,
      reasoning,
      recommended_rule: recommendedRule,
      estimated_impact: estimatedImpact,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      viewed_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      performance: {
        current_roas: metrics.roas,
        current_spend: metrics.spend,
        current_conversions: metrics.conversions,
        performance_change_percent: ctrVsBenchmark
      }
    };
  }

  private generateOptimizeOpportunity(
    metrics: EntityMetrics,
    entityType: RexEntityType,
    benchmarks: Benchmarks
  ): RexSuggestionWithPerformance {
    const reasoning: RexSuggestionReasoning = {
      triggeredBy: ['moderate_performance'],
      metrics: {
        roas: metrics.roas,
        spend: metrics.spend,
        revenue: metrics.revenue,
        conversions: metrics.conversions,
      },
      primaryInsight: `This ${entityType.replace('_', ' ')} is performing okay at ${metrics.roas.toFixed(2)}x ROAS, but there's room for improvement. Small optimizations could push it into high-performer territory.`,
      analysis: `With ${metrics.conversions} conversions and $${metrics.spend.toFixed(2)} spent, you're profitable but not crushing it. Test variations to find the winning formula.`,
      riskLevel: 'low',
      urgency: 'low',
      patternType: 'obvious',
      analysisDepth: 'standard',
      dataPointsAnalyzed: Math.floor(metrics.conversions * 10),
      methodology: 'Performance gap analysis identifying optimization opportunities.',
    };

    const recommendedRule: RexRecommendedRule = {
      name: `Optimize: ${metrics.name}`,
      description: `Watch for optimization opportunities and alert if performance changes significantly.`,
      entity_type: entityType,
      condition_logic: 'OR',
      check_frequency_minutes: 720,
      max_daily_actions: 1,
      require_approval: true,
      dry_run: false,
      conditions: [
        {
          metric_type: 'roas',
          operator: 'less_than',
          threshold_value: metrics.roas * 0.8,
          time_window_days: 5
        },
        {
          metric_type: 'roas',
          operator: 'greater_than',
          threshold_value: metrics.roas * 1.3,
          time_window_days: 5
        }
      ],
      actions: [
        {
          action_type: 'send_notification',
          parameters: { message: `Performance change detected: ${metrics.name}` }
        }
      ]
    };

    const estimatedImpact: RexEstimatedImpact = {
      revenueImpact: `Potential +20-40% with optimization`,
      profitImpact: `$${(metrics.spend * 0.5).toFixed(2)}-$${(metrics.spend * 1.0).toFixed(2)}/month`,
      timeframeWeeks: 3,
      confidenceLevel: 'moderate'
    };

    return {
      id: `temp-${metrics.id}-${Date.now()}`,
      user_id: 'temp',
      entity_type: entityType,
      entity_id: metrics.id,
      entity_name: metrics.name,
      platform: metrics.platform as any,
      platform_entity_id: metrics.id,
      suggestion_type: 'optimize_moderate_performer',
      priority_score: 50,
      confidence_score: 60,
      status: 'viewed',
      title: `Optimization Opportunity`,
      message: `${metrics.name} is doing okay at ${metrics.roas.toFixed(2)}x ROAS. Test new creative, adjust targeting, or optimize bids to push it into high-performer territory.`,
      reasoning,
      recommended_rule: recommendedRule,
      estimated_impact: estimatedImpact,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      viewed_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      performance: {
        current_roas: metrics.roas,
        current_spend: metrics.spend,
        current_conversions: metrics.conversions,
        performance_change_percent: ((metrics.roas / benchmarks.avgRoas) - 1) * 100
      }
    };
  }
}

export const entitySpecificSuggestionGenerator = new EntitySpecificSuggestionGenerator();
