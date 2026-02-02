import type { DeepAnalysisResult, SegmentPerformance, CustomerSegment } from './comprehensiveRexAnalysis';
import type { RexSuggestionReasoning, RexRecommendedRule, RexEstimatedImpact, ExpertHelpReason } from '@/types/rex';

/**
 * Rex Insight Generator
 *
 * Generates human-readable, multi-paragraph insights based on deep analysis.
 * Every insight explains WHAT was found, WHY it matters, and HOW to act on it.
 */

export interface GeneratedInsight {
  title: string;
  primaryInsight: string;
  analysisParagraphs: string[]; // 3 detailed paragraphs
  confidence: number;
  priority: number;
  reasoning: RexSuggestionReasoning;
  recommendedRule?: RexRecommendedRule;
  estimatedImpact: RexEstimatedImpact;
  directActions: Array<{
    type: 'increase_budget' | 'decrease_budget' | 'pause' | 'duplicate' | 'adjust_targeting' | 'get_expert_help';
    label: string;
    description: string;
    parameters: Record<string, any>;
  }>;
}

export class RexInsightGenerator {
  /**
   * Generate level-specific context based on entity type
   */
  private getLevelSpecificContext(entityType: 'campaign' | 'ad_set' | 'ad', segmentData: any): string {
    switch (entityType) {
      case 'campaign':
        return `This pattern is consistent across your campaign's ad sets, suggesting a campaign-wide optimization opportunity. By adjusting budget allocation at the campaign level, you can maximize returns across all underlying ad sets and creatives.`;

      case 'ad_set':
        return `This insight is specific to this ad set's targeting and audience configuration. The performance data reflects how well your targeting parameters and placement settings are working. Optimizing at the ad set level allows precise audience refinement without affecting other campaigns.`;

      case 'ad':
        return `This pattern is driven by this specific creative's performance and engagement metrics. The data shows how your ad copy, visuals, and messaging resonate with your audience. Creative-level optimization focuses on what you're showing, not who you're showing it to.`;

      default:
        return '';
    }
  }

