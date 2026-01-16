export type RuleStatus = 'active' | 'paused' | 'draft';
export type EntityType = 'campaign' | 'ad_set' | 'ad';
export type ConditionLogic = 'AND' | 'OR';

export type MetricType =
  | 'profit'
  | 'profit_margin'
  | 'net_roas'
  | 'roas'
  | 'cpa'
  | 'cpc'
  | 'cpm'
  | 'ctr'
  | 'spend'
  | 'conversions'
  | 'revenue'
  | 'clicks'
  | 'impressions'
  | 'frequency'
  | 'quality_score'
  | 'search_impression_share'
  | 'search_top_impression_share'
  | 'search_abs_top_impression_share'
  | 'search_lost_impression_share_budget'
  | 'search_lost_impression_share_rank'
  | 'conversion_rate'
  | 'cost_per_conversion'
  | 'view_through_conversions';

export type ConditionOperator =
  | 'greater_than'
  | 'less_than'
  | 'equals'
  | 'greater_or_equal'
  | 'less_or_equal'
  | 'between'
  | 'not_equals';

export type ActionType =
  | 'pause_entity'
  | 'resume_entity'
  | 'adjust_budget'
  | 'send_notification'
  | 'change_bid'
  | 'duplicate_winner'
  | 'change_status'
  | 'adjust_device_bid'
  | 'adjust_location_bid'
  | 'adjust_audience_bid'
  | 'adjust_ad_schedule_bid'
  | 'adjust_keyword_bid'
  | 'add_negative_keyword'
  | 'exclude_placement'
  | 'change_bidding_strategy';

export type BudgetChangeType = 'percent' | 'fixed_amount';

export type ExecutionStatus = 'running' | 'completed' | 'failed' | 'cancelled';

export type ActionHistoryStatus = 'pending' | 'applied' | 'failed' | 'rolled_back';

export type TemplateCategory =
  | 'profit_protection'
  | 'scale_winners'
  | 'pause_losers'
  | 'budget_optimization'
  | 'creative_management'
  | 'audience_optimization'
  | 'custom';

export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced';

