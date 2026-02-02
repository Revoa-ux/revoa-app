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
// COMPREHENSIVE CAMPAIGN-LEVEL SETTINGS KNOWLEDGE
// ============================================================================

export interface CampaignObjectiveKnowledge {
  objective: string;
  metaApiName: string;
  description: string;
  optimizedFor: string;
  bestFor: string[];
  notRecommendedFor: string[];
  isDefaultForEcommerce: boolean;
}

export interface BidStrategyKnowledge {
  strategy: string;
  metaApiName: string;
  description: string;
  whenToUse: string[];
  whenToAvoid: string[];
  requirements: string[];
  duplicateFromProfitable: boolean;
  settingGuidance: string;
  riskLevel: 'low' | 'medium' | 'high';
}

export interface CampaignLevelKnowledge {
  platform: AdPlatform;
  objectives: CampaignObjectiveKnowledge[];
  bidStrategies: BidStrategyKnowledge[];
  budgetOptimization: {
    cbo: {
      description: string;
      advantages: string[];
      whenToUse: string[];
      isUniversalDefault: boolean;
    };
    abo: {
      description: string;
      advantages: string[];
      whenToUse: string[];
    };
  };
  budgetTypes: {
    daily: {
      description: string;
      isDefault: boolean;
      reasoning: string;
    };
    lifetime: {
      description: string;
      whenToUse: string[];
    };
  };
}

export const META_CAMPAIGN_LEVEL_KNOWLEDGE: CampaignLevelKnowledge = {
  platform: 'facebook',

  objectives: [
    {
      objective: 'Sales',
      metaApiName: 'OUTCOME_SALES',
      description: 'Optimizes for purchase conversions on your website or app',
      optimizedFor: 'Purchase events, catalog sales, conversions',
      bestFor: [
        'Ecommerce stores (Shopify, WooCommerce, etc.)',
        'Any business with online purchases',
        'Maximizing revenue and ROAS',
      ],
      notRecommendedFor: [
        'Brand awareness campaigns',
        'Content distribution',
        'App installs',
      ],
      isDefaultForEcommerce: true,
    },
    {
      objective: 'Leads',
      metaApiName: 'OUTCOME_LEADS',
      description: 'Optimizes for lead generation forms and sign-ups',
      optimizedFor: 'Lead forms, registrations, contact submissions',
      bestFor: [
        'B2B lead generation',
        'Service businesses',
        'Email list building',
      ],
      notRecommendedFor: [
        'Direct ecommerce sales',
        'When you want immediate purchases',
      ],
      isDefaultForEcommerce: false,
    },
    {
      objective: 'Traffic',
      metaApiName: 'OUTCOME_TRAFFIC',
      description: 'Optimizes for link clicks and landing page views',
      optimizedFor: 'Website visits, link clicks',
      bestFor: [
        'Blog content promotion',
        'Driving awareness to new pages',
        'Testing landing pages',
      ],
      notRecommendedFor: [
        'Ecommerce conversion optimization',
        'When purchase is the goal',
        'Performance marketing',
      ],
      isDefaultForEcommerce: false,
    },
    {
      objective: 'Awareness',
      metaApiName: 'OUTCOME_AWARENESS',
      description: 'Optimizes for reach and ad recall lift',
      optimizedFor: 'Maximum reach, brand recall',
      bestFor: [
        'Brand launches',
        'Mass market awareness',
        'Large budget brand campaigns',
      ],
      notRecommendedFor: [
        'Direct response',
        'Ecommerce with limited budget',
        'Performance-focused campaigns',
      ],
      isDefaultForEcommerce: false,
    },
  ],

  bidStrategies: [
    {
      strategy: 'Highest Volume',
      metaApiName: 'LOWEST_COST_WITHOUT_CAP',
      description: 'Meta bids to get the most conversions at the lowest cost, spending your full budget',
      whenToUse: [
        'New campaigns and testing',
        'Learning phase campaigns',
        'When you need conversion volume',
        'When ROAS is consistently profitable',
        'Default for most campaigns',
      ],
      whenToAvoid: [
        'When CPA is at absolute maximum acceptable',
        'When you need strict cost control',
      ],
      requirements: [
        'Trust in product profitability',
        'Willingness to accept day-to-day CPA fluctuations',
      ],
      duplicateFromProfitable: false,
      settingGuidance: 'No bid cap or target needed. Meta automatically optimizes to spend your full budget at the lowest possible cost per result.',
      riskLevel: 'low',
    },
    {
      strategy: 'ROAS Goal',
      metaApiName: 'LOWEST_COST_WITH_MIN_ROAS',
      description: 'Meta maintains a minimum ROAS floor while maximizing conversions',
      whenToUse: [
        'When a Highest Volume campaign is CONSISTENTLY profitable (7+ days)',
        'When you want to maintain a minimum return on ad spend',
        'Scaling proven campaigns without sacrificing efficiency',
        'Protecting margins during aggressive scaling',
      ],
      whenToAvoid: [
        'New campaigns without conversion history',
        'Low volume campaigns (<50 conversions/week)',
        'Testing new audiences or creative',
        'If you set floor too high (will underspend)',
      ],
      requirements: [
        'Campaign must have exited learning phase',
        'At least 7 days of consistent profitable performance',
        'Sufficient pixel data (50+ conversions)',
        'Budget high enough to hit ROAS target',
      ],
      duplicateFromProfitable: true,
      settingGuidance: 'DUPLICATE a consistently profitable Highest Volume campaign. Set ROAS goal EQUAL to that campaign\'s current ROAS. Set budget HIGH ($100+/day) to ensure spend while maintaining the floor.',
      riskLevel: 'medium',
    },
    {
      strategy: 'Cost Per Result Goal',
      metaApiName: 'COST_CAP',
      description: 'Meta tries to maintain your target CPA while maximizing conversions',
      whenToUse: [
        'When a Highest Volume campaign is CONSISTENTLY net profitable (7+ days)',
        'When you know your maximum acceptable CPA',
        'Protecting profit margins during scaling',
        'When you have clear unit economics',
      ],
      whenToAvoid: [
        'New campaigns without CPA history',
        'If cap is set too low (severe underspending)',
        'Testing phase - restricts algorithm learning',
      ],
      requirements: [
        'Campaign must have exited learning phase',
        'At least 7 days of consistent profitable performance',
        'Historical CPA data to set realistic target',
        '50+ conversions for reliable CPA baseline',
      ],
      duplicateFromProfitable: true,
      settingGuidance: 'DUPLICATE a consistently profitable Highest Volume campaign. Set cost cap to that campaign\'s current CPA. Can set 10-20% higher to give algorithm room while protecting downside.',
      riskLevel: 'medium',
    },
    {
      strategy: 'Bid Cap',
      metaApiName: 'LOWEST_COST_WITH_BID_CAP',
      description: 'Sets the maximum bid Meta will place in any single auction',
      whenToUse: [
        'Very experienced advertisers only',
        'Precise auction-level control needed',
        'Extremely competitive niches',
        'When you understand auction dynamics deeply',
      ],
      whenToAvoid: [
        'Most advertisers should NOT use this',
        'New campaigns',
        'If you don\'t understand auction mechanics',
        'When you want consistent delivery',
      ],
      requirements: [
        'Deep understanding of auction mechanics',
        'Extensive historical bid data',
        'Willingness to manually adjust frequently',
        'Accept significant underspending risk',
      ],
      duplicateFromProfitable: false,
      settingGuidance: 'NOT RECOMMENDED for most advertisers. Cost Per Result Goal provides 90% of the control with 50% of the complexity. Only use if you have specific auction-level requirements.',
      riskLevel: 'high',
    },
  ],

  budgetOptimization: {
    cbo: {
      description: 'Campaign Budget Optimization allows Meta to automatically distribute budget across ad sets based on real-time performance',
      advantages: [
        'Automatic budget allocation to best performers',
        'Responds to real-time performance signals',
        'Typically 10-20% better efficiency than manual',
        'Less manual management required',
        'Better for scaling',
      ],
      whenToUse: [
        'ALWAYS - This is the universal default',
        'All scaling campaigns',
        'When you have multiple ad sets',
        'When you trust the algorithm',
      ],
      isUniversalDefault: true,
    },
    abo: {
      description: 'Ad Set Budget Optimization gives you manual control over budget allocation per ad set',
      advantages: [
        'Precise control over spend per audience',
        'Useful for specific testing scenarios',
        'Can prevent algorithm from over-concentrating spend',
      ],
      whenToUse: [
        'Testing specific audiences with equal budget',
        'When you need guaranteed spend on each ad set',
        'Very early testing phase with 2-3 audiences',
      ],
    },
  },

  budgetTypes: {
    daily: {
      description: 'Budget that refreshes every day at midnight account time',
      isDefault: true,
      reasoning: 'Daily budgets provide predictable spend, easier ROI calculation, and better control. You can pause anytime without wasting allocated budget.',
    },
    lifetime: {
      description: 'Total budget for campaign duration that Meta distributes across days',
      whenToUse: [
        'Event-based campaigns with fixed end dates',
        'Product launches with specific timelines',
        'When you want Meta to optimize timing',
      ],
    },
  },
};

// ============================================================================
// COMPREHENSIVE AD SET-LEVEL SETTINGS KNOWLEDGE
// ============================================================================

export interface ConversionLocationKnowledge {
  location: string;
  metaApiName: string;
  description: string;
  isDefaultForShopify: boolean;
  whenToUse: string[];
}

export interface ConversionEventKnowledge {
  event: string;
  metaApiName: string;
  description: string;
  funnelPosition: 'top' | 'middle' | 'bottom';
  isDefaultForEcommerce: boolean;
  whenToUse: string[];
  whenToAvoid: string[];
}

export interface PerformanceGoalKnowledge {
  goal: string;
  metaApiName: string;
  description: string;
  isDefault: boolean;
  whenToUse: string[];
  duplicateToTest: boolean;
}

export interface AdSetLevelKnowledge {
  platform: AdPlatform;
  conversionLocations: ConversionLocationKnowledge[];
  conversionEvents: ConversionEventKnowledge[];
  performanceGoals: PerformanceGoalKnowledge[];
  attributionSettings: Array<{
    setting: string;
    description: string;
    isDefault: boolean;
    reasoning: string;
  }>;
}