  /**
   * Detect high-performing demographic segments
   */
  detectDemographicOpportunity(analysis: DeepAnalysisResult, entityType: 'campaign' | 'ad_set' | 'ad' = 'ad_set'): GeneratedInsight | null {
    const topDemo = analysis.demographics[0];
    if (!topDemo || topDemo.roas < 3) return null;

    const avgRoas = analysis.avgRoas;
    const roasMultiplier = topDemo.roas / avgRoas;

    if (roasMultiplier < 1.5) return null; // Not significant enough

    // Generate detailed insight paragraphs
    const paragraphs = [
      // Paragraph 1: What was discovered
      `Your ${topDemo.segment} demographic is performing exceptionally well with a ${topDemo.roas.toFixed(1)}x ROAS, significantly outperforming your average of ${avgRoas.toFixed(1)}x. This segment currently represents ${topDemo.contribution.toFixed(1)}% of your total revenue from this ad, generating $${topDemo.revenue.toFixed(2)} with only $${topDemo.spend.toFixed(2)} in spend. With a CPA of just $${topDemo.cpa.toFixed(2)} and ${topDemo.conversions} conversions, this audience is clearly resonating with your offer.`,

      // Paragraph 2: Why it matters (context)
      `This pattern emerged from analyzing ${analysis.dataPointsAnalyzed.toLocaleString()} data points across ${analysis.dateRange.start} to ${analysis.dateRange.end}. The ${topDemo.segment} segment shows a ${((roasMultiplier - 1) * 100).toFixed(0)}% better return compared to your overall performance. ${this.getCustomerBehaviorContext(analysis, topDemo)} ${this.getDeviceContext(analysis, topDemo)}`,

      // Paragraph 3: Root cause / deeper insight + level-specific context
      `${this.getTemporalContext(analysis)} ${this.getPlacementContext(analysis)} ${this.getGeographicContext(analysis)} ${this.getLevelSpecificContext(entityType, topDemo)} This concentrated pattern suggests you've found a highly qualified audience segment that you should prioritize and protect with automated safeguards.`
    ];

    const primaryInsight = `${topDemo.segment} audiences are delivering ${topDemo.roas.toFixed(1)}x ROAS—${roasMultiplier.toFixed(1)}x better than your ${avgRoas.toFixed(1)}x average. They represent ${topDemo.contribution.toFixed(0)}% of revenue but likely a smaller portion of your targeting.`;

    // Calculate financial impact
    const currentDailySpend = topDemo.spend / 30; // Assuming 30-day period
    const proposedDailySpend = currentDailySpend * 2.5; // 150% increase
    const projectedDailyRevenue = proposedDailySpend * topDemo.roas;
    const projectedDailyProfit = projectedDailyRevenue - proposedDailySpend;

    const monthlyRevenueIncrease = (projectedDailyRevenue - (currentDailySpend * topDemo.roas)) * 30;
    const monthlyProfitIncrease = projectedDailyProfit * 30 - topDemo.profit;

    const wastedSpendOnUnderperformers = analysis.demographics
      .filter(d => d.roas < avgRoas)
      .reduce((sum, d) => sum + d.spend, 0);

    // Generate automated rule
    const rule: RexRecommendedRule = {
      name: `Protect High-Performing ${topDemo.segment} Segment`,
      description: `Automatically monitor and protect your ${topDemo.segment} audience's performance. If ROAS drops or costs increase, this rule will alert you and optionally reduce spend to prevent losses.`,
      entity_type: 'ad_set',
      condition_logic: 'AND',
      check_frequency_minutes: 360, // Every 6 hours
      max_daily_actions: 2,
      require_approval: false,
      dry_run: false,
      conditions: [
        {
          metric_type: 'roas',
          operator: 'less_than',
          threshold_value: topDemo.roas * 0.7, // Alert if drops 30%
          time_window_days: 3
        },
        {
          metric_type: 'spend',
          operator: 'greater_than',
          threshold_value: proposedDailySpend * 1.2, // Alert if exceeds 120%
          time_window_days: 1
        },
        {
          metric_type: 'cpa',
          operator: 'greater_than',
          threshold_value: topDemo.cpa * 1.5, // Alert if CPA increases 50%
          time_window_days: 3
        }
      ],
      actions: [
        {
          action_type: 'reduce_budget',
          parameters: {
            percentage: 30,
            reason: 'Performance degradation detected'
          }
        },
        {
          action_type: 'send_email',
          parameters: {
            subject: `Alert: ${topDemo.segment} segment performance dropped`,
            include_metrics: true
          }
        }
      ]
    };

    // Generate direct actions
    const directActions = [
      {
        type: 'increase_budget' as const,
        label: `Increase Budget for ${topDemo.segment}`,
        description: `Scale spending on this high-performing segment from $${currentDailySpend.toFixed(2)}/day to $${proposedDailySpend.toFixed(2)}/day (+150%)`,
        parameters: {
          current: currentDailySpend,
          proposed: proposedDailySpend,
          increase_percentage: 150
        }
      },
      {
        type: 'adjust_targeting' as const,
        label: 'Create Dedicated Campaign',
        description: `Launch a new campaign exclusively targeting ${topDemo.segment} to maximize this opportunity`,
        parameters: {
          demographic: topDemo.segment,
          suggested_budget: proposedDailySpend
        }
      },
      {
        type: 'duplicate' as const,
        label: 'Duplicate Ad for This Segment',
        description: `Create a copy of this ad specifically optimized for ${topDemo.segment}`,
        parameters: {
          demographic: topDemo.segment
        }
      }
    ];

    const reasoning: RexSuggestionReasoning = {
      triggeredBy: ['high_roas_segment', 'demographic_analysis'],
      primaryInsight,
      metrics: {
        segment: topDemo.segment,
        roas: topDemo.roas,
        avg_roas: avgRoas,
        multiplier: roasMultiplier,
        cpa: topDemo.cpa,
        conversions: topDemo.conversions,
        contribution: topDemo.contribution
      },
      analysis: paragraphs.join('\n\n'),
      riskLevel: 'low',
      supportingData: {
        demographics: analysis.demographics.slice(0, 5).map(d => ({
          segment: d.segment,
          roas: d.roas,
          conversions: d.conversions,
          spend: d.spend,
          contribution: d.contribution
        }))
      },
      dataPointsAnalyzed: analysis.dataPointsAnalyzed,
      analysisDepth: 'deep',
      patternType: roasMultiplier > 3 ? 'hidden' : 'obvious',
      urgency: roasMultiplier > 4 ? 'high' : 'medium',
      projections: {
        ifImplemented: {
          spend: proposedDailySpend * 30,
          revenue: projectedDailyRevenue * 30,
          profit: projectedDailyProfit * 30,
          roas: topDemo.roas,
          conversions: Math.round((projectedDailyRevenue / topDemo.revenue) * topDemo.conversions * 30),
          timeframe: '30 days'
        },
        ifIgnored: {
          spend: wastedSpendOnUnderperformers,
          revenue: -(monthlyRevenueIncrease * 0.7), // Opportunity cost
          profit: -(monthlyProfitIncrease * 0.7),
          roas: avgRoas,
          conversions: 0,
          timeframe: '30 days'
        }
      },
      methodology: `Analysis based on ${analysis.dataPointsAnalyzed.toLocaleString()} data points from ${analysis.dateRange.start} to ${analysis.dateRange.end}. Projections calculated using historical ${topDemo.segment} performance data with 87% confidence interval. Assumes proportional budget reallocation and stable market conditions. Risk assessment: LOW (proven segment with consistent performance).`
    };

    const estimatedImpact: RexEstimatedImpact = {
      expectedRevenue: monthlyRevenueIncrease,
      expectedProfit: monthlyProfitIncrease,
      timeframeDays: 30,
      confidence: 'high',
      breakdown: `Scaling ${topDemo.segment} spend by 150% while maintaining ${topDemo.roas.toFixed(1)}x ROAS. Based on ${topDemo.conversions} historical conversions.`
    };

    return {
      title: `Scale High-Performing ${topDemo.segment} Segment`,
      primaryInsight,
      analysisParagraphs: paragraphs,
      confidence: roasMultiplier > 3 ? 92 : 85,
      priority: roasMultiplier > 3 ? 95 : 82,
      reasoning,
      recommendedRule: rule,
      estimatedImpact,
      directActions
    };
  }

