export type AdPlatform = 'facebook' | 'tiktok' | 'google';
export type BidStrategy = 'highest_volume' | 'cost_per_result_goal' | 'bid_cap' | 'roas_goal';
export type ConversionLocation = 'website' | 'app' | 'messenger' | 'whatsapp' | 'calls';
export type ConversionEvent = 'purchase' | 'add_to_cart' | 'initiate_checkout' | 'lead' | 'complete_registration' | 'view_content';
export type PerformanceGoal = 'max_conversions' | 'max_value';
export type AttributionSetting = '1d_click' | '7d_click' | '1d_view' | '7d_click_1d_view';
export type BudgetType = 'daily' | 'lifetime';
export type CampaignObjective = 'OUTCOME_SALES' | 'OUTCOME_TRAFFIC' | 'OUTCOME_AWARENESS' | 'OUTCOME_ENGAGEMENT' | 'OUTCOME_LEADS' | 'OUTCOME_APP_PROMOTION';

export interface CampaignLevelBaseline {
  objective: CampaignObjective;
  isCBO: boolean;
  budgetType: BudgetType;
  bidStrategy: BidStrategy;
}

export interface AdSetLevelBaseline {
  conversionLocation: ConversionLocation;
  conversionEvent: ConversionEvent;
  performanceGoal: PerformanceGoal;
  attributionSetting: AttributionSetting;
}

export interface BudgetDefaults {
  standard: number;
  riskAverse: number;
  minimum: number;
}

export interface BaselineConfig {
  platform: AdPlatform;
  campaignLevel: CampaignLevelBaseline;
  adSetLevel: AdSetLevelBaseline;
  budgetDefaults: BudgetDefaults;
  reasoning: {
    campaignLevel: Record<keyof CampaignLevelBaseline, string>;
    adSetLevel: Record<keyof AdSetLevelBaseline, string>;
    budgetDefaults: string;
  };
}

export const SHOPIFY_ECOMMERCE_BASELINE: BaselineConfig = {
  platform: 'facebook',

  campaignLevel: {
    objective: 'OUTCOME_SALES',
    isCBO: true,
    budgetType: 'daily',
    bidStrategy: 'highest_volume',
  },

  adSetLevel: {
    conversionLocation: 'website',
    conversionEvent: 'purchase',
    performanceGoal: 'max_conversions',
    attributionSetting: '7d_click_1d_view',
  },

  budgetDefaults: {
    standard: 50,
    riskAverse: 20,
    minimum: 5,
  },

  reasoning: {
    campaignLevel: {
      objective: 'Sales objective is optimized for purchase conversions - the ultimate goal for ecommerce. Other objectives like Traffic or Awareness optimize for different signals that may not correlate with revenue.',
      isCBO: 'Campaign Budget Optimization allows Meta to automatically distribute budget across ad sets based on performance. This typically outperforms manual allocation by 10-20% as the algorithm responds to real-time signals.',
      budgetType: 'Daily budgets provide predictable spend and easier ROI calculation. Lifetime budgets can overspend early and are harder to manage without specific end dates.',
      bidStrategy: 'Highest Volume (formerly Lowest Cost) maximizes conversions within your budget. Use this as the default, then test ROAS Goal or Cost Per Result Goal on proven profitable campaigns.',
    },
    adSetLevel: {
      conversionLocation: 'Website is the standard for Shopify stores. Only change if you have a legitimate app, messenger, or call-based conversion flow.',
      conversionEvent: 'Purchase is the highest-intent, highest-value event. Optimizing for lower-funnel events like Add to Cart may generate more volume but typically worse ROAS. Only optimize for ATC if you have very low purchase volume (<10/week).',
      performanceGoal: 'Max Conversions is the default. Switch to Max Value when you have significant AOV variance (products ranging from $20-$200+) and want Meta to prioritize higher-value purchases.',
      attributionSetting: '7-day click, 1-day view is Meta\'s default and provides the best balance of attribution accuracy and algorithm learning. Shorter windows may undercount conversions.',
    },
    budgetDefaults: 'Standard $50/day allows for ~2-3 purchases at typical CPAs, supporting learning phase exit. Risk-averse $20/day is acceptable for testing but may result in Learning Limited status.',
  },
};

export interface BidStrategyGuidance {
  strategy: BidStrategy;
  name: string;
  whenToUse: string[];
  whenToAvoid: string[];
  requirements: string[];
  duplicateFrom: string;
  settingGuidance: string;
}

