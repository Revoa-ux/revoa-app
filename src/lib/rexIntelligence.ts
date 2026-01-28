import type {
  RexEntityType,
  CreateRexSuggestionParams,
  RexSuggestionReasoning,
  RexRecommendedRule,
  RexEstimatedImpact
} from '@/types/rex';

const REX_PERSONALITY = {
  greeting: ['Hey there!', 'Heads up!', 'Listen up!', 'Quick note:', 'Check this out:'],
  confidence: {
    high: ['I\'m pretty confident', 'I\'m certain', 'I\'m sure', 'Trust me on this'],
    medium: ['I think', 'It looks like', 'I\'ve noticed', 'From what I can see'],
    low: ['You might want to consider', 'It could be worth', 'Perhaps', 'Maybe']
  },
  urgency: {
    high: ['This needs your attention ASAP!', 'Act on this quickly!', 'Don\'t wait on this one!'],
    medium: ['This could use some attention.', 'Worth looking into soon.', 'Keep an eye on this.'],
    low: ['When you get a chance...', 'No rush, but...', 'FYI:']
  }
};

interface AdMetrics {
  spend: number;
  revenue: number;
  profit: number;
  roas: number;
  conversions: number;
  cpa: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cvr?: number;
  fatigueScore?: number;
}

interface EntityData {
  id: string;
  name: string;
  platform: string;
  metrics: AdMetrics;
  performance?: 'high' | 'medium' | 'low';
}

export class RexIntelligence {
  analyzeEntity(
    userId: string,
    entityType: RexEntityType,
    entity: EntityData
  ): CreateRexSuggestionParams[] {
    const suggestions: CreateRexSuggestionParams[] = [];

    const negativeRoi = this.checkNegativeROI(userId, entityType, entity);
    if (negativeRoi) suggestions.push(negativeRoi);

    const scaleOpportunity = this.checkScaleOpportunity(userId, entityType, entity);
    if (scaleOpportunity) suggestions.push(scaleOpportunity);

    if (entityType === 'ad') {
      const fatigueSuggestion = this.checkCreativeFatigue(userId, entity);
      if (fatigueSuggestion) suggestions.push(fatigueSuggestion);
    }

    const underperforming = this.checkUnderperformance(userId, entityType, entity);
    if (underperforming) suggestions.push(underperforming);

    const lowCvr = this.checkLowConversionRate(userId, entityType, entity);
    if (lowCvr) suggestions.push(lowCvr);

    return suggestions;
  }

  private checkNegativeROI(
    userId: string,
    entityType: RexEntityType,
    entity: EntityData
  ): CreateRexSuggestionParams | null {
    const { metrics } = entity;

    if (metrics.spend > 50 && metrics.profit < 0) {
      const lossPercentage = Math.abs((metrics.profit / metrics.spend) * 100);

      const reasoning: RexSuggestionReasoning = {
        triggeredBy: ['negative_profit', 'excessive_spend'],
        metrics: {
          spend: metrics.spend,
          profit: metrics.profit,
          loss_percentage: lossPercentage
        },
        analysis: `This ${entityType} has spent $${metrics.spend.toFixed(2)} but generated a loss of $${Math.abs(metrics.profit).toFixed(2)}. That's a ${lossPercentage.toFixed(1)}% loss on spend.`,
        riskLevel: 'high'
      };

      const recommendedRule: RexRecommendedRule = {
        name: `Rex: Pause Negative ROI ${entity.name}`,
        description: `Automatically pause this ${entityType} if profit remains negative`,
        entity_type: entityType,
        condition_logic: 'AND',
        check_frequency_minutes: 60,
        max_daily_actions: 1,
        require_approval: false,
        dry_run: false,
        conditions: [
          {
            metric_type: 'profit',
            operator: 'less_than',
            threshold_value: 0,
            time_window_days: 1
          },
          {
            metric_type: 'spend',
            operator: 'greater_than',
            threshold_value: 20,
            time_window_days: 1
          }
        ],
        actions: [
          {
            action_type: 'pause',
            parameters: { reason: 'Paused by Rex: Negative profitability' }
          }
        ]
      };

      const estimatedImpact: RexEstimatedImpact = {
        expectedSavings: Math.abs(metrics.profit) * 2,
        timeframeDays: 7,
        confidence: 'high',
        breakdown: `By pausing this unprofitable ${entityType}, you'll stop losing approximately $${Math.abs(metrics.profit).toFixed(2)} per day.`
      };

      return {
        user_id: userId,
        entity_type: entityType,
        entity_id: entity.id,
        entity_name: entity.name,
        platform: entity.platform,
        suggestion_type: 'pause_negative_roi',
        priority_score: 95,
        confidence_score: 90,
        title: `Rex Alert: "${entity.name}" is losing money!`,
        message: `${REX_PERSONALITY.urgency.high[0]} I've been watching "${entity.name}" and it's burning through cash with negative returns. You've lost $${Math.abs(metrics.profit).toFixed(2)} already. Let me pause this before it drains more budget.`,
        reasoning,
        recommended_rule: recommendedRule,
        estimated_impact: estimatedImpact
      };
    }

    return null;
  }

