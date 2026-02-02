import type { RexRecommendedRule, RexSuggestionType } from '@/types/rex';

/**
 * Rex Rule Generator
 *
 * Generates appropriate automation rules based on suggestion types.
 * Ensures every suggestion has a complementary automation rule.
 */

interface RuleGenerationParams {
  suggestionType: RexSuggestionType | string;
  entityType: 'campaign' | 'ad_set' | 'ad';
  entityName: string;
  currentMetrics?: {
    roas?: number;
    spend?: number;
    profit?: number;
    conversions?: number;
    cpa?: number;
  };
  platform?: string;
}

export class RexRuleGenerator {
  /**
   * Generate a recommended automation rule based on suggestion type
   */
  static generateRule(params: RuleGenerationParams): RexRecommendedRule {
    const { suggestionType, entityType, entityName, currentMetrics = {}, platform = 'facebook' } = params;

    switch (suggestionType) {
      case 'scale_high_performer':
        return this.generateScaleHighPerformerRule(entityType, entityName, currentMetrics, platform);

      case 'optimize_campaign':
      case 'optimize_ad_set':
        return this.generateOptimizationRule(entityType, entityName, currentMetrics);

      case 'review_underperformer':
      case 'pause_underperforming':
        return this.generateUnderperformerRule(entityType, entityName, currentMetrics);

      case 'increase_budget':
        return this.generateBudgetIncreaseRule(entityType, entityName, currentMetrics);

      case 'reduce_budget':
      case 'decrease_budget':
        return this.generateBudgetDecreaseRule(entityType, entityName, currentMetrics);

      case 'pause_entity':
      case 'pause_negative_roi':
        return this.generatePauseRule(entityType, entityName, currentMetrics);

      case 'refresh_creative':
      case 'test_new_creative':
        return this.generateCreativeRefreshRule(entityType, entityName, currentMetrics);

      default:
        return this.generateDefaultRule(entityType, entityName, currentMetrics);
    }
  }

  /**
   * Generate rule for scaling high performers
   */
  private static generateScaleHighPerformerRule(
    entityType: 'campaign' | 'ad_set' | 'ad',
    entityName: string,
    metrics: any,
    platform: string
  ): RexRecommendedRule {
    const breakeven = metrics.roas ? metrics.roas * 0.7 : 1.5;
    const targetProfitMargin = 20;

    return {
      name: `Smart Scaling for ${entityName}`,
      description: `Automatically scales budget by 20% when performance is strong, and scales down by 20% if metrics deteriorate. Checks every 2-3 days to allow optimization to stabilize.`,
      entity_type: entityType,
      condition_logic: 'AND',
      check_frequency_minutes: platform === 'tiktok' ? 2880 : 4320, // 2 days for TikTok, 3 days for others
      max_daily_actions: 1,
      require_approval: false,
      dry_run: false,
      conditions: [
        {
          metric_type: 'roas',
          operator: 'greater_than_or_equal',
          threshold_value: breakeven,
          time_window_days: 3
        },
        {
          metric_type: 'profit_margin_percent',
          operator: 'greater_than_or_equal',
          threshold_value: targetProfitMargin,
          time_window_days: 3
        },
        {
          metric_type: 'conversions',
          operator: 'greater_than',
          threshold_value: 3,
          time_window_days: 3
        }
      ],
      actions: [
        {
          action_type: 'increase_budget',
          parameters: {
            increase_percentage: 20,
            reason: 'Performance metrics meet scaling thresholds'
          }
        }
      ]
    };
  }

  /**
   * Generate rule for optimization opportunities
   */
  private static generateOptimizationRule(
    entityType: 'campaign' | 'ad_set' | 'ad',
    entityName: string,
    metrics: any
  ): RexRecommendedRule {
    return {
      name: `Performance Monitoring for ${entityName}`,
      description: `Monitors key metrics and alerts when performance drops below thresholds. Helps catch issues early before they impact profitability.`,
      entity_type: entityType,
      condition_logic: 'OR',
      check_frequency_minutes: 1440, // Daily check
      max_daily_actions: 2,
      require_approval: true,
      dry_run: false,
      conditions: [
        {
          metric_type: 'roas',
          operator: 'less_than',
          threshold_value: metrics.roas ? metrics.roas * 0.8 : 1.5,
          time_window_days: 3
        },
        {
          metric_type: 'cpa',
          operator: 'greater_than',
          threshold_value: metrics.cpa ? metrics.cpa * 1.3 : 50,
          time_window_days: 3
        }
      ],
      actions: [
        {
          action_type: 'alert',
          parameters: {
            message: `${entityName} performance has degraded - review and optimize`
          }
        }
      ]
    };
  }

  /**
   * Generate rule for underperformers
   */
  private static generateUnderperformerRule(
    entityType: 'campaign' | 'ad_set' | 'ad',
    entityName: string,
    metrics: any
  ): RexRecommendedRule {
    return {
      name: `Auto-Protect Budget from ${entityName}`,
      description: `Automatically reduces budget by 20% if ROAS drops below breakeven or profit margin is negative. Prevents continued losses while allowing for recovery.`,
      entity_type: entityType,
      condition_logic: 'OR',
      check_frequency_minutes: 1440, // Check daily
      max_daily_actions: 2,
      require_approval: false,
      dry_run: false,
      conditions: [
        {
          metric_type: 'roas',
          operator: 'less_than',
          threshold_value: 1.0,
          time_window_days: 2
        },
        {
          metric_type: 'profit',
          operator: 'less_than',
          threshold_value: 0,
          time_window_days: 2
        },
        {
          metric_type: 'spend',
          operator: 'greater_than',
          threshold_value: 50,
          time_window_days: 2
        }
      ],
      actions: [
        {
          action_type: 'decrease_budget',
          parameters: {
            decrease_percentage: 20,
            reason: 'Reducing spend to prevent losses'
          }
        }
      ]
    };
  }

