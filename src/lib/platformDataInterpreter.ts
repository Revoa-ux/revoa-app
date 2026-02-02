/**
 * Platform Data Interpreter
 *
 * PURPOSE: Use platform knowledge to UNDERSTAND what data means, NOT to make suggestions.
 *
 * This is the AI's "reading comprehension" - it knows HOW to read platform data correctly.
 * Examples:
 * - Sees 47 conversions → interprets as "3 away from learning phase exit"
 * - Sees frequency 4.2 → interprets as "creative fatigue risk"
 * - Sees audience 25K → interprets as "too small for conversion campaigns"
 *
 * YOUR BUSINESS LOGIC then uses these interpretations to make decisions.
 * Platform knowledge doesn't override your expertise - it helps you read the data correctly.
 */

import {
  getLearningPhaseKnowledge,
  getBudgetScalingKnowledge,
  getTargetingKnowledge,
  type AdPlatform,
  type OptimizationGoal
} from './platformKnowledgeBase';

// ============================================================================
// DATA INTERPRETATION (not suggestion generation)
// ============================================================================

export interface LearningPhaseInterpretation {
  status: 'LEARNING' | 'LEARNING_LIMITED' | 'ACTIVE' | 'UNKNOWN';
  conversions: number;
  conversionsNeeded: number;
  conversionsRemaining: number;
  daysInPhase: number;
  conversionVelocity: number; // per day
  estimatedDaysToExit: number;
  interpretation: string; // What this means
  risk: 'none' | 'low' | 'medium' | 'high' | 'critical';
}

export interface BudgetScalingInterpretation {
  currentBudget: number;
  safeIncreasePercent: number; // Max without reset
  timeWindow: string;
  interpretation: string;
}

export interface AudienceSizeInterpretation {
  size: number;
  minimumRecommended: number;
  interpretation: string;
  risk: 'none' | 'low' | 'medium' | 'high' | 'critical';
}

export interface FrequencyInterpretation {
  frequency: number;
  interpretation: string;
  fatigueRisk: 'none' | 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Platform Data Interpreter - Reads and understands platform metrics
 * Does NOT make suggestions - just interprets what the data means
 */
export class PlatformDataInterpreter {
  /**
   * Interpret learning phase status from raw metrics
   * Returns what the data MEANS, not what to DO
   */
  interpretLearningPhase(
    platform: AdPlatform,
    data: {
      conversions: number;
      daysSinceLaunchOrEdit: number;
      optimizationGoal?: OptimizationGoal;
    }
  ): LearningPhaseInterpretation {
    const knowledge = getLearningPhaseKnowledge(platform, data.optimizationGoal);
    const requirement = knowledge.conversionRequirements[data.optimizationGoal || 'PURCHASE'];

    if (!requirement) {
      return {
        status: 'UNKNOWN',
        conversions: data.conversions,
        conversionsNeeded: 50,
        conversionsRemaining: 50 - data.conversions,
        daysInPhase: data.daysSinceLaunchOrEdit,
        conversionVelocity: 0,
        estimatedDaysToExit: 999,
        interpretation: 'Unable to determine learning phase status',
        risk: 'none'
      };
    }

    const conversionsNeeded = requirement.conversionsNeeded;
    const conversionsRemaining = Math.max(0, conversionsNeeded - data.conversions);
    const conversionVelocity = data.conversions / Math.max(1, data.daysSinceLaunchOrEdit);
    const estimatedDaysToExit = conversionsRemaining > 0
      ? Math.ceil(conversionsRemaining / Math.max(0.1, conversionVelocity))
      : 0;

    // Determine status
    let status: 'LEARNING' | 'LEARNING_LIMITED' | 'ACTIVE' = 'LEARNING';
    if (data.conversions >= conversionsNeeded) {
      status = 'ACTIVE';
    } else if (data.daysSinceLaunchOrEdit > requirement.timeWindowDays && conversionVelocity < 7) {
      status = 'LEARNING_LIMITED';
    }

    // Interpret what this means
    let interpretation = '';
    let risk: 'none' | 'low' | 'medium' | 'high' | 'critical' = 'none';

    if (status === 'ACTIVE') {
      interpretation = `Exited learning phase. Algorithm understands customer profile and optimizes delivery efficiently.`;
      risk = 'none';
    } else if (status === 'LEARNING_LIMITED') {
      interpretation = `Learning Limited - not generating enough conversions to exit learning. Performance will remain suboptimal until fixed.`;
      risk = 'critical';
    } else {
      // In learning phase
      const progress = (data.conversions / conversionsNeeded) * 100;

      if (progress >= 90) {
        interpretation = `${conversionsRemaining} conversions away from learning phase exit. Estimated ${estimatedDaysToExit} days at current velocity.`;
        risk = 'low'; // Close to exit
      } else if (progress >= 70) {
        interpretation = `${Math.round(progress)}% through learning phase. ${conversionsRemaining} conversions needed.`;
        risk = 'medium';
      } else if (conversionVelocity >= 7) {
        interpretation = `Strong conversion velocity (${conversionVelocity.toFixed(1)}/day). Will exit learning in ${estimatedDaysToExit} days.`;
        risk = 'low'; // Good velocity
      } else if (conversionVelocity >= 3) {
        interpretation = `Moderate conversion velocity (${conversionVelocity.toFixed(1)}/day). ${estimatedDaysToExit} days to exit learning.`;
        risk = 'medium';
      } else {
        interpretation = `Low conversion velocity (${conversionVelocity.toFixed(1)}/day). Risk of Learning Limited status. ${estimatedDaysToExit}+ days to exit.`;
        risk = 'high';
      }
    }

    return {
      status,
      conversions: data.conversions,
      conversionsNeeded,
      conversionsRemaining,
      daysInPhase: data.daysSinceLaunchOrEdit,
      conversionVelocity,
      estimatedDaysToExit,
      interpretation,
      risk
    };
  }

