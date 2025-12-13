import { supabase } from './supabase';
import { AdvancedRexIntelligence } from './advancedRexIntelligence';
import { SettingsDeviationService, type SettingsDeviation } from './settingsDeviationService';
import { BidStrategyRecommendationService, type BidStrategyRecommendation } from './bidStrategyRecommendationService';
import { PixelStrengthService, type PixelHealthScore } from './pixelStrengthService';
import { CampaignStructureIntelligenceEngine } from './campaignStructureIntelligence';
import type { CreateRexSuggestionParams, RexEntityType } from '@/types/rex';
import type { AdPlatform } from './recommendedBaselineConfig';

export interface UnifiedIntelligenceResult {
  suggestions: CreateRexSuggestionParams[];
  accountHealthSummary: AccountHealthSummary;
  pixelHealth: PixelHealthScore | null;
  deviationSummary: DeviationSummary;
  prioritizedActions: PrioritizedAction[];
}

export interface AccountHealthSummary {
  overallStatus: 'healthy' | 'attention_needed' | 'at_risk' | 'critical';
  paymentIssues: PaymentIssue[];
  accountQuality: string;
  riskFactors: string[];
}

export interface PaymentIssue {
  type: string;
  count: number;
  lastOccurred: string | null;
  impact: string;
}

export interface DeviationSummary {
  totalDeviations: number;
  criticalCount: number;
  warningCount: number;
  deviations: SettingsDeviation[];
}

export interface PrioritizedAction {
  rank: number;
  category: 'critical' | 'high' | 'medium' | 'low';
  source: 'deviation' | 'bid_strategy' | 'pixel' | 'payment' | 'performance';
  title: string;
  description: string;
  suggestion: CreateRexSuggestionParams;
}

export class UnifiedIntelligenceOrchestrator {
  private userId: string;
  private platform: AdPlatform;
  private advancedIntel: AdvancedRexIntelligence;
  private deviationService: SettingsDeviationService;
  private bidStrategyService: BidStrategyRecommendationService;
  private pixelService: PixelStrengthService;
  private campaignIntel: CampaignStructureIntelligenceEngine;

  constructor(userId: string, platform: AdPlatform = 'facebook') {
    this.userId = userId;
    this.platform = platform;
    this.advancedIntel = new AdvancedRexIntelligence(userId);
    this.deviationService = new SettingsDeviationService(userId, platform);
    this.bidStrategyService = new BidStrategyRecommendationService(userId, platform);
    this.pixelService = new PixelStrengthService(userId);
    this.campaignIntel = new CampaignStructureIntelligenceEngine(userId);
  }

  async generateUnifiedRecommendations(
    startDate: string,
    endDate: string
  ): Promise<UnifiedIntelligenceResult> {
    console.log('[UnifiedIntelligence] Starting comprehensive analysis...');

    const [
      deviations,
      bidStrategyRecs,
      pixelHealth,
      accountHealth,
    ] = await Promise.all([
      this.deviationService.detectAllDeviations(),
      this.bidStrategyService.analyzeForBidStrategyRecommendations(),
      this.pixelService.calculatePixelHealth(startDate, endDate),
      this.getAccountHealthSummary(),
    ]);

    console.log('[UnifiedIntelligence] Analysis complete:', {
      deviations: deviations.length,
      bidStrategyRecs: bidStrategyRecs.length,
      pixelHealthGrade: pixelHealth.healthGrade,
      accountStatus: accountHealth.overallStatus,
    });

    const allSuggestions: CreateRexSuggestionParams[] = [];

    const deviationSuggestions = this.convertDeviationsToSuggestions(deviations);
    allSuggestions.push(...deviationSuggestions);

    const bidStrategySuggestions = bidStrategyRecs.map(r => r.rexSuggestion);
    allSuggestions.push(...bidStrategySuggestions);

    const pixelSuggestions = await this.generatePixelSuggestions(pixelHealth);
    allSuggestions.push(...pixelSuggestions);

    const paymentSuggestions = this.generatePaymentSuggestions(accountHealth);
    allSuggestions.push(...paymentSuggestions);

    const adjustedSuggestions = this.adjustConfidenceByPixelStrength(allSuggestions, pixelHealth);

    const crossReferencedSuggestions = this.crossReferenceAndBoost(adjustedSuggestions, {
      deviations,
      bidStrategyRecs,
      pixelHealth,
      accountHealth,
    });

    const prioritizedActions = this.createPrioritizedActionList(crossReferencedSuggestions);

    const finalSuggestions = crossReferencedSuggestions
      .sort((a, b) => b.priority_score - a.priority_score)
      .slice(0, 10);

    return {
      suggestions: finalSuggestions,
      accountHealthSummary: accountHealth,
      pixelHealth,
      deviationSummary: {
        totalDeviations: deviations.length,
        criticalCount: deviations.filter(d => d.severity === 'critical').length,
        warningCount: deviations.filter(d => d.severity === 'warning').length,
        deviations,
      },
      prioritizedActions,
    };
  }

