import { createClient } from 'npm:@supabase/supabase-js@2.39.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface RuleWithDetails {
  id: string;
  user_id: string;
  name: string;
  status: string;
  entity_type: 'campaign' | 'ad_set' | 'ad';
  ad_account_id: string | null;
  platform: 'facebook' | 'google' | 'tiktok';
  condition_logic: 'AND' | 'OR';
  check_frequency_minutes: number;
  max_daily_actions: number | null;
  require_approval: boolean;
  dry_run: boolean;
  rule_conditions: RuleCondition[];
  rule_actions: RuleAction[];
}

interface RuleCondition {
  metric_type: string;
  operator: string;
  threshold_value: number;
  threshold_value_max: number | null;
  time_window_days: number;
}

interface RuleAction {
  action_type: string;
  action_params: Record<string, any>;
  budget_change_type: string | null;
  budget_change_value: number | null;
  min_budget: number | null;
  max_budget: number | null;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    console.log('[execute-rules] Starting automation rule execution');

    // Fetch active rules that are due for execution
    const now = new Date().toISOString();
    const { data: rules, error: rulesError } = await supabase
      .from('automation_rules')
      .select(`
        *,
        rule_conditions(*),
        rule_actions(*)
      `)
      .eq('status', 'active')
      .or(`next_execution_at.is.null,next_execution_at.lte.${now}`)
      .order('created_at', { ascending: true });