export const META_AD_SET_LEVEL_KNOWLEDGE: AdSetLevelKnowledge = {
  platform: 'facebook',

  conversionLocations: [
    {
      location: 'Website',
      metaApiName: 'WEBSITE',
      description: 'Conversions happen on your website (Shopify store)',
      isDefaultForShopify: true,
      whenToUse: [
        'ALWAYS for Shopify ecommerce',
        'Any web-based conversion flow',
        'Standard ecommerce purchases',
      ],
    },
    {
      location: 'App',
      metaApiName: 'APP',
      description: 'Conversions happen in your mobile app',
      isDefaultForShopify: false,
      whenToUse: [
        'Mobile app purchases only',
        'When you have a dedicated app',
      ],
    },
    {
      location: 'Messenger',
      metaApiName: 'MESSENGER',
      description: 'Conversions happen through Messenger conversations',
      isDefaultForShopify: false,
      whenToUse: [
        'Chat-based sales',
        'High-touch service businesses',
      ],
    },
    {
      location: 'WhatsApp',
      metaApiName: 'WHATSAPP',
      description: 'Conversions happen through WhatsApp conversations',
      isDefaultForShopify: false,
      whenToUse: [
        'WhatsApp-based sales (popular in some regions)',
        'When WhatsApp is primary sales channel',
      ],
    },
  ],

  conversionEvents: [
    {
      event: 'Purchase',
      metaApiName: 'PURCHASE',
      description: 'Completed purchase on your website',
      funnelPosition: 'bottom',
      isDefaultForEcommerce: true,
      whenToUse: [
        'ALWAYS for ecommerce - this is the universal default',
        'When you want to optimize for actual revenue',
        'Any campaign focused on sales',
      ],
      whenToAvoid: [
        'Never avoid for ecommerce',
      ],
    },
    {
      event: 'Add to Cart',
      metaApiName: 'ADD_TO_CART',
      description: 'Added product to shopping cart',
      funnelPosition: 'middle',
      isDefaultForEcommerce: false,
      whenToUse: [
        'ONLY when purchase volume is very low (<10/week)',
        'Testing phase when you need more signals',
        'Higher-funnel retargeting campaigns',
      ],
      whenToAvoid: [
        'When you have sufficient purchase volume (10+/week)',
        'Main prospecting campaigns',
        'When focused on revenue',
      ],
    },
    {
      event: 'Initiate Checkout',
      metaApiName: 'INITIATE_CHECKOUT',
      description: 'Started checkout process',
      funnelPosition: 'middle',
      isDefaultForEcommerce: false,
      whenToUse: [
        'When purchase volume is low but checkout volume is decent',
        'Specific checkout optimization campaigns',
      ],
      whenToAvoid: [
        'Main prospecting campaigns',
        'When you have purchase volume',
      ],
    },
    {
      event: 'Lead',
      metaApiName: 'LEAD',
      description: 'Submitted lead form or contact information',
      funnelPosition: 'middle',
      isDefaultForEcommerce: false,
      whenToUse: [
        'B2B lead generation',
        'Service businesses',
        'Email signup campaigns',
      ],
      whenToAvoid: [
        'Ecommerce purchase campaigns',
        'When direct sale is the goal',
      ],
    },
    {
      event: 'View Content',
      metaApiName: 'VIEW_CONTENT',
      description: 'Viewed product page or key content',
      funnelPosition: 'top',
      isDefaultForEcommerce: false,
      whenToUse: [
        'Awareness campaigns',
        'When all other events have zero volume',
        'Content marketing',
      ],
      whenToAvoid: [
        'Performance campaigns',
        'When you want conversions',
        'Ecommerce sales campaigns',
      ],
    },
  ],

  performanceGoals: [
    {
      goal: 'Maximize Number of Conversions',
      metaApiName: 'OFFSITE_CONVERSIONS',
      description: 'Meta optimizes for the highest number of conversion events',
      isDefault: true,
      whenToUse: [
        'Default for most campaigns',
        'When all products have similar value',
        'When you want maximum purchase volume',
        'New campaigns and testing',
      ],
      duplicateToTest: false,
    },
    {
      goal: 'Maximize Conversion Value',
      metaApiName: 'VALUE',
      description: 'Meta optimizes for highest total conversion value (revenue)',
      isDefault: false,
      whenToUse: [
        'When you have significant AOV variance ($20-$200+ product range)',
        'When Max Conversions campaign is already profitable',
        'When you want Meta to prioritize higher-value purchases',
        'Stores with premium products mixed with entry-level',
      ],
      duplicateToTest: true,
    },
  ],

  attributionSettings: [
    {
      setting: '7-day click, 1-day view',
      description: 'Conversions attributed if user clicked within 7 days or viewed within 1 day',
      isDefault: true,
      reasoning: 'Meta\'s recommended default. Provides best balance of attribution accuracy and algorithm learning. Shorter windows may undercount conversions.',
    },
    {
      setting: '1-day click',
      description: 'Only conversions within 1 day of click are attributed',
      isDefault: false,
      reasoning: 'Most conservative. Use for products with short consideration cycles or when you suspect view-through is inflating numbers.',
    },
    {
      setting: '7-day click',
      description: 'Conversions within 7 days of click, no view-through',
      isDefault: false,
      reasoning: 'Good middle ground if you distrust view-through but have longer consideration cycles.',
    },
  ],
};

// ============================================================================
// TIKTOK COMPREHENSIVE KNOWLEDGE BASE
// ============================================================================

export const TIKTOK_LEARNING_PHASE_COMPREHENSIVE: DetailedLearningPhaseRules = {
  platform: 'tiktok',

  conversionRequirements: {
    PURCHASE: {
      conversionsNeeded: 50,
      timeWindowDays: 7,
      reasoning: 'TikTok requires 50 conversion events within 7 days to exit learning phase. The algorithm is highly sensitive - most changes reset learning entirely.'
    },
    INITIATE_CHECKOUT: {
      conversionsNeeded: 50,
      timeWindowDays: 7,
      reasoning: 'Same 50 events required. Checkout events are more frequent than purchases, making learning phase easier to exit.'
    },
    ADD_TO_CART: {
      conversionsNeeded: 50,
      timeWindowDays: 7,
      reasoning: 'Best option for new accounts with limited data. Higher volume makes 50 events achievable faster.'
    },
    LANDING_PAGE_VIEWS: {
      conversionsNeeded: 50,
      timeWindowDays: 7,
      reasoning: 'TikTok calls this "Landing Page View". Useful for testing but less correlated with sales.'
    },
    LINK_CLICKS: {
      conversionsNeeded: 50,
      timeWindowDays: 7,
      reasoning: 'TikTok requires same 50 events for clicks - different from Meta which only needs 25.'
    },
    IMPRESSIONS: {
      conversionsNeeded: 0,
      timeWindowDays: 0,
      reasoning: 'Reach & Frequency campaigns do not have learning phase requirements.'
    },
    REACH: {
      conversionsNeeded: 0,
      timeWindowDays: 0,
      reasoning: 'Reach optimization does not require learning phase.'
    }
  },

  budgetRules: {
    minimumDailyBudget: 20,
    minimumForLearning: 50,
    tooLowWarning: 'TikTok minimum is $20/day for ad groups. For reliable learning phase exit, budget should be at least 20x your expected CPA. TikTok\'s CPMs are often higher than Meta.'
  },

  audienceRules: {
    minimumSize: 10000,
    recommendedSize: 100000,
    tooSmallImpact: 'TikTok requires minimum 1,000 audience size but recommends 100K+ for conversion campaigns. Smaller audiences cause severe delivery issues and Learning Phase failures.'
  },

  resetsOn: [
    {
      action: 'Budget increase',
      threshold: '>20% in 24 hours',
      timeWindow: '24 hours',
      reasoning: 'TikTok is MORE sensitive than Meta - only 24 hour window vs 72 hours. Any budget change over 20% resets learning.',
      howToAvoid: 'Scale in 20% increments daily. TikTok actually allows faster scaling velocity than Meta (daily vs every 3 days), but tighter threshold.'
    },
    {
      action: 'Budget decrease',
      threshold: '>50% in 24 hours',
      reasoning: 'Large decreases reset learning. TikTok is more forgiving with decreases than increases.',
      howToAvoid: 'Pause the ad group instead of dramatically cutting budget.'
    },
    {
      action: 'Any targeting changes',
      reasoning: 'TikTok is extremely sensitive. ANY targeting modification resets learning - even minor changes.',
      howToAvoid: 'Never modify targeting on performing ad groups. Create new ad group with different targeting.'
    },
    {
      action: 'Change optimization event',
      reasoning: 'Cannot change after launch. TikTok\'s pixel trains specifically for the selected event.',
      howToAvoid: 'Create new ad group with desired optimization. This is a platform limitation.'
    },
    {
      action: 'Creative changes',
      reasoning: 'Adding, removing, or editing creative resets learning. TikTok treats creative changes as significant.',
      howToAvoid: 'Create new ad group for new creative. Never edit creatives in performing ad groups.'
    },
    {
      action: 'Pause longer than 7 days',
      timeWindow: '7+ days',
      reasoning: 'TikTok considers paused ad groups stale after 7 days. User behavior changes rapidly on TikTok.',
      howToAvoid: 'Treat as fresh start after long pause. Consider duplicating instead of restarting.'
    },
    {
      action: 'Bid changes',
      reasoning: 'Changing bid strategy or bid amount resets learning phase.',
      howToAvoid: 'Only change bids when performance is poor. Accept learning phase reset.'
    }
  ],

  states: {
    LEARNING: {
      description: 'Ad group is exploring to understand your audience. Performance will be volatile and costs typically higher.',
      expectedPerformance: 'CPA may be 30-50% higher than post-learning. TikTok\'s learning phase is often more volatile than Meta\'s.',
      whatToDo: [
        'Do not touch ANYTHING for first 48 hours minimum',
        'Ensure $50+/day budget for conversion campaigns',
        'Monitor conversion velocity (need 7+/day)',
        'Check TikTok Pixel is firing correctly',
        'Verify audience size is 100K+'
      ],
      whatNotToDo: [
        'Do not change budget, targeting, or creative',
        'Do not panic at initial high costs',
        'Do not pause and restart',
        'Do not add new creatives',
        'Do not adjust bids'
      ]
    },
    LEARNING_LIMITED: {
      description: 'TikTok calls this "Learning Phase Limited". Ad group cannot gather enough data to optimize.',
      causes: [
        'Budget too low (need 20x CPA daily)',
        'Audience too narrow (<100K)',
        'High CPA relative to budget',
        'Pixel not firing correctly',
        'Creative not resonating',
        'Too many ad groups competing for same audience'
      ],
      howToFix: [
        'Increase budget to at least $100/day for conversion campaigns',
        'Broaden targeting significantly',
        'Test Spark Ads (organic + paid hybrid) for better engagement',
        'Consolidate ad groups to concentrate budget',
        'Check pixel implementation',
        'Try higher-funnel optimization (ATC vs Purchase)'
      ],
      expectedOutcome: 'Learning Limited ad groups underperform by 40-60%. Often better to restart fresh than try to fix.'
    },
    ACTIVE: {
      description: 'Successfully exited learning phase. Algorithm understands your audience and delivers efficiently.',
      howToMaintain: [
        'Scale budget 20% daily max',
        'Never edit targeting or creative',
        'Add new creative via new ad groups only',
        'Monitor for creative fatigue (faster on TikTok)',
        'Refresh creative every 2-3 weeks'
      ],
      scalingOpportunities: 'TikTok allows faster scaling (daily vs 3 days) but saturates faster. Creative fatigue happens 2-3x faster than Meta. Plan for frequent creative refresh.'
    }
  },

  conversionVelocity: {
    healthy: '7+ conversions per day allows learning phase exit in 7 days. Strong creative-audience fit.',
    concerning: '3-6 conversions per day means 8-16 days to exit. Consider higher budget or broader targeting.',
    critical: 'Under 3 conversions per day is critical. TikTok\'s 7-day window is strict. Immediate action needed.'
  }
};