  private convertDeviationsToSuggestions(deviations: SettingsDeviation[]): CreateRexSuggestionParams[] {
    return deviations
      .filter(d => d.severity === 'critical' || d.severity === 'warning')
      .map(d => ({
        user_id: this.userId,
        entity_type: d.entityType as RexEntityType,
        entity_id: d.entityId,
        entity_name: d.entityName,
        platform: d.platform,
        suggestion_type: 'settings_deviation_warning',
        priority_score: d.severity === 'critical' ? 95 : 75,
        confidence_score: d.performanceCorrelation?.hasImpact ? 90 : 70,
        title: `Settings Deviation: ${this.formatSettingName(d.settingName)}`,
        message: `${d.entityName} has ${d.settingName} set to "${d.currentValue}" instead of recommended "${d.recommendedValue}". ${d.reasoning}`,
        reasoning: {
          triggeredBy: ['settings_baseline_deviation', d.settingName],
          metrics: {
            current_value: d.currentValue,
            recommended_value: d.recommendedValue,
            performance_impact: d.performanceCorrelation?.hasImpact,
            current_roas: d.performanceCorrelation?.roasAfter,
          },
          analysis: d.reasoning,
          riskLevel: d.severity === 'critical' ? 'high' : 'medium',
        },
      }));
  }

  private async generatePixelSuggestions(health: PixelHealthScore): Promise<CreateRexSuggestionParams[]> {
    const impact = await this.pixelService.getPixelStrengthImpact(
      health.calculatedForStart,
      health.calculatedForEnd
    );
    return impact.recommendations;
  }

  private generatePaymentSuggestions(accountHealth: AccountHealthSummary): CreateRexSuggestionParams[] {
    const suggestions: CreateRexSuggestionParams[] = [];

    for (const issue of accountHealth.paymentIssues) {
      if (issue.count > 0) {
        suggestions.push({
          user_id: this.userId,
          entity_type: 'account',
          entity_id: 'billing',
          entity_name: 'Billing & Payments',
          platform: this.platform,
          suggestion_type: 'payment_issue_warning',
          priority_score: issue.count >= 3 ? 92 : 78,
          confidence_score: 95,
          title: `Payment Issues Detected (${issue.count} failures)`,
          message: `${issue.count} payment failure(s) detected. ${issue.impact}`,
          reasoning: {
            triggeredBy: ['payment_failure_pattern', 'account_health_risk'],
            metrics: {
              failure_count: issue.count,
              last_failure: issue.lastOccurred,
            },
            analysis: 'Payment failures can pause campaigns, reset learning phases, and damage account standing with the ad platform.',
            riskLevel: issue.count >= 3 ? 'critical' : 'high',
          },
        });
      }
    }

    return suggestions;
  }

  private adjustConfidenceByPixelStrength(
    suggestions: CreateRexSuggestionParams[],
    pixelHealth: PixelHealthScore
  ): CreateRexSuggestionParams[] {
    let confidenceModifier = 1.0;

    if (pixelHealth.healthGrade === 'critical') {
      confidenceModifier = 0.6;
    } else if (pixelHealth.healthGrade === 'weak') {
      confidenceModifier = 0.75;
    } else if (pixelHealth.healthGrade === 'moderate') {
      confidenceModifier = 0.9;
    }

    return suggestions.map(s => {
      const isMetricsBased = s.suggestion_type?.includes('budget') ||
                            s.suggestion_type?.includes('scale') ||
                            s.suggestion_type?.includes('bid_strategy');

      if (isMetricsBased && confidenceModifier < 1.0) {
        const adjustedConfidence = Math.round(s.confidence_score * confidenceModifier);
        return {
          ...s,
          confidence_score: adjustedConfidence,
          reasoning: {
            ...s.reasoning,
            pixelHealthWarning: pixelHealth.healthGrade !== 'strong'
              ? `Note: Pixel health is ${pixelHealth.healthGrade} (${pixelHealth.attributionRate.toFixed(1)}% attribution). Actual metrics may be better than reported.`
              : undefined,
          },
        };
      }

      return s;
    });
  }

