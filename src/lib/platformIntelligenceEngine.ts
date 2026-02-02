/**
 * Platform Intelligence Engine
 *
 * This engine REASONS over platform knowledge to provide expert-level recommendations.
 * It combines:
 * 1. Platform knowledge (what's possible/optimal on each platform)
 * 2. Campaign context (current state, metrics, history)
 * 3. Business logic (profit goals, risk tolerance)
 *
 * The result: Recommendations that are both platform-aware and business-smart.
 */

import {
  queryPlatformKnowledge,
  getLearningPhaseKnowledge,
  getBudgetScalingKnowledge,
  getTargetingKnowledge,
  type AdPlatform,
  type CampaignObjective,
  type OptimizationGoal
} from './platformKnowledgeBase';

import {
  getPlatformConstraints,
  getLearningPhaseRules,
  getBudgetScalingRules,
  calculateSafeBudgetIncrease,
  isInLearningPhase,
  willResetLearningPhase
} from './platformConstraints';

// ============================================================================
// TYPES
// ============================================================================

export interface CampaignContext {
  platform: AdPlatform;
  objective?: CampaignObjective;
  optimizationGoal?: OptimizationGoal;

  // Current state
  dailyBudget: number;
  lifetimeBudget?: number;
  totalSpend: number;
  totalRevenue: number;
  totalConversions: number;
  roas: number;
  cpa: number;

  // Learning phase info
  daysSinceLaunchOrReset?: number;
  conversionsInLast7Days?: number;
  learningStatus?: 'LEARNING' | 'LEARNING_LIMITED' | 'ACTIVE';

  // Audience info
  estimatedAudienceSize?: number;
  actualReach?: number;
  frequency?: number;

  // Campaign settings
  isCBO?: boolean;
  isAdvantagePlus?: boolean;
  biddingStrategy?: string;
}

export interface BusinessGoals {
  targetROAS?: number;
  maxCPA?: number;
  minProfitMargin?: number;
  riskTolerance: 'conservative' | 'moderate' | 'aggressive';
  scalingGoals?: 'test' | 'scale' | 'maintain';
}

export interface IntelligentRecommendation {
  action: string;
  reasoning: {
    platformKnowledge: string[]; // What platform rules/best practices apply
    currentAnalysis: string[];   // Analysis of current situation
    businessAlignment: string[];  // How this aligns with business goals
    risks: string[];             // What could go wrong
    expectedOutcome: string;     // What to expect
  };
  priority: 'critical' | 'high' | 'medium' | 'low';
  confidence: number; // 0-100
  implementation: {
    steps: string[];
    timeline: string;
    monitoring: string[];
  };
}

// ============================================================================
// PLATFORM INTELLIGENCE ENGINE
// ============================================================================