export const TIKTOK_BUDGET_SCALING_COMPREHENSIVE: BudgetScalingKnowledge = {
  platform: 'tiktok',

  minimumBudgets: {
    byObjective: {
      CONVERSIONS: {
        daily: 50,
        reasoning: 'TikTok recommends $50+ daily for conversion optimization. Higher CPMs than Meta require larger budgets.'
      },
      TRAFFIC: {
        daily: 20,
        reasoning: '$20 minimum for traffic campaigns. Click costs vary widely by targeting.'
      },
      AWARENESS: {
        daily: 20,
        reasoning: '$20 minimum. CPMs on TikTok range $5-15, higher than Meta in most markets.'
      },
      ENGAGEMENT: {
        daily: 20,
        reasoning: '$20 minimum for engagement campaigns. Video views are relatively affordable.'
      }
    },
    byCountry: {
      US: 20,
      CA: 20,
      GB: 20,
      AU: 20,
      IN: 5,
      BR: 10,
      MX: 10
    }
  },

  scalingStrategies: [
    {
      name: 'Vertical Scaling (Daily Budget Increases)',
      description: 'Increase budget on winning ad groups by 20% daily',
      whenToUse: 'When ad group is Active (post-learning) with profitable ROAS for 3+ days',
      howTo: 'Increase budget by exactly 20% every 24 hours. TikTok allows daily scaling unlike Meta\'s 72-hour window.',
      expectedOutcome: 'Can scale 2x in one week without learning reset. Monitor CPA daily.',
      risks: [
        'Creative fatigue happens faster on TikTok',
        'CPA can spike rapidly once audience exhausts',
        'Frequency caps are less effective on TikTok',
        'Younger audience = faster trend changes'
      ]
    },
    {
      name: 'Horizontal Scaling (Ad Group Duplication)',
      description: 'Duplicate winning ad groups to find new audience pockets',
      whenToUse: 'When vertical scaling causes CPA to rise or when testing new targeting',
      howTo: 'Duplicate ad group with identical settings. TikTok will find different users. Can also duplicate with slight targeting variations.',
      expectedOutcome: 'Fresh learning phase but often finds new profitable audiences. TikTok\'s algorithm finds diverse users.',
      risks: [
        'Each duplicate needs full learning phase',
        'May compete with original in auction',
        'Requires more budget to run multiple ad groups',
        'More complex to manage'
      ]
    },
    {
      name: 'Spark Ads Scaling',
      description: 'Use organic posts as ads for authenticity and better engagement',
      whenToUse: 'When you have organic content performing well, or creator partnerships',
      howTo: 'Boost existing organic posts or creator content. Native format often outperforms traditional ads.',
      expectedOutcome: 'Typically 20-40% better engagement and 10-20% lower CPA than standard ads.',
      risks: [
        'Dependent on organic content quality',
        'Less control over messaging',
        'Creator partnerships add complexity',
        'Limited creative control'
      ]
    },
    {
      name: 'Smart+ Campaigns',
      description: 'TikTok\'s automated campaign type (equivalent to Meta\'s Advantage+)',
      whenToUse: 'When pixel has strong data and you want maximum automation',
      howTo: 'Create Smart+ Web Campaign. Let TikTok handle targeting, placements, and optimization.',
      expectedOutcome: 'Often matches or beats manual campaigns. Best for experienced pixel accounts.',
      risks: [
        'Less control over targeting',
        'Requires strong pixel data',
        'May explore unprofitable audiences',
        'Harder to diagnose issues'
      ]
    }
  ],

  biddingStrategies: [
    {
      name: 'Lowest Cost',
      description: 'TikTok bids to get most conversions at lowest cost, spending full budget',
      bestFor: [
        'New campaigns and testing',
        'Learning phase',
        'When you need volume',
        'Default for most campaigns'
      ],
      requirements: [
        'Trust in product profitability',
        'Willingness to accept CPA fluctuations',
        'Strong creative'
      ],
      pros: [
        'Maximum delivery',
        'Best for learning phase',
        'Simplest to manage',
        'Good for testing'
      ],
      cons: [
        'CPA can spike unexpectedly',
        'No cost control',
        'May overspend on poor days'
      ],
      expertTip: 'Use Lowest Cost during learning phase and first scaling attempts. Only switch to Cost Cap after establishing profitable baseline.'
    },
    {
      name: 'Cost Cap',
      description: 'Set maximum CPA. TikTok tries to stay at or below your cap.',
      bestFor: [
        'Scaling proven campaigns',
        'Protecting margins',
        'When you know max profitable CPA'
      ],
      requirements: [
        'Must have exited learning phase',
        'Historical CPA data (7+ days)',
        'Set cap 20-30% above current CPA'
      ],
      pros: [
        'Cost control',
        'Protects profitability',
        'Good for scaling'
      ],
      cons: [
        'May underspend if cap too low',
        'Less volume than Lowest Cost',
        'Can trigger Learning Limited'
      ],
      expertTip: 'Set Cost Cap at current CPA + 25%. TikTok needs more room than Meta due to higher volatility.'
    },
    {
      name: 'Bid Cap',
      description: 'Set maximum bid per impression. Most restrictive option.',
      bestFor: [
        'Expert advertisers only',
        'Specific CPM targets',
        'Competitive auction control'
      ],
      requirements: [
        'Deep auction understanding',
        'Extensive data',
        'Manual optimization willingness'
      ],
      pros: [
        'Maximum control',
        'Can find arbitrage'
      ],
      cons: [
        'Often underspends',
        'Complex to manage',
        'Not recommended for most'
      ],
      expertTip: 'Avoid unless you have specific auction-level requirements. Cost Cap is better for most advertisers.'
    }
  ],

  budgetTypes: {
    daily: {
      description: 'Budget refreshes daily at midnight account time',
      pros: [
        'Predictable daily spend',
        'Easy ROI calculation',
        'Can pause anytime',
        'Better for testing'
      ],
      cons: [
        'May not optimize for best days',
        'Less flexibility'
      ],
      bestFor: 'Most campaigns. TikTok recommends daily budgets for better control.'
    },
    lifetime: {
      description: 'Total budget for campaign duration',
      pros: [
        'TikTok optimizes timing',
        'Good for scheduled content',
        'Can spend more on trending days'
      ],
      cons: [
        'Can overspend early',
        'Less predictable',
        'Unused budget wasted at end'
      ],
      bestFor: 'Event campaigns, product launches, or when following TikTok trends.'
    }
  }
};

export const TIKTOK_CAMPAIGN_LEVEL_KNOWLEDGE: CampaignLevelKnowledge = {
  platform: 'tiktok',

  objectives: [
    {
      objective: 'Website Conversions',
      metaApiName: 'CONVERSIONS',
      description: 'Optimizes for purchases and other conversion events on your website',
      optimizedFor: 'Purchase, Add to Cart, Initiate Checkout, Complete Registration',
      bestFor: [
        'Ecommerce stores',
        'Direct response campaigns',
        'Performance marketing'
      ],
      notRecommendedFor: [
        'Brand awareness',
        'Content distribution',
        'App installs'
      ],
      isDefaultForEcommerce: true
    },
    {
      objective: 'Product Sales',
      metaApiName: 'PRODUCT_SALES',
      description: 'Catalog-based shopping ads optimized for product purchases',
      optimizedFor: 'Product catalog sales, dynamic retargeting',
      bestFor: [
        'Stores with large catalogs',
        'Dynamic retargeting',
        'Product discovery'
      ],
      notRecommendedFor: [
        'Single product stores',
        'Non-ecommerce'
      ],
      isDefaultForEcommerce: false
    },
    {
      objective: 'Traffic',
      metaApiName: 'TRAFFIC',
      description: 'Drive users to your website or app',
      optimizedFor: 'Link clicks, landing page views',
      bestFor: [
        'Content promotion',
        'Awareness with traffic focus',
        'Testing landing pages'
      ],
      notRecommendedFor: [
        'Direct sales campaigns',
        'When conversion is goal'
      ],
      isDefaultForEcommerce: false
    },
    {
      objective: 'Reach',
      metaApiName: 'REACH',
      description: 'Show ads to maximum unique users',
      optimizedFor: 'Maximum unique reach',
      bestFor: [
        'Brand awareness',
        'Product launches',
        'Mass market messaging'
      ],
      notRecommendedFor: [
        'Performance campaigns',
        'Limited budgets'
      ],
      isDefaultForEcommerce: false
    },
    {
      objective: 'Video Views',
      metaApiName: 'VIDEO_VIEWS',
      description: 'Maximize video view completions',
      optimizedFor: '6-second, 2-second, or full video views',
      bestFor: [
        'Brand storytelling',
        'Product demonstrations',
        'Building video view audiences for retargeting'
      ],
      notRecommendedFor: [
        'Direct response',
        'Conversion optimization'
      ],
      isDefaultForEcommerce: false
    }
  ],

  bidStrategies: [
    {
      strategy: 'Lowest Cost',
      metaApiName: 'BID_TYPE_NO_BID',
      description: 'TikTok automatically bids to maximize conversions at lowest cost',
      whenToUse: [
        'New campaigns',
        'Testing phase',
        'When you need volume',
        'Default recommendation'
      ],
      whenToAvoid: [
        'When you need strict cost control',
        'Limited budget with hard CPA limits'
      ],
      requirements: [
        'Trust in product profitability',
        'Sufficient budget to allow optimization'
      ],
      duplicateFromProfitable: false,
      settingGuidance: 'No bid required. TikTok handles optimization automatically.',
      riskLevel: 'low'
    },
    {
      strategy: 'Cost Cap',
      metaApiName: 'BID_TYPE_CUSTOM',
      description: 'Set your target CPA - TikTok tries to hit this while maximizing volume',
      whenToUse: [
        'After establishing profitable baseline',
        'Scaling while maintaining margins',
        'When you know max profitable CPA'
      ],
      whenToAvoid: [
        'New campaigns without data',
        'If set too aggressively (will underspend)'
      ],
      requirements: [
        'Exited learning phase',
        '7+ days of CPA history',
        'Set 20-30% above current CPA'
      ],
      duplicateFromProfitable: true,
      settingGuidance: 'Duplicate profitable Lowest Cost campaign. Set cap at current CPA + 25% to give algorithm room.',
      riskLevel: 'medium'
    },
    {
      strategy: 'Maximum Delivery',
      metaApiName: 'BID_TYPE_PACING',
      description: 'Spend budget as quickly as possible while maintaining some optimization',
      whenToUse: [
        'Time-sensitive campaigns',
        'Flash sales',
        'When speed matters more than efficiency'
      ],
      whenToAvoid: [
        'Most campaigns',
        'When efficiency matters'
      ],
      requirements: [
        'Accept potentially higher CPAs',
        'Specific time-based need'
      ],
      duplicateFromProfitable: false,
      settingGuidance: 'Only use for specific time-sensitive scenarios. Generally avoid.',
      riskLevel: 'high'
    }
  ],

  budgetOptimization: {
    cbo: {
      description: 'Campaign Budget Optimization distributes budget across ad groups automatically',
      advantages: [
        'Automatic allocation to best performers',
        'Less manual management',
        'Often better efficiency',
        'Good for scaling'
      ],
      whenToUse: [
        'When you have 2+ ad groups',
        'Scaling campaigns',
        'When you trust algorithm',
        'Most campaigns'
      ],
      isUniversalDefault: true
    },
    abo: {
      description: 'Ad Group Budget Optimization - manual budget control per ad group',
      advantages: [
        'Precise control per audience',
        'Useful for testing',
        'Guarantees spend per ad group'
      ],
      whenToUse: [
        'A/B testing specific audiences',
        'When you need equal spend per test',
        'Early testing phase'
      ]
    }
  },

  budgetTypes: {
    daily: {
      description: 'Budget refreshes daily',
      isDefault: true,
      reasoning: 'Daily budgets provide predictable spend and easier management. Recommended for most campaigns.'
    },
    lifetime: {
      description: 'Total budget for campaign duration',
      whenToUse: [
        'Scheduled campaigns',
        'Event-based promotions',
        'When TikTok should optimize timing'
      ]
    }
  }
};