  private crossReferenceAndBoost(
    suggestions: CreateRexSuggestionParams[],
    context: {
      deviations: SettingsDeviation[];
      bidStrategyRecs: BidStrategyRecommendation[];
      pixelHealth: PixelHealthScore;
      accountHealth: AccountHealthSummary;
    }
  ): CreateRexSuggestionParams[] {
    const entityIssueCount: Record<string, number> = {};

    context.deviations.forEach(d => {
      entityIssueCount[d.entityId] = (entityIssueCount[d.entityId] || 0) + 1;
    });

    return suggestions.map(s => {
      let priorityBoost = 0;

      const issueCount = entityIssueCount[s.entity_id] || 0;
      if (issueCount > 1) {
        priorityBoost += Math.min(10, issueCount * 3);
      }

      if (context.accountHealth.overallStatus === 'critical' &&
          s.suggestion_type === 'payment_issue_warning') {
        priorityBoost += 5;
      }

      if (context.pixelHealth.healthGrade === 'critical' &&
          s.suggestion_type === 'pixel_strength_warning') {
        priorityBoost += 5;
      }

      return {
        ...s,
        priority_score: Math.min(100, s.priority_score + priorityBoost),
        reasoning: {
          ...s.reasoning,
          crossReferenced: priorityBoost > 0,
          multipleIssuesOnEntity: issueCount > 1 ? issueCount : undefined,
        },
      };
    });
  }

  private createPrioritizedActionList(suggestions: CreateRexSuggestionParams[]): PrioritizedAction[] {
    const sorted = [...suggestions].sort((a, b) => b.priority_score - a.priority_score);

    return sorted.slice(0, 10).map((s, index) => {
      let category: 'critical' | 'high' | 'medium' | 'low';
      if (s.priority_score >= 90) category = 'critical';
      else if (s.priority_score >= 75) category = 'high';
      else if (s.priority_score >= 50) category = 'medium';
      else category = 'low';

      let source: 'deviation' | 'bid_strategy' | 'pixel' | 'payment' | 'performance';
      if (s.suggestion_type?.includes('deviation')) source = 'deviation';
      else if (s.suggestion_type?.includes('bid_strategy') || s.suggestion_type?.includes('performance_goal')) source = 'bid_strategy';
      else if (s.suggestion_type?.includes('pixel')) source = 'pixel';
      else if (s.suggestion_type?.includes('payment')) source = 'payment';
      else source = 'performance';

      return {
        rank: index + 1,
        category,
        source,
        title: s.title || 'Optimization Opportunity',
        description: s.message || '',
        suggestion: s,
      };
    });
  }

  private async getAccountHealthSummary(): Promise<AccountHealthSummary> {
    try {
      const { data: healthData } = await supabase
        .from('ad_account_health')
        .select('*')
        .eq('user_id', this.userId)
        .maybeSingle();

      if (!healthData) {
        return {
          overallStatus: 'healthy',
          paymentIssues: [],
          accountQuality: 'unknown',
          riskFactors: [],
        };
      }

      const paymentIssues: PaymentIssue[] = [];
      if (healthData.payment_failures_count > 0) {
        paymentIssues.push({
          type: 'payment_failure',
          count: healthData.payment_failures_count,
          lastOccurred: healthData.last_payment_failure_at,
          impact: healthData.payment_failures_count >= 3
            ? 'Multiple failures can pause all campaigns and damage account standing'
            : 'Campaigns may have been paused temporarily',
        });
      }

      let overallStatus: 'healthy' | 'attention_needed' | 'at_risk' | 'critical' = 'healthy';
      if (healthData.risk_level === 'critical' || healthData.payment_failures_count >= 3) {
        overallStatus = 'critical';
      } else if (healthData.risk_level === 'high' || healthData.payment_failures_count >= 2) {
        overallStatus = 'at_risk';
      } else if (healthData.risk_level === 'medium' || healthData.payment_failures_count >= 1) {
        overallStatus = 'attention_needed';
      }

      return {
        overallStatus,
        paymentIssues,
        accountQuality: healthData.account_quality || 'unknown',
        riskFactors: healthData.risk_factors || [],
      };
    } catch (error) {
      console.error('[UnifiedIntelligence] Error getting account health:', error);
      return {
        overallStatus: 'healthy',
        paymentIssues: [],
        accountQuality: 'unknown',
        riskFactors: [],
      };
    }
  }

  private formatSettingName(setting: string): string {
    const mapping: Record<string, string> = {
      'objective': 'Campaign Objective',
      'is_cbo': 'Budget Optimization',
      'bid_strategy': 'Bid Strategy',
      'budget_type': 'Budget Type',
      'conversion_location': 'Conversion Location',
      'conversion_event': 'Conversion Event',
      'performance_goal': 'Performance Goal',
      'attribution_setting': 'Attribution Setting',
    };
    return mapping[setting] || setting.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }
}

export function createUnifiedIntelligenceOrchestrator(userId: string, platform: AdPlatform = 'facebook') {
  return new UnifiedIntelligenceOrchestrator(userId, platform);
}
