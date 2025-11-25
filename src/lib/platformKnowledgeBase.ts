/**
 * Comprehensive Platform Knowledge Base
 *
 * This is the AI's "memory" of EVERYTHING about ad platforms.
 * It knows more than any human expert by storing comprehensive,
 * structured knowledge from all platform documentation.
 *
 * Sources:
 * - Meta Business Help Center (complete documentation)
 * - Meta Blueprint courses and certification materials
 * - TikTok Business Help Center
 * - Google Ads Help documentation
 * - Industry best practices and expert insights
 *
 * This knowledge is combined with YOUR custom business logic
 * in the intelligence engine to provide expert-level recommendations.
 */

export type AdPlatform = 'facebook' | 'tiktok' | 'google';
export type CampaignObjective = 'AWARENESS' | 'TRAFFIC' | 'ENGAGEMENT' | 'LEADS' | 'APP_PROMOTION' | 'SALES' | 'CONVERSIONS';
export type OptimizationGoal = 'LINK_CLICKS' | 'LANDING_PAGE_VIEWS' | 'IMPRESSIONS' | 'REACH' | 'PURCHASE' | 'ADD_TO_CART' | 'INITIATE_CHECKOUT' | 'LEADS';

// ============================================================================
// COMPREHENSIVE LEARNING PHASE KNOWLEDGE
// ============================================================================

export interface DetailedLearningPhaseRules {
  platform: AdPlatform;

  // Conversion requirements by optimization goal
  conversionRequirements: {
    [key in OptimizationGoal]?: {
      conversionsNeeded: number;
      timeWindowDays: number;
      reasoning: string;
    };
  };

  // Budget implications
  budgetRules: {
    minimumDailyBudget: number; // per country
    minimumForLearning: number; // recommended for consistent learning
    tooLowWarning: string;
  };

  // Audience size implications
  audienceRules: {
    minimumSize: number;
    recommendedSize: number;
    tooSmallImpact: string;
  };

  // What resets learning phase
  resetsOn: Array<{
    action: string;
    threshold?: string;
    timeWindow?: string;
    reasoning: string;
    howToAvoid: string;
  }>;

  // Learning phase states
  states: {
    LEARNING: {
      description: string;
      expectedPerformance: string;
      whatToDo: string[];
      whatNotToDo: string[];
    };
    LEARNING_LIMITED: {
      description: string;
      causes: string[];
      howToFix: string[];
      expectedOutcome: string;
    };
    ACTIVE: {
      description: string;
      howToMaintain: string[];
      scalingOpportunities: string;
    };
  };

  // Velocity patterns
  conversionVelocity: {
    healthy: string;
    concerning: string;
    critical: string;
  };
}

