/**
 * Platform Constraints Knowledge System
 *
 * This module contains ALL platform-specific rules, constraints, and knowledge
 * about how Facebook/Meta, TikTok, and Google Ads platforms work.
 *
 * The AI must know these constraints to prevent harmful suggestions.
 */

export type AdPlatform = 'facebook' | 'tiktok' | 'google';

export interface PlatformConstraint {
  field: string;
  canEdit: boolean;
  canEditAfterLaunch: boolean;
  resetLearningPhase: boolean;
  reason: string;
  alternativeAction?: string;
}

export interface LearningPhaseRules {
  platform: AdPlatform;
  conversionsRequired: number;
  timeWindowDays: number;
  resetsOn: string[];
  canForceExit: boolean;
  notes: string;
}

export interface BudgetScalingRules {
  platform: AdPlatform;
  maxIncreasePercentWithoutReset: number;
  maxDecreasePercentWithoutReset: number;
  recommendedIncreasePercent: number;
  timeWindowHours: number;
  notes: string;
}

// ============================================================================
// FACEBOOK/META PLATFORM CONSTRAINTS
// ============================================================================

export const FACEBOOK_CONSTRAINTS: Record<string, PlatformConstraint> = {
  campaign_objective: {
    field: 'Campaign Objective',
    canEdit: true,
    canEditAfterLaunch: false,
    resetLearningPhase: true,
    reason: 'Meta does not allow changing campaign objective after launch. This would reset the entire campaign and lose all learning.',
    alternativeAction: 'Create a new campaign with the desired objective instead.'
  },

  optimization_goal: {
    field: 'Optimization Goal',
    canEdit: true,
    canEditAfterLaunch: false,
    resetLearningPhase: true,
    reason: 'Meta does not allow changing the optimization goal after an ad set launches. The pixel trains specifically for the selected goal.',
    alternativeAction: 'Create a new ad set with the desired optimization goal.'
  },

  bidding_strategy: {
    field: 'Bidding Strategy',
    canEdit: true,
    canEditAfterLaunch: false,
    resetLearningPhase: true,
    reason: 'Bidding strategy (Lowest Cost, Cost Cap, Bid Cap) cannot be changed after launch without resetting learning.',
    alternativeAction: 'Duplicate the ad set or campaign with new bidding strategy.'
  },

  attribution_setting: {
    field: 'Attribution Setting',
    canEdit: true,
    canEditAfterLaunch: false,
    resetLearningPhase: true,
    reason: 'Attribution window (7-day click, 1-day view, etc.) is locked after campaign creation.',
    alternativeAction: 'This affects reporting only. Create new campaign if different attribution is critical.'
  },

  budget_moderate_change: {
    field: 'Budget (moderate change)',
    canEdit: true,
    canEditAfterLaunch: true,
    resetLearningPhase: false,
    reason: 'Budget changes under 20% do not reset learning phase.',
    alternativeAction: 'Safe to adjust within 20% threshold.'
  },

  budget_significant_change: {
    field: 'Budget (significant change)',
    canEdit: true,
    canEditAfterLaunch: true,
    resetLearningPhase: true,
    reason: 'Budget increases over 20% in a 72-hour window will reset the learning phase.',
    alternativeAction: 'Scale gradually in 15-20% increments every 3 days, or accept learning phase reset.'
  },

  targeting_minor_change: {
    field: 'Targeting (minor change)',
    canEdit: true,
    canEditAfterLaunch: true,
    resetLearningPhase: false,
    reason: 'Minor targeting adjustments (adding interests, locations) typically do not reset learning.',
    alternativeAction: 'Safe to optimize targeting carefully.'
  },

  targeting_major_change: {
    field: 'Targeting (major change)',
    canEdit: true,
    canEditAfterLaunch: true,
    resetLearningPhase: true,
    reason: 'Major targeting changes (switching age ranges, genders, removing large audiences) reset learning phase.',
    alternativeAction: 'Make incremental changes or duplicate ad set.'
  },

  creative_change: {
    field: 'Ad Creative',
    canEdit: true,
    canEditAfterLaunch: true,
    resetLearningPhase: true,
    reason: 'Changing ad creative (new image, video, copy) creates a new ad and resets learning.',
    alternativeAction: 'Add new creative alongside existing ad rather than replacing it.'
  },

  placement_change: {
    field: 'Placements',
    canEdit: true,
    canEditAfterLaunch: true,
    resetLearningPhase: true,
    reason: 'Significant placement changes (automatic to manual, removing placements) reset learning.',
    alternativeAction: 'Use Automatic Placements when possible or create new ad set.'
  },

  campaign_pause: {
    field: 'Campaign/Ad Set Pause',
    canEdit: true,
    canEditAfterLaunch: true,
    resetLearningPhase: false,
    reason: 'Pausing and resuming does not reset learning if done within 7 days.',
    alternativeAction: 'Safe to pause for up to 7 days without losing learning.'
  },

  campaign_long_pause: {
    field: 'Campaign/Ad Set Long Pause',
    canEdit: true,
    canEditAfterLaunch: true,
    resetLearningPhase: true,
    reason: 'Pausing for more than 7 days will reset the learning phase when resumed.',
    alternativeAction: 'If pause needed longer, consider starting fresh campaign.'
  }
};