export const TIKTOK_AD_SET_LEVEL_KNOWLEDGE: AdSetLevelKnowledge = {
  platform: 'tiktok',

  conversionLocations: [
    {
      location: 'Website',
      metaApiName: 'EXTERNAL_WEBSITE',
      description: 'Conversions happen on your website via TikTok Pixel',
      isDefaultForShopify: true,
      whenToUse: [
        'Standard ecommerce',
        'Shopify stores',
        'Any web-based conversion'
      ]
    },
    {
      location: 'TikTok Shop',
      metaApiName: 'TIKTOK_SHOP',
      description: 'Conversions happen within TikTok Shop',
      isDefaultForShopify: false,
      whenToUse: [
        'TikTok Shop sellers',
        'In-app purchases',
        'Live shopping'
      ]
    },
    {
      location: 'App',
      metaApiName: 'APP',
      description: 'Conversions happen in your mobile app',
      isDefaultForShopify: false,
      whenToUse: [
        'Mobile app installs',
        'In-app purchases',
        'App engagement'
      ]
    }
  ],

  conversionEvents: [
    {
      event: 'Complete Payment',
      metaApiName: 'COMPLETE_PAYMENT',
      description: 'Completed purchase on your website',
      funnelPosition: 'bottom',
      isDefaultForEcommerce: true,
      whenToUse: [
        'All ecommerce campaigns',
        'When optimizing for revenue',
        'Main conversion goal'
      ],
      whenToAvoid: [
        'Never avoid for ecommerce'
      ]
    },
    {
      event: 'Add to Cart',
      metaApiName: 'ADD_TO_CART',
      description: 'Added product to cart',
      funnelPosition: 'middle',
      isDefaultForEcommerce: false,
      whenToUse: [
        'Low purchase volume (<10/week)',
        'Testing phase',
        'Building pixel data'
      ],
      whenToAvoid: [
        'When you have sufficient purchases',
        'Main prospecting campaigns'
      ]
    },
    {
      event: 'Initiate Checkout',
      metaApiName: 'INITIATE_CHECKOUT',
      description: 'Started checkout process',
      funnelPosition: 'middle',
      isDefaultForEcommerce: false,
      whenToUse: [
        'Low purchase volume',
        'Checkout optimization focus'
      ],
      whenToAvoid: [
        'Main prospecting campaigns',
        'When purchases are available'
      ]
    },
    {
      event: 'View Content',
      metaApiName: 'VIEW_CONTENT',
      description: 'Viewed product page',
      funnelPosition: 'top',
      isDefaultForEcommerce: false,
      whenToUse: [
        'Awareness campaigns',
        'Very limited pixel data',
        'Content marketing'
      ],
      whenToAvoid: [
        'Performance campaigns',
        'When better events available'
      ]
    },
    {
      event: 'Submit Form',
      metaApiName: 'SUBMIT_FORM',
      description: 'Submitted a form on your website',
      funnelPosition: 'middle',
      isDefaultForEcommerce: false,
      whenToUse: [
        'Lead generation',
        'Newsletter signups',
        'Contact forms'
      ],
      whenToAvoid: [
        'Ecommerce purchase campaigns'
      ]
    }
  ],

  performanceGoals: [
    {
      goal: 'Conversion',
      metaApiName: 'CONVERT',
      description: 'Optimize for maximum conversions',
      isDefault: true,
      whenToUse: [
        'Most campaigns',
        'When optimizing for conversion volume',
        'Standard ecommerce'
      ],
      duplicateToTest: false
    },
    {
      goal: 'Value',
      metaApiName: 'VALUE',
      description: 'Optimize for conversion value (revenue)',
      isDefault: false,
      whenToUse: [
        'Significant AOV variance',
        'When revenue matters more than volume',
        'Premium product mix'
      ],
      duplicateToTest: true
    }
  ],

  attributionSettings: [
    {
      setting: '7-day click, 1-day view',
      description: 'Default attribution window',
      isDefault: true,
      reasoning: 'TikTok\'s recommended default. Balances attribution accuracy with algorithm learning.'
    },
    {
      setting: '1-day click',
      description: 'Short attribution window',
      isDefault: false,
      reasoning: 'Most conservative. Use for impulse purchases or when you suspect view-through inflation.'
    },
    {
      setting: '28-day click',
      description: 'Extended click attribution',
      isDefault: false,
      reasoning: 'For high-consideration products with long purchase cycles.'
    }
  ]
};

// ============================================================================
// GOOGLE ADS COMPREHENSIVE KNOWLEDGE BASE
// ============================================================================

export const GOOGLE_LEARNING_PHASE_COMPREHENSIVE: DetailedLearningPhaseRules = {
  platform: 'google',

  conversionRequirements: {
    PURCHASE: {
      conversionsNeeded: 30,
      timeWindowDays: 30,
      reasoning: 'Google Smart Bidding needs 30 conversions in 30 days for baseline learning. Optimal performance typically after 50+ conversions. Learning period is 7-14 days.'
    },
    INITIATE_CHECKOUT: {
      conversionsNeeded: 30,
      timeWindowDays: 30,
      reasoning: 'Same 30 conversion requirement. Google is more forgiving than Meta/TikTok with longer time window.'
    },
    ADD_TO_CART: {
      conversionsNeeded: 30,
      timeWindowDays: 30,
      reasoning: 'Can use micro-conversions when purchase volume is low. Google handles multiple conversion actions well.'
    },
    LANDING_PAGE_VIEWS: {
      conversionsNeeded: 15,
      timeWindowDays: 30,
      reasoning: 'Google calls this "Page Views". Lower threshold for top-funnel events.'
    },
    LINK_CLICKS: {
      conversionsNeeded: 0,
      timeWindowDays: 0,
      reasoning: 'Maximize Clicks bidding does not have a learning phase - it optimizes for click volume immediately.'
    },
    IMPRESSIONS: {
      conversionsNeeded: 0,
      timeWindowDays: 0,
      reasoning: 'Target Impression Share bidding has no learning phase.'
    },
    LEADS: {
      conversionsNeeded: 30,
      timeWindowDays: 30,
      reasoning: 'Lead gen campaigns need 30 conversions. Consider using secondary conversions (form starts) for faster learning.'
    }
  },

  budgetRules: {
    minimumDailyBudget: 10,
    minimumForLearning: 50,
    tooLowWarning: 'Google recommends daily budget of at least 10x your target CPA for reliable Smart Bidding. Lower budgets may work but take longer to optimize. Google is more forgiving than Meta/TikTok.'
  },

  audienceRules: {
    minimumSize: 1000,
    recommendedSize: 10000,
    tooSmallImpact: 'Google allows smaller audiences than Meta/TikTok. Remarketing lists need 1,000 users minimum. For conversion optimization, larger is better but Google handles smaller audiences well.'
  },

  resetsOn: [
    {
      action: 'Change bid strategy',
      reasoning: 'Switching between Manual CPC, Maximize Conversions, Target CPA, etc. resets learning. Each strategy optimizes differently.',
      howToAvoid: 'Commit to a bid strategy for at least 2-3 weeks. Only change if fundamentally wrong approach.'
    },
    {
      action: 'Significant Target CPA/ROAS change',
      threshold: '>20% change',
      reasoning: 'Large target changes force algorithm to re-learn auction dynamics at new price point.',
      howToAvoid: 'Adjust targets gradually in 10-15% increments. Give 1-2 weeks between changes.'
    },
    {
      action: 'Major campaign restructure',
      reasoning: 'Consolidating or splitting campaigns changes data signals to algorithm.',
      howToAvoid: 'Plan structure carefully upfront. Restructuring is sometimes necessary but understand impact.'
    },
    {
      action: 'Pause longer than 7 days',
      timeWindow: '7+ days',
      reasoning: 'Extended pauses cause algorithm to partially reset. Search behavior changes over time.',
      howToAvoid: 'Use low budgets instead of pausing if possible. Expect ramp-up period after long pause.'
    }
  ],

  states: {
    LEARNING: {
      description: 'Smart Bidding is calibrating. Google shows "Learning" status in campaign interface. Typically 7-14 days.',
      expectedPerformance: 'CPA may be 10-20% higher than post-learning. Google\'s learning is less volatile than Meta/TikTok.',
      whatToDo: [
        'Wait 1-2 weeks before judging performance',
        'Ensure sufficient budget and conversion volume',
        'Check conversion tracking is accurate',
        'Review Search Terms report for relevance',
        'Monitor Quality Score trends'
      ],
      whatNotToDo: [
        'Do not change bid strategy',
        'Do not dramatically change budgets',
        'Do not panic at initial metrics',
        'Do not add too many keywords at once',
        'Do not pause campaigns frequently'
      ]
    },
    LEARNING_LIMITED: {
      description: 'Google shows "Learning (limited)" - insufficient data to optimize properly.',
      causes: [
        'Budget too limited for conversion volume needed',
        'Target CPA/ROAS too aggressive',
        'Low conversion volume',
        'Too many campaigns splitting data',
        'Conversion tracking issues'
      ],
      howToFix: [
        'Increase budget or consolidate campaigns',
        'Relax target CPA/ROAS by 20-30%',
        'Consider Maximize Conversions without target first',
        'Check conversion tracking accuracy',
        'Consolidate similar campaigns to aggregate data',
        'Use Portfolio Bid Strategies to share learning'
      ],
      expectedOutcome: 'Learning Limited campaigns can still perform but optimization is suboptimal. Addressing causes typically improves performance 15-25%.'
    },
    ACTIVE: {
      description: 'Successfully calibrated. Google shows "Eligible" status. Smart Bidding is fully optimized.',
      howToMaintain: [
        'Make gradual budget changes only',
        'Adjust targets slowly (10-15% max)',
        'Add keywords and ads incrementally',
        'Regularly review Search Terms',
        'Monitor competitor auction pressure'
      ],
      scalingOpportunities: 'Google campaigns can often scale 3-5x with gradual increases. Portfolio strategies allow aggressive scaling by sharing data across campaigns.'
    }
  },

  conversionVelocity: {
    healthy: '4+ conversions per day allows learning completion in 7-10 days. Good signal to scale.',
    concerning: '1-3 conversions per day extends learning to 10-30 days. Consider aggregating campaigns.',
    critical: 'Under 1 conversion per day makes Smart Bidding unreliable. Use Maximize Clicks or consolidate.'
  }
};