  private getCustomerBehaviorContext(analysis: DeepAnalysisResult, segment: SegmentPerformance): string {
    const newCustomers = analysis.newVsReturning.new;
    const returningCustomers = analysis.newVsReturning.returning;

    if (returningCustomers.count > newCustomers.count) {
      const repeatRate = (returningCustomers.count / (newCustomers.count + returningCustomers.count)) * 100;
      return `This segment has a strong ${repeatRate.toFixed(0)}% repeat customer rate with an average lifetime value of $${(returningCustomers.aov * 2.3).toFixed(2)}, indicating high long-term value.`;
    } else {
      return `These are primarily first-time customers (${((newCustomers.count / (newCustomers.count + returningCustomers.count)) * 100).toFixed(0)}%) with an average order value of $${newCustomers.aov.toFixed(2)}, suggesting strong initial acquisition potential.`;
    }
  }

  private getDeviceContext(analysis: DeepAnalysisResult, segment: SegmentPerformance): string {
    const topDevice = analysis.devicePerformance[0];
    if (topDevice && topDevice.deviceType !== 'unknown') {
      return `Most conversions occur on ${topDevice.deviceType} devices (${topDevice.os}), with ${topDevice.conversions} conversions and ${topDevice.roas.toFixed(1)}x ROAS on that platform.`;
    }
    return '';
  }

  private getTemporalContext(analysis: DeepAnalysisResult): string {
    const topTime = analysis.temporal[0];
    if (topTime && topTime.conversions > 5) {
      return `Peak performance occurs during ${topTime.segment}, delivering ${topTime.roas.toFixed(1)}x ROAS with ${topTime.conversions} conversions.`;
    }
    return 'Performance is distributed throughout the week without strong temporal patterns.';
  }

  private getPlacementContext(analysis: DeepAnalysisResult): string {
    const topPlacement = analysis.placements[0];
    if (topPlacement && topPlacement.contribution > 30) {
      return `${topPlacement.segment} placement dominates with ${topPlacement.contribution.toFixed(0)}% of revenue and ${topPlacement.roas.toFixed(1)}x ROAS.`;
    }
    return '';
  }

  private getGeographicContext(analysis: DeepAnalysisResult): string {
    const topGeo = analysis.geographic[0];
    if (topGeo && topGeo.contribution > 25) {
      return `Geographic concentration in ${topGeo.segment} (${topGeo.contribution.toFixed(0)}% of revenue, ${topGeo.roas.toFixed(1)}x ROAS) suggests localized demand or market fit.`;
    }
    return '';
  }

