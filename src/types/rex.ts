// Rex AI Suggestion System Types

export type RexSuggestionStatus =
  | 'pending'
  | 'viewed'
  | 'accepted'
  | 'applied'
  | 'monitoring'
  | 'dismissed'
  | 'expired'
  | 'completed';

export type RexSuggestionType =
  | 'pause_underperforming'
  | 'scale_high_performer'
  | 'reduce_budget'
  | 'increase_budget'
  | 'refresh_creative'
  | 'adjust_targeting'
  | 'pause_negative_roi'
  | 'reallocate_budget'
  | 'test_new_creative'
  | 'optimize_schedule';

export type RexEntityType = 'campaign' | 'ad_set' | 'ad';

export interface RexSuggestionReasoning {
  triggeredBy: string[];
  metrics: {
    [key: string]: number | string;
  };
  analysis: string;
  riskLevel: 'low' | 'medium' | 'high';
}

export interface RexRecommendedRule {
  name: string;
  description: string;
  entity_type: 'campaign' | 'ad_set' | 'ad';
  condition_logic: 'AND' | 'OR';
  check_frequency_minutes: number;
  max_daily_actions: number;
  require_approval: boolean;
  dry_run: boolean;
  conditions: Array<{
    metric_type: string;
    operator: string;
    threshold_value: number;
    threshold_value_max?: number;
    time_window_days: number;
  }>;
  actions: Array<{
    action_type: string;
    parameters: Record<string, any>;
  }>;
}

export interface RexEstimatedImpact {
  expectedSavings?: number;
  expectedRevenue?: number;
  expectedProfit?: number;
  timeframeDays: number;
  confidence: 'low' | 'medium' | 'high';
  breakdown: string;
}

export interface RexSuggestion {
  id: string;
  user_id: string;
  entity_type: RexEntityType;
  entity_id: string;
  entity_name: string;
  platform: string;
  suggestion_type: RexSuggestionType;
  status: RexSuggestionStatus;
  priority_score: number;
  confidence_score: number;
  title: string;
  message: string;
  reasoning: RexSuggestionReasoning;
  recommended_rule?: RexRecommendedRule;
  estimated_impact?: RexEstimatedImpact;
  automation_rule_id?: string;
  created_at: string;
  viewed_at?: string;
  accepted_at?: string;
  applied_at?: string;
  dismissed_at?: string;
  expired_at?: string;
  completed_at?: string;
  expires_at: string;
}

export interface RexSuggestionPerformance {
  id: string;
  suggestion_id: string;
  baseline_spend: number;
  baseline_revenue: number;
  baseline_profit: number;
  baseline_roas: number;
  baseline_conversions: number;
  baseline_cpa: number;
  baseline_impressions: number;
  baseline_clicks: number;
  baseline_ctr: number;
  baseline_period_start: string;
  baseline_period_end: string;
  current_spend: number;
  current_revenue: number;
  current_profit: number;
  current_roas: number;
  current_conversions: number;
  current_cpa: number;
  current_impressions: number;
  current_clicks: number;
  current_ctr: number;
  current_period_start?: string;
  current_period_end?: string;
  spend_delta: number;
  revenue_delta: number;
  profit_delta: number;
  roas_delta: number;
  conversions_delta: number;
  is_improving: boolean;
  performance_change_percent?: number;
  created_at: string;
  updated_at: string;
  last_synced_at?: string;
}

export interface RexSuggestionInteraction {
  id: string;
  suggestion_id: string;
  user_id: string;
  interaction_type: 'viewed' | 'dismissed' | 'accepted' | 'modified' | 'rule_created';
  interaction_data?: Record<string, any>;
  created_at: string;
}

export interface RexSuggestionWithPerformance extends RexSuggestion {
  performance?: RexSuggestionPerformance;
}

export interface CreateRexSuggestionParams {
  user_id: string;
  entity_type: RexEntityType;
  entity_id: string;
  entity_name: string;
  platform: string;
  suggestion_type: RexSuggestionType;
  priority_score: number;
  confidence_score: number;
  title: string;
  message: string;
  reasoning: RexSuggestionReasoning;
  recommended_rule?: RexRecommendedRule;
  estimated_impact?: RexEstimatedImpact;
  expires_at?: string;
}

export interface RexAnalytics {
  totalSuggestions: number;
  pendingSuggestions: number;
  acceptedSuggestions: number;
  dismissedSuggestions: number;
  appliedSuggestions: number;
  totalSavings: number;
  totalGains: number;
  averageConfidence: number;
  topSuggestionType: RexSuggestionType;
  acceptanceRate: number;
}