    if (rulesError) {
      console.error('[execute-rules] Error fetching rules:', rulesError);
      return new Response(
        JSON.stringify({ success: false, error: rulesError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!rules || rules.length === 0) {
      console.log('[execute-rules] No rules due for execution');
      return new Response(
        JSON.stringify({ success: true, rulesExecuted: 0, message: 'No rules due for execution' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[execute-rules] Found ${rules.length} rules to execute`);

    const results = [];

    for (const rule of rules as RuleWithDetails[]) {
      console.log(`[execute-rules] Executing rule: ${rule.name}`);

      const executionResult = await executeRule(supabase, rule);
      results.push(executionResult);

      // Update next execution time
      const nextExecution = new Date(Date.now() + rule.check_frequency_minutes * 60 * 1000);
      await supabase
        .from('automation_rules')
        .update({
          last_executed_at: now,
          next_execution_at: nextExecution.toISOString(),
          total_executions: (rule as any).total_executions + 1
        })
        .eq('id', rule.id);
    }

    const successfulExecutions = results.filter(r => r.success).length;
    const failedExecutions = results.filter(r => !r.success).length;

    console.log(`[execute-rules] Completed. Success: ${successfulExecutions}, Failed: ${failedExecutions}`);

    return new Response(
      JSON.stringify({
        success: true,
        rulesExecuted: rules.length,
        successfulExecutions,
        failedExecutions,
        results
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[execute-rules] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function executeRule(supabase: any, rule: RuleWithDetails) {
  const executionStart = Date.now();

  // Create execution record
  const { data: execution, error: execError } = await supabase
    .from('rule_executions')
    .insert({
      rule_id: rule.id,
      user_id: rule.user_id,
      started_at: new Date().toISOString(),
      status: 'running',
      entities_checked: 0,
      entities_matched: 0,
      actions_taken: 0,
      actions_failed: 0,
      execution_metadata: {}
    })
    .select()
    .single();

  if (execError) {
    console.error('[execute-rules] Error creating execution record:', execError);
    return { success: false, ruleId: rule.id, error: execError.message };
  }

  try {
    // Fetch entities to check based on rule criteria
    const entities = await fetchEntities(supabase, rule);

    let entitiesMatched = 0;
    let actionsTaken = 0;
    let actionsFailed = 0;

    for (const entity of entities) {
      // Check if entity matches conditions
      const matches = await evaluateConditions(supabase, rule, entity);

      if (matches) {
        entitiesMatched++;

        // Execute actions if not in dry-run mode
        if (!rule.dry_run) {
          for (const action of rule.rule_actions) {
            const actionResult = await executeAction(supabase, rule, entity, action, execution.id);

            if (actionResult.success) {
              actionsTaken++;
            } else {
              actionsFailed++;
            }
          }
        } else {
          console.log(`[execute-rules] DRY RUN: Would execute ${rule.rule_actions.length} actions for ${entity.name}`);
        }

        // Check daily action limit
        if (rule.max_daily_actions && actionsTaken >= rule.max_daily_actions) {
          console.log(`[execute-rules] Reached daily action limit (${rule.max_daily_actions})`);
          break;
        }
      }
    }

    // Update execution record
    await supabase
      .from('rule_executions')
      .update({
        completed_at: new Date().toISOString(),
        status: 'completed',
        entities_checked: entities.length,
        entities_matched: entitiesMatched,
        actions_taken: actionsTaken,
        actions_failed: actionsFailed,
        execution_duration_ms: Date.now() - executionStart
      })
      .eq('id', execution.id);

    // Update rule totals
    await supabase
      .from('automation_rules')
      .update({
        total_actions_taken: ((rule as any).total_actions_taken || 0) + actionsTaken
      })
      .eq('id', rule.id);

    return {
      success: true,
      ruleId: rule.id,
      ruleName: rule.name,
      entitiesChecked: entities.length,
      entitiesMatched,
      actionsTaken,
      actionsFailed,
      dryRun: rule.dry_run
    };
  } catch (error) {
    // Update execution record with error
    await supabase
      .from('rule_executions')
      .update({
        completed_at: new Date().toISOString(),
        status: 'failed',
        error_message: error instanceof Error ? error.message : 'Unknown error',
        execution_duration_ms: Date.now() - executionStart
      })
      .eq('id', execution.id);

    console.error('[execute-rules] Error executing rule:', error);
    return { success: false, ruleId: rule.id, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

async function fetchEntities(supabase: any, rule: RuleWithDetails) {
  const tableName = rule.entity_type === 'campaign' ? 'ad_campaigns' : rule.entity_type === 'ad_set' ? 'ad_sets' : 'ads';

  let query = supabase
    .from(tableName)
    .select('*')
    .eq('user_id', rule.user_id)
    .eq('platform', rule.platform)
    .neq('status', 'DELETED');

  if (rule.ad_account_id) {
    query = query.eq('ad_account_id', rule.ad_account_id);
  }

  const { data: entities, error } = await query;

  if (error) {
    console.error('[execute-rules] Error fetching entities:', error);
    return [];
  }

  return entities || [];
}

async function evaluateConditions(supabase: any, rule: RuleWithDetails, entity: any): Promise<boolean> {
  const conditionResults = [];

  for (const condition of rule.rule_conditions) {
    const result = await evaluateCondition(supabase, rule, entity, condition);
    conditionResults.push(result);
  }

  // Apply logic (AND/OR)
  if (rule.condition_logic === 'AND') {
    return conditionResults.every(r => r);
  } else {
    return conditionResults.some(r => r);
  }
}

async function evaluateCondition(supabase: any, rule: RuleWithDetails, entity: any, condition: RuleCondition): Promise<boolean> {
  // Fetch metrics for the entity within time window
  const endDate = new Date();
  const startDate = new Date(Date.now() - condition.time_window_days * 24 * 60 * 60 * 1000);

  const { data: metrics, error } = await supabase
    .from('ad_metrics')
    .select('*')
    .eq('user_id', rule.user_id)
    .gte('date', startDate.toISOString().split('T')[0])
    .lte('date', endDate.toISOString().split('T')[0]);

  if (error || !metrics || metrics.length === 0) {
    return false;
  }

  // Filter metrics for this specific entity
  const entityMetrics = metrics.filter((m: any) => {
    if (rule.entity_type === 'campaign') {
      return m.campaign_id === entity.id;
    } else if (rule.entity_type === 'ad_set') {
      return m.ad_set_id === entity.id;
    } else {
      return m.ad_id === entity.id;
    }
  });

  if (entityMetrics.length === 0) {
    return false;
  }

  // Calculate aggregate metric value
  const metricValue = calculateMetric(entityMetrics, condition.metric_type);

  // Evaluate condition
  return evaluateOperator(metricValue, condition.operator, condition.threshold_value, condition.threshold_value_max);
}

function calculateMetric(metrics: any[], metricType: string): number {
  const totalSpend = metrics.reduce((sum, m) => sum + (m.spend || 0), 0);
  const totalRevenue = metrics.reduce((sum, m) => sum + (m.revenue || 0), 0);
  const totalConversions = metrics.reduce((sum, m) => sum + (m.conversions || 0), 0);
  const totalClicks = metrics.reduce((sum, m) => sum + (m.clicks || 0), 0);
  const totalImpressions = metrics.reduce((sum, m) => sum + (m.impressions || 0), 0);

  switch (metricType) {
    case 'spend':
      return totalSpend;
    case 'revenue':
      return totalRevenue;
    case 'conversions':
      return totalConversions;
    case 'clicks':
      return totalClicks;
    case 'impressions':
      return totalImpressions;
    case 'roas':
      return totalSpend > 0 ? totalRevenue / totalSpend : 0;
    case 'cpa':
      return totalConversions > 0 ? totalSpend / totalConversions : Infinity;
    case 'cpc':
      return totalClicks > 0 ? totalSpend / totalClicks : Infinity;
    case 'ctr':
      return totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
    case 'profit':
      return totalRevenue - totalSpend;
    case 'profit_margin':
      return totalRevenue > 0 ? ((totalRevenue - totalSpend) / totalRevenue) * 100 : 0;
    default:
      return 0;
  }
}

function evaluateOperator(value: number, operator: string, threshold: number, thresholdMax: number | null): boolean {
  switch (operator) {
    case 'greater_than':
      return value > threshold;
    case 'less_than':
      return value < threshold;
    case 'equals':
      return value === threshold;
    case 'greater_or_equal':
      return value >= threshold;
    case 'less_or_equal':
      return value <= threshold;
    case 'between':
      return thresholdMax ? (value >= threshold && value <= thresholdMax) : false;
    case 'not_equals':
      return value !== threshold;
    default:
      return false;
  }
}

async function executeAction(supabase: any, rule: RuleWithDetails, entity: any, action: RuleAction, executionId: string) {
  console.log(`[execute-rules] Executing action: ${action.action_type} for ${entity.name}`);

  const actionRecord = {
    execution_id: executionId,
    rule_id: rule.id,
    user_id: rule.user_id,
    entity_type: rule.entity_type,
    entity_id: entity.id,
    entity_platform_id: entity.platform_campaign_id || entity.platform_ad_set_id || entity.platform_ad_id,
    entity_name: entity.name,
    action_type: action.action_type,
    action_params: action.action_params || {},
    status: 'pending',
    can_rollback: false
  };

  try {
    let result;

    switch (action.action_type) {
      case 'pause_entity':
        result = await pauseEntity(supabase, rule, entity);
        actionRecord.field_changed = 'status';
        actionRecord.old_value = entity.status;
        actionRecord.new_value = 'PAUSED';
        break;

      case 'resume_entity':
        result = await resumeEntity(supabase, rule, entity);
        actionRecord.field_changed = 'status';
        actionRecord.old_value = entity.status;
        actionRecord.new_value = 'ACTIVE';
        break;

      case 'adjust_budget':
        result = await adjustBudget(supabase, rule, entity, action);
        actionRecord.field_changed = 'budget';
        actionRecord.old_value = entity.daily_budget?.toString();
        actionRecord.can_rollback = true;
        break;

      case 'send_notification':
        result = await sendNotification(supabase, rule, entity, action);
        break;

      default:
        result = { success: false, message: `Unsupported action type: ${action.action_type}` };
    }

    actionRecord.status = result.success ? 'applied' : 'failed';
    actionRecord.error_message = result.success ? null : result.message;
    if (result.newValue) {
      actionRecord.new_value = result.newValue.toString();
    }

    await supabase.from('action_history').insert(actionRecord);

    return result;
  } catch (error) {
    actionRecord.status = 'failed';
    actionRecord.error_message = error instanceof Error ? error.message : 'Unknown error';

    await supabase.from('action_history').insert(actionRecord);

    return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
  }
}

async function pauseEntity(supabase: any, rule: RuleWithDetails, entity: any) {
  if (rule.platform !== 'facebook') {
    return { success: false, message: 'Only Facebook platform supported currently' };
  }

  const { data: adAccount } = await supabase
    .from('ad_accounts')
    .select('*, integration_connections(*)')
    .eq('user_id', rule.user_id)
    .eq('platform', rule.platform)
    .single();

  if (!adAccount?.integration_connections?.access_token) {
    return { success: false, message: 'No access token found' };
  }

  const platformId = entity.platform_campaign_id || entity.platform_ad_set_id || entity.platform_ad_id;
  const url = `https://graph.facebook.com/v21.0/${platformId}?access_token=${adAccount.integration_connections.access_token}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'PAUSED' })
  });

  if (!response.ok) {
    const error = await response.json();
    return { success: false, message: error.error?.message || 'Failed to pause entity' };
  }

  // Update local database
  const tableName = rule.entity_type === 'campaign' ? 'ad_campaigns' : rule.entity_type === 'ad_set' ? 'ad_sets' : 'ads';
  await supabase
    .from(tableName)
    .update({ status: 'PAUSED' })
    .eq('id', entity.id);

  return { success: true, message: 'Entity paused successfully' };
}

async function resumeEntity(supabase: any, rule: RuleWithDetails, entity: any) {
  if (rule.platform !== 'facebook') {
    return { success: false, message: 'Only Facebook platform supported currently' };
  }

  const { data: adAccount } = await supabase
    .from('ad_accounts')
    .select('*, integration_connections(*)')
    .eq('user_id', rule.user_id)
    .eq('platform', rule.platform)
    .single();

  if (!adAccount?.integration_connections?.access_token) {
    return { success: false, message: 'No access token found' };
  }

  const platformId = entity.platform_campaign_id || entity.platform_ad_set_id || entity.platform_ad_id;
  const url = `https://graph.facebook.com/v21.0/${platformId}?access_token=${adAccount.integration_connections.access_token}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'ACTIVE' })
  });

  if (!response.ok) {
    const error = await response.json();
    return { success: false, message: error.error?.message || 'Failed to resume entity' };
  }

  // Update local database
  const tableName = rule.entity_type === 'campaign' ? 'ad_campaigns' : rule.entity_type === 'ad_set' ? 'ad_sets' : 'ads';
  await supabase
    .from(tableName)
    .update({ status: 'ACTIVE' })
    .eq('id', entity.id);

  return { success: true, message: 'Entity resumed successfully' };
}

async function adjustBudget(supabase: any, rule: RuleWithDetails, entity: any, action: RuleAction) {
  if (rule.platform !== 'facebook') {
    return { success: false, message: 'Only Facebook platform supported currently' };
  }

  if (rule.entity_type === 'ad') {
    return { success: false, message: 'Budget adjustment not supported for ads' };
  }

  const currentBudget = entity.daily_budget || 0;
  let newBudget: number;

  if (action.budget_change_type === 'percent') {
    const changePercent = action.budget_change_value || 0;
    newBudget = currentBudget * (1 + changePercent / 100);
  } else {
    newBudget = currentBudget + (action.budget_change_value || 0);
  }

  // Apply min/max constraints
  if (action.min_budget && newBudget < action.min_budget) {
    newBudget = action.min_budget;
  }
  if (action.max_budget && newBudget > action.max_budget) {
    newBudget = action.max_budget;
  }

  // Round to 2 decimal places
  newBudget = Math.round(newBudget * 100) / 100;

  const { data: adAccount } = await supabase
    .from('ad_accounts')
    .select('*, integration_connections(*)')
    .eq('user_id', rule.user_id)
    .eq('platform', rule.platform)
    .single();

  if (!adAccount?.integration_connections?.access_token) {
    return { success: false, message: 'No access token found' };
  }

  const platformId = entity.platform_campaign_id || entity.platform_ad_set_id;
  const budgetInCents = Math.round(newBudget * 100);
  const url = `https://graph.facebook.com/v21.0/${platformId}?access_token=${adAccount.integration_connections.access_token}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ daily_budget: budgetInCents })
  });

  if (!response.ok) {
    const error = await response.json();
    return { success: false, message: error.error?.message || 'Failed to adjust budget' };
  }

  // Update local database
  const tableName = rule.entity_type === 'campaign' ? 'ad_campaigns' : 'ad_sets';
  await supabase
    .from(tableName)
    .update({ daily_budget: newBudget })
    .eq('id', entity.id);

  return {
    success: true,
    message: `Budget adjusted from $${currentBudget} to $${newBudget}`,
    newValue: newBudget
  };
}

async function sendNotification(supabase: any, rule: RuleWithDetails, entity: any, action: RuleAction) {
  // Store notification in database (user can check notifications page)
  await supabase.from('notifications').insert({
    user_id: rule.user_id,
    type: 'automation_rule_triggered',
    title: `Rule Triggered: ${rule.name}`,
    message: action.notification_message || `Automation rule "${rule.name}" triggered for ${entity.name}`,
    metadata: {
      rule_id: rule.id,
      entity_type: rule.entity_type,
      entity_id: entity.id,
      entity_name: entity.name
    },
    is_read: false
  });

  return { success: true, message: 'Notification sent' };
}