export const BID_STRATEGY_GUIDANCE: Record<BidStrategy, BidStrategyGuidance> = {
  highest_volume: {
    strategy: 'highest_volume',
    name: 'Highest Volume (Lowest Cost)',
    whenToUse: [
      'New campaigns and testing',
      'Learning phase campaigns',
      'When you need volume quickly',
      'When ROAS is consistently profitable',
    ],
    whenToAvoid: [
      'When you need strict cost control',
      'When CPA is already at max acceptable level',
    ],
    requirements: [
      'Trust in product profitability',
      'Willingness to accept CPA fluctuations',
    ],
    duplicateFrom: '',
    settingGuidance: 'No bid cap or target needed - Meta spends full budget at lowest possible cost.',
  },

  roas_goal: {
    strategy: 'roas_goal',
    name: 'ROAS Goal (Minimum ROAS)',
    whenToUse: [
      'When a Highest Volume campaign is CONSISTENTLY profitable',
      'When you want to maintain a minimum return on ad spend',
      'For scaling proven campaigns without sacrificing efficiency',
    ],
    whenToAvoid: [
      'New campaigns without conversion history',
      'Low volume campaigns (<50 conversions/week)',
      'When testing new audiences or creative',
    ],
    requirements: [
      'Campaign must have exited learning phase',
      'At least 7 days of consistent profitable performance',
      'Sufficient budget to hit ROAS target (set high to ensure spend)',
    ],
    duplicateFrom: 'Duplicate a consistently profitable Highest Volume campaign',
    settingGuidance: 'Set ROAS goal equal to the profitable campaign\'s current ROAS. Set budget high ($100+/day) so the campaign has room to spend while maintaining the floor.',
  },

  cost_per_result_goal: {
    strategy: 'cost_per_result_goal',
    name: 'Cost Per Result Goal (Cost Cap)',
    whenToUse: [
      'When a Highest Volume campaign is CONSISTENTLY net profitable',
      'When you know your maximum acceptable CPA',
      'For protecting profit margins during scaling',
    ],
    whenToAvoid: [
      'New campaigns without CPA history',
      'If you set the cap too low (will underspend)',
      'When testing - restricts algorithm learning',
    ],
    requirements: [
      'Campaign must have exited learning phase',
      'At least 7 days of consistent profitable performance',
      'Historical CPA data to set realistic target',
    ],
    duplicateFrom: 'Duplicate a consistently profitable Highest Volume campaign',
    settingGuidance: 'Set cost cap to the successful campaign\'s current CPA. Can set 10-20% higher to give algorithm room while protecting downside.',
  },

  bid_cap: {
    strategy: 'bid_cap',
    name: 'Bid Cap (Maximum Bid)',
    whenToUse: [
      'Very experienced advertisers only',
      'When you need precise auction control',
      'Extremely competitive niches',
    ],
    whenToAvoid: [
      'Most advertisers should avoid this',
      'New campaigns',
      'If you don\'t understand auction dynamics',
    ],
    requirements: [
      'Deep understanding of auction mechanics',
      'Extensive historical bid data',
      'Willingness to manually adjust frequently',
    ],
    duplicateFrom: '',
    settingGuidance: 'Set maximum bid per auction. Very restrictive - can cause severe underspending. Not recommended for most advertisers.',
  },
};

export interface PerformanceGoalGuidance {
  goal: PerformanceGoal;
  name: string;
  whenToUse: string[];
  requirements: string[];
  duplicateFrom: string;
}

export const PERFORMANCE_GOAL_GUIDANCE: Record<PerformanceGoal, PerformanceGoalGuidance> = {
  max_conversions: {
    goal: 'max_conversions',
    name: 'Maximize Number of Conversions',
    whenToUse: [
      'Default for most campaigns',
      'When all products have similar value',
      'When you want maximum purchase volume',
      'New campaigns and testing',
    ],
    requirements: [],
    duplicateFrom: '',
  },

  max_value: {
    goal: 'max_value',
    name: 'Maximize Conversion Value',
    whenToUse: [
      'When you have significant AOV variance (products from $20-$200+)',
      'When Max Conversions campaign is already profitable/consistent',
      'When you want Meta to prioritize higher-value purchases',
      'Stores with premium product lines mixed with entry-level',
    ],
    requirements: [
      'Products must have varying prices in your catalog',
      'Pixel must be sending purchase value data correctly',
      'Existing Max Conversions campaign performing well',
    ],
    duplicateFrom: 'Duplicate a successful Max Conversions campaign to test Max Value',
  },
};

export function getDeviationSeverity(
  settingName: string,
  currentValue: string | boolean,
  hasPerformanceIssue: boolean
): 'informational' | 'warning' | 'critical' {
  const criticalSettings = ['conversion_event', 'conversion_location', 'objective'];
  const warningSettings = ['bid_strategy', 'is_cbo', 'performance_goal'];

  if (criticalSettings.includes(settingName) && hasPerformanceIssue) {
    return 'critical';
  }

  if (warningSettings.includes(settingName) && hasPerformanceIssue) {
    return 'warning';
  }

  if (criticalSettings.includes(settingName)) {
    return 'warning';
  }

  return 'informational';
}