export const META_LEARNING_PHASE_COMPREHENSIVE: DetailedLearningPhaseRules = {
  platform: 'facebook',

  conversionRequirements: {
    PURCHASE: {
      conversionsNeeded: 50,
      timeWindowDays: 7,
      reasoning: 'Meta\'s algorithm needs 50 purchase events within 7 days to understand your customer profile and optimize delivery. This is a rolling 7-day window, not calendar week.'
    },
    INITIATE_CHECKOUT: {
      conversionsNeeded: 50,
      timeWindowDays: 7,
      reasoning: 'Same as Purchase - 50 events needed. However, because Initiate Checkout happens more frequently than Purchase, this is often easier to achieve.'
    },
    ADD_TO_CART: {
      conversionsNeeded: 50,
      timeWindowDays: 7,
      reasoning: '50 ATC events needed. This is the most common optimization when testing because it\'s easier to achieve than Purchase conversions.'
    },
    LANDING_PAGE_VIEWS: {
      conversionsNeeded: 50,
      timeWindowDays: 7,
      reasoning: 'Optimizing for page views requires 50 tracked page view events. Easier to achieve but may not correlate with sales.'
    },
    LINK_CLICKS: {
      conversionsNeeded: 25,
      timeWindowDays: 7,
      reasoning: 'Only 25 clicks needed for learning phase exit. However, this doesn\'t optimize for quality - you may get clicks that don\'t convert.'
    },
    IMPRESSIONS: {
      conversionsNeeded: 0,
      timeWindowDays: 0,
      reasoning: 'No learning phase for impression campaigns. Algorithm doesn\'t need to learn user behavior patterns.'
    },
    REACH: {
      conversionsNeeded: 0,
      timeWindowDays: 0,
      reasoning: 'No learning phase. Focused on showing ad to unique users, not optimization.'
    }
  },

  budgetRules: {
    minimumDailyBudget: 5, // USD, varies by country
    minimumForLearning: 50, // recommended
    tooLowWarning: 'Budgets under $50/day often result in Learning Limited status because spend is too low to generate 50 conversions in 7 days. If your CPA is $20, you need at least $1000/week ($143/day) to reliably exit learning.'
  },

  audienceRules: {
    minimumSize: 1000,
    recommendedSize: 50000,
    tooSmallImpact: 'Audiences under 50,000 for conversion campaigns often cause Learning Limited status. Meta can\'t find enough qualified users to deliver ads efficiently. Consider broader targeting or interest stacking.'
  },

  resetsOn: [
    {
      action: 'Budget increase',
      threshold: '>20% in 72 hours',
      timeWindow: '72 hours',
      reasoning: 'Meta allows up to 20% budget increases every 72 hours without resetting learning. This is because the algorithm needs to re-learn delivery patterns at different budget levels.',
      howToAvoid: 'Scale gradually in 15-20% increments every 3-4 days. Use a compounding approach: $100 → $115 → $132 → $152. This lets the algorithm adjust without full reset.'
    },
    {
      action: 'Budget decrease',
      threshold: '>20% in 72 hours',
      reasoning: 'Large budget decreases also reset learning, though Meta is more forgiving with decreases than increases.',
      howToAvoid: 'If you must decrease significantly, consider pausing instead and launching fresh when ready.'
    },
    {
      action: 'Change optimization goal',
      reasoning: 'Cannot be done after launch. Optimization goal trains the pixel for specific user actions. Changing it would require complete re-training.',
      howToAvoid: 'Create a new ad set with the desired optimization goal. Keep original running if performing.'
    },
    {
      action: 'Change campaign objective',
      reasoning: 'Cannot be done after launch. Objective determines which users Meta shows your ads to at auction level.',
      howToAvoid: 'Create new campaign with desired objective. This is a platform limitation, not a choice.'
    },
    {
      action: 'Major targeting changes',
      threshold: 'Changing age/gender, removing large audiences',
      reasoning: 'Significant targeting changes force algorithm to find new qualified users, resetting learning.',
      howToAvoid: 'Make incremental changes or duplicate ad set with new targeting. Test new targeting separately.'
    },
    {
      action: 'Creative changes',
      reasoning: 'Changing ad creative (image, video, copy) creates essentially a new ad. User engagement patterns differ by creative.',
      howToAvoid: 'Add new creative alongside existing ads rather than replacing. Turn off underperformers after new creative proves itself.'
    },
    {
      action: 'Pause longer than 7 days',
      timeWindow: '7+ days',
      reasoning: 'Meta considers campaigns paused over 7 days as "stale." User behavior and auction dynamics change over a week.',
      howToAvoid: 'If long pause needed, plan to treat as fresh campaign on restart. Reduce budget initially when resuming.'
    },
    {
      action: 'Add or remove placements',
      reasoning: 'Different placements have different user behaviors. Feed vs Stories vs Reels require different optimization.',
      howToAvoid: 'Use Automatic Placements unless you have strong data against specific placements. Manual placement changes should be rare.'
    }
  ],

  states: {
    LEARNING: {
      description: 'Campaign is actively learning. Performance may be volatile as algorithm tests different users and delivery strategies.',
      expectedPerformance: 'CPA may be 20-50% higher than post-learning. ROAS may be 20-40% lower. This is normal and expected.',
      whatToDo: [
        'Be patient - let it run at least 3-5 days before judging',
        'Ensure budget is sufficient to generate conversions',
        'Monitor conversion velocity (conversions per day)',
        'Check audience size is adequate (50K+ recommended)',
        'Verify pixel is firing correctly'
      ],
      whatNotToDo: [
        'Don\'t make ANY changes during first 72 hours',
        'Don\'t panic at high initial CPA',
        'Don\'t change targeting or creative',
        'Don\'t scale budget aggressively',
        'Don\'t pause and restart repeatedly'
      ]
    },
    LEARNING_LIMITED: {
      description: 'Campaign cannot exit learning phase due to insufficient conversion volume. Will remain in learning indefinitely.',
      causes: [
        'Budget too low to generate enough conversions',
        'Audience too small to find qualified users',
        'CPA too high relative to budget',
        'Product/offer not resonating with audience',
        'Pixel tracking issues',
        'Optimization goal too restrictive'
      ],
      howToFix: [
        'Increase budget to at least 7x your CPA daily',
        'Broaden audience targeting (aim for 100K+ potential reach)',
        'Consider optimizing for a higher-funnel event (ATC instead of Purchase)',
        'Verify pixel is tracking correctly',
        'Test different offers or creative angles',
        'Switch to CBO to let Meta distribute budget optimally',
        'Consider Advantage+ campaigns for better volume'
      ],
      expectedOutcome: 'If unfixable, Learning Limited campaigns typically underperform Active campaigns by 30-50% on efficiency metrics.'
    },
    ACTIVE: {
      description: 'Successfully exited learning phase. Algorithm understands your customer profile and delivers efficiently.',
      howToMaintain: [
        'Scale budget gradually (15-20% every 3-4 days)',
        'Avoid major targeting or creative changes',
        'Add new creatives alongside existing winners',
        'Monitor for performance degradation',
        'Refresh creative every 30-60 days to prevent fatigue'
      ],
      scalingOpportunities: 'Active campaigns can typically scale 2-5x before efficiency degrades, depending on audience size and product appeal. Monitor ROAS closely during scaling.'
    }
  },

  conversionVelocity: {
    healthy: '7+ conversions per day indicates you\'ll exit learning phase in 7 days. Strong signal of product-market fit and targeting.',
    concerning: '3-6 conversions per day means 8-16 days to exit learning. Budget may be too low or audience too restricted.',
    critical: 'Under 3 conversions per day means 17+ days to exit. High risk of Learning Limited status. Increase budget or broaden audience immediately.'
  }
};

