import { supabase } from './supabase';
import type {
  AutomationRule,
  RuleCondition,
  RuleAction,
  RuleExecution,
  ActionHistory,
  RuleTemplate,
  RuleWithDetails,
  RuleBuilderFormData,
  RulePerformanceMetrics,
} from '../types/automation';

export class AutomationRulesService {
  async getRules(userId: string): Promise<RuleWithDetails[]> {
    try {
      const { data: rules, error } = await supabase
        .from('ad_automation_rules')
        .select(`
          *,
          conditions:ad_automation_rule_conditions(*),
          actions:ad_automation_actions(*)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return rules as RuleWithDetails[];
    } catch (error) {
      console.error('[AutomationRules] Error fetching rules:', error);
      throw error;
    }
  }

  async getRule(ruleId: string, userId: string): Promise<RuleWithDetails | null> {
    try {
      const { data: rule, error } = await supabase
        .from('ad_automation_rules')
        .select(`
          *,
          conditions:ad_automation_rule_conditions(*),
          actions:ad_automation_actions(*),
          recent_executions:ad_automation_rule_executions(*)
        `)
        .eq('id', ruleId)
        .eq('user_id', userId)
        .order('started_at', { foreignTable: 'ad_automation_rule_executions', ascending: false })
        .limit(10, { foreignTable: 'ad_automation_rule_executions' })
        .maybeSingle();

      if (error) throw error;

      return rule as RuleWithDetails | null;
    } catch (error) {
      console.error('[AutomationRules] Error fetching rule:', error);
      throw error;
    }
  }

  async createRule(userId: string, formData: RuleBuilderFormData): Promise<AutomationRule> {
    try {
      const { data: rule, error: ruleError } = await supabase
        .from('ad_automation_rules')
        .insert({
          user_id: userId,
          name: formData.name,
          description: formData.description,
          entity_type: formData.entity_type,
          ad_account_id: formData.ad_account_id,
          condition_logic: formData.condition_logic,
          check_frequency_minutes: formData.check_frequency_minutes,
          max_daily_actions: formData.max_daily_actions,
          require_approval: formData.require_approval,
          dry_run: formData.dry_run,
          status: 'draft',
          next_execution_at: new Date(Date.now() + formData.check_frequency_minutes * 60 * 1000).toISOString(),
        })
        .select()
        .single();

      if (ruleError) throw ruleError;

      const conditions = formData.conditions.map((condition, index) => ({
        rule_id: rule.id,
        metric_type: condition.metric_type,
        operator: condition.operator,
        threshold_value: condition.threshold_value,
        threshold_value_max: condition.threshold_value_max || null,
        time_window_days: condition.time_window_days,
        condition_order: index,
      }));

      const { error: conditionsError } = await supabase
        .from('ad_automation_rule_conditions')
        .insert(conditions);

      if (conditionsError) throw conditionsError;

      const actions = formData.actions.map((action, index) => ({
        rule_id: rule.id,
        action_type: action.action_type,
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

      if (actionsError) throw actionsError;

      return rule as AutomationRule;
    } catch (error) {
      console.error('[AutomationRules] Error creating rule:', error);
      throw error;
    }
  }

  async updateRule(
    ruleId: string,
    userId: string,
    formData: Partial<RuleBuilderFormData>
  ): Promise<AutomationRule> {
    try {
      const updateData: any = {};

      if (formData.name !== undefined) updateData.name = formData.name;
      if (formData.description !== undefined) updateData.description = formData.description;
      if (formData.entity_type !== undefined) updateData.entity_type = formData.entity_type;
      if (formData.ad_account_id !== undefined) updateData.ad_account_id = formData.ad_account_id;
      if (formData.condition_logic !== undefined) updateData.condition_logic = formData.condition_logic;
      if (formData.check_frequency_minutes !== undefined) {
        updateData.check_frequency_minutes = formData.check_frequency_minutes;
      }
      if (formData.max_daily_actions !== undefined) updateData.max_daily_actions = formData.max_daily_actions;
      if (formData.require_approval !== undefined) updateData.require_approval = formData.require_approval;
      if (formData.dry_run !== undefined) updateData.dry_run = formData.dry_run;

      updateData.updated_at = new Date().toISOString();

      const { data: rule, error: ruleError } = await supabase
        .from('ad_automation_rules')
        .update(updateData)
        .eq('id', ruleId)
        .eq('user_id', userId)
        .select()
        .single();

      if (ruleError) throw ruleError;

      if (formData.conditions) {
        await supabase
          .from('ad_automation_rule_conditions')
          .delete()
          .eq('rule_id', ruleId);

        const conditions = formData.conditions.map((condition, index) => ({
          rule_id: ruleId,
          metric_type: condition.metric_type,
          operator: condition.operator,
          threshold_value: condition.threshold_value,
          threshold_value_max: condition.threshold_value_max || null,
          time_window_days: condition.time_window_days,
          condition_order: index,
        }));

        await supabase.from('ad_automation_rule_conditions').insert(conditions);
      }

      if (formData.actions) {
        await supabase
          .from('ad_automation_actions')
          .delete()
          .eq('rule_id', ruleId);

        const actions = formData.actions.map((action, index) => ({
          rule_id: ruleId,
          action_type: action.action_type,
          action_params: action.action_params || {},
          budget_change_type: action.budget_change_type || null,
          budget_change_value: action.budget_change_value || null,
          min_budget: action.min_budget || null,
          max_budget: action.max_budget || null,
          notification_channels: action.notification_channels || ['in_app'],
          notification_message: action.notification_message || null,
          action_order: index,
        }));

        await supabase.from('ad_automation_actions').insert(actions);
      }

      return rule as AutomationRule;
    } catch (error) {
      console.error('[AutomationRules] Error updating rule:', error);
      throw error;
    }
  }

  async deleteRule(ruleId: string, userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('ad_automation_rules')
        .delete()
        .eq('id', ruleId)
        .eq('user_id', userId);

      if (error) throw error;
    } catch (error) {
      console.error('[AutomationRules] Error deleting rule:', error);
      throw error;
    }
  }

  async toggleRuleStatus(
    ruleId: string,
    userId: string,
    newStatus: 'active' | 'paused'
  ): Promise<AutomationRule> {
    try {
      const updateData: any = {
        status: newStatus,
        updated_at: new Date().toISOString(),
      };

      if (newStatus === 'active') {
        const { data: rule } = await supabase
          .from('ad_automation_rules')
          .select('check_frequency_minutes')
          .eq('id', ruleId)
          .single();

        if (rule) {
          updateData.next_execution_at = new Date(
            Date.now() + rule.check_frequency_minutes * 60 * 1000
          ).toISOString();
        }
      }

      const { data, error } = await supabase
        .from('ad_automation_rules')
        .update(updateData)
        .eq('id', ruleId)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;

      return data as AutomationRule;
    } catch (error) {
      console.error('[AutomationRules] Error toggling rule status:', error);
      throw error;
    }
  }

  async duplicateRule(ruleId: string, userId: string): Promise<AutomationRule> {
    try {
      const original = await this.getRule(ruleId, userId);
      if (!original) throw new Error('Rule not found');

      const { data: newRule, error: ruleError } = await supabase
        .from('ad_automation_rules')
        .insert({
          user_id: userId,
          name: `${original.name} (Copy)`,
          description: original.description,
          entity_type: original.entity_type,
          ad_account_id: original.ad_account_id,
          platform: original.platform,
          condition_logic: original.condition_logic,
          check_frequency_minutes: original.check_frequency_minutes,
          max_daily_actions: original.max_daily_actions,
          require_approval: original.require_approval,
          dry_run: original.dry_run,
          status: 'draft',
          metadata: original.metadata,
        })
        .select()
        .single();

      if (ruleError) throw ruleError;

      const conditions = original.conditions.map((c) => ({
        rule_id: newRule.id,
        metric_type: c.metric_type,
        operator: c.operator,
        threshold_value: c.threshold_value,
        threshold_value_max: c.threshold_value_max,
        time_window_days: c.time_window_days,
        condition_order: c.condition_order,
      }));

      await supabase.from('ad_automation_rule_conditions').insert(conditions);

      const actions = original.actions.map((a) => ({
        rule_id: newRule.id,
        action_type: a.action_type,
        action_params: a.action_params,
        budget_change_type: a.budget_change_type,
        budget_change_value: a.budget_change_value,
        min_budget: a.min_budget,
        max_budget: a.max_budget,
        notification_channels: a.notification_channels,
        notification_message: a.notification_message,
        action_order: a.action_order,
      }));

      await supabase.from('ad_automation_actions').insert(actions);

      return newRule as AutomationRule;
    } catch (error) {
      console.error('[AutomationRules] Error duplicating rule:', error);
      throw error;
    }
  }

  async getRuleExecutions(ruleId: string, limit = 50): Promise<RuleExecution[]> {
    try {
      const { data, error } = await supabase
        .from('ad_automation_rule_executions')
        .select('*')
        .eq('rule_id', ruleId)
        .order('started_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return data as RuleExecution[];
    } catch (error) {
      console.error('[AutomationRules] Error fetching executions:', error);
      throw error;
    }
  }

  async getActionHistory(ruleId: string, limit = 100): Promise<ActionHistory[]> {
    try {
      const { data, error } = await supabase
        .from('ad_automation_actions_history')
        .select('*')
        .eq('rule_id', ruleId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return data as ActionHistory[];
    } catch (error) {
      console.error('[AutomationRules] Error fetching action history:', error);
      throw error;
    }
  }

  async getRulePerformanceMetrics(ruleId: string): Promise<RulePerformanceMetrics> {
    try {
      const { data: rule } = await supabase
        .from('ad_automation_rules')
        .select('total_executions, total_actions_taken, total_cost_saved')
        .eq('id', ruleId)
        .single();

      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

      const { data: executions } = await supabase
        .from('ad_automation_rule_executions')
        .select('execution_duration_ms, status, actions_taken, started_at')
        .eq('rule_id', ruleId);

      const { data: recent7Days } = await supabase
        .from('ad_automation_actions_history')
        .select('id', { count: 'exact', head: true })
        .eq('rule_id', ruleId)
        .gte('created_at', sevenDaysAgo);

      const { data: recent30Days } = await supabase
        .from('ad_automation_rule_executions')
        .select('actions_taken')
        .eq('rule_id', ruleId)
        .gte('started_at', thirtyDaysAgo);

      const avgExecutionTime =
        executions && executions.length > 0
          ? executions.reduce((sum, e) => sum + (e.execution_duration_ms || 0), 0) / executions.length
          : 0;

      const successRate =
        executions && executions.length > 0
          ? (executions.filter((e) => e.status === 'completed').length / executions.length) * 100
          : 0;

      const last30DaysSavings = recent30Days
        ? recent30Days.reduce((sum, e) => sum + (e.actions_taken || 0), 0) * 10
        : 0;

      return {
        total_executions: rule?.total_executions || 0,
        total_actions_taken: rule?.total_actions_taken || 0,
        total_cost_saved: rule?.total_cost_saved || 0,
        avg_execution_time_ms: avgExecutionTime,
        success_rate: successRate,
        last_7_days_actions: recent7Days?.length || 0,
        last_30_days_savings: last30DaysSavings,
      };
    } catch (error) {
      console.error('[AutomationRules] Error fetching performance metrics:', error);
      return {
        total_executions: 0,
        total_actions_taken: 0,
        total_cost_saved: 0,
        avg_execution_time_ms: 0,
        success_rate: 0,
        last_7_days_actions: 0,
        last_30_days_savings: 0,
      };
    }
  }

  async getTemplates(): Promise<RuleTemplate[]> {
    try {
      const { data, error } = await supabase
        .from('ad_automation_rule_templates')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (error) throw error;

      return data as RuleTemplate[];
    } catch (error) {
      console.error('[AutomationRules] Error fetching templates:', error);
      throw error;
    }
  }

  async createRuleFromTemplate(
    userId: string,
    templateId: string,
    customName?: string,
    adAccountId?: string
  ): Promise<AutomationRule> {
    try {
      const { data: template, error: templateError } = await supabase
        .from('ad_automation_rule_templates')
        .select('*')
        .eq('id', templateId)
        .single();

      if (templateError || !template) throw new Error('Template not found');

      const formData: RuleBuilderFormData = {
        name: customName || template.name,
        description: template.description,
        entity_type: template.entity_type,
        ad_account_id: adAccountId || null,
        condition_logic: template.condition_logic,
        conditions: template.conditions as any[],
        actions: template.actions as any[],
        check_frequency_minutes: 60,
        max_daily_actions: 100,
        require_approval: false,
        dry_run: false,
      };

      return await this.createRule(userId, formData);
    } catch (error) {
      console.error('[AutomationRules] Error creating rule from template:', error);
      throw error;
    }
  }

  async rollbackAction(actionId: string, userId: string, reason: string): Promise<void> {
    try {
      const { data: action, error: fetchError } = await supabase
        .from('ad_automation_actions_history')
        .select('*')
        .eq('id', actionId)
        .eq('user_id', userId)
        .single();

      if (fetchError || !action) throw new Error('Action not found or not accessible');

      if (!action.can_rollback) {
        throw new Error('This action cannot be rolled back');
      }

      if (action.status === 'rolled_back') {
        throw new Error('Action has already been rolled back');
      }

      const { error: updateError } = await supabase
        .from('ad_automation_actions_history')
        .update({
          status: 'rolled_back',
          rolled_back_at: new Date().toISOString(),
          rollback_reason: reason,
        })
        .eq('id', actionId);

      if (updateError) throw updateError;
    } catch (error) {
      console.error('[AutomationRules] Error rolling back action:', error);
      throw error;
    }
  }
}

export const automationRulesService = new AutomationRulesService();