  private checkScaleOpportunity(
    userId: string,
    entityType: RexEntityType,
    entity: EntityData
  ): CreateRexSuggestionParams | null {
    const { metrics } = entity;

    if (metrics.roas > 3 && metrics.profit > 100 && metrics.conversions > 10) {
      const reasoning: RexSuggestionReasoning = {
        triggeredBy: ['high_roas', 'high_profit', 'strong_conversions'],
        metrics: {
          roas: metrics.roas,
          profit: metrics.profit,
          conversions: metrics.conversions,
          spend: metrics.spend
        },
        analysis: `This ${entityType} is crushing it with ${metrics.roas.toFixed(2)}x ROAS and $${metrics.profit.toFixed(2)} in profit from ${metrics.conversions} conversions. It's a proven winner.`,
        riskLevel: 'low'
      };

      const currentBudgetIncrease = metrics.spend * 0.25;
      const projectedProfit = (metrics.profit / metrics.spend) * currentBudgetIncrease;

      const recommendedRule: RexRecommendedRule = {
        name: `Rex: Scale High Performer ${entity.name}`,
        description: `Automatically increase budget for high-performing ${entityType}`,
        entity_type: entityType,
        condition_logic: 'AND',
        check_frequency_minutes: 360,
        max_daily_actions: 2,
        require_approval: true,
        dry_run: false,
        conditions: [
          {
            metric_type: 'roas',
            operator: 'greater_than',
            threshold_value: 3,
            time_window_days: 3
          },
          {
            metric_type: 'profit',
            operator: 'greater_than',
            threshold_value: 100,
            time_window_days: 3
          }
        ],
        actions: [
          {
            action_type: 'increase_budget',
            parameters: {
              increase_percentage: 25,
              max_budget: metrics.spend * 2,
              reason: 'Scaled by Rex: Consistent high performance'
            }
          }
        ]
      };

      const estimatedImpact: RexEstimatedImpact = {
        expectedProfit: projectedProfit,
        expectedRevenue: metrics.revenue * 1.25,
        timeframeDays: 7,
        confidence: 'high',
        breakdown: `By increasing budget by 25% ($${currentBudgetIncrease.toFixed(2)}), you could add approximately $${projectedProfit.toFixed(2)} in profit per week while maintaining similar ROAS.`
      };

      return {
        user_id: userId,
        entity_type: entityType,
        entity_id: entity.id,
        entity_name: entity.name,
        platform: entity.platform,
        suggestion_type: 'scale_high_performer',
        priority_score: 85,
        confidence_score: 88,
        title: `Rex says: Scale up "${entity.name}"!`,
        message: `${REX_PERSONALITY.confidence.high[1]} that "${entity.name}" is a goldmine! With ${metrics.roas.toFixed(2)}x ROAS and $${metrics.profit.toFixed(2)} profit, this deserves more budget. Let me help you scale this winner up by 25%.`,
        reasoning,
        recommended_rule: recommendedRule,
        estimated_impact: estimatedImpact
      };
    }

    return null;
  }