  /**
   * Interpret budget scaling constraints
   * Returns safe thresholds based on platform rules
   */
  interpretBudgetScaling(
    platform: AdPlatform,
    currentBudget: number
  ): BudgetScalingInterpretation {
    const knowledge = getBudgetScalingKnowledge(platform);

    return {
      currentBudget,
      safeIncreasePercent: knowledge.maxIncreasePercentWithoutReset,
      timeWindow: `${knowledge.timeWindowHours} hours`,
      interpretation: `Safe to increase up to ${knowledge.maxIncreasePercentWithoutReset}% every ${knowledge.timeWindowHours} hours without resetting learning phase. Increases beyond this threshold will force algorithm to re-learn delivery patterns.`
    };
  }

  /**
   * Interpret audience size for given objective
   * Returns whether size is adequate
   */
  interpretAudienceSize(
    platform: AdPlatform,
    audienceSize: number,
    objective: string = 'CONVERSIONS'
  ): AudienceSizeInterpretation {
    const knowledge = getTargetingKnowledge(platform);
    const guidelines = knowledge.audienceSizeGuidelines.byObjective[objective];

    if (!guidelines) {
      return {
        size: audienceSize,
        minimumRecommended: 50000,
        interpretation: 'Audience size data not available for this objective',
        risk: 'none'
      };
    }

    let interpretation = '';
    let risk: 'none' | 'low' | 'medium' | 'high' | 'critical' = 'none';

    if (audienceSize >= guidelines.optimal) {
      interpretation = `Optimal audience size. Large enough for significant scaling and testing.`;
      risk = 'none';
    } else if (audienceSize >= guidelines.recommended) {
      interpretation = `Good audience size. Sufficient for consistent learning and moderate scaling.`;
      risk = 'low';
    } else if (audienceSize >= guidelines.minimum) {
      interpretation = `Minimum audience size. May experience Learning Limited if budget is too high. Limited scaling potential.`;
      risk = 'medium';
    } else {
      interpretation = `Audience too small (${audienceSize} vs ${guidelines.minimum} minimum). High risk of Learning Limited status and poor performance.`;
      risk = 'critical';
    }

    return {
      size: audienceSize,
      minimumRecommended: guidelines.recommended,
      interpretation,
      risk
    };
  }