export class PlatformIntelligenceEngine {
  /**
   * Should we scale this campaign's budget?
   */
  shouldScaleBudget(
    campaign: CampaignContext,
    goals: BusinessGoals,
    desiredIncrease: number // percentage
  ): IntelligentRecommendation {
    const platformKnowledge: string[] = [];
    const currentAnalysis: string[] = [];
    const businessAlignment: string[] = [];
    const risks: string[] = [];

    // Get comprehensive platform knowledge
    const learningKnowledge = getLearningPhaseKnowledge(campaign.platform, campaign.optimizationGoal);
    const budgetKnowledge = getBudgetScalingKnowledge(campaign.platform);

    // Analyze learning phase status
    if (campaign.learningStatus === 'LEARNING') {
      const convReq = learningKnowledge.conversionRequirements[campaign.optimizationGoal || 'PURCHASE'];

      if (convReq && campaign.conversionsInLast7Days) {
        const progress = (campaign.conversionsInLast7Days / convReq.conversionsNeeded) * 100;

        platformKnowledge.push(
          `Platform Knowledge: ${campaign.platform} requires ${convReq.conversionsNeeded} ${campaign.optimizationGoal || 'purchase'} events in 7 days to exit learning phase.`
        );

        currentAnalysis.push(
          `Current Status: ${campaign.conversionsInLast7Days} conversions (${progress.toFixed(1)}% toward learning phase exit).`
        );

        if (progress >= 90) {
          currentAnalysis.push(
            `You're ${convReq.conversionsNeeded - campaign.conversionsInLast7Days} conversions away from exiting learning phase. This should happen within 24-48 hours at current velocity.`
          );

          platformKnowledge.push(
            `Expert Insight: Budget increases over 20% will RESET learning phase, forcing you to get 50 new conversions. This would cost you an estimated ${this.estimateLearningPhaseCost(campaign)} in wasted spend.`
          );

          return {
            action: 'WAIT',
            reasoning: {
              platformKnowledge,
              currentAnalysis,
              businessAlignment: [
                'Waiting 24-48 hours will save you money and improve results.',
                `Once learning phase exits, ROAS typically improves ${learningKnowledge.states.LEARNING.expectedPerformance}`
              ],
              risks: [
                'Opportunity cost of not scaling immediately',
                'Performance could degrade before reaching 50 conversions'
              ],
              expectedOutcome: `In 24-48 hours you'll exit learning phase with improved efficiency, THEN you can safely scale ${desiredIncrease}% without reset.`
            },
            priority: 'high',
            confidence: 95,
            implementation: {
              steps: [
                'Wait for learning phase to exit (monitor for 50 conversions)',
                `After exit confirmed, increase budget by ${desiredIncrease <= 20 ? desiredIncrease : 15}% as first step`,
                'Monitor ROAS for 24 hours',
                'Continue scaling in 15-20% increments every 3-4 days'
              ],
              timeline: '2-3 days to first scale, then weekly increments',
              monitoring: [
                'Check learning status daily',
                'Track conversion velocity',
                'Monitor ROAS changes',
                'Watch for Learning Limited status'
              ]
            }
          };
        }
      }
    }

    // Check if scaling is safe
    const scalingRules = getBudgetScalingRules(campaign.platform);
    const isSafeIncrease = desiredIncrease <= (scalingRules?.maxIncreasePercentWithoutReset || 20);

    if (!isSafeIncrease && scalingRules) {
      const safeScaling = calculateSafeBudgetIncrease(
        campaign.platform,
        campaign.dailyBudget,
        campaign.dailyBudget * (1 + desiredIncrease / 100)
      );

      platformKnowledge.push(
        `Platform Rule: ${campaign.platform} allows up to ${scalingRules.maxIncreasePercentWithoutReset}% budget increases every ${scalingRules.timeWindowHours} hours without resetting learning phase.`
      );

      platformKnowledge.push(
        `Your ${desiredIncrease}% increase exceeds safe threshold. This will RESET learning phase.`
      );

      if (safeScaling.recommendedSteps.length > 1) {
        return {
          action: 'SCALE_GRADUALLY',
          reasoning: {
            platformKnowledge,
            currentAnalysis: [
              `Current budget: $${campaign.dailyBudget}/day`,
              `Desired budget: $${(campaign.dailyBudget * (1 + desiredIncrease / 100)).toFixed(2)}/day`,
              `This requires ${safeScaling.recommendedSteps.length} steps to avoid learning phase reset`
            ],
            businessAlignment: [
              goals.riskTolerance === 'aggressive'
                ? 'Your aggressive risk tolerance suggests you may accept learning phase reset for faster scaling'
                : 'Gradual scaling protects your current performance while reaching target budget'
            ],
            risks: [
              'Scaling too fast: Reset learning, lose 1-2 weeks of optimized delivery',
              'Scaling too slow: Miss scaling opportunities if demand is high'
            ],
            expectedOutcome: `Reach target budget in ${safeScaling.recommendedSteps.length * 3} days without performance degradation.`
          },
          priority: 'high',
          confidence: 90,
          implementation: {
            steps: safeScaling.recommendedSteps.map((step, idx) =>
              `Step ${idx + 1} (${step.date}): Increase to $${step.amount}/day`
            ),
            timeline: `${safeScaling.recommendedSteps.length * 3} days to reach target`,
            monitoring: [
              'Monitor ROAS after each increase',
              'Check for learning phase reset',
              'Watch CPA trends',
              'Pause scaling if ROAS drops 20%+'
            ]
          }
        };
      }
    }

    // Check business goals alignment
    if (goals.targetROAS && campaign.roas < goals.targetROAS) {
      businessAlignment.push(
        `Current ROAS (${campaign.roas.toFixed(2)}x) is below target (${goals.targetROAS}x). Scaling will likely worsen this.`
      );

      risks.push(
        'Scaling underperforming campaigns increases spend without improving efficiency',
        'May dig deeper hole before identifying root cause'
      );

      return {
        action: 'OPTIMIZE_FIRST',
        reasoning: {
          platformKnowledge: [
            'Platform best practice: Optimize for efficiency before scaling spend'
          ],
          currentAnalysis: [
            `ROAS is ${((goals.targetROAS - campaign.roas) / goals.targetROAS * 100).toFixed(1)}% below target`,
            'Scaling increases losses without fixing underlying issues'
          ],
          businessAlignment,
          risks,
          expectedOutcome: 'Improve ROAS first through targeting, creative, or offer optimization. Then scale from stronger position.'
        },
        priority: 'critical',
        confidence: 95,
        implementation: {
          steps: [
            'Pause budget scaling',
            'Analyze funnel for drop-off points',
            'Review targeting for underperforming segments',
            'Test new creative angles',
            'Once ROAS stabilizes above target, resume scaling'
          ],
          timeline: '1-2 weeks to optimize, then scale',
          monitoring: [
            'Daily ROAS tracking',
            'Funnel conversion rates',
            'Audience performance',
            'Creative engagement metrics'
          ]
        }
      };
    }

    // If all checks pass, approve scaling
    return {
      action: 'SCALE_APPROVED',
      reasoning: {
        platformKnowledge: [
          `Safe to scale: ${desiredIncrease}% is within ${scalingRules?.maxIncreasePercentWithoutReset || 20}% threshold`,
          'Will not reset learning phase',
          learningKnowledge.states.ACTIVE?.scalingOpportunities || 'Campaign ready for scaling'
        ],
        currentAnalysis: [
          `Strong performance: ${campaign.roas.toFixed(2)}x ROAS, $${campaign.cpa.toFixed(2)} CPA`,
          `${campaign.learningStatus === 'ACTIVE' ? 'Learning phase complete' : 'Ready to scale'}`,
          `${campaign.totalConversions} conversions demonstrates consistent performance`
        ],
        businessAlignment: [
          goals.targetROAS ? `Exceeds target ROAS of ${goals.targetROAS}x` : 'Meets profitability goals',
          `Risk tolerance: ${goals.riskTolerance} - scaling aligns with growth objectives`
        ],
        risks: [
          'CPA may increase 10-20% as you reach broader audience',
          'Monitor for audience saturation (frequency >3)',
          'Have backup creatives ready if fatigue sets in'
        ],
        expectedOutcome: `Budget increases to $${(campaign.dailyBudget * (1 + desiredIncrease / 100)).toFixed(2)}/day. Expect ROAS to maintain within 10-15% of current for first 2x scale.`
      },
      priority: 'high',
      confidence: 85,
      implementation: {
        steps: [
          `Increase budget to $${(campaign.dailyBudget * (1 + desiredIncrease / 100)).toFixed(2)}/day`,
          'Monitor performance for 72 hours',
          'If ROAS stable, plan next 15-20% increase in 3-4 days',
          'If ROAS drops 20%+, reduce budget to previous level'
        ],
        timeline: 'Immediate',
        monitoring: [
          'Daily ROAS tracking',
          'CPA trends',
          'Frequency metrics',
          'Audience saturation signals'
        ]
      }
    };
  }