export const GOOGLE_BUDGET_SCALING_COMPREHENSIVE: BudgetScalingKnowledge = {
  platform: 'google',

  minimumBudgets: {
    byObjective: {
      CONVERSIONS: {
        daily: 30,
        reasoning: 'Google recommends daily budget of 10x target CPA minimum. $30 works for $3 CPA targets.'
      },
      TRAFFIC: {
        daily: 10,
        reasoning: 'Maximize Clicks can work with lower budgets. $10/day provides meaningful data.'
      },
      AWARENESS: {
        daily: 10,
        reasoning: 'CPM campaigns can run at lower budgets. Display CPMs are often $2-5.'
      },
      LEADS: {
        daily: 30,
        reasoning: 'Lead gen typically needs similar budget to conversions.'
      }
    },
    byCountry: {
      US: 5,
      CA: 5,
      GB: 5,
      AU: 5,
      IN: 1,
      BR: 2,
      MX: 2
    }
  },

  scalingStrategies: [
    {
      name: 'Vertical Scaling (Budget Increases)',
      description: 'Increase budget on performing campaigns',
      whenToUse: 'When campaigns are profitable and exited learning',
      howTo: 'Increase budget by 15-25% weekly. Google is more forgiving than Meta - weekly changes work well.',
      expectedOutcome: 'Can often scale 3-5x before efficiency degrades. Search has more scale than Social.',
      risks: [
        'May hit search volume ceiling',
        'Competition increases with larger budgets',
        'Quality Score matters more at scale',
        'Impression Share reveals true potential'
      ]
    },
    {
      name: 'Horizontal Scaling (New Campaigns)',
      description: 'Create new campaigns for different keywords, audiences, or campaign types',
      whenToUse: 'When vertical scaling hits volume ceiling or you want to test new areas',
      howTo: 'Launch new campaigns targeting different keywords, audiences, or using different campaign types (Search, Shopping, Performance Max).',
      expectedOutcome: 'Expands total addressable traffic. Google has massive inventory across Search, Display, YouTube, Shopping.',
      risks: [
        'Each campaign needs learning period',
        'Budget fragmentation',
        'Cannibalization between campaigns',
        'More complex management'
      ]
    },
    {
      name: 'Performance Max',
      description: 'Google\'s fully automated campaign type across all inventory',
      whenToUse: 'When you have product feed and want maximum automation and reach',
      howTo: 'Create Performance Max campaign with strong asset groups. Let Google optimize across all placements.',
      expectedOutcome: 'Often finds incremental conversions across Search, Shopping, Display, YouTube. Good for scaling.',
      risks: [
        'Less visibility into what\'s working',
        'Can cannibalize other campaigns',
        'Requires good creative assets',
        'Less control over placements'
      ]
    },
    {
      name: 'Portfolio Bid Strategies',
      description: 'Share bid strategy across multiple campaigns for unified optimization',
      whenToUse: 'When you have multiple campaigns with similar goals',
      howTo: 'Create Portfolio Bid Strategy in Shared Library. Apply to relevant campaigns.',
      expectedOutcome: 'Faster learning, better budget allocation, unified optimization across campaigns.',
      risks: [
        'One underperformer affects all',
        'Less granular control',
        'Need similar goals across campaigns'
      ]
    }
  ],

  biddingStrategies: [
    {
      name: 'Maximize Conversions',
      description: 'Google bids to get maximum conversions within budget',
      bestFor: [
        'New campaigns',
        'When you need volume',
        'Building conversion data',
        'Default starting point'
      ],
      requirements: [
        'Conversion tracking set up',
        'Sufficient budget'
      ],
      pros: [
        'Simplest Smart Bidding',
        'Maximum volume',
        'Good for learning'
      ],
      cons: [
        'No cost control',
        'Can have high CPA',
        'Spends full budget aggressively'
      ],
      expertTip: 'Start with Maximize Conversions to build data, then add Target CPA once you have 30+ conversions and know your profitable CPA.'
    },
    {
      name: 'Target CPA',
      description: 'Maximize conversions while trying to hit target cost per acquisition',
      bestFor: [
        'Established campaigns with conversion history',
        'When you know max profitable CPA',
        'Scaling while maintaining efficiency'
      ],
      requirements: [
        '30+ conversions in past 30 days',
        'Know your profitable CPA range',
        'Set realistic target (start at current CPA)'
      ],
      pros: [
        'Cost control',
        'Predictable CPA',
        'Good for scaling'
      ],
      cons: [
        'May limit volume if target too aggressive',
        'Need conversion history',
        'Can miss opportunities if too restrictive'
      ],
      expertTip: 'Start Target CPA at your current average CPA. Tighten gradually (10-15% per week) once stable.'
    },
    {
      name: 'Maximize Conversion Value',
      description: 'Optimize for total conversion value (revenue) rather than conversion count',
      bestFor: [
        'Ecommerce with varying product values',
        'When revenue matters more than count',
        'Strong conversion value tracking'
      ],
      requirements: [
        'Conversion values passed to Google',
        'Varying product prices',
        'Sufficient conversion volume'
      ],
      pros: [
        'Optimizes for revenue',
        'Handles product mix well',
        'Good for ecommerce'
      ],
      cons: [
        'Needs value data',
        'May ignore lower-value products',
        'More complex setup'
      ],
      expertTip: 'Ensure your conversion value tracking includes actual product prices. Static values defeat the purpose.'
    },
    {
      name: 'Target ROAS',
      description: 'Maximize conversion value while achieving target return on ad spend',
      bestFor: [
        'Ecommerce with clear ROAS targets',
        'When profit margins are known',
        'Scaling while maintaining returns'
      ],
      requirements: [
        'Conversion value tracking',
        '30+ conversions with values',
        'Know your profitable ROAS'
      ],
      pros: [
        'Controls returns',
        'Good for profitability focus',
        'Works well with ecommerce'
      ],
      cons: [
        'May severely limit volume if target too high',
        'Needs significant data',
        'Complex to optimize'
      ],
      expertTip: 'Start Target ROAS at 80-90% of current ROAS. Being too aggressive will kill volume. Better to have volume at good ROAS than nothing at great ROAS.'
    },
    {
      name: 'Manual CPC',
      description: 'Set maximum CPC bids manually for each keyword',
      bestFor: [
        'Full control needs',
        'Very low volume situations',
        'When Smart Bidding not enough data'
      ],
      requirements: [
        'Time for manual optimization',
        'Understanding of keyword value'
      ],
      pros: [
        'Full control',
        'Works with any volume',
        'Good for testing'
      ],
      cons: [
        'Time intensive',
        'Miss real-time optimization',
        'Harder to scale'
      ],
      expertTip: 'Use Manual CPC only when Smart Bidding truly cannot work (very low volume, new verticals). Move to Smart Bidding ASAP.'
    }
  ],

  budgetTypes: {
    daily: {
      description: 'Daily spend limit that Google tries to hit, may vary day-to-day',
      pros: [
        'Predictable monthly spend (daily x 30.4)',
        'Easy to manage',
        'Good for most campaigns'
      ],
      cons: [
        'Google may overspend up to 2x daily on high-opportunity days',
        'Monthly budget is the real limit'
      ],
      bestFor: 'Most campaigns. Google\'s daily budget works well with Smart Bidding optimization.'
    },
    lifetime: {
      description: 'Google does not have true lifetime budgets - use campaign end dates with daily budgets',
      pros: [
        'Campaign scheduling available',
        'Can set end dates'
      ],
      cons: [
        'Must manually calculate daily from total',
        'Less flexible than Meta\'s lifetime budgets'
      ],
      bestFor: 'Scheduled promotions. Set daily budget = total / days and add end date.'
    }
  }
};

