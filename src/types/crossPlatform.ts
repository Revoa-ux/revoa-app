export type AdPlatform = 'facebook' | 'google' | 'tiktok';

export interface CrossPlatformMetric {
  id: string;
  userId: string;
  platform: AdPlatform;
  date: string;
  revenue: number;
  cogs: number;
  adSpend: number;
  netProfit: number;
  profitMargin: number;
  roas: number;
  netRoas: number;
  impressions: number;
  clicks: number;
  conversions: number;
  ctr: number;
  cpc: number;
  cpa: number;
  hourlyNetProfit: number[];
  hourlySpend: number[];
  hourlyConversions: number[];
  dataQualityScore: number;
}

export interface DayOfWeekPattern {
  dayIndex: number;
  dayName: string;
  avgNetProfit: number;
  avgSpend: number;
  avgConversions: number;
  profitPerDollar: number;
  dataPoints: number;
  platform: AdPlatform;
}

export interface TimeOfDayPattern {
  hourBucket: string;
  startHour: number;
  endHour: number;
  avgNetProfit: number;
  avgSpend: number;
  percentOfDailySpend: number;
  profitPerDollar: number;
  platform: AdPlatform;
}

export interface WeekOverWeekTrend {
  platform: AdPlatform;
  currentWeek: {
    netProfit: number;
    spend: number;
    conversions: number;
    netRoas: number;
  };
  previousWeek: {
    netProfit: number;
    spend: number;
    conversions: number;
    netRoas: number;
  };
  fourWeekAverage: {
    netProfit: number;
    spend: number;
    conversions: number;
    netRoas: number;
  };
  profitChange: number;
  profitChangePercent: number;
  spendChange: number;
  spendChangePercent: number;
  efficiencyChange: number;
  momentum: 'accelerating' | 'stable' | 'declining';
}

export interface BudgetCorrelation {
  platform: AdPlatform;
  spendBuckets: Array<{
    minSpend: number;
    maxSpend: number;
    avgNetProfit: number;
    marginalReturn: number;
    dataPoints: number;
  }>;
  optimalSpendRange: {
    min: number;
    max: number;
  };
  diminishingReturnsThreshold: number;
}

export interface CrossPlatformCorrelation {
  platformA: AdPlatform;
  platformB: AdPlatform;
  correlationCoefficient: number;
  relationship: 'synergistic' | 'independent' | 'cannibalistic';
  recommendation: string;
}

export interface PlatformAllocation {
  platform: AdPlatform;
  currentAllocation: number;
  recommendedAllocation: number;
  currentNetProfit: number;
  projectedNetProfit: number;
  netProfitPerDollar: number;
}

export type DataAvailabilityLevel =
  | 'minimal'      // 0-7 days
  | 'basic'        // 7-30 days
  | 'moderate'     // 30-90 days
  | 'comprehensive'; // 90+ days

export interface DataAvailability {
  level: DataAvailabilityLevel;
  daysAvailable: number;
  oldestDataDate: string;
  newestDataDate: string;
  platformBreakdown: Record<AdPlatform, number>;
  availableAnalyses: string[];
  unavailableAnalyses: string[];
}

export interface CrossPlatformPattern {
  id: string;
  userId: string;
  patternType: 'day_of_week' | 'week_over_week' | 'month_over_month' | 'seasonal' | 'budget_correlation' | 'cross_platform_correlation' | 'time_of_day';
  platforms: AdPlatform[];
  patternData: Record<string, unknown>;
  dataPointsAnalyzed: number;
  confidenceScore: number;
  dataRangeStart: string;
  dataRangeEnd: string;
  isActive: boolean;
  expiresAt?: string;
}

export type CrossPlatformSuggestionType =
  | 'cross_platform_budget_reallocation'
  | 'cross_platform_time_optimization'
  | 'cross_platform_trend_alert'
  | 'cross_platform_efficiency_opportunity';

export interface CrossPlatformSuggestion {
  id: string;
  type: CrossPlatformSuggestionType;
  title: string;
  message: string;
  platforms: AdPlatform[];
  priority: number;
  confidence: number;
  dataConfidence: {
    level: DataAvailabilityLevel;
    daysAnalyzed: number;
    dataPointsUsed: number;
  };
  estimatedImpact: {
    monthlyNetProfitChange: number;
    percentageChange: number;
    timeframeDays: number;
  };
  actionable: boolean;
  actions?: CrossPlatformAction[];
  patternEvidence?: Record<string, unknown>;
}

export interface CrossPlatformAction {
  id: string;
  type: 'update_budget' | 'pause_entity' | 'enable_entity' | 'duplicate_entity' | 'update_schedule' | 'reallocate_budget';
  platform: AdPlatform;
  entityType: 'campaign' | 'ad_set' | 'ad';
  entityId: string;
  entityName: string;
  description: string;
  parameters: Record<string, unknown>;
  estimatedImpact: number;
  requiresConfirmation: boolean;
}

export interface PlatformActionLog {
  id: string;
  userId: string;
  platform: AdPlatform;
  actionType: string;
  entityType: 'campaign' | 'ad_set' | 'ad';
  entityId: string;
  entityName?: string;
  platformEntityId?: string;
  previousState?: Record<string, unknown>;
  newState?: Record<string, unknown>;
  actionParameters?: Record<string, unknown>;
  status: 'pending' | 'executing' | 'completed' | 'failed' | 'rolled_back';
  errorMessage?: string;
  triggeredBy: 'user_manual' | 'suggestion_action' | 'automation_rule';
  suggestionId?: string;
  automationRuleId?: string;
  isRollbackAvailable: boolean;
  rolledBackAt?: string;
  rollbackActionId?: string;
  executedAt?: string;
  createdAt: string;
}

export const PLATFORM_COLORS: Record<AdPlatform, string> = {
  facebook: '#1877F2',
  google: '#34A853',
  tiktok: '#FF0050'
};

export const PLATFORM_LABELS: Record<AdPlatform, string> = {
  facebook: 'Meta',
  google: 'Google',
  tiktok: 'TikTok'
};