  /**
   * Should we change optimization goal?
   */
  canChangeOptimizationGoal(
    campaign: CampaignContext,
    newGoal: OptimizationGoal
  ): IntelligentRecommendation {
    const constraints = getPlatformConstraints(campaign.platform);
    const optimizationConstraint = constraints['optimization_goal'];

    if (!optimizationConstraint.canEditAfterLaunch) {
      return {
        action: 'NOT_POSSIBLE',
        reasoning: {
          platformKnowledge: [
            `Platform Constraint: ${optimizationConstraint.reason}`,
            'This is a hard platform limitation, not a recommendation.'
          ],
          currentAnalysis: [
            `Current optimization goal: ${campaign.optimizationGoal}`,
            `Desired goal: ${newGoal}`
          ],
          businessAlignment: [],
          risks: [],
          expectedOutcome: 'Cannot change optimization goal on existing campaign.'
        },
        priority: 'critical',
        confidence: 100,
        implementation: {
          steps: [
            optimizationConstraint.alternativeAction || 'Create new campaign with desired optimization goal',
            'Launch with same budget as current campaign',
            'Let run for 3-5 days to exit learning phase',
            'If new campaign performs better, pause old campaign',
            'If old campaign better, pause new one'
          ],
          timeline: '1-2 weeks for proper testing',
          monitoring: [
            'Compare CPA between campaigns',
            'Compare ROAS',
            'Check learning phase progress',
            'Monitor total account spend'
          ]
        }
      };
    }

    return {
      action: 'UNEXPECTED',
      reasoning: {
        platformKnowledge: ['Platform allows this change (unexpected)'],
        currentAnalysis: [],
        businessAlignment: [],
        risks: [],
        expectedOutcome: 'Proceed with caution'
      },
      priority: 'medium',
      confidence: 50,
      implementation: { steps: [], timeline: '', monitoring: [] }
    };
  }

  /**
   * Estimate cost of going through learning phase
   */
  private estimateLearningPhaseCost(campaign: CampaignContext): string {
    const learningPhaseKnowledge = getLearningPhaseKnowledge(campaign.platform);
    const convReq = learningPhaseKnowledge.conversionRequirements[campaign.optimizationGoal || 'PURCHASE'];

    if (!convReq) return '$unknown';

    // During learning, CPA is typically 30-50% higher
    const learningCPA = campaign.cpa * 1.4; // 40% higher
    const costToExitLearning = learningCPA * convReq.conversionsNeeded;

    return `$${costToExitLearning.toFixed(2)}`;
  }

  /**
   * Get expert recommendation for any campaign decision
   */
  getRecommendation(
    decision: 'scale_budget' | 'change_targeting' | 'switch_to_cbo' | 'change_optimization_goal' | 'pause_campaign',
    campaign: CampaignContext,
    goals: BusinessGoals,
    params?: any
  ): IntelligentRecommendation {
    switch (decision) {
      case 'scale_budget':
        return this.shouldScaleBudget(campaign, goals, params?.increasePercent || 20);

      case 'change_optimization_goal':
        return this.canChangeOptimizationGoal(campaign, params?.newGoal);

      // Add more decision types as needed

      default:
        throw new Error(`Decision type ${decision} not yet implemented`);
    }
  }
}

// Export singleton
export const platformIntelligence = new PlatformIntelligenceEngine();
