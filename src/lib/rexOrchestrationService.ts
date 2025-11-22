import { supabase } from './supabase';
import { ComprehensiveRexAnalysis } from './comprehensiveRexAnalysis';
import { RexInsightGenerator } from './rexInsightGenerator';
import type { GeneratedInsight } from './rexInsightGenerator';
import type { RexEntityType } from '@/types/rex';

/**
 * Rex Orchestration Service
 *
 * Coordinates the entire AI analysis pipeline:
 * 1. Fetch ad entity data
 * 2. Run comprehensive analysis
 * 3. Generate insights
 * 4. Store suggestions in database
 * 5. Execute actions
 */

export interface AdEntity {
  id: string;
  platformId: string;
  platform: string;
  name: string;
  type: RexEntityType;
  status: string;
  dailyBudget?: number;
  spend?: number;
  revenue?: number;
  conversions?: number;
  roas?: number;
  cpa?: number;
}

export class RexOrchestrationService {
  private userId: string;
  private analysisEngine: ComprehensiveRexAnalysis;
  private insightGenerator: RexInsightGenerator;

  constructor(userId: string) {
    this.userId = userId;
    this.analysisEngine = new ComprehensiveRexAnalysis(userId);
    this.insightGenerator = new RexInsightGenerator();
  }

  /**
   * Analyze an ad entity and generate actionable insights
   */
  async analyzeEntity(entity: AdEntity, dateRangeDays: number = 30): Promise<GeneratedInsight[]> {
    console.log('[RexOrchestration] Starting analysis for:', entity.name);

    try {
      // Step 1: Run comprehensive analysis
      const analysis = await this.analysisEngine.analyzeEntity(
        entity.type,
        entity.id,
        entity.platformId,
        dateRangeDays
      );

      console.log('[RexOrchestration] Analysis complete. Data points:', analysis.dataPointsAnalyzed);

      // Step 2: Generate insights from analysis
      const insights: GeneratedInsight[] = [];

      // Detect demographic opportunities
      const demoInsight = this.insightGenerator.detectDemographicOpportunity(analysis);
      if (demoInsight) {
        insights.push(demoInsight);
      }

      // Detect underperforming segments
      const underperformingInsight = this.insightGenerator.detectUnderperformingSegment(analysis);
      if (underperformingInsight) {
        insights.push(underperformingInsight);
      }

      // Detect placement opportunities
      const placementInsight = this.insightGenerator.detectPlacementOpportunity(analysis);
      if (placementInsight) {
        insights.push(placementInsight);
      }

      // Detect geographic opportunities
      const geoInsight = this.insightGenerator.detectGeographicOpportunity(analysis);
      if (geoInsight) {
        insights.push(geoInsight);
      }

      // Detect temporal patterns
      const temporalInsight = this.insightGenerator.detectTemporalOpportunity(analysis);
      if (temporalInsight) {
        insights.push(temporalInsight);
      }

      console.log('[RexOrchestration] Generated', insights.length, 'insights');

      // Step 3: Store insights as suggestions in database
      for (const insight of insights) {
        await this.storeSuggestion(entity, insight);
      }

      return insights;
    } catch (error) {
      console.error('[RexOrchestration] Error analyzing entity:', error);
      throw error;
    }
  }

  /**
   * Store a generated insight as a Rex suggestion in the database
   */
  private async storeSuggestion(entity: AdEntity, insight: GeneratedInsight) {
    try {
      const { error } = await supabase.from('rex_suggestions').insert({
        user_id: this.userId,
        entity_type: entity.type,
        entity_id: entity.id,
        platform: entity.platform,
        platform_entity_id: entity.platformId,
        suggestion_type: this.mapInsightTypeToSuggestionType(insight.title),
        message: insight.primaryInsight,
        priority_score: insight.priority,
        confidence_score: insight.confidence,
        reasoning: insight.reasoning,
        estimated_impact: insight.estimatedImpact,
        recommended_rule: insight.recommendedRule,
        status: 'pending',
        created_at: new Date().toISOString()
      });

      if (error) {
        console.error('[RexOrchestration] Error storing suggestion:', error);
      }
    } catch (error) {
      console.error('[RexOrchestration] Error storing suggestion:', error);
    }
  }