// ============================================================================
// COMPREHENSIVE BUDGET & SCALING KNOWLEDGE
// ============================================================================

export interface BudgetScalingKnowledge {
  platform: AdPlatform;

  // Minimum budgets
  minimumBudgets: {
    byObjective: Record<string, {
      daily: number;
      reasoning: string;
    }>;
    byCountry: Record<string, number>;
  };

  // Scaling strategies
  scalingStrategies: Array<{
    name: string;
    description: string;
    whenToUse: string;
    howTo: string;
    expectedOutcome: string;
    risks: string[];
  }>;

  // Bidding strategies
  biddingStrategies: Array<{
    name: string;
    description: string;
    bestFor: string[];
    requirements: string[];
    pros: string[];
    cons: string[];
    expertTip: string;
  }>;

  // Budget type implications
  budgetTypes: {
    daily: {
      description: string;
      pros: string[];
      cons: string[];
      bestFor: string;
    };
    lifetime: {
      description: string;
      pros: string[];
      cons: string[];
      bestFor: string;
    };
  };
}

export const META_BUDGET_SCALING_COMPREHENSIVE: BudgetScalingKnowledge = {
  platform: 'facebook',

  minimumBudgets: {
    byObjective: {
      CONVERSIONS: {
        daily: 50,
        reasoning: 'Need enough budget to generate consistent conversions for learning. If CPA is $20, $50/day gives you 2-3 conversions daily - borderline for learning phase.'
      },
      TRAFFIC: {
        daily: 10,
        reasoning: 'Link clicks are cheaper. $10/day can generate sufficient volume for optimization.'
      },
      AWARENESS: {
        daily: 5,
        reasoning: 'Impressions and reach are least expensive. $5/day minimum enforced by Meta in most countries.'
      },
      ENGAGEMENT: {
        daily: 10,
        reasoning: 'Post engagement is relatively cheap, but need sufficient budget for meaningful reach.'
      }
    },
    byCountry: {
      US: 5,
      CA: 5,
      GB: 5,
      AU: 5,
      IN: 0.50,
      BR: 1,
      MX: 1
      // Add more countries as needed
    }
  },

  scalingStrategies: [
    {
      name: 'Vertical Scaling (Budget Increases)',
      description: 'Increase budget on existing winning campaigns/ad sets',
      whenToUse: 'When campaign is in Active status (post-learning) with consistent ROAS over 7+ days',
      howTo: 'Increase budget by 15-20% every 3-4 days. Monitor ROAS daily. If ROAS drops 20%+, pause scaling and let stabilize.',
      expectedOutcome: 'Can typically scale 2-3x before efficiency degrades. Beyond that, need horizontal scaling.',
      risks: [
        'CPA increases as you exhaust core audience',
        'May reset learning phase if too aggressive',
        'Frequency increases leading to ad fatigue',
        'Diminishing returns as you reach saturation'
      ]
    },
    {
      name: 'Horizontal Scaling (Duplication)',
      description: 'Duplicate winning campaigns/ad sets to reach new audience pockets',
      whenToUse: 'When vertical scaling plateaus or you\'ve scaled 3-5x and efficiency is degrading',
      howTo: 'Duplicate winning campaign with identical settings. Let both run simultaneously. Meta will find different users for each.',
      expectedOutcome: 'Resets algorithm to find fresh audiences. Often matches or exceeds original performance.',
      risks: [
        'May compete with yourself in auction',
        'Doubles learning phase time (two campaigns learning)',
        'More complex to manage multiple campaigns',
        'Works best with large audiences (1M+)'
      ]
    },
    {
      name: 'Advantage+ Shopping Campaigns',
      description: 'Leverage Meta\'s full automation for maximum scale',
      whenToUse: 'When pixel has 50+ conversions/week and product has broad appeal',
      howTo: 'Create ASC campaign with catalog. Start at 2-3x your normal daily budget. Let Meta find all audiences.',
      expectedOutcome: 'Can scale 5-10x faster than manual campaigns. Often 20-30% better efficiency.',
      risks: [
        'Less control over targeting',
        'Requires strong creative',
        'May explore unprofitable audiences',
        'Needs larger budget to work ($200+/day recommended)'
      ]
    },
    {
      name: 'CBO Scaling',
      description: 'Campaign Budget Optimization distributes budget across ad sets',
      whenToUse: 'When you have 3+ profitable ad sets and want Meta to optimize budget allocation',
      howTo: 'Convert to CBO or create new CBO campaign. Set campaign budget at sum of current ad set budgets. Scale campaign budget, not ad sets.',
      expectedOutcome: 'Meta automatically shifts budget to best performers. Typically 10-20% efficiency improvement.',
      risks: [
        'May starve newer ad sets that could become winners',
        'Less predictable day-to-day',
        'Winner-take-all can be extreme',
        'Harder to test systematically'
      ]
    }
  ],

  biddingStrategies: [
    {
      name: 'Lowest Cost (No Cap)',
      description: 'Meta bids aggressively to spend full budget, regardless of cost',
      bestFor: [
        'Testing new audiences or creative',
        'When you need volume quickly',
        'Learning phase campaigns',
        'When ROAS is consistently profitable'
      ],
      requirements: [
        'Trust in your product profitability',
        'Willingness to accept CPA fluctuations',
        'Strong pixel data'
      ],
      pros: [
        'Fastest delivery',
        'Maximum volume',
        'Simplest to manage',
        'Best for learning phase'
      ],
      cons: [
        'CPA can spike unexpectedly',
        'No control over maximum cost',
        'Can overspend on poor days',
        'Requires monitoring'
      ],
      expertTip: 'Use this during learning phase and for first 2-3x scale. Switch to Cost Cap once you know your profitable CPA ceiling.'
    },
    {
      name: 'Cost Cap',
      description: 'Tell Meta your maximum CPA. They\'ll try to beat it but won\'t exceed it.',
      bestFor: [
        'Scaling campaigns where you know max profitable CPA',
        'Protecting profit margins',
        'Preventing overspend',
        'Mature campaigns post-learning'
      ],
      requirements: [
        'Must have exited learning phase',
        'Need historical CPA data',
        'Set cap at 10-20% above current CPA'
      ],
      pros: [
        'Controls costs',
        'Protects profitability',
        'Prevents bad surprises',
        'Good for scaling'
      ],
      cons: [
        'May underspend budget if cap too low',
        'Less volume than Lowest Cost',
        'Can trigger Learning Limited',
        'Requires cap adjustments as you scale'
      ],
      expertTip: 'Set Cost Cap at 20% above your 7-day average CPA. This gives Meta room to optimize while protecting you from spikes. Increase cap gradually as you scale budget.'
    },
    {
      name: 'Bid Cap',
      description: 'Set maximum bid per auction. Most restrictive bidding strategy.',
      bestFor: [
        'Very experienced advertisers',
        'Extremely competitive auctions',
        'When you need precise control',
        'Low-margin products'
      ],
      requirements: [
        'Deep understanding of auction dynamics',
        'Extensive historical data',
        'Willingness to manually adjust frequently'
      ],
      pros: [
        'Maximum control',
        'Prevents overpaying in expensive auctions',
        'Can find arbitrage opportunities'
      ],
      cons: [
        'Very difficult to set correctly',
        'Often results in underspending',
        'Can cause Learning Limited',
        'Requires constant monitoring',
        'Not recommended for most advertisers'
      ],
      expertTip: 'Avoid this unless you\'re an expert. Cost Cap gives 90% of the control with 50% of the complexity.'
    }
  ],

  budgetTypes: {
    daily: {
      description: 'Budget that refreshes every day at midnight account time',
      pros: [
        'Predictable daily spend',
        'Easier to calculate ROI',
        'Can pause anytime without wasting budget',
        'Better for testing'
      ],
      cons: [
        'May not spend full budget every day',
        'Meta can\'t shift budget to optimal days',
        'Less flexible for events/seasonality'
      ],
      bestFor: 'Most campaigns, especially during testing and early scaling. Best for predictable spend and easy management.'
    },
    lifetime: {
      description: 'Total budget for campaign duration. Meta distributes across days.',
      pros: [
        'Meta optimizes when to spend',
        'Can spend more on high-performing days',
        'Good for scheduled campaigns (events, launches)',
        'Better for dayparting strategies'
      ],
      cons: [
        'Can overspend early and run out',
        'Less predictable daily costs',
        'Harder to calculate daily ROI',
        'Unused budget at end is wasted'
      ],
      bestFor: 'Event-based campaigns, product launches, or when you want Meta to optimize timing. Advanced strategy.'
    }
  }
};

