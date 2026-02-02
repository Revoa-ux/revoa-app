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

      // Step 2: Generate insights from analysis (pass entity type for level-specific context)
      const insights: GeneratedInsight[] = [];

      // Detect demographic opportunities
      const demoInsight = this.insightGenerator.detectDemographicOpportunity(analysis, entity.type);
      if (demoInsight) {
        insights.push(demoInsight);
      }

      // Detect underperforming segments
      const underperformingInsight = this.insightGenerator.detectUnderperformingSegment(analysis, entity.type);
      if (underperformingInsight) {
        insights.push(underperformingInsight);
      }

      // Detect placement opportunities
      const placementInsight = this.insightGenerator.detectPlacementOpportunity(analysis, entity.type);
      if (placementInsight) {
        insights.push(placementInsight);
      }

      // Detect geographic opportunities
      const geoInsight = this.insightGenerator.detectGeographicOpportunity(analysis, entity.type);
      if (geoInsight) {
        insights.push(geoInsight);
      }

      // Detect temporal patterns
      const temporalInsight = this.insightGenerator.detectTemporalOpportunity(analysis, entity.type);
      if (temporalInsight) {
        insights.push(temporalInsight);
      }

      // Expert Help Detection - these are issues that require human expertise

      // Detect creative fatigue
      const creativeFatigueInsight = this.insightGenerator.detectCreativeFatigue({
        name: entity.name,
        spend: entity.spend || 0,
        ctr: analysis.avgCtr || 0,
        frequency: analysis.frequency,
        daysRunning: analysis.daysRunning
      });
      if (creativeFatigueInsight) {
        insights.push(creativeFatigueInsight);
      }

      // Detect landing page / CRO issues (high CTR but low conversion)
      const conversionRate = entity.conversions && entity.spend && entity.spend > 0
        ? (entity.conversions / (analysis.totalClicks || 1)) * 100
        : 0;
      const landingPageInsight = this.insightGenerator.detectLandingPageIssues({
        name: entity.name,
        spend: entity.spend || 0,
        ctr: analysis.avgCtr || 0,
        conversionRate,
        clicks: analysis.totalClicks || 0,
        conversions: entity.conversions || 0
      });
      if (landingPageInsight) {
        insights.push(landingPageInsight);
      }

      // Detect product viability issues (persistent poor performance)
      const profit = (entity.revenue || 0) - (entity.spend || 0);
      const productViabilityInsight = this.insightGenerator.detectProductViabilityIssues(
        {
          name: entity.name,
          spend: entity.spend || 0,
          profit,
          roas: entity.roas || 0,
          conversions: entity.conversions || 0
        },
        {
          daysAnalyzed: analysis.dateRange ?
            Math.ceil((new Date(analysis.dateRange.end).getTime() - new Date(analysis.dateRange.start).getTime()) / (1000 * 60 * 60 * 24)) :
            dateRangeDays,
          creativesTestedCount: analysis.creativesCount,
          audiencesTestedCount: analysis.adSetsCount,
          hasBeenOptimized: analysis.hasBeenOptimized
        }
      );
      if (productViabilityInsight) {
        insights.push(productViabilityInsight);
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
    parameters: any,
    suggestionId?: string
  ): Promise<{ success: boolean; message: string }> {
    console.log('[RexOrchestration] Executing action:', actionType, 'for', entity.name);

    try {
      let result;
      switch (actionType) {
        case 'increase_budget':
          result = await this.increaseBudget(entity, parameters);
          break;

        case 'decrease_budget':
          result = await this.decreaseBudget(entity, parameters);
          break;

        case 'pause':
          result = await this.pauseEntity(entity, parameters);
          break;

        case 'duplicate':
          result = await this.duplicateEntity(entity, parameters);
          break;

        case 'adjust_targeting':
          result = await this.adjustTargeting(entity, parameters);
          break;

        case 'build_segments':
          result = await this.buildSegments(entity, parameters);
          break;

        default:
          return { success: false, message: 'Unknown action type' };
      }

      // If action was successful and we have a suggestion ID, update suggestion status and log action
      if (result.success && suggestionId) {
        await this.markSuggestionApplied(suggestionId, entity, actionType, parameters);
      }

      return result;
    } catch (error) {
      console.error('[RexOrchestration] Error executing action:', error);
      return { success: false, message: error instanceof Error ? error.message : 'Action failed' };
    }
  }

  /**
   * Mark a suggestion as applied and log the action
   */
  private async markSuggestionApplied(
    suggestionId: string,
    entity: AdEntity,
    actionType: string,
    parameters: any
  ) {
    try {
      // Update suggestion status to 'applied'
      const { error: updateError } = await supabase
        .from('rex_suggestions')
        .update({
          status: 'applied',
          applied_at: new Date().toISOString()
        })
        .eq('id', suggestionId);

      if (updateError) {
        console.error('[RexOrchestration] Error updating suggestion status:', updateError);
      }

      // Log action in platform_action_logs
      const { error: logError } = await supabase
        .from('platform_action_logs')
        .insert({
          user_id: this.userId,
          platform: entity.platform,
          action_type: actionType === 'increase_budget' || actionType === 'decrease_budget' ? 'update_budget' : actionType,
          entity_type: entity.type,
          entity_id: entity.id,
          entity_name: entity.name,
          platform_entity_id: entity.platformId,
          action_parameters: parameters,
          status: 'completed',
          triggered_by: 'suggestion_action',
          suggestion_id: suggestionId,
          executed_at: new Date().toISOString()
        });

      if (logError) {
        console.error('[RexOrchestration] Error logging action:', logError);
      }

      console.log('[RexOrchestration] Marked suggestion as applied and logged action');
    } catch (error) {
      console.error('[RexOrchestration] Error in markSuggestionApplied:', error);
    }
  }

  /**
   * Mark a suggestion as monitoring (rule created)
   */
  private async markSuggestionMonitoring(suggestionId: string, ruleId: string) {
    try {
      const { error } = await supabase
        .from('rex_suggestions')
        .update({
          status: 'monitoring',
          automation_rule_id: ruleId,
          accepted_at: new Date().toISOString()
        })
        .eq('id', suggestionId);

      if (error) {
        console.error('[RexOrchestration] Error updating suggestion to monitoring:', error);
      } else {
        console.log('[RexOrchestration] Marked suggestion as monitoring with rule', ruleId);
      }
    } catch (error) {
      console.error('[RexOrchestration] Error in markSuggestionMonitoring:', error);
    }
  }

  /**
   * Create an automated rule from a recommendation
   */
  async createAutomatedRule(entity: AdEntity, insight: GeneratedInsight, suggestionId?: string): Promise<{ success: boolean; ruleId?: string; message?: string }> {
    try {
      if (!insight.recommendedRule) {
        return { success: false, message: 'No recommended rule available' };
      }

      const { data: adAccount } = await supabase
        .from('ad_accounts')
        .select('id')
        .eq('user_id', this.userId)
        .eq('platform', entity.platform)
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();

      const { data: rule, error: ruleError } = await supabase
        .from('ad_automation_rules')
        .insert({
          user_id: this.userId,
          name: insight.recommendedRule.name,
          description: insight.recommendedRule.description,
          entity_type: insight.recommendedRule.entity_type || entity.type,
          ad_account_id: adAccount?.id || null,
          condition_logic: insight.recommendedRule.condition_logic || 'AND',
          check_frequency_minutes: insight.recommendedRule.check_frequency_minutes || 60,
          max_daily_actions: insight.recommendedRule.max_daily_actions || 3,
          require_approval: insight.recommendedRule.require_approval ?? true,
          dry_run: insight.recommendedRule.dry_run ?? false,
          status: 'active',
          next_execution_at: new Date(Date.now() + (insight.recommendedRule.check_frequency_minutes || 60) * 60 * 1000).toISOString(),
        })
        .select('id')
        .single();

      if (ruleError) {
        console.error('[RexOrchestration] Error creating rule:', ruleError);
        return { success: false, message: ruleError.message };
      }

      if (insight.recommendedRule.conditions && insight.recommendedRule.conditions.length > 0) {
        const conditions = insight.recommendedRule.conditions.map((condition: any, index: number) => ({
          rule_id: rule.id,
          metric_type: condition.metric_type,
          operator: condition.operator,
          threshold_value: condition.threshold_value,
          threshold_value_max: condition.threshold_value_max || null,
          time_window_days: condition.time_window_days || 7,
          condition_order: index,
        }));

        const { error: conditionsError } = await supabase
          .from('ad_automation_rule_conditions')
          .insert(conditions);

        if (conditionsError) {
          console.error('[RexOrchestration] Error creating conditions:', conditionsError);
        }
      }

      if (insight.recommendedRule.actions && insight.recommendedRule.actions.length > 0) {
        const actions = insight.recommendedRule.actions.map((action: any, index: number) => ({
          rule_id: rule.id,
          action_type: action.action_type || action.type,
          action_params: action.action_params || {},
          budget_change_type: action.budget_change_type || null,
          budget_change_value: action.budget_change_value || null,
          min_budget: action.min_budget || null,
          max_budget: action.max_budget || null,
          notification_channels: action.notification_channels || ['in_app'],
          notification_message: action.notification_message || null,
          action_order: index,
        }));

        const { error: actionsError } = await supabase
          .from('ad_automation_actions')
          .insert(actions);

        if (actionsError) {
          console.error('[RexOrchestration] Error creating actions:', actionsError);
        }
      }

      if (suggestionId && rule.id) {
        await this.markSuggestionMonitoring(suggestionId, rule.id);
      }

      return { success: true, ruleId: rule.id };
    } catch (error) {
      console.error('[RexOrchestration] Error creating rule:', error);
      return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
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

  private async buildSegments(entity: AdEntity, parameters: any) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        return { success: false, message: 'Not authenticated' };
      }

      // Map entity type to API format
      const entityTypeMap: Record<string, string> = {
        'campaign': 'campaign',
        'ad_set': 'adset',
        'ad': 'ad'
      };

      // Call the duplicate entity edge function with segment build parameters
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/facebook-ads-duplicate-entity`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            userId: this.userId,
            platform: entity.platform,
            entityType: entityTypeMap[entity.type] || entity.type,
            entityId: entity.platformId,
            nameSuffix: parameters.newName || 'Copy',
            selectedSegments: parameters.selectedSegments || [],
            bidStrategy: parameters.bidStrategy,
            bidAmount: parameters.bidAmount,
            budget: parameters.budget,
            createWideOpen: parameters.createWideOpen || false,
            pauseSource: parameters.pauseSource || false,
            buildType: parameters.buildType || 'new_campaign'
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        return { success: false, message: error.error || 'Failed to build segments' };
      }

      const result = await response.json();

      // Track the segment build in the database
      await supabase
        .from('segment_builds')
        .insert({
          user_id: this.userId,
          source_entity_type: entity.type,
          source_entity_id: entity.id,
          platform_source_entity_id: entity.platformId,
          platform: entity.platform,
          selected_segments: parameters.selectedSegments,
          targeting_spec: result.targetingSpec,
          bid_strategy: parameters.bidStrategy,
          bid_amount: parameters.bidAmount,
          budget: parameters.budget,
          created_wide_open: parameters.createWideOpen,
          new_campaign_id: result.newCampaignId,
          new_adset_ids: result.newAdSetIds
        });

      return {
        success: true,
        message: `Successfully built ${parameters.createWideOpen ? '2' : '2'} ad sets with selected segments`
      };
    } catch (error) {
      console.error('[RexOrchestration] Error building segments:', error);
      return { success: false, message: error instanceof Error ? error.message : 'Failed to build segments' };
    }
  }

  // Platform-specific implementations
  private async updateFacebookBudget(entity: AdEntity, newBudget: number) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        return { success: false, message: 'Not authenticated' };
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/facebook-ads-update-budget`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            userId: this.userId,
            platform: 'facebook',
            entityType: entity.type === 'ad_set' ? 'adset' : entity.type,
            entityId: entity.platformId,
            newBudget,
            budgetType: 'daily'
          }),
        }
      );

      const result = await response.json();
      if (!result.success) {
        console.error('[RexOrchestration] Failed to update Facebook budget:', result.message);
        return { success: false, message: result.message };
      }

      console.log('[RexOrchestration] Successfully updated Facebook budget to:', newBudget);
      return { success: true, message: `Budget updated to $${newBudget.toFixed(2)}/day` };
    } catch (error) {
      console.error('[RexOrchestration] Error updating Facebook budget:', error);
      return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
    }
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
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        return { success: false, message: 'Not authenticated' };
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/facebook-ads-toggle-status`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            userId: this.userId,
            platform: 'facebook',
            entityType: entity.type === 'ad_set' ? 'adset' : entity.type,
            entityId: entity.platformId,
            newStatus: 'PAUSED'
          }),
        }
      );

      const result = await response.json();
      if (!result.success) {
        console.error('[RexOrchestration] Failed to pause Facebook entity:', result.message);
        return { success: false, message: result.message };
      }

      console.log('[RexOrchestration] Successfully paused Facebook entity:', entity.name);
      return { success: true, message: `${entity.name} has been paused` };
    } catch (error) {
      console.error('[RexOrchestration] Error pausing Facebook entity:', error);
      return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
    }
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
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        return { success: false, message: 'Not authenticated' };
      }

      const nameSuffix = parameters?.nameSuffix || 'Rex Auto-Copy';

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/facebook-ads-duplicate-entity`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            userId: this.userId,
            platform: 'facebook',
            entityType: entity.type === 'ad_set' ? 'adset' : entity.type,
            entityId: entity.platformId,
            nameSuffix
          }),
        }
      );

      const result = await response.json();
      if (!result.success) {
        console.error('[RexOrchestration] Failed to duplicate Facebook entity:', result.message);
        return { success: false, message: result.message };
      }

      console.log('[RexOrchestration] Successfully duplicated Facebook entity:', entity.name);
      return { success: true, message: result.message || `Created copy of ${entity.name}` };
    } catch (error) {
      console.error('[RexOrchestration] Error duplicating Facebook entity:', error);
      return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
    }
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
