import { supabase } from './supabase';
import type { AdPlatform, PlatformActionLog, CrossPlatformAction } from '@/types/crossPlatform';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

export interface ActionResult {
  success: boolean;
  actionLogId: string;
  message: string;
  data?: Record<string, unknown>;
  error?: string;
}

export interface DryRunResult {
  wouldSucceed: boolean;
  message: string;
  preview: {
    entityName: string;
    currentValue: unknown;
    newValue: unknown;
    estimatedImpact: number;
  };
}

export class PlatformActionService {
  private async getAuthHeaders() {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;

    if (!token) {
      throw new Error('Not authenticated');
    }

    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
    };
  }

  private async createActionLog(
    userId: string,
    action: CrossPlatformAction,
    triggeredBy: 'user_manual' | 'suggestion_action' | 'automation_rule',
    suggestionId?: string
  ): Promise<string> {
    const { data, error } = await supabase
      .from('platform_action_logs')
      .insert([{
        user_id: userId,
        platform: action.platform,
        action_type: action.type,
        entity_type: action.entityType,
        entity_id: action.entityId,
        entity_name: action.entityName,
        action_parameters: action.parameters,
        status: 'pending',
        triggered_by: triggeredBy,
        suggestion_id: suggestionId
      }])
      .select('id')
      .single();

    if (error) throw error;
    return data.id;
  }

  private async updateActionLog(
    actionLogId: string,
    updates: Partial<PlatformActionLog>
  ): Promise<void> {
    const { error } = await supabase
      .from('platform_action_logs')
      .update(updates)
      .eq('id', actionLogId);

    if (error) throw error;
  }

  async updateBudget(
    userId: string,
    platform: AdPlatform,
    entityType: 'campaign' | 'ad_set',
    entityId: string,
    newBudget: number,
    budgetType: 'daily' | 'lifetime',
    triggeredBy: 'user_manual' | 'suggestion_action' | 'automation_rule' = 'user_manual',
    suggestionId?: string
  ): Promise<ActionResult> {
    const action: CrossPlatformAction = {
      id: `budget-${Date.now()}`,
      type: 'update_budget',
      platform,
      entityType,
      entityId,
      entityName: '',
      description: `Update ${budgetType} budget to $${newBudget}`,
      parameters: { newBudget, budgetType },
      estimatedImpact: 0,
      requiresConfirmation: true
    };

    const actionLogId = await this.createActionLog(userId, action, triggeredBy, suggestionId);

    try {
      await this.updateActionLog(actionLogId, { status: 'executing' });

      const headers = await this.getAuthHeaders();
      const endpoint = `${SUPABASE_URL}/functions/v1/facebook-ads-update-budget`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          userId,
          entityType,
          entityId,
          newBudget,
          budgetType,
          platform
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to update budget');
      }

      const result = await response.json();

      await this.updateActionLog(actionLogId, {
        status: 'completed',
        executed_at: new Date().toISOString(),
        new_state: { budget: newBudget, budgetType }
      });

      return {
        success: true,
        actionLogId,
        message: `Successfully updated ${budgetType} budget to $${newBudget}`,
        data: result
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await this.updateActionLog(actionLogId, {
        status: 'failed',
        error_message: errorMessage
      });

      return {
        success: false,
        actionLogId,
        message: 'Failed to update budget',
        error: errorMessage
      };
    }
  }

  async toggleEntityStatus(
    userId: string,
    platform: AdPlatform,
    entityType: 'campaign' | 'ad_set' | 'ad',
    entityId: string,
    enable: boolean,
    triggeredBy: 'user_manual' | 'suggestion_action' | 'automation_rule' = 'user_manual',
    suggestionId?: string
  ): Promise<ActionResult> {
    const action: CrossPlatformAction = {
      id: `toggle-${Date.now()}`,
      type: enable ? 'enable_entity' : 'pause_entity',
      platform,
      entityType,
      entityId,
      entityName: '',
      description: `${enable ? 'Enable' : 'Pause'} ${entityType}`,
      parameters: { enable },
      estimatedImpact: 0,
      requiresConfirmation: true
    };

    const actionLogId = await this.createActionLog(userId, action, triggeredBy, suggestionId);

    try {
      await this.updateActionLog(actionLogId, { status: 'executing' });

      const headers = await this.getAuthHeaders();
      const endpoint = `${SUPABASE_URL}/functions/v1/facebook-ads-toggle-status`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          entityType,
          entityId,
          enable,
          platform
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `Failed to ${enable ? 'enable' : 'pause'} entity`);
      }

      const result = await response.json();

      await this.updateActionLog(actionLogId, {
        status: 'completed',
        executed_at: new Date().toISOString(),
        new_state: { status: enable ? 'ACTIVE' : 'PAUSED' }
      });

      return {
        success: true,
        actionLogId,
        message: `Successfully ${enable ? 'enabled' : 'paused'} ${entityType}`,
        data: result
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await this.updateActionLog(actionLogId, {
        status: 'failed',
        error_message: errorMessage
      });

      return {
        success: false,
        actionLogId,
        message: `Failed to ${enable ? 'enable' : 'pause'} entity`,
        error: errorMessage
      };
    }
  }

  async duplicateWithSchedule(
    userId: string,
    platform: AdPlatform,
    adSetId: string,
    schedule: Array<{ days: number[]; startMinute: number; endMinute: number }>,
    triggeredBy: 'user_manual' | 'suggestion_action' | 'automation_rule' = 'user_manual',
    suggestionId?: string
  ): Promise<ActionResult> {
    const action: CrossPlatformAction = {
      id: `dup-schedule-${Date.now()}`,
      type: 'duplicate_entity',
      platform,
      entityType: 'ad_set',
      entityId: adSetId,
      entityName: '',
      description: 'Duplicate ad set with optimized schedule',
      parameters: { schedule },
      estimatedImpact: 0,
      requiresConfirmation: true
    };

    const actionLogId = await this.createActionLog(userId, action, triggeredBy, suggestionId);

    try {
      await this.updateActionLog(actionLogId, { status: 'executing' });

      const headers = await this.getAuthHeaders();
      const endpoint = `${SUPABASE_URL}/functions/v1/facebook-ads-duplicate-entity`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          entityType: 'ad_set',
          entityId: adSetId,
          modifications: {
            schedule,
            budgetType: 'lifetime'
          },
          platform
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to duplicate ad set');
      }

      const result = await response.json();

      await this.updateActionLog(actionLogId, {
        status: 'completed',
        executed_at: new Date().toISOString(),
        new_state: { duplicatedId: result.newEntityId, schedule }
      });

      return {
        success: true,
        actionLogId,
        message: 'Successfully duplicated ad set with schedule',
        data: result
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await this.updateActionLog(actionLogId, {
        status: 'failed',
        error_message: errorMessage
      });

      return {
        success: false,
        actionLogId,
        message: 'Failed to duplicate ad set',
        error: errorMessage
      };
    }
  }

  async updateSchedule(
    userId: string,
    platform: AdPlatform,
    adSetId: string,
    excludedHours: number[],
    triggeredBy: 'user_manual' | 'suggestion_action' | 'automation_rule' = 'user_manual',
    suggestionId?: string
  ): Promise<ActionResult> {
    const schedule = this.buildScheduleFromExcludedHours(excludedHours);

    const action: CrossPlatformAction = {
      id: `schedule-${Date.now()}`,
      type: 'update_schedule',
      platform,
      entityType: 'ad_set',
      entityId: adSetId,
      entityName: '',
      description: `Apply optimized schedule excluding hours: ${excludedHours.join(', ')}`,
      parameters: { excludedHours, schedule },
      estimatedImpact: 0,
      requiresConfirmation: true
    };

    const actionLogId = await this.createActionLog(userId, action, triggeredBy, suggestionId);

    try {
      await this.updateActionLog(actionLogId, { status: 'executing' });

      return await this.duplicateWithSchedule(
        userId,
        platform,
        adSetId,
        schedule,
        triggeredBy,
        suggestionId
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await this.updateActionLog(actionLogId, {
        status: 'failed',
        error_message: errorMessage
      });

      return {
        success: false,
        actionLogId,
        message: 'Failed to update schedule',
        error: errorMessage
      };
    }
  }

  private buildScheduleFromExcludedHours(
    excludedHours: number[]
  ): Array<{ days: number[]; startMinute: number; endMinute: number }> {
    const allDays = [0, 1, 2, 3, 4, 5, 6];
    const includedHours = [];

    for (let h = 0; h < 24; h++) {
      if (!excludedHours.includes(h)) {
        includedHours.push(h);
      }
    }

    if (includedHours.length === 0) {
      return [{ days: allDays, startMinute: 0, endMinute: 1439 }];
    }

    const ranges: Array<{ start: number; end: number }> = [];
    let rangeStart = includedHours[0];
    let rangeEnd = includedHours[0];

    for (let i = 1; i < includedHours.length; i++) {
      if (includedHours[i] === rangeEnd + 1) {
        rangeEnd = includedHours[i];
      } else {
        ranges.push({ start: rangeStart, end: rangeEnd });
        rangeStart = includedHours[i];
        rangeEnd = includedHours[i];
      }
    }
    ranges.push({ start: rangeStart, end: rangeEnd });

    return ranges.map(r => ({
      days: allDays,
      startMinute: r.start * 60,
      endMinute: (r.end + 1) * 60 - 1
    }));
  }

  async rebalanceBudgets(
    userId: string,
    allocations: Array<{
      platform: AdPlatform;
      currentSpend: number;
      targetPercent: number;
    }>,
    totalBudget: number,
    triggeredBy: 'user_manual' | 'suggestion_action' | 'automation_rule' = 'user_manual',
    suggestionId?: string
  ): Promise<ActionResult[]> {
    const results: ActionResult[] = [];

    for (const allocation of allocations) {
      const targetBudget = (allocation.targetPercent / 100) * totalBudget;
      const budgetChange = targetBudget - allocation.currentSpend;

      if (Math.abs(budgetChange) < 10) continue;

      const { data: campaigns } = await supabase
        .from('ad_campaigns')
        .select('id, daily_budget, ad_account_id')
        .eq('status', 'ACTIVE')
        .order('daily_budget', { ascending: false })
        .limit(1);

      if (campaigns && campaigns.length > 0) {
        const campaign = campaigns[0];
        const currentBudget = campaign.daily_budget || 0;
        const newBudget = Math.max(10, currentBudget + budgetChange);

        const result = await this.updateBudget(
          userId,
          allocation.platform,
          'campaign',
          campaign.id,
          newBudget,
          'daily',
          triggeredBy,
          suggestionId
        );

        results.push(result);
      }
    }

    return results;
  }

  async dryRun(
    platform: AdPlatform,
    actionType: string,
    entityType: 'campaign' | 'ad_set' | 'ad',
    entityId: string,
    parameters: Record<string, unknown>
  ): Promise<DryRunResult> {
    let tableName: string;
    switch (entityType) {
      case 'campaign':
        tableName = 'ad_campaigns';
        break;
      case 'ad_set':
        tableName = 'ad_sets';
        break;
      case 'ad':
        tableName = 'ads';
        break;
    }

    const { data: entity, error } = await supabase
      .from(tableName)
      .select('*')
      .eq('id', entityId)
      .maybeSingle();

    if (error || !entity) {
      return {
        wouldSucceed: false,
        message: `Could not find ${entityType} with ID ${entityId}`,
        preview: {
          entityName: 'Unknown',
          currentValue: null,
          newValue: parameters,
          estimatedImpact: 0
        }
      };
    }

    let currentValue: unknown;
    let newValue: unknown;
    let estimatedImpact = 0;

    switch (actionType) {
      case 'update_budget':
        currentValue = entity.daily_budget || entity.lifetime_budget || 0;
        newValue = parameters.newBudget;
        break;
      case 'pause_entity':
      case 'enable_entity':
        currentValue = entity.status;
        newValue = actionType === 'enable_entity' ? 'ACTIVE' : 'PAUSED';
        break;
      case 'update_schedule':
        currentValue = 'All hours';
        newValue = `Excluding hours: ${(parameters.excludedHours as number[])?.join(', ')}`;
        break;
      default:
        currentValue = entity;
        newValue = parameters;
    }

    return {
      wouldSucceed: true,
      message: `Preview: ${actionType} on ${entity.name || entityId}`,
      preview: {
        entityName: entity.name || entityId,
        currentValue,
        newValue,
        estimatedImpact
      }
    };
  }

  async rollbackAction(actionLogId: string, userId: string): Promise<ActionResult> {
    const { data: log, error } = await supabase
      .from('platform_action_logs')
      .select('*')
      .eq('id', actionLogId)
      .eq('user_id', userId)
      .maybeSingle();

    if (error || !log) {
      return {
        success: false,
        actionLogId,
        message: 'Action log not found',
        error: 'Not found'
      };
    }

    if (!log.is_rollback_available) {
      return {
        success: false,
        actionLogId,
        message: 'Rollback not available for this action',
        error: 'Rollback not available'
      };
    }

    if (!log.previous_state) {
      return {
        success: false,
        actionLogId,
        message: 'No previous state recorded for rollback',
        error: 'No previous state'
      };
    }

    try {
      return {
        success: true,
        actionLogId,
        message: 'Rollback initiated (implementation pending)',
        data: { previousState: log.previous_state }
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        actionLogId,
        message: 'Rollback failed',
        error: errorMessage
      };
    }
  }

  async getActionHistory(
    userId: string,
    limit: number = 50
  ): Promise<PlatformActionLog[]> {
    const { data, error } = await supabase
      .from('platform_action_logs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data as PlatformActionLog[];
  }
}

export const platformActionService = new PlatformActionService();