  private checkCreativeFatigue(
    userId: string,
    entity: EntityData
  ): CreateRexSuggestionParams | null {
    const { metrics } = entity;

    if (metrics.fatigueScore && metrics.fatigueScore > 70 && metrics.ctr < 1.5) {
      const reasoning: RexSuggestionReasoning = {
        triggeredBy: ['high_fatigue', 'low_ctr'],
        metrics: {
          fatigue_score: metrics.fatigueScore,
          ctr: metrics.ctr,
          impressions: metrics.impressions
        },
        analysis: `This creative has a fatigue score of ${metrics.fatigueScore.toFixed(0)} with a CTR of only ${metrics.ctr.toFixed(2)}%. After ${metrics.impressions.toLocaleString()} impressions, people are getting tired of seeing it.`,
        riskLevel: 'medium'
      };

      const recommendedRule: RexRecommendedRule = {
        name: `Rex: Pause Fatigued Creative ${entity.name}`,
        description: 'Automatically pause creatives showing signs of audience fatigue',
        entity_type: 'ad',
        condition_logic: 'AND',
        check_frequency_minutes: 180,
        max_daily_actions: 3,
        require_approval: false,
        dry_run: false,
        conditions: [
          {
            metric_type: 'fatigue_score',
            operator: 'greater_than',
            threshold_value: 75,
            time_window_days: 3
          },
          {
            metric_type: 'ctr',
            operator: 'less_than',
            threshold_value: 1.5,
            time_window_days: 3
          }
        ],
        actions: [
          {
            action_type: 'pause',
            parameters: { reason: 'Paused by Rex: Creative fatigue detected' }
          }
        ]
      };

      const estimatedImpact: RexEstimatedImpact = {
        expectedSavings: metrics.spend * 0.15,
        timeframeDays: 7,
        confidence: 'medium',
        breakdown: `Pausing this fatigued creative and replacing it with fresh content could improve CTR by 0.5-1% and reduce wasted spend by approximately $${(metrics.spend * 0.15).toFixed(2)}.`
      };

      return {
        user_id: userId,
        entity_type: 'ad',
        entity_id: entity.id,
        entity_name: entity.name,
        platform: entity.platform,
        suggestion_type: 'refresh_creative',
        priority_score: 70,
        confidence_score: 75,
        title: `Rex noticed: "${entity.name}" needs a refresh`,
        message: `${REX_PERSONALITY.confidence.medium[2]} that people are getting tired of "${entity.name}". The fatigue score is ${metrics.fatigueScore.toFixed(0)} and CTR is dropping. Time for some fresh creative!`,
        reasoning,
        recommended_rule: recommendedRule,
        estimated_impact: estimatedImpact
      };
    }

    return null;
  }

  private checkUnderperformance(
    userId: string,
    entityType: RexEntityType,
    entity: EntityData
  ): CreateRexSuggestionParams | null {
    const { metrics } = entity;

    if (metrics.spend > 100 && metrics.roas < 1.5 && metrics.profit < 50) {
      const reasoning: RexSuggestionReasoning = {
        triggeredBy: ['low_roas', 'low_profit', 'significant_spend'],
        metrics: {
          spend: metrics.spend,
          roas: metrics.roas,
          profit: metrics.profit
        },
        analysis: `After spending $${metrics.spend.toFixed(2)}, this ${entityType} is only generating ${metrics.roas.toFixed(2)}x ROAS and $${metrics.profit.toFixed(2)} in profit. That's below acceptable thresholds.`,
        riskLevel: 'medium'
      };

      const recommendedRule: RexRecommendedRule = {
        name: `Rex: Pause Underperforming ${entity.name}`,
        description: `Pause ${entityType} that consistently underperforms`,
        entity_type: entityType,
        condition_logic: 'AND',
        check_frequency_minutes: 120,
        max_daily_actions: 2,
        require_approval: false,
        dry_run: false,
        conditions: [
          {
            metric_type: 'roas',
            operator: 'less_than',
            threshold_value: 1.5,
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
            parameters: { reason: 'Paused by Rex: Underperformance' }
          }
        ]
      };

      const estimatedImpact: RexEstimatedImpact = {
        expectedSavings: metrics.spend * 0.3,
        timeframeDays: 7,
        confidence: 'medium',
        breakdown: `Pausing this underperformer would free up approximately $${(metrics.spend * 0.3).toFixed(2)} that could be reallocated to better-performing campaigns.`
      };

      return {
        user_id: userId,
        entity_type: entityType,
        entity_id: entity.id,
        entity_name: entity.name,
        platform: entity.platform,
        suggestion_type: 'pause_underperforming',
        priority_score: 75,
        confidence_score: 80,
        title: `Rex thinks "${entity.name}" isn't pulling its weight`,
        message: `${REX_PERSONALITY.confidence.medium[0]} we should pause "${entity.name}". It's spent $${metrics.spend.toFixed(2)} but only delivering ${metrics.roas.toFixed(2)}x ROAS. Your money could work harder elsewhere.`,
        reasoning,
        recommended_rule: recommendedRule,
        estimated_impact: estimatedImpact
      };
    }

    return null;
  }