export const FACEBOOK_LEARNING_PHASE: LearningPhaseRules = {
  platform: 'facebook',
  conversionsRequired: 50,
  timeWindowDays: 7,
  resetsOn: [
    'Budget increase >20% in 72 hours',
    'Targeting major changes',
    'Creative changes',
    'Optimization goal change',
    'Bidding strategy change',
    'Pause >7 days',
    'Significant placement changes'
  ],
  canForceExit: false,
  notes: 'Meta requires 50 optimization events (usually purchases) within 7 days to exit learning phase. Cannot be forced. Performance is less stable during learning phase. Learning Limited status occurs when not generating enough conversions to exit learning.'
};

export const FACEBOOK_BUDGET_SCALING: BudgetScalingRules = {
  platform: 'facebook',
  maxIncreasePercentWithoutReset: 20,
  maxDecreasePercentWithoutReset: 20,
  recommendedIncreasePercent: 15,
  timeWindowHours: 72,
  notes: 'Meta allows up to 20% budget increases every 72 hours without resetting learning phase. Best practice is 10-20% increases every 3-4 days. Decreases do not reset learning unless very significant (>50%).'
};

export const FACEBOOK_CBO_RULES = {
  description: 'Campaign Budget Optimization distributes budget across ad sets automatically',
  advantages: [
    'More efficient budget distribution',
    'Better for scaling accounts',
    'Reduces need for manual optimization',
    'Works well with Advantage+ campaigns'
  ],
  disadvantages: [
    'Less control over individual ad set budgets',
    'May starve lower-performing ad sets that could improve',
    'Can be unpredictable for testing'
  ],
  bestFor: [
    'Scaling proven campaigns',
    'Accounts with consistent product margins',
    'When you have multiple winning ad sets',
    'Advantage+ Shopping Campaigns'
  ],
  notes: 'CBO works by giving budget to the ad sets Meta predicts will perform best. It requires trust in the algorithm and works better at higher budgets ($200+/day).'
};

export const FACEBOOK_ABO_RULES = {
  description: 'Ad Set Budget Optimization gives you manual control over each ad set budget',
  advantages: [
    'Full control over budget allocation',
    'Easier to test systematically',
    'Can protect specific segments',
    'More predictable testing'
  ],
  disadvantages: [
    'Requires more manual optimization',
    'May miss opportunities algorithm would catch',
    'Can be inefficient at scale',
    'More time-intensive to manage'
  ],
  bestFor: [
    'Testing new products or audiences',
    'Small budgets (<$200/day)',
    'When you need precise budget control',
    'Learning which audiences work'
  ],
  notes: 'ABO gives you control but requires active management. Better for testing phase and smaller accounts.'
};

export const FACEBOOK_ADVANTAGE_PLUS = {
  description: 'Advantage+ campaigns use maximum automation and audience expansion',
  requirements: [
    'Pixel must have conversion history',
    'Catalog must be connected (for shopping)',
    'Minimum budget recommendations apply',
    'Less targeting control available'
  ],
  benefits: [
    'Faster learning phase',
    'Access to expanded audiences',
    'Better for scaling',
    'Less setup time'
  ],
  limitations: [
    'Cannot exclude specific audiences easily',
    'Less granular targeting',
    'Requires trust in automation',
    'May spend quickly if not monitored'
  ],
  bestFor: [
    'Scaling proven offers',
    'Broad audience products',
    'When pixel has strong data',
    'Accounts ready to scale'
  ],
  notes: 'Advantage+ Shopping Campaigns are Meta\'s most automated campaign type. They work best when you have proven product-market fit and good pixel data.'
};

// ============================================================================
// TIKTOK PLATFORM CONSTRAINTS
// ============================================================================