export const GOOGLE_CAMPAIGN_LEVEL_KNOWLEDGE: CampaignLevelKnowledge = {
  platform: 'google',

  objectives: [
    {
      objective: 'Sales',
      metaApiName: 'SALES',
      description: 'Drive sales on your website, app, or in-store',
      optimizedFor: 'Purchase conversions, transaction value',
      bestFor: [
        'Ecommerce stores',
        'Direct response',
        'Performance marketing'
      ],
      notRecommendedFor: [
        'Brand awareness',
        'Content distribution'
      ],
      isDefaultForEcommerce: true
    },
    {
      objective: 'Leads',
      metaApiName: 'LEADS',
      description: 'Generate leads and signups',
      optimizedFor: 'Form submissions, calls, sign-ups',
      bestFor: [
        'B2B lead generation',
        'Service businesses',
        'Professional services'
      ],
      notRecommendedFor: [
        'Direct ecommerce sales'
      ],
      isDefaultForEcommerce: false
    },
    {
      objective: 'Website Traffic',
      metaApiName: 'WEBSITE_TRAFFIC',
      description: 'Drive visitors to your website',
      optimizedFor: 'Clicks, site visits',
      bestFor: [
        'Content promotion',
        'Awareness with traffic focus',
        'Testing landing pages'
      ],
      notRecommendedFor: [
        'Conversion-focused campaigns'
      ],
      isDefaultForEcommerce: false
    },
    {
      objective: 'Brand Awareness',
      metaApiName: 'AWARENESS',
      description: 'Reach people and build awareness',
      optimizedFor: 'Impressions, reach',
      bestFor: [
        'Brand launches',
        'Mass market awareness',
        'Display and YouTube campaigns'
      ],
      notRecommendedFor: [
        'Direct response',
        'Limited budgets'
      ],
      isDefaultForEcommerce: false
    }
  ],

  bidStrategies: [
    {
      strategy: 'Maximize Conversions',
      metaApiName: 'MAXIMIZE_CONVERSIONS',
      description: 'Get the most conversions within your budget',
      whenToUse: [
        'New campaigns',
        'Building conversion data',
        'When volume matters most'
      ],
      whenToAvoid: [
        'When CPA is critical and must be controlled'
      ],
      requirements: [
        'Conversion tracking',
        'Sufficient budget'
      ],
      duplicateFromProfitable: false,
      settingGuidance: 'Start here to build data. No target needed. Google optimizes for maximum conversions.',
      riskLevel: 'low'
    },
    {
      strategy: 'Target CPA',
      metaApiName: 'TARGET_CPA',
      description: 'Get conversions at your target cost per acquisition',
      whenToUse: [
        'After establishing conversion baseline',
        'When you know max profitable CPA',
        'Scaling profitably'
      ],
      whenToAvoid: [
        'New campaigns without history',
        'If target too aggressive (kills volume)'
      ],
      requirements: [
        '30+ conversions in 30 days',
        'Realistic target (start at current CPA)',
        'Sufficient budget for target'
      ],
      duplicateFromProfitable: true,
      settingGuidance: 'Add Target CPA to Maximize Conversions campaign. Start at current CPA, tighten 10-15% per week.',
      riskLevel: 'medium'
    },
    {
      strategy: 'Target ROAS',
      metaApiName: 'TARGET_ROAS',
      description: 'Maximize value while hitting return target',
      whenToUse: [
        'Ecommerce with value tracking',
        'When ROAS is the key metric',
        'Varying product values'
      ],
      whenToAvoid: [
        'Without value tracking',
        'If target too aggressive'
      ],
      requirements: [
        'Conversion value tracking',
        '30+ conversions with values',
        'Realistic ROAS target'
      ],
      duplicateFromProfitable: true,
      settingGuidance: 'Start Target ROAS at 80-90% of current ROAS. Aggressive targets kill volume.',
      riskLevel: 'medium'
    },
    {
      strategy: 'Maximize Clicks',
      metaApiName: 'MAXIMIZE_CLICKS',
      description: 'Get the most clicks within budget',
      whenToUse: [
        'Traffic campaigns',
        'When building awareness',
        'Low conversion volume situations'
      ],
      whenToAvoid: [
        'When conversions are the goal',
        'Performance campaigns'
      ],
      requirements: [
        'Click-worthy ads',
        'Good landing pages'
      ],
      duplicateFromProfitable: false,
      settingGuidance: 'Use for traffic or when Smart Bidding lacks data. Not for conversion campaigns.',
      riskLevel: 'low'
    }
  ],

  budgetOptimization: {
    cbo: {
      description: 'Shared Budgets allow Google to distribute budget across campaigns automatically',
      advantages: [
        'Automatic allocation to performers',
        'Simplified budget management',
        'Better optimization across campaigns'
      ],
      whenToUse: [
        'Multiple campaigns with shared goals',
        'When you want Google to optimize allocation',
        'Scaling scenarios'
      ],
      isUniversalDefault: false
    },
    abo: {
      description: 'Individual campaign budgets - standard approach in Google Ads',
      advantages: [
        'Clear budget control per campaign',
        'Predictable spend allocation',
        'Standard approach'
      ],
      whenToUse: [
        'Most campaigns',
        'When you need specific budget control',
        'Different campaign objectives'
      ]
    }
  },

  budgetTypes: {
    daily: {
      description: 'Daily budget with monthly cap at daily x 30.4',
      isDefault: true,
      reasoning: 'Google uses daily budgets as the standard. Monthly spend = daily x 30.4. Google may overspend daily up to 2x on high-opportunity days.'
    },
    lifetime: {
      description: 'Use campaign end dates with daily budgets for scheduled campaigns',
      whenToUse: [
        'Time-limited promotions',
        'Event-based campaigns',
        'Scheduled advertising'
      ]
    }
  }
};

export const GOOGLE_AD_SET_LEVEL_KNOWLEDGE: AdSetLevelKnowledge = {
  platform: 'google',

  conversionLocations: [
    {
      location: 'Website',
      metaApiName: 'WEBSITE',
      description: 'Conversions on your website via Google tag',
      isDefaultForShopify: true,
      whenToUse: [
        'Ecommerce',
        'Lead gen websites',
        'Standard web conversions'
      ]
    },
    {
      location: 'Phone Calls',
      metaApiName: 'PHONE_CALLS',
      description: 'Phone call conversions',
      isDefaultForShopify: false,
      whenToUse: [
        'Service businesses',
        'Local businesses',
        'Call-focused campaigns'
      ]
    },
    {
      location: 'App',
      metaApiName: 'APP',
      description: 'Mobile app conversions',
      isDefaultForShopify: false,
      whenToUse: [
        'App installs',
        'In-app purchases',
        'App engagement'
      ]
    },
    {
      location: 'Store Visits',
      metaApiName: 'STORE_VISITS',
      description: 'Physical store visits (requires location tracking)',
      isDefaultForShopify: false,
      whenToUse: [
        'Retail with physical stores',
        'Local campaigns',
        'Omnichannel attribution'
      ]
    }
  ],

  conversionEvents: [
    {
      event: 'Purchase',
      metaApiName: 'purchase',
      description: 'Completed purchase',
      funnelPosition: 'bottom',
      isDefaultForEcommerce: true,
      whenToUse: [
        'All ecommerce campaigns',
        'Revenue optimization'
      ],
      whenToAvoid: []
    },
    {
      event: 'Add to Cart',
      metaApiName: 'add_to_cart',
      description: 'Added product to cart',
      funnelPosition: 'middle',
      isDefaultForEcommerce: false,
      whenToUse: [
        'Low purchase volume',
        'Micro-conversion tracking',
        'Building audience data'
      ],
      whenToAvoid: [
        'When purchase data is sufficient'
      ]
    },
    {
      event: 'Begin Checkout',
      metaApiName: 'begin_checkout',
      description: 'Started checkout process',
      funnelPosition: 'middle',
      isDefaultForEcommerce: false,
      whenToUse: [
        'Checkout optimization',
        'Low purchase volume'
      ],
      whenToAvoid: [
        'Main optimization goal'
      ]
    },
    {
      event: 'Lead',
      metaApiName: 'generate_lead',
      description: 'Submitted lead form',
      funnelPosition: 'middle',
      isDefaultForEcommerce: false,
      whenToUse: [
        'Lead generation campaigns',
        'B2B marketing',
        'Service businesses'
      ],
      whenToAvoid: [
        'Ecommerce purchase focus'
      ]
    },
    {
      event: 'Page View',
      metaApiName: 'page_view',
      description: 'Viewed key page',
      funnelPosition: 'top',
      isDefaultForEcommerce: false,
      whenToUse: [
        'Awareness tracking',
        'Content marketing',
        'Very limited data'
      ],
      whenToAvoid: [
        'Performance campaigns'
      ]
    }
  ],

  performanceGoals: [
    {
      goal: 'Conversions',
      metaApiName: 'CONVERSIONS',
      description: 'Optimize for conversion count',
      isDefault: true,
      whenToUse: [
        'Most campaigns',
        'When volume matters',
        'Standard ecommerce'
      ],
      duplicateToTest: false
    },
    {
      goal: 'Conversion Value',
      metaApiName: 'CONVERSION_VALUE',
      description: 'Optimize for conversion value (revenue)',
      isDefault: false,
      whenToUse: [
        'Varying product prices',
        'Revenue focus',
        'Premium product mix'
      ],
      duplicateToTest: true
    }
  ],

  attributionSettings: [
    {
      setting: 'Data-Driven Attribution',
      description: 'Google\'s ML-based attribution across touchpoints',
      isDefault: true,
      reasoning: 'Google\'s recommended default. Uses machine learning to distribute credit across ad interactions. Most accurate for most accounts.'
    },
    {
      setting: 'Last Click',
      description: 'All credit to final click',
      isDefault: false,
      reasoning: 'Simple but outdated. Only use if DDA not available or for specific comparison needs.'
    },
    {
      setting: 'First Click',
      description: 'All credit to first interaction',
      isDefault: false,
      reasoning: 'Values awareness touchpoints. Rarely used except for brand awareness analysis.'
    },
    {
      setting: 'Linear',
      description: 'Equal credit to all touchpoints',
      isDefault: false,
      reasoning: 'Even distribution. Use when you value all touchpoints equally.'
    }
  ]
};

// ============================================================================
// GOOGLE ADS BID ADJUSTMENT KNOWLEDGE
// ============================================================================

export interface BidAdjustmentKnowledge {
  adjustmentType: string;
  description: string;
  validRange: { min: number; max: number };
  excludeOption: boolean;
  bestPractices: string[];
  automationOpportunities: string[];
  warningThresholds: {
    tooHigh: number;
    tooLow: number;
    reasoning: string;
  };
}