  private checkLowConversionRate(
    userId: string,
    entityType: RexEntityType,
    entity: EntityData
  ): CreateRexSuggestionParams | null {
    const { metrics } = entity;

    const cvr = metrics.clicks > 0
      ? (metrics.conversions / metrics.clicks) * 100
      : 0;

    // Only check if we have meaningful traffic
    if (metrics.clicks < 100) {
      return null;
    }

    // Determine severity: <1% = critical, <2% = warning, <3% = not good
    let severity: 'critical' | 'high' | 'medium' | null = null;
    let priorityScore = 0;
    let riskLevel: 'high' | 'medium' | 'low' = 'medium';
    let message = '';
    let title = '';

    if (cvr < 1) {
      // Terrible - critical issue
      severity = 'critical';
      priorityScore = 85;
      riskLevel = 'high';
      title = `"${entity.name}" has a terrible CVR (<1%) - urgent review needed`;
      message = `${REX_PERSONALITY.urgency.high[0]} "${entity.name}" has a CVR of only ${cvr.toFixed(2)}%. With ${metrics.clicks} clicks and just ${metrics.conversions} conversions, something is seriously wrong with your landing page, offer, or checkout process.`;
    } else if (cvr < 2) {
      // Warning - needs attention
      severity = 'high';
      priorityScore = 75;
      riskLevel = 'high';
      title = `"${entity.name}" has a low CVR (<2%) - needs attention`;
      message = `${REX_PERSONALITY.confidence.high[0]} "${entity.name}" needs work. CVR of ${cvr.toFixed(2)}% is below industry standards. With ${metrics.clicks} clicks, you should be getting more than ${metrics.conversions} conversions.`;
    } else if (cvr < 3) {
      // Not good - should improve
      severity = 'medium';
      priorityScore = 65;
      riskLevel = 'medium';
      title = `"${entity.name}" CVR could be better (${cvr.toFixed(2)}%)`;
      message = `${REX_PERSONALITY.confidence.medium[1]} "${entity.name}" could perform better. CVR of ${cvr.toFixed(2)}% is below the 3% mark. There's room for improvement in your landing page experience.`;
    }

    if (!severity) {
      return null;
    }

    const reasoning: RexSuggestionReasoning = {
      triggeredBy: ['low_conversion_rate', 'landing_page_friction'],
      metrics: {
        clicks: metrics.clicks,
        conversions: metrics.conversions,
        cvr: cvr,
        ctr: metrics.ctr
      },
      analysis: `This ${entityType} has ${metrics.clicks} clicks but only ${metrics.conversions} conversions (${cvr.toFixed(2)}% CVR). ${cvr < 1 ? 'This is critically low and suggests major friction.' : cvr < 2 ? 'This is below industry standards.' : 'This could be improved.'} Common issues: slow page load, confusing checkout, pricing concerns, or trust signals.`,
      riskLevel
    };

    const recommendedRule: RexRecommendedRule = {
      name: `Rex: Monitor CVR for ${entity.name}`,
      description: `Alert if CVR stays below ${cvr < 1 ? '1%' : cvr < 2 ? '2%' : '3%'} with sustained traffic`,
      entity_type: entityType,
      condition_logic: 'AND',
      check_frequency_minutes: 360,
      max_daily_actions: 1,
      require_approval: true,
      dry_run: false,
      conditions: [
        {
          metric_type: 'clicks',
          operator: 'greater_than',
          threshold_value: 100,
          time_window_days: 7
        }
      ],
      actions: [
        {
          action_type: 'notify',
          parameters: { reason: `CVR below ${cvr < 1 ? '1%' : cvr < 2 ? '2%' : '3%'} - review landing page` }
        }
      ]
    };

    // Calculate potential impact
    const targetCvr = 3.0; // Industry average target
    const additionalConversions = (metrics.clicks * (targetCvr / 100)) - metrics.conversions;
    const avgOrderValue = metrics.conversions > 0 ? metrics.revenue / metrics.conversions : 50;

    const estimatedImpact: RexEstimatedImpact = {
      expectedSavings: additionalConversions * avgOrderValue,
      timeframeDays: 14,
      confidence: cvr < 1 ? 'high' : cvr < 2 ? 'medium' : 'low',
      breakdown: `Improving CVR to ${targetCvr}% would generate approximately ${additionalConversions.toFixed(0)} additional conversions worth ~$${(additionalConversions * avgOrderValue).toFixed(0)} over 2 weeks.`
    };

    return {
      user_id: userId,
      entity_type: entityType,
      entity_id: entity.id,
      entity_name: entity.name,
      platform: entity.platform,
      suggestion_type: 'landing_page_optimization',
      priority_score: priorityScore,
      confidence_score: cvr < 1 ? 90 : cvr < 2 ? 80 : 70,
      title,
      message,
      reasoning,
      recommended_rule: recommendedRule,
      estimated_impact: estimatedImpact
    };
  }
}

export const rexIntelligence = new RexIntelligence();