export interface AutomationRule {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  status: RuleStatus;
  entity_type: EntityType;
  ad_account_id: string | null;
  platform: 'facebook' | 'tiktok' | 'google';
  condition_logic: ConditionLogic;
  check_frequency_minutes: number;
  last_executed_at: string | null;
  next_execution_at: string | null;
  max_daily_actions: number | null;
  require_approval: boolean;
  dry_run: boolean;
  total_executions: number;
  total_actions_taken: number;
  total_cost_saved: number;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface RuleCondition {
  id: string;
  rule_id: string;
  metric_type: MetricType;
  operator: ConditionOperator;
  threshold_value: number;
  threshold_value_max: number | null;
  time_window_days: number;
  condition_order: number;
  created_at: string;
}

export interface RuleAction {
  id: string;
  rule_id: string;
  action_type: ActionType;
  action_params: Record<string, any>;
  budget_change_type: BudgetChangeType | null;
  budget_change_value: number | null;
  min_budget: number | null;
  max_budget: number | null;
  notification_channels: string[];
  notification_message: string | null;
  action_order: number;
  created_at: string;
}

export interface RuleExecution {
  id: string;
  rule_id: string;
  user_id: string;
  started_at: string;
  completed_at: string | null;
  status: ExecutionStatus;
  entities_checked: number;
  entities_matched: number;
  actions_taken: number;
  actions_failed: number;
  error_message: string | null;
  error_details: Record<string, any> | null;
  execution_duration_ms: number | null;
  execution_metadata: Record<string, any>;
}

export interface ActionHistory {
  id: string;
  execution_id: string;
  rule_id: string;
  user_id: string;
  entity_type: EntityType;
  entity_id: string;
  entity_platform_id: string | null;
  entity_name: string | null;
  action_type: string;
  action_params: Record<string, any>;
  field_changed: string | null;
  old_value: string | null;
  new_value: string | null;
  status: ActionHistoryStatus;
  error_message: string | null;
  api_response: Record<string, any> | null;
  can_rollback: boolean;
  rolled_back_at: string | null;
  rollback_reason: string | null;
  created_at: string;
}

export interface RuleTemplate {
  id: string;
  name: string;
  description: string;
  category: TemplateCategory;
  entity_type: EntityType;
  condition_logic: ConditionLogic;
  conditions: RuleConditionConfig[];
  actions: RuleActionConfig[];
  recommended_for: string[];
  difficulty_level: DifficultyLevel;
  estimated_impact: string | null;
  use_case_description: string | null;
  success_rate: number | null;
  is_active: boolean;
  is_featured: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface RuleConditionConfig {
  metric_type: MetricType;
  operator: ConditionOperator;
  threshold_value: number;
  threshold_value_max?: number;
  time_window_days: number;
}

export interface RuleActionConfig {
  action_type: ActionType;
  action_params?: Record<string, any>;
  budget_change_type?: BudgetChangeType;
  budget_change_value?: number;
  min_budget?: number;
  max_budget?: number;
  notification_channels?: string[];
  notification_message?: string;
}

export interface RuleWithDetails extends AutomationRule {
  conditions: RuleCondition[];
  actions: RuleAction[];
  recent_executions?: RuleExecution[];
}

export interface RuleBuilderFormData {
  name: string;
  description: string;
  entity_type: EntityType;
  ad_account_id: string | null;
  platform: 'facebook' | 'tiktok' | 'google';
  condition_logic: ConditionLogic;
  conditions: RuleConditionConfig[];
  actions: RuleActionConfig[];
  check_frequency_minutes: number;
  max_daily_actions: number;
  require_approval: boolean;
  dry_run: boolean;
}

export interface RulePerformanceMetrics {
  total_executions: number;
  total_actions_taken: number;
  total_cost_saved: number;
  avg_execution_time_ms: number;
  success_rate: number;
  last_7_days_actions: number;
  last_30_days_savings: number;
}

export interface RuleSuggestion {
  template_id: string;
  template_name: string;
  reason: string;
  confidence: number;
  estimated_impact: string;
  related_metrics: Record<string, number>;
  category: TemplateCategory;
}

export type GoogleDeviceType = 'MOBILE' | 'DESKTOP' | 'TABLET' | 'CONNECTED_TV';

export type GoogleBiddingStrategyType =
  | 'MANUAL_CPC'
  | 'ENHANCED_CPC'
  | 'TARGET_CPA'
  | 'TARGET_ROAS'
  | 'MAXIMIZE_CONVERSIONS'
  | 'MAXIMIZE_CONVERSION_VALUE'
  | 'MAXIMIZE_CLICKS'
  | 'TARGET_IMPRESSION_SHARE';

export type GoogleAudienceType =
  | 'IN_MARKET'
  | 'AFFINITY'
  | 'REMARKETING'
  | 'SIMILAR'
  | 'CUSTOM_INTENT'
  | 'COMBINED';

export type GoogleNegativeKeywordMatchType = 'BROAD' | 'PHRASE' | 'EXACT';

export interface GoogleDeviceBidAdjustmentParams {
  device_type: GoogleDeviceType;
  bid_modifier_percent: number;
}

export interface GoogleLocationBidAdjustmentParams {
  location_id: string;
  location_name?: string;
  bid_modifier_percent: number;
}

export interface GoogleAudienceBidAdjustmentParams {
  audience_id: string;
  audience_name?: string;
  audience_type?: GoogleAudienceType;
  bid_modifier_percent: number;
}

export interface GoogleAdScheduleBidAdjustmentParams {
  day_of_week: 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY';
  start_hour: number;
  end_hour: number;
  bid_modifier_percent: number;
}

export interface GoogleKeywordBidAdjustmentParams {
  keyword_id?: string;
  keyword_text?: string;
  match_type?: 'BROAD' | 'PHRASE' | 'EXACT';
  bid_micros: number;
}

export interface GoogleNegativeKeywordParams {
  keyword_text: string;
  match_type: GoogleNegativeKeywordMatchType;
  level: 'campaign' | 'ad_group';
}

export interface GooglePlacementExclusionParams {
  placement_url: string;
  level: 'campaign' | 'ad_group';
}

export interface GoogleBiddingStrategyParams {
  strategy_type: GoogleBiddingStrategyType;
  target_cpa_micros?: number;
  target_roas?: number;
  target_impression_share?: number;
  target_impression_share_location?: 'ANYWHERE_ON_PAGE' | 'TOP_OF_PAGE' | 'ABSOLUTE_TOP_OF_PAGE';
}

export interface GoogleAdsActionParams {
  device_bid?: GoogleDeviceBidAdjustmentParams;
  location_bid?: GoogleLocationBidAdjustmentParams;
  audience_bid?: GoogleAudienceBidAdjustmentParams;
  ad_schedule_bid?: GoogleAdScheduleBidAdjustmentParams;
  keyword_bid?: GoogleKeywordBidAdjustmentParams;
  negative_keyword?: GoogleNegativeKeywordParams;
  placement_exclusion?: GooglePlacementExclusionParams;
  bidding_strategy?: GoogleBiddingStrategyParams;
}

export const GOOGLE_ADS_METRICS: { value: MetricType; label: string; googleOnly?: boolean }[] = [
  { value: 'quality_score', label: 'Quality Score', googleOnly: true },
  { value: 'search_impression_share', label: 'Search Impression Share', googleOnly: true },
  { value: 'search_top_impression_share', label: 'Top Impression Share', googleOnly: true },
  { value: 'search_abs_top_impression_share', label: 'Absolute Top Impression Share', googleOnly: true },
  { value: 'search_lost_impression_share_budget', label: 'Lost IS (Budget)', googleOnly: true },
  { value: 'search_lost_impression_share_rank', label: 'Lost IS (Rank)', googleOnly: true },
  { value: 'conversion_rate', label: 'Conversion Rate' },
  { value: 'cost_per_conversion', label: 'Cost Per Conversion' },
];

export const GOOGLE_ADS_ACTIONS: { value: ActionType; label: string; description: string; googleOnly: boolean }[] = [
  {
    value: 'adjust_device_bid',
    label: 'Adjust Device Bid',
    description: 'Increase or decrease bids for mobile, desktop, or tablet',
    googleOnly: true,
  },
  {
    value: 'adjust_location_bid',
    label: 'Adjust Location Bid',
    description: 'Increase or decrease bids for specific locations',
    googleOnly: true,
  },
  {
    value: 'adjust_audience_bid',
    label: 'Adjust Audience Bid',
    description: 'Increase or decrease bids for audience segments',
    googleOnly: true,
  },
  {
    value: 'adjust_ad_schedule_bid',
    label: 'Adjust Schedule Bid',
    description: 'Increase or decrease bids for specific times/days',
    googleOnly: true,
  },
  {
    value: 'adjust_keyword_bid',
    label: 'Adjust Keyword Bid',
    description: 'Change bid amount for keywords',
    googleOnly: true,
  },
  {
    value: 'add_negative_keyword',
    label: 'Add Negative Keyword',
    description: 'Block unwanted search terms',
    googleOnly: true,
  },
  {
    value: 'exclude_placement',
    label: 'Exclude Placement',
    description: 'Block ads from showing on specific sites',
    googleOnly: true,
  },
  {
    value: 'change_bidding_strategy',
    label: 'Change Bidding Strategy',
    description: 'Switch between CPC, CPA, ROAS strategies',
    googleOnly: true,
  },
];