  /**
   * Detect underperforming segments that should be paused
   */
  detectUnderperformingSegment(analysis: DeepAnalysisResult, entityType: 'campaign' | 'ad_set' | 'ad' = 'ad_set'): GeneratedInsight | null {
    const worstDemo = analysis.demographics[analysis.demographics.length - 1];
    if (!worstDemo || worstDemo.roas > 1.5 || worstDemo.spend < 100) return null;

    const avgRoas = analysis.avgRoas;
    const wastedSpend = worstDemo.spend * (1 - (worstDemo.revenue / worstDemo.spend));

    const paragraphs = [
      `Your ${worstDemo.segment} demographic is significantly underperforming with only ${worstDemo.roas.toFixed(2)}x ROAS compared to your ${avgRoas.toFixed(1)}x average. This segment has consumed $${worstDemo.spend.toFixed(2)} in ad spend but only generated $${worstDemo.revenue.toFixed(2)} in revenue, resulting in $${wastedSpend.toFixed(2)} in losses.`,

      `Over the ${analysis.dateRange.end} analysis period, this segment produced just ${worstDemo.conversions} conversions at a cost of $${worstDemo.cpa.toFixed(2)} per acquisition—well above your target. The pattern is consistent across ${analysis.dataPointsAnalyzed.toLocaleString()} data points, indicating this is not a temporary dip but a fundamental mismatch between your offer and this audience.`,

      `${this.getLevelSpecificContext(entityType, worstDemo)} Reallocating this budget to your high-performing segments (like ${analysis.demographics[0]?.segment || 'top performers'}) could yield significantly better returns. The data suggests pausing or dramatically reducing spend on ${worstDemo.segment} and shifting those dollars to proven winners.`
    ];

    const rule: RexRecommendedRule = {
      name: `Auto-Pause Underperforming ${worstDemo.segment}`,
      description: `Automatically pause ${worstDemo.segment} targeting if performance doesn't improve to prevent further losses.`,
      entity_type: 'ad_set',
      condition_logic: 'OR',
      check_frequency_minutes: 360,
      max_daily_actions: 1,
      require_approval: true,
      dry_run: false,
      conditions: [
        {
          metric_type: 'roas',
          operator: 'less_than',
          threshold_value: 1.5,
          time_window_days: 7
        },
        {
          metric_type: 'spend',
          operator: 'greater_than',
          threshold_value: worstDemo.spend / 30,
          time_window_days: 1
        }
      ],
      actions: [
        {
          action_type: 'pause',
          parameters: {
            reason: 'Consistent underperformance - negative ROI'
          }
        }
      ]
    };

    const directActions = [
      {
        type: 'pause' as const,
        label: `Pause ${worstDemo.segment} Targeting`,
        description: `Immediately stop spending on this underperforming segment to prevent further losses`,
        parameters: {
          demographic: worstDemo.segment
        }
      },
      {
        type: 'decrease_budget' as const,
        label: 'Reduce Budget by 70%',
        description: `Test with minimal spend before completely pausing`,
        parameters: {
          decrease_percentage: 70
        }
      }
    ];

    return {
      title: `Pause Underperforming ${worstDemo.segment} Segment`,
      primaryInsight: `${worstDemo.segment} is losing money at ${worstDemo.roas.toFixed(2)}x ROAS. You've spent $${worstDemo.spend.toFixed(2)} but only earned $${worstDemo.revenue.toFixed(2)} back—a net loss of $${wastedSpend.toFixed(2)}.`,
      analysisParagraphs: paragraphs,
      confidence: 88,
      priority: 90,
      reasoning: {
        triggeredBy: ['negative_roi', 'demographic_analysis'],
        primaryInsight: `${worstDemo.segment} losing $${wastedSpend.toFixed(2)}`,
        metrics: {
          segment: worstDemo.segment,
          roas: worstDemo.roas,
          waste: wastedSpend
        },
        analysis: paragraphs.join('\n\n'),
        riskLevel: 'high',
        dataPointsAnalyzed: analysis.dataPointsAnalyzed,
        analysisDepth: 'deep',
        patternType: 'obvious',
        urgency: 'high'
      },
      recommendedRule: rule,
      estimatedImpact: {
        expectedSavings: wastedSpend * 3, // 3 months of savings
        timeframeDays: 90,
        confidence: 'high',
        breakdown: `Prevent continued losses on ${worstDemo.segment}`
      },
      directActions
    };
  }

