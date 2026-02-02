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
  | 'optimize_schedule'
  | 'optimize_demographics'
  | 'optimize_placements'
  | 'optimize_geographic'
  | 'enable_dayparting'
  | 'target_high_ltv_segment'
  | 'refresh_fatigued_placement'
  | 'scale_hidden_winner'
  | 'test_similar_demographic'
  | 'expand_winning_region'
  | 'pause_entity'
  | 'cross_platform_budget_reallocation'
  | 'cross_platform_time_optimization'
  | 'cross_platform_trend_alert'
  | 'cross_platform_efficiency_opportunity'
  | 'settings_deviation_warning'
  | 'bid_strategy_test'
  | 'performance_goal_test'
  | 'pixel_strength_warning'
  | 'payment_issue_warning'
  | 'learning_phase_optimization'
  | 'switch_to_cbo'
  | 'switch_to_abo'
  | 'optimize_product_mix'
  | 'product_margin_optimization'
  | 'refresh_creative'
  | 'landing_page_optimization'
  | 'product_page_optimization'
  | 'checkout_optimization'
  | 'optimize_funnel'
  | 'demographic_optimization'
  | 'placement_optimization'
  | 'geographic_optimization'
  | 'temporal_optimization'
  | 'optimize_campaign'
  | 'review_underperformer'
  | 'build_segment_campaign'
  | 'build_segment_ad_set'
  | 'horizontal_scale_opportunity'
  | 'get_expert_help';

export type ExpertHelpReason =
  | 'creative_fatigue'
  | 'landing_page_issues'
  | 'product_viability'
  | 'scaling_plateau'
  | 'complex_optimization';

export type RexSuggestionCategory = 'campaign_level' | 'cross_platform';

export type RexEntityType = 'campaign' | 'ad_set' | 'ad' | 'account';

// Breakdown Data Interfaces
export interface DemographicBreakdown {
  topPerforming: Array<{
    ageRange: string;
    gender: string;
    roas: number;
    conversions: number;
    spend: number;
    ctr: number;
    improvement: number; // vs average
  }>;
  underperforming: Array<{
    ageRange: string;
    gender: string;
    roas: number;
    wasted_spend: number;
  }>;
  insights: string[];
}

export interface PlacementBreakdown {
  topPerforming: Array<{
    placementType: string;
    deviceType: string;
    platform: string;
    roas: number;
    conversions: number;
    spend: number;
    ctr: number;
    engagement: number;
    improvement: number;
  }>;
  underperforming: Array<{
    placementType: string;
    deviceType: string;
    roas: number;
    wasted_spend: number;
  }>;
  insights: string[];
}

export interface GeographicBreakdown {
  topPerforming: Array<{
    country: string;
    region?: string;
    city?: string;
    roas: number;
    conversions: number;
    spend: number;
    averageOrderValue: number;
    improvement: number;
  }>;
  untapped: Array<{
    country: string;
    potential: string;
    similarMarkets: string[];
  }>;
  insights: string[];
}

export interface TemporalPattern {
  bestPerforming: Array<{
    dayOfWeek: string;
    hourRange: string;
    roas: number;
    conversions: number;
    spend: number;
    improvement: number;
  }>;
  worstPerforming: Array<{
    dayOfWeek: string;
    hourRange: string;
    roas: number;
    wasted_spend: number;
  }>;
  insights: string[];
}

export interface CustomerInsights {
  newVsReturning: {
    new: { conversions: number; revenue: number; averageOrderValue: number; cpa: number };
    returning: { conversions: number; revenue: number; averageOrderValue: number; cpa: number };
  };
  lifetimeValue: {
    average: number;
    top10Percent: number;
    repeatPurchaseRate: number;
  };
  behaviors: string[];
  insights: string[];
}

export interface MetricProjections {
  spend?: number;
  revenue?: number;
  profit?: number;
  roas?: number;
  conversions?: number;
  timeframe: string;
}

export interface RexSuggestionReasoning {
  triggeredBy: string[];
  primaryInsight?: string;
  metrics: {
    [key: string]: number | string | boolean | undefined;
  };
  analysis: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  expertHelpReason?: ExpertHelpReason;

  // Enhanced breakdown data
  supportingData?: {
    demographics?: DemographicBreakdown;
    placements?: PlacementBreakdown;
    geographic?: GeographicBreakdown;
    temporal?: TemporalPattern;
    customerBehavior?: CustomerInsights;
  };

  // Analysis metadata
  dataPointsAnalyzed?: number;
  analysisDepth?: 'surface' | 'moderate' | 'deep';
  patternType?: 'obvious' | 'hidden' | 'anomaly';
  urgency?: 'low' | 'medium' | 'high' | 'critical';

  // Projections
  projections?: {
    ifImplemented?: MetricProjections;
    ifIgnored?: MetricProjections;
  };

  // Evidence
  sampleDataPoints?: any[];
  methodology?: string;
  confidenceIntervals?: Record<string, { lower: number; upper: number }>;

  // Action guidance
  actionSteps?: string[];

  // Cross-engine context
  platformContext?: {
    learningPhaseStatus?: string;
    budgetConstraints?: string;
    performanceContext?: string;
  };
  pixelHealthWarning?: string;
  crossReferenced?: boolean;
  multipleIssuesOnEntity?: number;
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
  expectedROAS?: number;
  expectedCPA?: number;
  timeframeDays?: number;
  timeframe?: string;
  confidence?: 'low' | 'medium' | 'high';
  breakdown?: string;
  reasoning?: string;
}

export interface RexSuggestion {
  id: string;
  user_id: string;
  entity_type: RexEntityType;
  entity_id: string;
  entity_name: string;
  platform: string;
  platform_entity_id?: string;
  suggestion_type: RexSuggestionType;
  suggestion_category?: RexSuggestionCategory;
  status: RexSuggestionStatus;
  priority_score: number;
  confidence_score: number;
  title: string;
  message: string;
  reasoning: RexSuggestionReasoning;
  recommended_rule?: RexRecommendedRule;
  estimated_impact?: RexEstimatedImpact;
  automation_rule_id?: string;
  data_confidence?: {
    level: string;
    daysAnalyzed: number;
    dataPointsUsed: number;
  };
  data_range_days?: number;
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
  platform_entity_id?: string;
  suggestion_type: RexSuggestionType | string;
  suggestion_category?: RexSuggestionCategory;
  priority_score: number;
  confidence_score: number;
  title?: string;
  message?: string;
  reasoning: Partial<RexSuggestionReasoning> & {
    triggeredBy: string[];
    analysis: string;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    metrics: Record<string, number | string | boolean | undefined>;
  };
  recommended_rule?: RexRecommendedRule;
  estimated_impact?: Partial<RexEstimatedImpact>;
  data_confidence?: {
    level: string;
    daysAnalyzed: number;
    dataPointsUsed: number;
  };
  data_range_days?: number;
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