export interface GoogleAdsBidAdjustmentKnowledge {
  platform: 'google';
  deviceBidAdjustments: {
    devices: Array<{
      device: string;
      description: string;
      defaultBehavior: string;
      typicalAdjustments: { min: number; max: number };
      whenToIncrease: string[];
      whenToDecrease: string[];
      whenToExclude: string[];
    }>;
    bestPractices: string[];
    commonMistakes: string[];
  };
  audienceBidAdjustments: {
    audienceTypes: Array<{
      type: string;
      description: string;
      typicalBidRange: { min: number; max: number };
      bestFor: string[];
      layeringStrategy: string;
    }>;
    targetingModes: Array<{
      mode: string;
      description: string;
      useCase: string;
    }>;
    bestPractices: string[];
  };
  demographicBidAdjustments: {
    ageRanges: Array<{
      range: string;
      apiValue: string;
      considerations: string;
    }>;
    genders: Array<{
      gender: string;
      apiValue: string;
    }>;
    householdIncomes: Array<{
      tier: string;
      apiValue: string;
      description: string;
    }>;
    parentalStatus: Array<{
      status: string;
      apiValue: string;
    }>;
    bestPractices: string[];
    dataRequirements: string;
  };
  locationBidAdjustments: {
    locationTypes: Array<{
      type: string;
      description: string;
      granularity: string;
    }>;
    strategies: Array<{
      strategy: string;
      description: string;
      whenToUse: string[];
    }>;
    bestPractices: string[];
  };
  adScheduleBidAdjustments: {
    description: string;
    granularity: string;
    strategies: Array<{
      strategy: string;
      description: string;
      implementation: string;
    }>;
    bestPractices: string[];
    commonPatterns: Array<{
      pattern: string;
      typicalAdjustment: string;
      reasoning: string;
    }>;
  };
  keywordBidAdjustments: {
    matchTypes: Array<{
      type: string;
      description: string;
      bidStrategy: string;
    }>;
    qualityScoreImpact: {
      components: string[];
      bidImplications: string;
      optimizationTips: string[];
    };
    bestPractices: string[];
  };
  placementBidAdjustments: {
    placementTypes: Array<{
      type: string;
      description: string;
      adjustmentRange: { min: number; max: number };
    }>;
    exclusionStrategies: string[];
    bestPractices: string[];
  };
}

export const GOOGLE_ADS_BID_ADJUSTMENT_KNOWLEDGE: GoogleAdsBidAdjustmentKnowledge = {
  platform: 'google',

  deviceBidAdjustments: {
    devices: [
      {
        device: 'MOBILE',
        description: 'Mobile phones with full browsers',
        defaultBehavior: 'Included at 0% adjustment (same bid as desktop)',
        typicalAdjustments: { min: -90, max: 900 },
        whenToIncrease: [
          'Mobile conversion rate equals or exceeds desktop',
          'Mobile CPA is lower than desktop',
          'Product/service suits mobile purchase behavior',
          'Strong mobile landing page experience',
          'Local business with high mobile search volume'
        ],
        whenToDecrease: [
          'Mobile conversion rate significantly lower than desktop',
          'Mobile CPA is much higher',
          'Complex checkout process that performs poorly on mobile',
          'High mobile traffic but low mobile conversions'
        ],
        whenToExclude: [
          'B2B with enterprise sales requiring desktop research',
          'Complex products requiring detailed comparison',
          'Mobile conversion rate near zero with significant spend',
          'Landing page not mobile optimized'
        ]
      },
      {
        device: 'DESKTOP',
        description: 'Desktop and laptop computers',
        defaultBehavior: 'Base bid - cannot be excluded, only adjusted',
        typicalAdjustments: { min: -90, max: 900 },
        whenToIncrease: [
          'Desktop conversion rate significantly higher',
          'B2B products requiring research',
          'High-value purchases typically made on desktop',
          'Complex comparison shopping behavior'
        ],
        whenToDecrease: [
          'Desktop traffic has lower conversion rate',
          'Mobile-first audience',
          'Simple impulse purchase products'
        ],
        whenToExclude: []
      },
      {
        device: 'TABLET',
        description: 'Tablet devices',
        defaultBehavior: 'Included at 0% adjustment',
        typicalAdjustments: { min: -90, max: 900 },
        whenToIncrease: [
          'Tablet users show high engagement',
          'Visual products that benefit from larger screen',
          'Evening/weekend purchase patterns'
        ],
        whenToDecrease: [
          'Low tablet traffic volume',
          'Poor tablet conversion rate',
          'Landing page not tablet optimized'
        ],
        whenToExclude: [
          'Minimal tablet traffic with poor performance',
          'Budget constraints requiring device focus'
        ]
      },
      {
        device: 'CONNECTED_TV',
        description: 'Smart TVs and streaming devices (for Video campaigns)',
        defaultBehavior: 'Available for Video/Display campaigns',
        typicalAdjustments: { min: -90, max: 900 },
        whenToIncrease: [
          'Brand awareness focus',
          'Video completion rates are high',
          'Reaching cord-cutter audiences'
        ],
        whenToDecrease: [
          'Direct response focus',
          'Low engagement metrics'
        ],
        whenToExclude: [
          'Performance campaigns focused on conversions'
        ]
      }
    ],
    bestPractices: [
      'Analyze device performance for at least 2 weeks before making adjustments',
      'Start with small adjustments (10-20%) and increase gradually',
      'Consider the full conversion path - users may research on mobile, convert on desktop',
      'Use cross-device conversion data when available',
      'Set -100% to completely exclude a device (except desktop)',
      'Review device performance by campaign type - Search vs Display behavior differs'
    ],
    commonMistakes: [
      'Excluding mobile without considering assisted conversions',
      'Making large bid adjustments based on small sample sizes',
      'Not accounting for different user intents by device',
      'Ignoring tablet performance entirely',
      'Setting adjustments and never reviewing them'
    ]
  },

  audienceBidAdjustments: {
    audienceTypes: [
      {
        type: 'IN_MARKET',
        description: 'Users actively researching or comparing products/services',
        typicalBidRange: { min: 0, max: 50 },
        bestFor: ['Mid-funnel targeting', 'Competitive conquesting', 'Expanding reach to qualified users'],
        layeringStrategy: 'Add as Observation first, then apply bid adjustments based on performance'
      },
      {
        type: 'AFFINITY',
        description: 'Users with demonstrated long-term interests',
        typicalBidRange: { min: -20, max: 30 },
        bestFor: ['Brand awareness', 'Top-of-funnel reach', 'Lifestyle targeting'],
        layeringStrategy: 'Better for Display/Video than Search. Use for prospecting.'
      },
      {
        type: 'REMARKETING',
        description: 'Users who have previously interacted with your site/app',
        typicalBidRange: { min: 20, max: 100 },
        bestFor: ['Cart abandoners', 'Past purchasers', 'Page visitors'],
        layeringStrategy: 'Create tiered lists by recency and engagement level'
      },
      {
        type: 'SIMILAR',
        description: 'Users similar to your remarketing audiences',
        typicalBidRange: { min: 0, max: 40 },
        bestFor: ['Scaling beyond remarketing', 'Finding new customers', 'Lookalike targeting'],
        layeringStrategy: 'Test multiple similar audiences based on different seed lists'
      },
      {
        type: 'CUSTOM_INTENT',
        description: 'Users based on recent search behavior and site visits',
        typicalBidRange: { min: 10, max: 60 },
        bestFor: ['Competitor targeting', 'Specific keyword intent', 'Custom defined audiences'],
        layeringStrategy: 'Build from your best performing keywords and competitor URLs'
      },
      {
        type: 'COMBINED',
        description: 'Combination of multiple audience segments with AND/OR logic',
        typicalBidRange: { min: 20, max: 80 },
        bestFor: ['Precision targeting', 'Excluding certain segments', 'Complex audience logic'],
        layeringStrategy: 'Combine remarketing with demographics or in-market for precision'
      }
    ],
    targetingModes: [
      {
        mode: 'Observation',
        description: 'Audience added for bid adjustments and reporting only, does not restrict reach',
        useCase: 'Default for Search campaigns. Gather data before restricting.'
      },
      {
        mode: 'Targeting',
        description: 'Ads only shown to users in the audience',
        useCase: 'Use for Display/Video or when audience is large enough to sustain volume'
      }
    ],
    bestPractices: [
      'Start with Observation mode to collect data before making bid adjustments',
      'Layer multiple audiences to find high-intent segments',
      'Create audience hierarchy: hot (remarketing) > warm (in-market) > cold (affinity)',
      'Exclude converted users from prospecting audiences',
      'Refresh remarketing lists regularly to maintain recency',
      'Use bid-only mode for Search to maintain keyword targeting while boosting known audiences',
      'Test Custom Intent audiences built from competitor keywords'
    ]
  },

  demographicBidAdjustments: {
    ageRanges: [
      { range: '18-24', apiValue: 'AGE_RANGE_18_24', considerations: 'Lower purchase power but high engagement' },
      { range: '25-34', apiValue: 'AGE_RANGE_25_34', considerations: 'Often highest converting for ecommerce' },
      { range: '35-44', apiValue: 'AGE_RANGE_35_44', considerations: 'High purchase power, family purchases' },
      { range: '45-54', apiValue: 'AGE_RANGE_45_54', considerations: 'Established careers, higher AOV' },
      { range: '55-64', apiValue: 'AGE_RANGE_55_64', considerations: 'Pre-retirement, specific product interests' },
      { range: '65+', apiValue: 'AGE_RANGE_65_UP', considerations: 'Retirement, health, leisure focus' },
      { range: 'Unknown', apiValue: 'AGE_RANGE_UNDETERMINED', considerations: 'Cannot be excluded, often performs well' }
    ],
    genders: [
      { gender: 'Male', apiValue: 'MALE' },
      { gender: 'Female', apiValue: 'FEMALE' },
      { gender: 'Unknown', apiValue: 'UNDETERMINED' }
    ],
    householdIncomes: [
      { tier: 'Top 10%', apiValue: 'INCOME_RANGE_TOP_10_PERCENT', description: 'Highest household income tier' },
      { tier: '11-20%', apiValue: 'INCOME_RANGE_11_TO_20_PERCENT', description: 'Second highest tier' },
      { tier: '21-30%', apiValue: 'INCOME_RANGE_21_TO_30_PERCENT', description: 'Upper middle income' },
      { tier: '31-40%', apiValue: 'INCOME_RANGE_31_TO_40_PERCENT', description: 'Middle income' },
      { tier: '41-50%', apiValue: 'INCOME_RANGE_41_TO_50_PERCENT', description: 'Middle income' },
      { tier: 'Lower 50%', apiValue: 'INCOME_RANGE_LOWER_50_PERCENT', description: 'Lower income half' },
      { tier: 'Unknown', apiValue: 'INCOME_RANGE_UNDETERMINED', description: 'Income not determinable' }
    ],
    parentalStatus: [
      { status: 'Parent', apiValue: 'PARENT' },
      { status: 'Not a Parent', apiValue: 'NOT_A_PARENT' },
      { status: 'Unknown', apiValue: 'UNDETERMINED' }
    ],
    bestPractices: [
      'Collect at least 1000 clicks per demographic segment before adjusting bids',
      'Consider product fit when adjusting - luxury goods may warrant income targeting',
      'Unknown demographics often contain valuable traffic - avoid excluding',
      'Use demographic data alongside audience data for precision',
      'Test demographic exclusions carefully - they reduce reach significantly',
      'Household income targeting is US-only and based on census data'
    ],
    dataRequirements: 'Google estimates demographics based on user behavior. Accuracy varies. Verified data from signed-in users is most reliable.'
  },

  locationBidAdjustments: {
    locationTypes: [
      { type: 'Country', description: 'Entire country targeting', granularity: 'Broadest' },
      { type: 'Region/State', description: 'State, province, or region level', granularity: 'Regional' },
      { type: 'City', description: 'Metropolitan area', granularity: 'Local' },
      { type: 'Postal Code', description: 'ZIP/postal code level', granularity: 'Hyper-local' },
      { type: 'Radius', description: 'Distance from a point', granularity: 'Custom' }
    ],
    strategies: [
      {
        strategy: 'Tiered Geographic Bidding',
        description: 'Different bid adjustments for primary, secondary, and tertiary markets',
        whenToUse: ['Multi-location businesses', 'Varying demand by region', 'Budget optimization']
      },
      {
        strategy: 'Local Competitive Bidding',
        description: 'Higher bids in areas with strong local presence or competitive advantage',
        whenToUse: ['Local service businesses', 'Retail with physical locations', 'Delivery radius focus']
      },
      {
        strategy: 'Performance-Based Location Targeting',
        description: 'Adjust bids based on historical location performance data',
        whenToUse: ['Established campaigns with location data', 'Optimizing for ROAS by region']
      },
      {
        strategy: 'Exclusion Strategy',
        description: 'Exclude non-serviceable or low-value locations',
        whenToUse: ['Limited service areas', 'Poor performing regions', 'Budget constraints']
      }
    ],
    bestPractices: [
      'Start broad, then narrow based on performance data',
      'Consider timezone differences for ad scheduling combinations',
      'Use location groups for easier management of multiple locations',
      'Account for seasonality in location performance',
      'Review "Locations" vs "Location of Interest" report differences',
      'Exclude locations where you cannot service or ship to',
      'Consider cost-of-living differences when setting location bids'
    ]
  },

  adScheduleBidAdjustments: {
    description: 'Adjust bids by day of week and time of day (dayparting)',
    granularity: '15-minute increments, 7 days per week',
    strategies: [
      {
        strategy: 'Business Hours Focus',
        description: 'Increase bids during business hours when conversion probability is higher',
        implementation: 'Increase bids +20-50% during 9am-5pm on weekdays'
      },
      {
        strategy: 'Off-Peak Efficiency',
        description: 'Maintain presence during off-peak with reduced bids',
        implementation: 'Decrease bids -20-40% during nights and weekends if performance is lower'
      },
      {
        strategy: 'Performance-Based Scheduling',
        description: 'Use historical data to optimize bids by hour',
        implementation: 'Analyze conversion rates by hour/day, adjust bids to match performance patterns'
      },
      {
        strategy: 'Complete Day Exclusion',
        description: 'Exclude low-performing days entirely',
        implementation: 'Set -100% bid adjustment for days with consistently poor performance'
      }
    ],
    bestPractices: [
      'Analyze at least 4 weeks of hourly data before implementing',
      'Consider user timezone vs account timezone',
      'Account for attribution window - conversions may occur hours after click',
      'Start with broad time blocks, then refine to specific hours',
      'Review ad schedule performance monthly and adjust',
      'Consider seasonal patterns - holiday vs regular periods differ'
    ],
    commonPatterns: [
      { pattern: 'B2B', typicalAdjustment: '+30% weekday business hours, -50% weekends', reasoning: 'Business decisions made during work hours' },
      { pattern: 'Ecommerce', typicalAdjustment: '+20% evenings and weekends', reasoning: 'Shopping often happens during leisure time' },
      { pattern: 'Local Services', typicalAdjustment: '+40% business hours, consider emergency services 24/7', reasoning: 'Service requests during operating hours' },
      { pattern: 'Entertainment', typicalAdjustment: '+30% Friday-Sunday, evenings', reasoning: 'Entertainment decisions made during leisure' }
    ]
  },

  keywordBidAdjustments: {
    matchTypes: [
      {
        type: 'EXACT',
        description: 'Query must match keyword exactly or be a close variant',
        bidStrategy: 'Typically highest bid - most qualified traffic'
      },
      {
        type: 'PHRASE',
        description: 'Query must contain keyword phrase',
        bidStrategy: 'Medium bid - balanced reach and relevance'
      },
      {
        type: 'BROAD',
        description: 'Query relates to keyword meaning (Smart Bidding recommended)',
        bidStrategy: 'Lower bids but rely on Smart Bidding for optimization'
      }
    ],
    qualityScoreImpact: {
      components: [
        'Expected CTR - Historical click-through rate prediction',
        'Ad Relevance - How well ad matches keyword intent',
        'Landing Page Experience - Relevance and usability of landing page'
      ],
      bidImplications: 'Higher Quality Score = Lower actual CPC and better ad positions. Each point improvement typically reduces CPC 10-15%.',
      optimizationTips: [
        'Group tightly themed keywords into single ad groups',
        'Write ads that include target keywords',
        'Ensure landing page matches keyword intent',
        'Improve page load speed for better landing page scores',
        'Use negative keywords to improve relevance'
      ]
    },
    bestPractices: [
      'Set keyword-level bids for your top performers',
      'Use automated bidding but monitor keyword-level performance',
      'Add negative keywords proactively to prevent wasted spend',
      'Review Search Terms report weekly for new negative keyword opportunities',
      'Consider Quality Score when evaluating keyword CPA - low QS keywords may need optimization, not bid increases',
      'Pause keywords with consistently low Quality Score and high CPA'
    ]
  },

  placementBidAdjustments: {
    placementTypes: [
      {
        type: 'WEBSITE',
        description: 'Specific websites in Display Network',
        adjustmentRange: { min: -90, max: 900 }
      },
      {
        type: 'MOBILE_APP',
        description: 'Specific mobile applications',
        adjustmentRange: { min: -90, max: 900 }
      },
      {
        type: 'YOUTUBE_VIDEO',
        description: 'Specific YouTube videos',
        adjustmentRange: { min: -90, max: 900 }
      },
      {
        type: 'YOUTUBE_CHANNEL',
        description: 'Specific YouTube channels',
        adjustmentRange: { min: -90, max: 900 }
      }
    ],
    exclusionStrategies: [
      'Exclude mobile apps for non-app advertisers (often accidental clicks)',
      'Exclude low-performing placement categories',
      'Exclude competitors branded content',
      'Use placement exclusion lists for known low-quality sites',
      'Exclude placements with high impressions but zero conversions',
      'Review Where Ads Showed report regularly'
    ],
    bestPractices: [
      'Start with automatic placements, then exclude poor performers',
      'Increase bids on proven high-converting placements',
      'Create placement exclusion lists at account level for efficiency',
      'Consider brand safety when selecting placements',
      'Use managed placements for direct placement targeting',
      'Monitor viewability metrics alongside conversion data'
    ]
  }
};