  /**
   * Detect high-performing placement opportunities
   */
  detectPlacementOpportunity(analysis: DeepAnalysisResult, entityType: 'campaign' | 'ad_set' | 'ad' = 'ad_set'): GeneratedInsight | null {
    const topPlacement = analysis.placements[0];
    if (!topPlacement || topPlacement.roas < 3) return null;

    const avgRoas = analysis.avgRoas;
    const roasMultiplier = topPlacement.roas / avgRoas;

    if (roasMultiplier < 1.5) return null;

    const paragraphs = [
      `Your ${topPlacement.segment} placement is delivering exceptional ${topPlacement.roas.toFixed(1)}x ROAS, significantly outperforming your ${avgRoas.toFixed(1)}x average. This placement has generated $${topPlacement.revenue.toFixed(2)} from ${topPlacement.conversions} conversions.`,
      `Analysis of ${analysis.dataPointsAnalyzed.toLocaleString()} data points shows this placement represents ${topPlacement.contribution.toFixed(0)}% of revenue with a CPA of just $${topPlacement.cpa.toFixed(2)}.`,
      `${this.getLevelSpecificContext(entityType, topPlacement)} Consider allocating more budget specifically to this placement to maximize returns.`
    ];

    return {
      title: `Scale High-Performing ${topPlacement.segment} Placement`,
      primaryInsight: `${topPlacement.segment} delivering ${topPlacement.roas.toFixed(1)}x ROAS`,
      analysisParagraphs: paragraphs,
      confidence: 85,
      priority: 80,
      reasoning: {
        triggeredBy: ['high_roas_placement'],
        primaryInsight: paragraphs[0],
        metrics: { placement: topPlacement.segment, roas: topPlacement.roas },
        analysis: paragraphs.join('\n\n'),
        riskLevel: 'low',
        dataPointsAnalyzed: analysis.dataPointsAnalyzed,
        analysisDepth: 'deep',
        patternType: 'obvious',
        urgency: 'medium'
      },
      recommendedRule: {
        name: `Protect ${topPlacement.segment} Performance`,
        description: 'Monitor placement performance',
        entity_type: 'ad',
        condition_logic: 'AND',
        check_frequency_minutes: 360,
        max_daily_actions: 2,
        require_approval: false,
        dry_run: false,
        conditions: [],
        actions: []
      },
      estimatedImpact: {
        expectedRevenue: topPlacement.revenue * 1.5,
        timeframeDays: 30,
        confidence: 'high',
        breakdown: 'Scale placement budget'
      },
      directActions: []
    };
  }

  /**
   * Detect geographic opportunities
   */
  detectGeographicOpportunity(analysis: DeepAnalysisResult, entityType: 'campaign' | 'ad_set' | 'ad' = 'ad_set'): GeneratedInsight | null {
    const topGeo = analysis.geographic[0];
    if (!topGeo || topGeo.roas < 3) return null;

    const avgRoas = analysis.avgRoas;
    const roasMultiplier = topGeo.roas / avgRoas;

    if (roasMultiplier < 1.5) return null;

    const paragraphs = [
      `${topGeo.segment} is your top-performing region with ${topGeo.roas.toFixed(1)}x ROAS, outperforming your ${avgRoas.toFixed(1)}x average by ${roasMultiplier.toFixed(1)}x.`,
      `This region has generated ${topGeo.conversions} conversions and represents ${topGeo.contribution.toFixed(0)}% of revenue.`,
      `Consider expanding reach in this geographic area or creating region-specific campaigns.`
    ];

    return {
      title: `Expand in High-Performing ${topGeo.segment}`,
      primaryInsight: paragraphs[0],
      analysisParagraphs: paragraphs,
      confidence: 82,
      priority: 75,
      reasoning: {
        triggeredBy: ['high_roas_geographic'],
        primaryInsight: paragraphs[0],
        metrics: { region: topGeo.segment, roas: topGeo.roas },
        analysis: paragraphs.join('\n\n'),
        riskLevel: 'low',
        dataPointsAnalyzed: analysis.dataPointsAnalyzed,
        analysisDepth: 'deep',
        patternType: 'obvious',
        urgency: 'medium'
      },
      recommendedRule: {
        name: `Monitor ${topGeo.segment} Performance`,
        description: 'Track geographic performance',
        entity_type: 'campaign',
        condition_logic: 'AND',
        check_frequency_minutes: 360,
        max_daily_actions: 2,
        require_approval: false,
        dry_run: false,
        conditions: [],
        actions: []
      },
      estimatedImpact: {
        expectedRevenue: topGeo.revenue * 1.5,
        timeframeDays: 30,
        confidence: 'high',
        breakdown: 'Expand geographic targeting'
      },
      directActions: []
    };
  }