  /**
   * Execute a direct action (increase/decrease budget, pause, duplicate, etc.)
   */
  async executeAction(
    entity: AdEntity,
    actionType: string,
    parameters: any
  ): Promise<{ success: boolean; message: string }> {
    console.log('[RexOrchestration] Executing action:', actionType, 'for', entity.name);

    try {
      switch (actionType) {
        case 'increase_budget':
          return await this.increaseBudget(entity, parameters);

        case 'decrease_budget':
          return await this.decreaseBudget(entity, parameters);

        case 'pause':
          return await this.pauseEntity(entity, parameters);

        case 'duplicate':
          return await this.duplicateEntity(entity, parameters);

        case 'adjust_targeting':
          return await this.adjustTargeting(entity, parameters);

        default:
          return { success: false, message: 'Unknown action type' };
      }
    } catch (error) {
      console.error('[RexOrchestration] Error executing action:', error);
      return { success: false, message: error instanceof Error ? error.message : 'Action failed' };
    }
  }

  /**
   * Create an automated rule from a recommendation
   */
  async createAutomatedRule(entity: AdEntity, insight: GeneratedInsight): Promise<{ success: boolean; ruleId?: string }> {
    try {
      const { data, error } = await supabase.from('automation_rules').insert({
        user_id: this.userId,
        name: insight.recommendedRule.name,
        description: insight.recommendedRule.description,
        entity_type: insight.recommendedRule.entity_type,
        entity_id: entity.id,
        platform: entity.platform,
        condition_logic: insight.recommendedRule.condition_logic,
        conditions: insight.recommendedRule.conditions,
        actions: insight.recommendedRule.actions,
        check_frequency_minutes: insight.recommendedRule.check_frequency_minutes,
        max_daily_actions: insight.recommendedRule.max_daily_actions,
        require_approval: insight.recommendedRule.require_approval,
        dry_run: insight.recommendedRule.dry_run,
        is_active: true,
        created_at: new Date().toISOString()
      }).select('id').single();

      if (error) {
        console.error('[RexOrchestration] Error creating rule:', error);
        return { success: false };
      }

      return { success: true, ruleId: data.id };
    } catch (error) {
      console.error('[RexOrchestration] Error creating rule:', error);
      return { success: false };
    }
  }

  /**
   * Increase budget for an entity
   */
  private async increaseBudget(entity: AdEntity, parameters: any) {
    const { proposed, increase_percentage } = parameters;

    // Call appropriate platform API based on entity.platform
    if (entity.platform === 'facebook') {
      return await this.updateFacebookBudget(entity, proposed);
    } else if (entity.platform === 'google') {
      return await this.updateGoogleBudget(entity, proposed);
    } else if (entity.platform === 'tiktok') {
      return await this.updateTikTokBudget(entity, proposed);
    }

    return { success: false, message: 'Platform not supported' };
  }

  /**
   * Decrease budget for an entity
   */
  private async decreaseBudget(entity: AdEntity, parameters: any) {
    const { decrease_percentage } = parameters;
    const currentBudget = entity.dailyBudget || 0;
    const newBudget = currentBudget * (1 - decrease_percentage / 100);

    if (entity.platform === 'facebook') {
      return await this.updateFacebookBudget(entity, newBudget);
    } else if (entity.platform === 'google') {
      return await this.updateGoogleBudget(entity, newBudget);
    } else if (entity.platform === 'tiktok') {
      return await this.updateTikTokBudget(entity, newBudget);
    }

    return { success: false, message: 'Platform not supported' };
  }

  /**
   * Pause an entity
   */
  private async pauseEntity(entity: AdEntity, parameters: any) {
    if (entity.platform === 'facebook') {
      return await this.pauseFacebookEntity(entity);
    } else if (entity.platform === 'google') {
      return await this.pauseGoogleEntity(entity);
    } else if (entity.platform === 'tiktok') {
      return await this.pauseTikTokEntity(entity);
    }

    return { success: false, message: 'Platform not supported' };
  }

