import type { GeneratedInsight } from './rexInsightGenerator';

/**
 * Demo insight for testing when no real data exists
 * This matches the exact GeneratedInsight interface structure
 */
export const createDemoInsight = (): GeneratedInsight => ({
  title: 'High-Performing Demographic Discovered',
  primaryInsight: 'Women 25-34 audiences are delivering 8.2x ROAS—3.9x better than your 2.1x average. They represent 67% of revenue but likely a smaller portion of your targeting.',
  analysisParagraphs: [
    "Your Women 25-34 demographic is performing exceptionally well with an 8.2x ROAS, significantly outperforming your average of 2.1x. This segment currently represents 67% of your total revenue from this ad, generating $73,951.70 with only $9,018.50 in spend. With a CPA of just $18.50 and 487 conversions, this audience is clearly resonating with your offer.",
    "This pattern emerged from analyzing 14,287 data points from the last 30 days. The Women 25-34 segment shows a 290% better return compared to your overall performance. These customers convert 3.2x faster than other segments, with 43% becoming repeat buyers within 90 days compared to 13% average. Mobile devices drive 89% of their conversions, with iPhones accounting for 72% of the volume.",
    "Performance peaks Tuesday and Thursday evenings (7-9 PM) when this demographic is most active, with Instagram Stories delivering the strongest results (73% of revenue from this placement). The pattern is particularly pronounced in New York, LA, and Chicago metro areas. This concentrated behavior suggests you have found a highly qualified audience segment that you should prioritize and protect with automated safeguards."
  ],
  confidence: 88,
  priority: 85,
  reasoning: {
    triggeredBy: [
      'ROAS 3.9x above average',
      'CPA 72% below average',
      '487 conversions with consistent performance',
      'Strong repeat buyer rate (43%)'
    ],
    primaryInsight: 'Women 25-34 on Instagram Stories during evening hours represent your highest-value segment',
    metrics: {
      roas: 8.2,
      avgRoas: 2.1,
      cpa: 18.50,
      avgCpa: 67.00,
      conversions: 487,
      revenue: 73951.70,
      spend: 9018.50
    },
    analysis: 'Statistical significance confirmed with p-value < 0.01 across 30-day rolling window. Pattern shows consistent performance with minimal variance.',
    riskLevel: 'low',
    supportingData: {
      demographics: {
        topPerforming: [
          {
            ageRange: '25-34',
            gender: 'Female',
            roas: 8.2,
            conversions: 487,
            spend: 9018.50,
            ctr: 2.8,
            improvement: 290
          },
          {
            ageRange: '35-44',
            gender: 'Male',
            roas: 3.1,
            conversions: 124,
            spend: 5604.80,
            ctr: 1.4,
            improvement: 48
          },
          {
            ageRange: '35-44',
            gender: 'Female',
            roas: 2.8,
            conversions: 98,
            spend: 5105.80,
            ctr: 1.2,
            improvement: 33
          }
        ],
        underperforming: [
          {
            ageRange: '45-54',
            gender: 'Male',
            roas: 0.8,
            wasted_spend: 3200
          }
        ],
        insights: [
          'Women 25-34 outperform all other demographics by 3.9x',
          'Strong repeat buyer behavior in this segment (43% vs 13% average)',
          'Mobile-first audience with 89% of conversions on smartphones'
        ]
      },
      placements: {
        topPerforming: [
          {
            placementType: 'Instagram Stories',
            deviceType: 'Mobile (iPhone)',
            platform: 'Instagram',
            roas: 8.2,
            conversions: 487,
            spend: 9018.50,
            ctr: 3.2,
            engagement: 4.8,
            improvement: 290
          },
          {
            placementType: 'Instagram Feed',
            deviceType: 'Mobile',
            platform: 'Instagram',
            roas: 2.1,
            conversions: 124,
            spend: 5604.80,
            ctr: 1.8,
            engagement: 2.4,
            improvement: 0
          },
          {
            placementType: 'Facebook Feed',
            deviceType: 'Desktop',
            platform: 'Facebook',
            roas: 1.4,
            conversions: 67,
            spend: 4200.00,
            ctr: 0.9,
            engagement: 1.2,
            improvement: -33
          }
        ],
        underperforming: [
          {
            placementType: 'Audience Network',
            deviceType: 'Mobile',
            roas: 0.4,
            wasted_spend: 2100
          }
        ],
        insights: [
          'Instagram Stories on iPhone drives 73% of revenue',
          'Mobile placements outperform desktop by 5.9x',
          'Story format resonates strongly with target demographic'
        ]
      },
      geographic: {
        topPerforming: [
          {
            country: 'United States',
            region: 'New York',
            city: 'New York City',
            roas: 9.1,
            conversions: 127,
            spend: 7000.00,
            averageOrderValue: 520,
            improvement: 333
          },
          {
            country: 'United States',
            region: 'California',
            city: 'Los Angeles',
            roas: 7.8,
            conversions: 98,
            spend: 5600.00,
            averageOrderValue: 445,
            improvement: 271
          },
          {
            country: 'United States',
            region: 'Illinois',
            city: 'Chicago',
            roas: 6.2,
            conversions: 76,
            spend: 4500.00,
            averageOrderValue: 398,
            improvement: 195
          }
        ],
        untapped: [
          {
            country: 'United States',
            potential: 'Boston, Seattle, San Francisco show similar demographics',
            similarMarkets: ['Boston', 'Seattle', 'San Francisco']
          }
        ],
        insights: [
          'Major metro areas drive 89% of conversions',
          'NYC shows highest AOV at $520',
          'Similar demographics in Boston/Seattle remain untapped'
        ]
      },
      temporal: {
        bestPerforming: [
          {
            dayOfWeek: 'Tuesday',
            hourRange: '7-9 PM',
            roas: 8.9,
            conversions: 127,
            spend: 2800.00,
            improvement: 324
          },
          {
            dayOfWeek: 'Thursday',
            hourRange: '8-10 PM',
            roas: 7.2,
            conversions: 94,
            spend: 2100.00,
            improvement: 243
          },
          {
            dayOfWeek: 'Sunday',
            hourRange: '6-8 PM',
            roas: 5.8,
            conversions: 78,
            spend: 1800.00,
            improvement: 176
          }
        ],
        worstPerforming: [
          {
            dayOfWeek: 'Monday',
            hourRange: '6-8 AM',
            roas: 0.6,
            wasted_spend: 1200
          }
        ],
        insights: [
          'Evening hours (7-9 PM) drive 68% of conversions',
          'Weekday evenings outperform weekends by 2.3x',
          'Morning hours show poor performance across all days'
        ]
      },
      customerBehavior: {
        newVsReturning: {
          new: { conversions: 278, revenue: 42170.00, averageOrderValue: 245, cpa: 18.50 },
          returning: { conversions: 209, revenue: 48945.00, averageOrderValue: 387, cpa: 12.20 }
        },
        lifetimeValue: {
          average: 487,
          top10Percent: 1240,
          repeatPurchaseRate: 0.43
        },
        behaviors: [
          'Average 3.2 hours from ad click to purchase',
          '68% convert within same day',
          'Repeat buyers have 2.3 average orders',
          'Mobile-first journey: 89% discovery on mobile'
        ],
        insights: [
          'High repeat buyer rate (43%) indicates strong product-market fit',
          'Fast conversion times (3.2 hours) suggest strong intent',
          'LTV of $487 supports aggressive acquisition spending'
        ]
      }
    },
    dataPointsAnalyzed: 14287,
    analysisDepth: 'deep',
    patternType: 'obvious',
    urgency: 'high',
    projections: {
      ifImplemented: {
        spend: 37500,
        revenue: 186400,
        profit: 148900,
        roas: 4.97,
        conversions: 1220,
        timeframe: '30 days'
      },
      ifIgnored: {
        spend: 15000,
        revenue: 31500,
        profit: 16500,
        roas: 2.1,
        conversions: 280,
        timeframe: '30 days'
      }
    },
    methodology: 'Projections based on 30-day rolling performance data with 87% confidence interval. Assumes proportional budget reallocation to Women 25-34 demographic on Instagram Stories during peak evening hours. Historical data shows consistent performance with minimal variance (CV < 15%).'
  },
  recommendedRule: {
    name: 'Protect High-Performing Women 25-34 Segment',
    description: 'Automatically monitor and protect your Women 25-34 audience performance. If ROAS drops or costs increase, this rule will alert you and optionally reduce spend to prevent losses.',
    entity_type: 'ad_set',
    condition_logic: 'AND',
    check_frequency_minutes: 360,
    max_daily_actions: 2,
    require_approval: false,
    dry_run: false,
    conditions: [
      {
        metric_type: 'roas',
        operator: 'less_than',
        threshold_value: 5.0,
        time_window_days: 3
      },
      {
        metric_type: 'spend',
        operator: 'greater_than',
        threshold_value: 1500,
        time_window_days: 1
      },
      {
        metric_type: 'cpa',
        operator: 'greater_than',
        threshold_value: 25,
        time_window_days: 3
      }
    ],
    actions: [
      {
        action_type: 'reduce_budget',
        parameters: {
          reduction_percentage: 30,
          reason: 'Performance degradation detected'
        }
      },
      {
        action_type: 'send_alert',
        parameters: {
          channels: ['email', 'dashboard'],
          severity: 'medium'
        }
      }
    ]
  },
  estimatedImpact: {
    expectedRevenue: 154900,
    expectedProfit: 132400,
    expectedSavings: 8300,
    timeframeDays: 30,
    confidence: 'high',
    breakdown: 'Based on scaling Women 25-34 segment from $300/day to $1,250/day while maintaining 8.2x ROAS. Includes $8,300 savings from reducing spend on underperforming segments.'
  },
  directActions: [
    {
      type: 'increase_budget',
      label: 'Increase Budget +150%',
      description: 'Scale daily budget from $500/day to $1,250/day for Women 25-34 on Instagram Stories',
      parameters: {
        currentBudget: 500,
        newBudget: 1250,
        increasePercent: 150,
        targetDemographic: 'Women 25-34',
        targetPlacement: 'Instagram Stories',
        timeline: 'Implement gradually over 7 days',
        riskLevel: 'Low (proven segment)'
      }
    },
    {
      type: 'duplicate',
      label: 'Duplicate for Similar Demographics',
      description: 'Test Women 35-44 and 18-24 with same creative on Instagram Stories',
      parameters: {
        targetDemographics: ['Women 35-44', 'Women 18-24'],
        budget: 250,
        duration: 7
      }
    },
    {
      type: 'adjust_targeting',
      label: 'Expand to Similar Markets',
      description: 'Add Boston, Seattle, San Francisco with 20% of budget',
      parameters: {
        newLocations: ['Boston, MA', 'Seattle, WA', 'San Francisco, CA'],
        budgetPercent: 20
      }
    }
  ]
});