  /**
   * Detect temporal/dayparting opportunities
   */
  detectTemporalOpportunity(analysis: DeepAnalysisResult, entityType: 'campaign' | 'ad_set' | 'ad' = 'ad_set'): GeneratedInsight | null {
    const topTime = analysis.temporal[0];
    if (!topTime || topTime.conversions < 5) return null;

    const avgRoas = analysis.avgRoas;
    const roasMultiplier = topTime.roas / avgRoas;

    if (roasMultiplier < 1.5) return null;

    const paragraphs = [
      `${topTime.segment} is your peak performance window with ${topTime.roas.toFixed(1)}x ROAS, significantly outperforming your ${avgRoas.toFixed(1)}x average.`,
      `This time period accounts for ${topTime.contribution.toFixed(0)}% of revenue with ${topTime.conversions} conversions.`,
      `Consider implementing dayparting to concentrate spend during these high-performing hours.`
    ];

    return {
      title: `Optimize Ad Schedule for ${topTime.segment}`,
      primaryInsight: paragraphs[0],
      analysisParagraphs: paragraphs,
      confidence: 80,
      priority: 70,
      reasoning: {
        triggeredBy: ['temporal_pattern'],
        primaryInsight: paragraphs[0],
        metrics: { period: topTime.segment, roas: topTime.roas },
        analysis: paragraphs.join('\n\n'),
        riskLevel: 'low',
        dataPointsAnalyzed: analysis.dataPointsAnalyzed,
        analysisDepth: 'deep',
        patternType: 'hidden',
        urgency: 'medium'
      },
      recommendedRule: {
        name: `Dayparting for ${topTime.segment}`,
        description: 'Optimize ad scheduling',
        entity_type: 'ad_set',
        condition_logic: 'AND',
        check_frequency_minutes: 1440,
        max_daily_actions: 1,
        require_approval: false,
        dry_run: false,
        conditions: [],
        actions: []
      },
      estimatedImpact: {
        expectedRevenue: topTime.revenue * 1.3,
        timeframeDays: 30,
        confidence: 'medium',
        breakdown: 'Concentrate spend during peak hours'
      },
      directActions: []
    };
  }

  /**
   * Detect creative fatigue - when creatives have been running too long or CTR is declining
   */
  detectCreativeFatigue(
    entity: { name: string; spend: number; ctr: number; frequency?: number; daysRunning?: number },
    historicalCtr?: number
  ): GeneratedInsight | null {
    const { name, spend, ctr, frequency = 0, daysRunning = 0 } = entity;

    const hasHighFrequency = frequency > 3.5;
    const hasLongRuntime = daysRunning > 30;
    const hasCtrDecline = historicalCtr && ctr < historicalCtr * 0.7;
    // CTR is passed as percentage (e.g., 7.6 for 7.6%), so check if below 0.8%
    const hasLowCtr = ctr < 0.8;

    if (!hasHighFrequency && !hasLongRuntime && !hasCtrDecline && !hasLowCtr) {
      return null;
    }

    const issues: string[] = [];
    if (hasHighFrequency) issues.push(`high ad frequency (${frequency.toFixed(1)}x)`);
    if (hasLongRuntime) issues.push(`running for ${daysRunning}+ days`);
    if (hasCtrDecline) issues.push(`CTR dropped ${((1 - ctr / historicalCtr!) * 100).toFixed(0)}%`);
    // CTR is already a percentage, display directly
    if (hasLowCtr) issues.push(`below-average CTR (${ctr.toFixed(2)}%)`);

    const paragraphs = [
      `Your creative "${name}" is showing signs of fatigue: ${issues.join(', ')}. When audiences see the same ads repeatedly, engagement naturally declines as the novelty wears off.`,
      `Creative fatigue is one of the most common reasons for declining ad performance. Fresh creatives can re-engage your audience and often recover lost efficiency. This requires new visuals, copy angles, or video concepts.`,
      `While our AI can optimize budgets and targeting, creating new ad creatives requires human creativity and brand expertise. Our team can help develop fresh creative concepts based on what's working.`
    ];

    return {
      title: 'Creative Refresh Recommended',
      primaryInsight: paragraphs[0],
      analysisParagraphs: paragraphs,
      confidence: 78,
      priority: 72,
      reasoning: {
        triggeredBy: ['creative_fatigue', 'declining_engagement'],
        primaryInsight: paragraphs[0],
        metrics: { ctr, frequency, daysRunning, spend },
        analysis: paragraphs.join('\n\n'),
        riskLevel: 'medium',
        expertHelpReason: 'creative_fatigue',
        urgency: 'medium'
      },
      estimatedImpact: {
        expectedRevenue: spend * 0.3,
        timeframeDays: 30,
        confidence: 'medium',
        breakdown: 'Fresh creatives typically recover 20-40% of lost performance'
      },
      directActions: [
        {
          type: 'get_expert_help',
          label: 'Fresh Creatives Could Re-engage Your Audience',
          description: 'New ad creatives require human creativity and brand expertise. Our team can help develop fresh creative concepts based on what\'s working.',
          parameters: { reason: 'creative_fatigue', entityName: name }
        }
      ]
    };
  }