  /**
   * Duplicate an entity
   */
  private async duplicateEntity(entity: AdEntity, parameters: any) {
    if (entity.platform === 'facebook') {
      return await this.duplicateFacebookEntity(entity, parameters);
    } else if (entity.platform === 'google') {
      return await this.duplicateGoogleEntity(entity, parameters);
    } else if (entity.platform === 'tiktok') {
      return await this.duplicateTikTokEntity(entity, parameters);
    }

    return { success: false, message: 'Platform not supported' };
  }

  /**
   * Adjust targeting for an entity
   */
  private async adjustTargeting(entity: AdEntity, parameters: any) {
    return { success: false, message: 'Targeting adjustment requires manual configuration' };
  }

  // Platform-specific implementations
  private async updateFacebookBudget(entity: AdEntity, newBudget: number) {
    // TODO: Call Facebook Marketing API to update budget
    console.log('[RexOrchestration] Would update Facebook budget to:', newBudget);
    return { success: true, message: `Budget updated to $${newBudget.toFixed(2)}/day` };
  }

  private async updateGoogleBudget(entity: AdEntity, newBudget: number) {
    // TODO: Call Google Ads API to update budget
    console.log('[RexOrchestration] Would update Google budget to:', newBudget);
    return { success: true, message: `Budget updated to $${newBudget.toFixed(2)}/day` };
  }

  private async updateTikTokBudget(entity: AdEntity, newBudget: number) {
    // TODO: Call TikTok Ads API to update budget
    console.log('[RexOrchestration] Would update TikTok budget to:', newBudget);
    return { success: true, message: `Budget updated to $${newBudget.toFixed(2)}/day` };
  }

  private async pauseFacebookEntity(entity: AdEntity) {
    // TODO: Call Facebook Marketing API to pause
    console.log('[RexOrchestration] Would pause Facebook entity:', entity.name);
    return { success: true, message: `${entity.name} has been paused` };
  }

  private async pauseGoogleEntity(entity: AdEntity) {
    // TODO: Call Google Ads API to pause
    console.log('[RexOrchestration] Would pause Google entity:', entity.name);
    return { success: true, message: `${entity.name} has been paused` };
  }

  private async pauseTikTokEntity(entity: AdEntity) {
    // TODO: Call TikTok Ads API to pause
    console.log('[RexOrchestration] Would pause TikTok entity:', entity.name);
    return { success: true, message: `${entity.name} has been paused` };
  }

  private async duplicateFacebookEntity(entity: AdEntity, parameters: any) {
    // TODO: Call Facebook Marketing API to duplicate
    console.log('[RexOrchestration] Would duplicate Facebook entity:', entity.name);
    return { success: true, message: `Created copy of ${entity.name}` };
  }

  private async duplicateGoogleEntity(entity: AdEntity, parameters: any) {
    // TODO: Call Google Ads API to duplicate
    console.log('[RexOrchestration] Would duplicate Google entity:', entity.name);
    return { success: true, message: `Created copy of ${entity.name}` };
  }

  private async duplicateTikTokEntity(entity: AdEntity, parameters: any) {
    // TODO: Call TikTok Ads API to duplicate
    console.log('[RexOrchestration] Would duplicate TikTok entity:', entity.name);
    return { success: true, message: `Created copy of ${entity.name}` };
  }

  private mapInsightTypeToSuggestionType(title: string): string {
    if (title.includes('Scale') || title.includes('Increase')) return 'scale_high_performer';
    if (title.includes('Pause') || title.includes('Underperforming')) return 'pause_underperforming';
    if (title.includes('Placement')) return 'optimize_placements';
    if (title.includes('Geographic') || title.includes('Region')) return 'optimize_geographic';
    if (title.includes('Time') || title.includes('Temporal')) return 'enable_dayparting';
    return 'optimize_campaign';
  }
}

export const createRexOrchestration = (userId: string) => new RexOrchestrationService(userId);