  /**
   * Interpret ad frequency
   * Returns fatigue risk assessment
   */
  interpretFrequency(frequency: number): FrequencyInterpretation {
    let interpretation = '';
    let fatigueRisk: 'none' | 'low' | 'medium' | 'high' | 'critical' = 'none';

    if (frequency < 2) {
      interpretation = `Low frequency (${frequency.toFixed(2)}). Ads are fresh to audience. No fatigue concerns.`;
      fatigueRisk = 'none';
    } else if (frequency < 3) {
      interpretation = `Moderate frequency (${frequency.toFixed(2)}). Audience seeing ads 2-3 times. Healthy for engagement.`;
      fatigueRisk = 'low';
    } else if (frequency < 4) {
      interpretation = `Elevated frequency (${frequency.toFixed(2)}). Early signs of potential creative fatigue. Monitor engagement rates.`;
      fatigueRisk = 'medium';
    } else if (frequency < 5) {
      interpretation = `High frequency (${frequency.toFixed(2)}). Creative fatigue likely. Consider adding new creative or expanding audience.`;
      fatigueRisk = 'high';
    } else {
      interpretation = `Very high frequency (${frequency.toFixed(2)}). Severe creative fatigue. Users seeing same ads ${Math.floor(frequency)}+ times. Refresh creative immediately.`;
      fatigueRisk = 'critical';
    }

    return {
      frequency,
      interpretation,
      fatigueRisk
    };
  }

  /**
   * Interpret ROAS in context of learning phase
   * Returns expected vs actual performance
   */
  interpretROAS(
    roas: number,
    learningStatus: 'LEARNING' | 'LEARNING_LIMITED' | 'ACTIVE'
  ): {
    roas: number;
    interpretation: string;
    expectedRange: string;
  } {
    let interpretation = '';
    let expectedRange = '';

    if (learningStatus === 'ACTIVE') {
      expectedRange = 'Optimal performance';
      interpretation = `ROAS of ${roas.toFixed(2)}x represents true optimized performance. This is the baseline for scaling decisions.`;
    } else if (learningStatus === 'LEARNING') {
      expectedRange = '20-50% below post-learning';
      interpretation = `ROAS of ${roas.toFixed(2)}x during learning phase. Expected to improve 20-50% after exiting learning as algorithm refines delivery.`;
    } else {
      // LEARNING_LIMITED
      expectedRange = '30-50% below optimal';
      interpretation = `ROAS of ${roas.toFixed(2)}x while Learning Limited. Performance is suppressed due to insufficient conversion volume. Will improve if learning phase issues are resolved.`;
    }

    return {
      roas,
      interpretation,
      expectedRange
    };
  }

  /**
   * Get comprehensive campaign context interpretation
   * This gives YOUR business logic all the platform knowledge it needs
   */
  interpretCampaignContext(context: {
    platform: AdPlatform;
    conversions: number;
    daysSinceLaunchOrEdit: number;
    optimizationGoal?: OptimizationGoal;
    dailyBudget: number;
    audienceSize?: number;
    frequency?: number;
    roas: number;
    objective?: string;
  }): {
    learningPhase: LearningPhaseInterpretation;
    budgetScaling: BudgetScalingInterpretation;
    audienceSize?: AudienceSizeInterpretation;
    frequency?: FrequencyInterpretation;
    roas: ReturnType<typeof this.interpretROAS>;
    summary: string;
  } {
    const learningPhase = this.interpretLearningPhase(context.platform, {
      conversions: context.conversions,
      daysSinceLaunchOrEdit: context.daysSinceLaunchOrEdit,
      optimizationGoal: context.optimizationGoal
    });

    const budgetScaling = this.interpretBudgetScaling(context.platform, context.dailyBudget);

    const audienceSize = context.audienceSize
      ? this.interpretAudienceSize(context.platform, context.audienceSize, context.objective)
      : undefined;

    const frequency = context.frequency
      ? this.interpretFrequency(context.frequency)
      : undefined;

    const roas = this.interpretROAS(context.roas, learningPhase.status);

    // Create summary for YOUR business logic to use
    const summaryParts: string[] = [];
    summaryParts.push(`Learning Phase: ${learningPhase.interpretation}`);
    if (audienceSize && audienceSize.risk !== 'none') {
      summaryParts.push(`Audience: ${audienceSize.interpretation}`);
    }
    if (frequency && frequency.fatigueRisk !== 'none') {
      summaryParts.push(`Frequency: ${frequency.interpretation}`);
    }

    return {
      learningPhase,
      budgetScaling,
      audienceSize,
      frequency,
      roas,
      summary: summaryParts.join('. ')
    };
  }
}

// Export singleton
export const platformDataInterpreter = new PlatformDataInterpreter();