export const TIKTOK_CONSTRAINTS: Record<string, PlatformConstraint> = {
  campaign_objective: {
    field: 'Campaign Objective',
    canEdit: true,
    canEditAfterLaunch: false,
    resetLearningPhase: true,
    reason: 'TikTok does not allow changing campaign objective after launch.',
    alternativeAction: 'Create new campaign with desired objective.'
  },

  optimization_event: {
    field: 'Optimization Event',
    canEdit: true,
    canEditAfterLaunch: false,
    resetLearningPhase: true,
    reason: 'TikTok locks optimization event at ad group creation.',
    alternativeAction: 'Create new ad group with desired optimization event.'
  },

  budget_change: {
    field: 'Budget',
    canEdit: true,
    canEditAfterLaunch: true,
    resetLearningPhase: true,
    reason: 'Budget increases >20% in 24 hours reset learning phase.',
    alternativeAction: 'Scale gradually in 20% increments daily.'
  },

  targeting_change: {
    field: 'Targeting',
    canEdit: true,
    canEditAfterLaunch: true,
    resetLearningPhase: true,
    reason: 'Any targeting changes reset TikTok learning phase.',
    alternativeAction: 'Create new ad group for different targeting.'
  }
};

export const TIKTOK_LEARNING_PHASE: LearningPhaseRules = {
  platform: 'tiktok',
  conversionsRequired: 50,
  timeWindowDays: 7,
  resetsOn: [
    'Budget increase >20% in 24 hours',
    'Any targeting changes',
    'Bid strategy changes',
    'Creative changes',
    'Pause >7 days'
  ],
  canForceExit: false,
  notes: 'TikTok requires 50 conversions in 7 days to exit learning phase. Very sensitive to changes - most edits reset learning.'
};

export const TIKTOK_BUDGET_SCALING: BudgetScalingRules = {
  platform: 'tiktok',
  maxIncreasePercentWithoutReset: 20,
  maxDecreasePercentWithoutReset: 50,
  recommendedIncreasePercent: 20,
  timeWindowHours: 24,
  notes: 'TikTok allows 20% budget increases every 24 hours. More aggressive than Meta. Can scale faster but resets happen more easily.'
};

// ============================================================================
// GOOGLE ADS PLATFORM CONSTRAINTS
// ============================================================================

export const GOOGLE_CONSTRAINTS: Record<string, PlatformConstraint> = {
  campaign_type: {
    field: 'Campaign Type',
    canEdit: false,
    canEditAfterLaunch: false,
    resetLearningPhase: true,
    reason: 'Google does not allow changing campaign type after creation.',
    alternativeAction: 'Must create new campaign.'
  },

  bidding_strategy: {
    field: 'Bidding Strategy',
    canEdit: true,
    canEditAfterLaunch: true,
    resetLearningPhase: true,
    reason: 'Changing bid strategy resets Smart Bidding learning.',
    alternativeAction: 'Allow 2 weeks for learning after change.'
  },

  budget_change: {
    field: 'Budget',
    canEdit: true,
    canEditAfterLaunch: true,
    resetLearningPhase: false,
    reason: 'Google allows budget changes without resetting learning if gradual.',
    alternativeAction: 'Recommended to increase 10-20% every few days.'
  }
};

export const GOOGLE_LEARNING_PHASE: LearningPhaseRules = {
  platform: 'google',
  conversionsRequired: 30,
  timeWindowDays: 14,
  resetsOn: [
    'Bidding strategy change',
    'Target CPA or ROAS change >20%',
    'Major campaign restructure'
  ],
  canForceExit: false,
  notes: 'Google Smart Bidding requires 30 conversions in 30 days for learning, but optimal performance comes after 50+ conversions. Learning period typically 7-14 days.'
};

export const GOOGLE_BUDGET_SCALING: BudgetScalingRules = {
  platform: 'google',
  maxIncreasePercentWithoutReset: 30,
  maxDecreasePercentWithoutReset: 50,
  recommendedIncreasePercent: 20,
  timeWindowHours: 168,
  notes: 'Google is more forgiving with budget changes. Can increase up to 30% without disrupting Smart Bidding significantly. Weekly increases recommended.'
};

// ============================================================================
// PLATFORM KNOWLEDGE RETRIEVAL FUNCTIONS
// ============================================================================

export function getPlatformConstraints(platform: AdPlatform): Record<string, PlatformConstraint> {
  switch (platform) {
    case 'facebook':
      return FACEBOOK_CONSTRAINTS;
    case 'tiktok':
      return TIKTOK_CONSTRAINTS;
    case 'google':
      return GOOGLE_CONSTRAINTS;
    default:
      return {};
  }
}

export function getLearningPhaseRules(platform: AdPlatform): LearningPhaseRules | null {
  switch (platform) {
    case 'facebook':
      return FACEBOOK_LEARNING_PHASE;
    case 'tiktok':
      return TIKTOK_LEARNING_PHASE;
    case 'google':
      return GOOGLE_LEARNING_PHASE;
    default:
      return null;
  }
}