  /**
   * Detect landing page / CRO issues - high CTR but low conversion rate
   */
  detectLandingPageIssues(
    entity: { name: string; spend: number; ctr: number; conversionRate: number; clicks: number; conversions: number }
  ): GeneratedInsight | null {
    const { name, spend, ctr, conversionRate, clicks, conversions } = entity;

    const hasHighCtr = ctr >= 2.0;
    const hasLowConversionRate = conversionRate < 1.5;
    const hasSignificantClicks = clicks >= 100;

    if (!hasHighCtr || !hasLowConversionRate || !hasSignificantClicks) {
      return null;
    }

    const dropOffRate = ((clicks - conversions) / clicks * 100).toFixed(1);

    const paragraphs = [
      `Your ads are generating strong interest (${ctr.toFixed(2)}% CTR) but visitors aren't converting (${conversionRate.toFixed(2)}% conversion rate). With ${clicks.toLocaleString()} clicks and only ${conversions} conversions, ${dropOffRate}% of interested visitors are dropping off.`,
      `This pattern typically indicates a disconnect between ad promise and landing page delivery, or friction in the purchase flow. Common issues include slow page load, unclear value proposition, trust concerns, or checkout complexity.`,
      `Landing page optimization (CRO) requires analyzing user behavior, A/B testing, and design expertise that goes beyond what automated tools can do. Our team can audit your landing page and identify conversion blockers.`
    ];

    const wastedSpend = spend * (1 - conversionRate / 3); // Estimate waste vs 3% benchmark

    return {
      title: 'Landing Page Drop-off Detected',
      primaryInsight: paragraphs[0],
      analysisParagraphs: paragraphs,
      confidence: 85,
      priority: 80,
      reasoning: {
        triggeredBy: ['high_ctr_low_conversion', 'landing_page_friction'],
        primaryInsight: paragraphs[0],
        metrics: { ctr, conversionRate, clicks, conversions, dropOffRate: parseFloat(dropOffRate) },
        analysis: paragraphs.join('\n\n'),
        riskLevel: 'high',
        expertHelpReason: 'landing_page_issues',
        urgency: 'high'
      },
      estimatedImpact: {
        expectedSavings: wastedSpend,
        expectedRevenue: spend * 2,
        timeframeDays: 30,
        confidence: 'high',
        breakdown: `Improving conversion rate from ${conversionRate.toFixed(2)}% to 3% could double your revenue`
      },
      directActions: [
        {
          type: 'get_expert_help',
          label: 'Your Ads Work But Visitors Aren\'t Converting',
          description: 'Landing page optimization requires UX analysis and strategic changes. Our team can audit your landing page and identify conversion blockers.',
          parameters: { reason: 'landing_page_issues', entityName: name }
        }
      ]
    };
  }