export function getGoogleAdsBidAdjustmentKnowledge(): GoogleAdsBidAdjustmentKnowledge {
  return GOOGLE_ADS_BID_ADJUSTMENT_KNOWLEDGE;
}

export function getDeviceBidGuidance(device: string): any {
  const knowledge = GOOGLE_ADS_BID_ADJUSTMENT_KNOWLEDGE.deviceBidAdjustments;
  return knowledge.devices.find(d => d.device === device);
}

export function getAudienceTypeGuidance(audienceType: string): any {
  const knowledge = GOOGLE_ADS_BID_ADJUSTMENT_KNOWLEDGE.audienceBidAdjustments;
  return knowledge.audienceTypes.find(a => a.type === audienceType);
}

// ============================================================================
// EXPORT KNOWLEDGE RETRIEVAL FUNCTIONS
// ============================================================================

export function getCampaignLevelKnowledge(platform: AdPlatform): CampaignLevelKnowledge {
  if (platform === 'facebook') {
    return META_CAMPAIGN_LEVEL_KNOWLEDGE;
  }
  if (platform === 'tiktok') {
    return TIKTOK_CAMPAIGN_LEVEL_KNOWLEDGE;
  }
  if (platform === 'google') {
    return GOOGLE_CAMPAIGN_LEVEL_KNOWLEDGE;
  }
  throw new Error(`Campaign level knowledge not yet available for ${platform}`);
}

export function getAdSetLevelKnowledge(platform: AdPlatform): AdSetLevelKnowledge {
  if (platform === 'facebook') {
    return META_AD_SET_LEVEL_KNOWLEDGE;
  }
  if (platform === 'tiktok') {
    return TIKTOK_AD_SET_LEVEL_KNOWLEDGE;
  }
  if (platform === 'google') {
    return GOOGLE_AD_SET_LEVEL_KNOWLEDGE;
  }
  throw new Error(`Ad set level knowledge not yet available for ${platform}`);
}

export function getBidStrategyGuidance(
  platform: AdPlatform,
  strategy: string
): BidStrategyKnowledge | undefined {
  const knowledge = getCampaignLevelKnowledge(platform);
  return knowledge.bidStrategies.find(
    s => s.strategy.toLowerCase() === strategy.toLowerCase() ||
         s.metaApiName === strategy
  );
}

export function getConversionEventGuidance(
  platform: AdPlatform,
  event: string
): ConversionEventKnowledge | undefined {
  const knowledge = getAdSetLevelKnowledge(platform);
  return knowledge.conversionEvents.find(
    e => e.event.toLowerCase() === event.toLowerCase() ||
         e.metaApiName === event
  );
}

export function getLearningPhaseKnowledge(
  platform: AdPlatform,
  optimizationGoal?: OptimizationGoal
): DetailedLearningPhaseRules {
  if (platform === 'facebook') {
    return META_LEARNING_PHASE_COMPREHENSIVE;
  }
  if (platform === 'tiktok') {
    return TIKTOK_LEARNING_PHASE_COMPREHENSIVE;
  }
  if (platform === 'google') {
    return GOOGLE_LEARNING_PHASE_COMPREHENSIVE;
  }
  throw new Error(`Comprehensive learning phase knowledge not yet available for ${platform}`);
}

export function getBudgetScalingKnowledge(platform: AdPlatform): BudgetScalingKnowledge {
  if (platform === 'facebook') {
    return META_BUDGET_SCALING_COMPREHENSIVE;
  }
  if (platform === 'tiktok') {
    return TIKTOK_BUDGET_SCALING_COMPREHENSIVE;
  }
  if (platform === 'google') {
    return GOOGLE_BUDGET_SCALING_COMPREHENSIVE;
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