export function getBudgetScalingRules(platform: AdPlatform): BudgetScalingRules | null {
  switch (platform) {
    case 'facebook':
      return FACEBOOK_BUDGET_SCALING;
    case 'tiktok':
      return TIKTOK_BUDGET_SCALING;
    case 'google':
      return GOOGLE_BUDGET_SCALING;
    default:
      return null;
  }
}

export function canEditField(
  platform: AdPlatform,
  field: string,
  isLaunched: boolean
): { canEdit: boolean; reason?: string; alternative?: string } {
  const constraints = getPlatformConstraints(platform);
  const constraint = constraints[field];

  if (!constraint) {
    return { canEdit: true };
  }

  if (!isLaunched) {
    return { canEdit: constraint.canEdit };
  }

  return {
    canEdit: constraint.canEditAfterLaunch,
    reason: constraint.reason,
    alternative: constraint.alternativeAction
  };
}

export function willResetLearningPhase(
  platform: AdPlatform,
  field: string,
  changeType: 'minor' | 'major' = 'major'
): { willReset: boolean; reason?: string } {
  const constraints = getPlatformConstraints(platform);

  // Handle budget-specific logic
  if (field.includes('budget')) {
    const fieldKey = changeType === 'minor' ? 'budget_moderate_change' : 'budget_significant_change';
    const constraint = constraints[fieldKey];
    return {
      willReset: constraint?.resetLearningPhase || false,
      reason: constraint?.reason
    };
  }

  // Handle targeting-specific logic
  if (field.includes('targeting')) {
    const fieldKey = changeType === 'minor' ? 'targeting_minor_change' : 'targeting_major_change';
    const constraint = constraints[fieldKey];
    return {
      willReset: constraint?.resetLearningPhase || false,
      reason: constraint?.reason
    };
  }

  const constraint = constraints[field];
  return {
    willReset: constraint?.resetLearningPhase || false,
    reason: constraint?.reason
  };
}

export function calculateSafeBudgetIncrease(
  platform: AdPlatform,
  currentBudget: number,
  desiredBudget: number
): {
  isSafe: boolean;
  recommendedSteps: Array<{ amount: number; date: string }>;
  willResetLearning: boolean;
} {
  const rules = getBudgetScalingRules(platform);
  if (!rules) {
    return { isSafe: true, recommendedSteps: [], willResetLearning: false };
  }

  const increasePercent = ((desiredBudget - currentBudget) / currentBudget) * 100;
  const isSafe = increasePercent <= rules.maxIncreasePercentWithoutReset;

  if (isSafe) {
    return {
      isSafe: true,
      recommendedSteps: [{ amount: desiredBudget, date: 'now' }],
      willResetLearning: false
    };
  }

  // Calculate step-by-step increases
  const steps: Array<{ amount: number; date: string }> = [];
  let currentAmount = currentBudget;
  let daysElapsed = 0;

  while (currentAmount < desiredBudget) {
    const nextIncrease = currentAmount * (rules.recommendedIncreasePercent / 100);
    currentAmount = Math.min(currentAmount + nextIncrease, desiredBudget);

    const daysToWait = Math.ceil(rules.timeWindowHours / 24);
    daysElapsed += daysToWait;

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysElapsed);

    steps.push({
      amount: Math.round(currentAmount * 100) / 100,
      date: futureDate.toISOString().split('T')[0]
    });

    if (steps.length > 20) break; // Safety limit
  }

  return {
    isSafe: false,
    recommendedSteps: steps,
    willResetLearning: true
  };
}

export function isInLearningPhase(
  platform: AdPlatform,
  conversionsInWindow: number,
  daysSinceLaunchOrReset: number
): { isLearning: boolean; reason: string; daysRemaining?: number; conversionsNeeded?: number } {
  const rules = getLearningPhaseRules(platform);
  if (!rules) {
    return { isLearning: false, reason: 'Platform not supported' };
  }

  if (conversionsInWindow >= rules.conversionsRequired) {
    return {
      isLearning: false,
      reason: `Exited learning phase with ${conversionsInWindow} conversions`
    };
  }

  if (daysSinceLaunchOrReset > rules.timeWindowDays) {
    return {
      isLearning: true,
      reason: 'Learning Limited - not enough conversions to exit learning phase',
      conversionsNeeded: rules.conversionsRequired - conversionsInWindow
    };
  }

  return {
    isLearning: true,
    reason: 'Currently in learning phase',
    daysRemaining: rules.timeWindowDays - daysSinceLaunchOrReset,
    conversionsNeeded: rules.conversionsRequired - conversionsInWindow
  };
}