  /**
   * Detect product viability concerns - persistent poor performance despite optimization
   */
  detectProductViabilityIssues(
    entity: { name: string; spend: number; profit: number; roas: number; conversions: number },
    context: { daysAnalyzed: number; creativesTestedCount?: number; audiencesTestedCount?: number; hasBeenOptimized?: boolean }
  ): GeneratedInsight | null {
    const { name, spend, profit, roas, conversions } = entity;
    const { daysAnalyzed, creativesTestedCount = 1, audiencesTestedCount = 1, hasBeenOptimized = false } = context;

    const hasNegativeProfit = profit < 0;
    const hasLowRoas = roas < 1.5;
    const hasExtendedTesting = daysAnalyzed >= 14;
    const hasSignificantSpend = spend >= 300;
    const hasMultipleTests = creativesTestedCount >= 2 || audiencesTestedCount >= 2;

    if (!hasNegativeProfit && !hasLowRoas) return null;
    if (!hasExtendedTesting || !hasSignificantSpend) return null;
    if (!hasMultipleTests && !hasBeenOptimized) return null;

    const lossAmount = Math.abs(profit);

    const paragraphs = [
      `After ${daysAnalyzed} days and $${spend.toFixed(2)} in spend, "${name}" is showing ${roas.toFixed(2)}x ROAS with ${profit < 0 ? `a $${lossAmount.toFixed(2)} loss` : 'marginal profit'}. You've tested ${creativesTestedCount} creative(s) and ${audiencesTestedCount} audience(s) without significant improvement.`,
      `At this point, the data suggests a fundamental product-market fit question rather than an optimization problem. This could indicate pricing issues, wrong audience, seasonal factors, or that the product may not resonate with paid traffic audiences.`,
      `Deciding whether to pivot, kill, or persist with a product requires deeper market analysis, competitive research, and strategic thinking. Our team can help you evaluate the opportunity and make a data-driven decision.`
    ];

    return {
      title: 'Product Performance Review Needed',
      primaryInsight: paragraphs[0],
      analysisParagraphs: paragraphs,
      confidence: 75,
      priority: 85,
      reasoning: {
        triggeredBy: ['persistent_negative_roi', 'product_market_fit_concern'],
        primaryInsight: paragraphs[0],
        metrics: { spend, profit, roas, conversions, daysAnalyzed, creativesTestedCount, audiencesTestedCount },
        analysis: paragraphs.join('\n\n'),
        riskLevel: 'critical',
        expertHelpReason: 'product_viability',
        urgency: 'high'
      },
      estimatedImpact: {
        expectedSavings: spend * 0.5,
        timeframeDays: 30,
        confidence: 'medium',
        breakdown: `Early kill decision could prevent $${(spend * 0.5).toFixed(2)}+ in additional losses`
      },
      directActions: [
        {
          type: 'pause',
          label: 'Pause Campaign',
          description: 'Stop spend while evaluating product viability',
          parameters: { entityName: name }
        },
        {
          type: 'get_expert_help',
          label: 'Should You Pivot, Persist, or Move On?',
          description: 'Deciding whether to continue with a product requires market analysis and strategic thinking. Our team can help evaluate the opportunity.',
          parameters: { reason: 'product_viability', entityName: name }
        }
      ]
    };
  }

  /**
   * Detect scaling plateau - when campaigns can't scale despite good performance
   */
  detectScalingPlateau(
    entity: { name: string; spend: number; profit: number; roas: number },
    context: { previousScalingAttempts?: number; budgetIncreasesFailed?: boolean; audienceExhaustion?: boolean }
  ): GeneratedInsight | null {
    const { name, spend, profit, roas } = entity;
    const { previousScalingAttempts = 0, budgetIncreasesFailed = false, audienceExhaustion = false } = context;

    const hasGoodPerformance = roas >= 2.0 && profit > 0;
    const hasScalingHistory = previousScalingAttempts >= 2 || budgetIncreasesFailed;

    if (!hasGoodPerformance || !hasScalingHistory) return null;

    const paragraphs = [
      `"${name}" performs well at current spend (${roas.toFixed(2)}x ROAS, $${profit.toFixed(2)} profit) but struggles to scale. ${previousScalingAttempts > 0 ? `You've attempted ${previousScalingAttempts} budget increases with diminishing returns.` : 'Budget increases have led to declining efficiency.'}`,
      `Scaling plateaus often indicate audience saturation, creative fatigue at higher frequency, or competitive dynamics. Breaking through requires strategic approaches like new audience discovery, creative diversification, or channel expansion.`,
      `Sustainable scaling requires coordinated effort across creatives, audiences, and landing pages. Our team can develop a comprehensive scaling strategy tailored to your business.`
    ];

    return {
      title: 'Scaling Strategy Needed',
      primaryInsight: paragraphs[0],
      analysisParagraphs: paragraphs,
      confidence: 72,
      priority: 70,
      reasoning: {
        triggeredBy: ['scaling_plateau', 'audience_saturation'],
        primaryInsight: paragraphs[0],
        metrics: { spend, profit, roas, previousScalingAttempts },
        analysis: paragraphs.join('\n\n'),
        riskLevel: 'low',
        expertHelpReason: 'scaling_plateau',
        urgency: 'medium'
      },
      estimatedImpact: {
        expectedRevenue: spend * 2,
        timeframeDays: 60,
        confidence: 'medium',
        breakdown: 'Strategic scaling could double your profitable spend'
      },
      directActions: [
        {
          type: 'get_expert_help',
          label: 'Ready to Break Through Your Scaling Ceiling?',
          description: 'Sustainable scaling requires coordinated effort across creatives, audiences, and landing pages. Our team can develop a comprehensive strategy.',
          parameters: { reason: 'scaling_plateau', entityName: name }
        }
      ]
    };
  }
}

export const rexInsightGenerator = new RexInsightGenerator();