  /**
   * Generate rule for budget increases
   */
  private static generateBudgetIncreaseRule(
    entityType: 'campaign' | 'ad_set' | 'ad',
    entityName: string,
    metrics: any
  ): RexRecommendedRule {
    return {
      name: `Scale ${entityName} Safely`,
      description: `Increases budget by 15% when performance is consistently strong over 2-3 days. Ensures stable optimization before scaling.`,
      entity_type: entityType,
      condition_logic: 'AND',
      check_frequency_minutes: 2880, // Every 2 days
      max_daily_actions: 1,
      require_approval: false,
      dry_run: false,
      conditions: [
        {
          metric_type: 'roas',
          operator: 'greater_than_or_equal',
          threshold_value: metrics.roas ? metrics.roas * 0.9 : 2.0,
          time_window_days: 3
        },
        {
          metric_type: 'conversions',
          operator: 'greater_than',
          threshold_value: 5,
          time_window_days: 3
        }
      ],
      actions: [
        {
          action_type: 'increase_budget',
          parameters: {
            increase_percentage: 15,
            reason: 'Consistent strong performance'
          }
        }
      ]
    };
  }

  /**
   * Generate rule for budget decreases
   */
  private static generateBudgetDecreaseRule(
    entityType: 'campaign' | 'ad_set' | 'ad',
    entityName: string,
    metrics: any
  ): RexRecommendedRule {
    return {
      name: `Protect Budget for ${entityName}`,
      description: `Reduces budget by 20% if ROAS falls below profitable levels. Prevents wasteful spending while allowing recovery opportunity.`,
      entity_type: entityType,
      condition_logic: 'OR',
      check_frequency_minutes: 1440,
      max_daily_actions: 2,
      require_approval: false,
      dry_run: false,
      conditions: [
        {
          metric_type: 'roas',
          operator: 'less_than',
          threshold_value: 1.2,
          time_window_days: 2
        },
        {
          metric_type: 'cpa',
          operator: 'greater_than',
          threshold_value: metrics.cpa ? metrics.cpa * 1.5 : 75,
          time_window_days: 2
        }
      ],
      actions: [
        {
          action_type: 'decrease_budget',
          parameters: {
            decrease_percentage: 20,
            reason: 'Performance below target thresholds'
          }
        }
      ]
    };
  }

  /**
   * Generate rule for pausing entities
   */
  private static generatePauseRule(
    entityType: 'campaign' | 'ad_set' | 'ad',
    entityName: string,
    metrics: any
  ): RexRecommendedRule {
    return {
      name: `Auto-Pause ${entityName} if Unprofitable`,
      description: `Automatically pauses if spending continues without profitability. Requires approval to prevent accidental pauses.`,
      entity_type: entityType,
      condition_logic: 'AND',
      check_frequency_minutes: 1440,
      max_daily_actions: 1,
      require_approval: true,
      dry_run: false,
      conditions: [
        {
          metric_type: 'roas',
          operator: 'less_than',
          threshold_value: 0.8,
          time_window_days: 3
        },
        {
          metric_type: 'spend',
          operator: 'greater_than',
          threshold_value: 100,
          time_window_days: 3
        }
      ],
      actions: [
        {
          action_type: 'pause',
          parameters: {
            reason: 'Consistent negative ROI'
          }
        }
      ]
    };
  }

  /**
   * Generate rule for creative refresh
   */
  private static generateCreativeRefreshRule(
    entityType: 'campaign' | 'ad_set' | 'ad',
    entityName: string,
    metrics: any
  ): RexRecommendedRule {
    return {
      name: `Creative Fatigue Monitor for ${entityName}`,
      description: `Alerts when engagement metrics decline, indicating potential creative fatigue. Prompts creative refresh before performance degrades.`,
      entity_type: entityType,
      condition_logic: 'OR',
      check_frequency_minutes: 2880, // Check every 2 days
      max_daily_actions: 1,
      require_approval: true,
      dry_run: false,
      conditions: [
        {
          metric_type: 'ctr',
          operator: 'less_than',
          threshold_value: 1.5,
          time_window_days: 7
        },
        {
          metric_type: 'roas',
          operator: 'less_than',
          threshold_value: metrics.roas ? metrics.roas * 0.75 : 1.5,
          time_window_days: 7
        }
      ],
      actions: [
        {
          action_type: 'alert',
          parameters: {
            message: 'Creative may be fatigued - consider refreshing'
          }
        }
      ]
    };
  }

  /**
   * Generate default rule for unknown suggestion types
   */
  private static generateDefaultRule(
    entityType: 'campaign' | 'ad_set' | 'ad',
    entityName: string,
    metrics: any
  ): RexRecommendedRule {
    return {
      name: `Monitor ${entityName} Performance`,
      description: `Basic performance monitoring rule. Alerts when key metrics deviate significantly from current levels.`,
      entity_type: entityType,
      condition_logic: 'OR',
      check_frequency_minutes: 1440,
      max_daily_actions: 2,
      require_approval: true,
      dry_run: false,
      conditions: [
        {
          metric_type: 'roas',
          operator: 'less_than',
          threshold_value: metrics.roas ? metrics.roas * 0.7 : 1.5,
          time_window_days: 3
        },
        {
          metric_type: 'spend',
          operator: 'greater_than',
          threshold_value: metrics.spend ? metrics.spend * 1.5 : 500,
          time_window_days: 3
        }
      ],
      actions: [
        {
          action_type: 'alert',
          parameters: {
            message: 'Significant performance change detected'
          }
        }
      ]
    };
  }
}