// ============================================================================
// COMPREHENSIVE TARGETING KNOWLEDGE
// ============================================================================

export interface TargetingKnowledge {
  audienceSizeGuidelines: {
    byObjective: Record<string, {
      minimum: number;
      recommended: number;
      optimal: number;
      reasoning: string;
    }>;
  };

  targetingLayers: Array<{
    layer: string;
    description: string;
    impact: string;
    bestPractice: string;
  }>;

  advantagePlus: {
    description: string;
    howItWorks: string;
    whenToUse: string;
    requirements: string[];
    controls: string[];
    expectedResults: string;
  };

  lookalikes: {
    sources: Array<{
      source: string;
      quality: 'excellent' | 'good' | 'fair';
      reasoning: string;
    }>;
    percentages: Record<string, {
      audienceSize: string;
      quality: string;
      bestFor: string;
    }>;
  };
}

export const META_TARGETING_COMPREHENSIVE: TargetingKnowledge = {
  audienceSizeGuidelines: {
    byObjective: {
      CONVERSIONS: {
        minimum: 50000,
        recommended: 500000,
        optimal: 2000000,
        reasoning: 'Conversion campaigns need large audiences because only a small % convert. 50K is minimum to avoid Learning Limited. 500K+ gives Meta room to optimize. 2M+ enables significant scaling.'
      },
      TRAFFIC: {
        minimum: 10000,
        recommended: 100000,
        optimal: 500000,
        reasoning: 'Link clicks are more common than purchases. Smaller audiences work, but larger = better performance.'
      },
      AWARENESS: {
        minimum: 200000,
        recommended: 1000000,
        optimal: 10000000,
        reasoning: 'Reach and awareness campaigns benefit from massive audiences. Want to avoid frequency issues.'
      },
      ENGAGEMENT: {
        minimum: 50000,
        recommended: 200000,
        optimal: 1000000,
        reasoning: 'Engagement is relatively common, so medium-sized audiences work well.'
      }
    }
  },

  targetingLayers: [
    {
      layer: 'Demographics (Age, Gender, Location)',
      description: 'Basic targeting by age, gender, and geography',
      impact: 'Narrows audience by 50-90% depending on restrictions',
      bestPractice: 'Start broad (18-65+, All Genders, Country-level). Narrow only if product is truly limited. Let data guide you - don\'t assume.'
    },
    {
      layer: 'Detailed Targeting (Interests, Behaviors)',
      description: 'Target based on interests Meta infers from user activity',
      impact: 'Can narrow to 1-5% of population',
      bestPractice: 'Use broad interest categories (Fitness, Fashion, Tech). Avoid hyper-specific interests. Stack 3-5 related interests for broader reach. OR not AND.'
    },
    {
      layer: 'Custom Audiences (Your Data)',
      description: 'Target people who interacted with your business',
      impact: 'Highly targeted, small audiences',
      bestPractice: 'Use for retargeting and lookalikes. Website visitors (30/60/90 days), email lists, purchasers. Exclude converters from prospecting.'
    },
    {
      layer: 'Lookalike Audiences',
      description: 'Meta finds people similar to your customers',
      impact: 'Expands reach while maintaining quality',
      bestPractice: 'Build from purchase data (best) or high-intent actions. Start with 1-2% for quality, expand to 3-5% for scale.'
    }
  ],

  advantagePlus: {
    description: 'Advantage+ Audience allows Meta to expand beyond your targeting when it finds better performers',
    howItWorks: 'You set targeting suggestions, but Meta can ignore them if it finds profitable users outside. Balances your knowledge with Meta\'s algorithm.',
    whenToUse: 'When pixel has 50+ conversions/week and you\'re ready to scale. Best for proven offers.',
    requirements: [
      'Pixel with conversion history',
      'At least 50 conversions in past 30 days',
      'Budget of $50+/day recommended',
      'Proven product-market fit'
    ],
    controls: [
      'Can set targeting suggestions (age, interests, etc)',
      'Can exclude specific locations',
      'Can set age minimums (18+, 21+, etc)',
      'Cannot exclude most interests or demographics'
    ],
    expectedResults: 'Typically finds 20-40% more profitable conversions at similar or better CPA by expanding beyond your manual targeting assumptions.'
  },

  lookalikes: {
    sources: [
      {
        source: 'Purchase Events (Value-Based)',
        quality: 'excellent',
        reasoning: 'Best source. Finds people similar to your paying customers, weighted by purchase value. Highest conversion rates.'
      },
      {
        source: 'Purchase Events (Standard)',
        quality: 'excellent',
        reasoning: 'Finds people similar to any purchaser. Slightly broader than value-based but still excellent quality.'
      },
      {
        source: 'Initiate Checkout',
        quality: 'good',
        reasoning: 'High-intent audience. Found people who almost bought. Good alternative when purchase volume is low.'
      },
      {
        source: 'Add to Cart',
        quality: 'good',
        reasoning: 'Medium-intent. Useful for testing and when conversion volume is limited.'
      },
      {
        source: 'Page View',
        quality: 'fair',
        reasoning: 'Lower intent but useful for cold traffic testing. Converts worse than purchase-based but larger audience.'
      },
      {
        source: 'Email List',
        quality: 'good',
        reasoning: 'Quality depends on list quality. Subscribers and customers better than general leads.'
      }
    ],
    percentages: {
      '1%': {
        audienceSize: '~2-3M per country (US)',
        quality: 'Highest similarity to source',
        bestFor: 'Testing lookalikes. Tightest match. Best conversion rates but smallest volume.'
      },
      '2-3%': {
        audienceSize: '~4-9M per country (US)',
        quality: 'High similarity, good balance',
        bestFor: 'Scaling after 1% proves profitable. Sweet spot for most advertisers. Good quality + volume.'
      },
      '5%': {
        audienceSize: '~15M per country (US)',
        quality: 'Moderate similarity',
        bestFor: 'Aggressive scaling or very niche products. Larger reach but quality degrades.'
      },
      '10%': {
        audienceSize: '~30M per country (US)',
        quality: 'Lower similarity',
        bestFor: 'Broad products only. Quality often too low for profitable scaling. Test carefully.'
      }
    }
  }
};