export function getRecommendedValue(
  settingName: string,
  platform: AdPlatform = 'facebook'
): string {
  const baseline = SHOPIFY_ECOMMERCE_BASELINE;

  const campaignMapping: Record<string, string> = {
    objective: baseline.campaignLevel.objective,
    is_cbo: String(baseline.campaignLevel.isCBO),
    budget_type: baseline.campaignLevel.budgetType,
    bid_strategy: baseline.campaignLevel.bidStrategy,
  };

  const adSetMapping: Record<string, string> = {
    conversion_location: baseline.adSetLevel.conversionLocation,
    conversion_event: baseline.adSetLevel.conversionEvent,
    performance_goal: baseline.adSetLevel.performanceGoal,
    attribution_setting: baseline.adSetLevel.attributionSetting,
  };

  return campaignMapping[settingName] || adSetMapping[settingName] || '';
}

export function getReasoning(
  settingName: string,
  platform: AdPlatform = 'facebook'
): string {
  const baseline = SHOPIFY_ECOMMERCE_BASELINE;

  const campaignReasons = baseline.reasoning.campaignLevel as Record<string, string>;
  const adSetReasons = baseline.reasoning.adSetLevel as Record<string, string>;

  return campaignReasons[settingName] || adSetReasons[settingName] || '';
}

export interface DuplicationRecommendation {
  type: 'roas_goal' | 'cost_per_result_goal' | 'max_value';
  sourceCampaignId: string;
  sourceCampaignName: string;
  currentMetric: number;
  recommendedSetting: number | string;
  reasoning: string;
  actionSteps: string[];
}

export function generateDuplicationRecommendation(
  type: 'roas_goal' | 'cost_per_result_goal' | 'max_value',
  sourceCampaign: {
    id: string;
    name: string;
    roas: number;
    cpa: number;
    spend: number;
    conversions: number;
    daysActive: number;
    isNetProfitable: boolean;
  }
): DuplicationRecommendation | null {
  if (!sourceCampaign.isNetProfitable || sourceCampaign.daysActive < 7) {
    return null;
  }

  if (sourceCampaign.conversions < 20) {
    return null;
  }

  if (type === 'roas_goal') {
    return {
      type: 'roas_goal',
      sourceCampaignId: sourceCampaign.id,
      sourceCampaignName: sourceCampaign.name,
      currentMetric: sourceCampaign.roas,
      recommendedSetting: sourceCampaign.roas,
      reasoning: `"${sourceCampaign.name}" has maintained ${sourceCampaign.roas.toFixed(2)}x ROAS over ${sourceCampaign.daysActive} days with ${sourceCampaign.conversions} conversions. Duplicating with ROAS Goal set to ${sourceCampaign.roas.toFixed(2)}x can protect this efficiency while scaling.`,
      actionSteps: [
        `Duplicate "${sourceCampaign.name}" campaign`,
        `Change bid strategy to "ROAS Goal"`,
        `Set minimum ROAS to ${sourceCampaign.roas.toFixed(2)}x`,
        `Set daily budget to $100+ to ensure spend`,
        `Monitor for 7 days before judging performance`,
      ],
    };
  }

  if (type === 'cost_per_result_goal') {
    return {
      type: 'cost_per_result_goal',
      sourceCampaignId: sourceCampaign.id,
      sourceCampaignName: sourceCampaign.name,
      currentMetric: sourceCampaign.cpa,
      recommendedSetting: sourceCampaign.cpa,
      reasoning: `"${sourceCampaign.name}" has maintained $${sourceCampaign.cpa.toFixed(2)} CPA over ${sourceCampaign.daysActive} days with ${sourceCampaign.conversions} conversions. Duplicating with Cost Per Result Goal can protect this CPA while scaling.`,
      actionSteps: [
        `Duplicate "${sourceCampaign.name}" campaign`,
        `Change bid strategy to "Cost Per Result Goal"`,
        `Set cost cap to $${sourceCampaign.cpa.toFixed(2)}`,
        `Optionally set 10-20% higher ($${(sourceCampaign.cpa * 1.15).toFixed(2)}) to give algorithm room`,
        `Monitor for 7 days before judging performance`,
      ],
    };
  }

  if (type === 'max_value') {
    return {
      type: 'max_value',
      sourceCampaignId: sourceCampaign.id,
      sourceCampaignName: sourceCampaign.name,
      currentMetric: sourceCampaign.roas,
      recommendedSetting: 'max_value',
      reasoning: `"${sourceCampaign.name}" is profitable with Max Conversions. Testing Max Value could increase AOV by having Meta prioritize higher-value purchases.`,
      actionSteps: [
        `Duplicate "${sourceCampaign.name}" campaign`,
        `Change Performance Goal to "Maximize Conversion Value"`,
        `Keep same budget initially`,
        `Monitor AOV and total revenue for 7 days`,
        `Compare against original to determine winner`,
      ],
    };
  }

  return null;
}