// ============================================================================
// EXPORT KNOWLEDGE RETRIEVAL FUNCTIONS
// ============================================================================

export function getLearningPhaseKnowledge(
  platform: AdPlatform,
  optimizationGoal?: OptimizationGoal
): DetailedLearningPhaseRules {
  // Currently only Meta is fully built out
  // Add TikTok and Google following same structure
  if (platform === 'facebook') {
    return META_LEARNING_PHASE_COMPREHENSIVE;
  }

  // TODO: Add TikTok and Google comprehensive knowledge
  throw new Error(`Comprehensive learning phase knowledge not yet available for ${platform}`);
}

export function getBudgetScalingKnowledge(platform: AdPlatform): BudgetScalingKnowledge {
  if (platform === 'facebook') {
    return META_BUDGET_SCALING_COMPREHENSIVE;
  }

  throw new Error(`Comprehensive budget scaling knowledge not yet available for ${platform}`);
}

export function getTargetingKnowledge(platform: AdPlatform): TargetingKnowledge {
  if (platform === 'facebook') {
    return META_TARGETING_COMPREHENSIVE;
  }

  throw new Error(`Comprehensive targeting knowledge not yet available for ${platform}`);
}

/**
 * Query platform knowledge with context
 */
export function queryPlatformKnowledge(query: {
  platform: AdPlatform;
  topic: 'learning_phase' | 'budget' | 'targeting' | 'bidding' | 'creative';
  context?: {
    objective?: CampaignObjective;
    optimizationGoal?: OptimizationGoal;
    currentBudget?: number;
    audienceSize?: number;
    conversionsPerWeek?: number;
  };
}): any {
  const { platform, topic, context } = query;

  switch (topic) {
    case 'learning_phase':
      const learningKnowledge = getLearningPhaseKnowledge(platform, context?.optimizationGoal);

      // Return specific knowledge based on context
      if (context?.optimizationGoal) {
        return {
          ...learningKnowledge,
          specificRequirements: learningKnowledge.conversionRequirements[context.optimizationGoal]
        };
      }

      return learningKnowledge;

    case 'budget':
      return getBudgetScalingKnowledge(platform);

    case 'targeting':
      return getTargetingKnowledge(platform);

    default:
      throw new Error(`Topic ${topic} not yet implemented`);
  }
}
