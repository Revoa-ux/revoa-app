import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Plus, Play, Pause, Copy, Trash2, MoreVertical, Sparkles, TrendingUp, AlertTriangle, LayoutGrid, Cpu, Pencil } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { automationRulesService } from '@/lib/automationRulesService';
import RuleBuilderModal from '@/components/automation/RuleBuilderModal';
import RuleTemplatesModal from '@/components/automation/RuleTemplatesModal';
import GlassCard from '@/components/GlassCard';
import Modal from '@/components/Modal';
import { StatusIcon } from '@/components/StatusIcon';
import { toast } from '../lib/toast';
import { SubscriptionPageWrapper } from '@/components/subscription/SubscriptionPageWrapper';
import { useIsBlocked } from '@/components/subscription/SubscriptionGate';
import type { RuleWithDetails, RuleBuilderFormData, RulePerformanceMetrics } from '@/types/automation';

const AutomationRules: React.FC = () => {
  const { user } = useAuth();
  const isBlocked = useIsBlocked();
  const [rules, setRules] = useState<RuleWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRuleBuilder, setShowRuleBuilder] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [editingRule, setEditingRule] = useState<RuleWithDetails | null>(null);
  const [metrics, setMetrics] = useState<Record<string, RulePerformanceMetrics>>({});
  const [deleteConfirmRule, setDeleteConfirmRule] = useState<RuleWithDetails | null>(null);

  useEffect(() => {
    if (isBlocked) {
      setLoading(false);
      return;
    }
    if (user) {
      loadRules();
    }
  }, [user, isBlocked]);

  const loadRules = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const data = await automationRulesService.getRules(user.id);
      setRules(data);

      const metricsData: Record<string, RulePerformanceMetrics> = {};
      await Promise.all(
        data.map(async (rule) => {
          const m = await automationRulesService.getRulePerformanceMetrics(rule.id);
          metricsData[rule.id] = m;
        })
      );
      setMetrics(metricsData);
    } catch (error) {
      console.error('Failed to load rules:', error);
      toast.error('Failed to load automation rules');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRule = async (formData: RuleBuilderFormData) => {
    if (!user) return;

    try {
      await automationRulesService.createRule(user.id, formData);
      toast.success('Automation rule created successfully');
      loadRules();
    } catch (error) {
      console.error('Failed to create rule:', error);
      throw error;
    }
  };

  const handleUpdateRule = async (formData: RuleBuilderFormData) => {
    if (!user || !editingRule) return;

    try {
      await automationRulesService.updateRule(editingRule.id, user.id, formData);
      toast.success('Rule updated successfully');
      setEditingRule(null);
      loadRules();
    } catch (error) {
      console.error('Failed to update rule:', error);
      throw error;
    }
  };

  const handleToggleStatus = async (rule: RuleWithDetails) => {
    if (!user) return;

    try {
      const newStatus = rule.status === 'active' ? 'paused' : 'active';
      await automationRulesService.toggleRuleStatus(rule.id, user.id, newStatus);
      toast.success(`Rule ${newStatus === 'active' ? 'activated' : 'paused'}`);
      loadRules();
    } catch (error) {
      console.error('Failed to toggle rule:', error);
      toast.error('Failed to update rule status');
    }
  };

  const handleDuplicate = async (rule: RuleWithDetails) => {
    if (!user) return;

    try {
      await automationRulesService.duplicateRule(rule.id, user.id);
      toast.success('Rule duplicated successfully');
      loadRules();
    } catch (error) {
      console.error('Failed to duplicate rule:', error);
      toast.error('Failed to duplicate rule');
    }
  };

  const handleDelete = async (rule: RuleWithDetails) => {
    setDeleteConfirmRule(rule);
  };

  const confirmDelete = async () => {
    if (!user || !deleteConfirmRule) return;

    try {
      await automationRulesService.deleteRule(deleteConfirmRule.id, user.id);
      toast.success('Rule deleted successfully');
      setDeleteConfirmRule(null);
      loadRules();
    } catch (error) {
      console.error('Failed to delete rule:', error);
      toast.error('Failed to delete rule');
    }
  };

  const handleSelectTemplate = async (templateId: string) => {
    if (!user) return;

    try {
      await automationRulesService.createRuleFromTemplate(user.id, templateId);
      toast.success('Rule created from template');
      setShowTemplates(false);
      loadRules();
    } catch (error) {
      console.error('Failed to create rule from template:', error);
      toast.error('Failed to create rule from template');
    }
  };

  const totalExecutions = rules.reduce((sum, rule) => sum + rule.total_executions, 0);
  const totalActionsTaken = rules.reduce((sum, rule) => sum + rule.total_actions_taken, 0);
  const totalCostSaved = rules.reduce((sum, rule) => sum + rule.total_cost_saved, 0);
  const activeRules = rules.filter((r) => r.status === 'active').length;

  // Calculate secondary metrics
  const totalSuccessfulActions = Object.values(metrics).reduce((sum, m) =>
    sum + (m.total_actions_taken * (m.success_rate / 100)), 0
  );
  const overallSuccessRate = totalActionsTaken > 0
    ? ((totalSuccessfulActions / totalActionsTaken) * 100)
    : 0;
  const avgExecutionsPerRule = rules.length > 0 ? totalExecutions / rules.length : 0;
  const avgSavingsPerAction = totalActionsTaken > 0 ? totalCostSaved / totalActionsTaken : 0;
  const last7DaysActions = Object.values(metrics).reduce((sum, m) => sum + m.last_7_days_actions, 0);

  return (
    <SubscriptionPageWrapper>
      <Helmet>
        <title>Automation | Revoa</title>
      </Helmet>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-normal text-gray-900 dark:text-white mb-2">
            Automated Rule Manager
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 flex items-start sm:items-center gap-2">
            <span className="w-1.5 h-1.5 bg-red-500 rounded-full mt-1.5 sm:mt-0 flex-shrink-0"></span>
            Automate your ad management with profit-aware rules
          </p>
        </div>

      <div className="flex items-center justify-start sm:justify-end gap-3">
        <button
          onClick={() => setShowTemplates(true)}
          className="btn btn-secondary"
        >
          <LayoutGrid className="btn-icon w-4 h-4" />
          <span className="hidden sm:inline">Templates</span>
        </button>
        <button
          onClick={() => setShowRuleBuilder(true)}
          className="btn btn-primary"
        >
          <Plus className="btn-icon w-4 h-4" />
          <span className="hidden sm:inline">Create Rule</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Active Rules Card */}
        <div className="h-[180px] p-4 rounded-xl bg-gradient-to-b from-gray-50 to-white dark:from-[#2a2a2a]/50 dark:to-[#1f1f1f]/50 border border-gray-200/60 dark:border-[#3a3a3a]/60">
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 bg-gray-100 dark:bg-[#3a3a3a] rounded-lg flex items-center justify-center">
                <Play className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              </div>
            </div>
            <div>
              <h3 className="text-xs text-gray-500 dark:text-gray-400">Active Rules</h3>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {isBlocked ? '...' : activeRules}
              </p>
            </div>
            <div className="mt-auto space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500 dark:text-gray-400">Total Rules</span>
                <span className="text-xs font-bold text-gray-900 dark:text-white">
                  {isBlocked ? '...' : rules.length}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500 dark:text-gray-400">Success Rate</span>
                <span className="text-xs font-bold text-gray-900 dark:text-white">
                  {isBlocked ? '...' : `${overallSuccessRate.toFixed(1)}%`}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Total Executions Card */}
        <div className="h-[180px] p-4 rounded-xl bg-gradient-to-b from-gray-50 to-white dark:from-[#2a2a2a]/50 dark:to-[#1f1f1f]/50 border border-gray-200/60 dark:border-[#3a3a3a]/60">
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 bg-gray-100 dark:bg-[#3a3a3a] rounded-lg flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              </div>
            </div>
            <div>
              <h3 className="text-xs text-gray-500 dark:text-gray-400">Total Executions</h3>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {isBlocked ? '...' : totalExecutions.toLocaleString()}
              </p>
            </div>
            <div className="mt-auto space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500 dark:text-gray-400">Avg Per Rule</span>
                <span className="text-xs font-bold text-gray-900 dark:text-white">
                  {isBlocked ? '...' : avgExecutionsPerRule.toFixed(1)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Actions Taken Card */}
        <div className="h-[180px] p-4 rounded-xl bg-gradient-to-b from-gray-50 to-white dark:from-[#2a2a2a]/50 dark:to-[#1f1f1f]/50 border border-gray-200/60 dark:border-[#3a3a3a]/60">
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 bg-gray-100 dark:bg-[#3a3a3a] rounded-lg flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              </div>
            </div>
            <div>
              <h3 className="text-xs text-gray-500 dark:text-gray-400">Actions Taken</h3>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {isBlocked ? '...' : totalActionsTaken.toLocaleString()}
              </p>
            </div>
            <div className="mt-auto space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500 dark:text-gray-400">Last 7 Days</span>
                <span className="text-xs font-bold text-gray-900 dark:text-white">
                  {isBlocked ? '...' : last7DaysActions.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Est. Cost Saved Card */}
        <div className="h-[180px] p-4 rounded-xl bg-gradient-to-b from-gray-50 to-white dark:from-[#2a2a2a]/50 dark:to-[#1f1f1f]/50 border border-gray-200/60 dark:border-[#3a3a3a]/60">
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 bg-gray-100 dark:bg-[#3a3a3a] rounded-lg flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              </div>
            </div>
            <div>
              <h3 className="text-xs text-gray-500 dark:text-gray-400">Est. Cost Saved</h3>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {isBlocked ? '...' : `$${totalCostSaved.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              </p>
            </div>
            <div className="mt-auto space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500 dark:text-gray-400">Avg Per Action</span>
                <span className="text-xs font-bold text-gray-900 dark:text-white">
                  {isBlocked ? '...' : `$${avgSavingsPerAction.toFixed(2)}`}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {loading && !isBlocked ? (
        <div className="space-y-4 animate-pulse">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="p-6 rounded-2xl bg-gradient-to-b from-gray-50 to-white dark:from-[#2a2a2a]/50 dark:to-[#1f1f1f]/50 border border-gray-200/60 dark:border-[#3a3a3a]/60">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="h-6 w-48 bg-gray-200 dark:bg-[#3a3a3a] rounded"></div>
                    <div className="h-6 w-16 bg-gray-200 dark:bg-[#3a3a3a] rounded"></div>
                  </div>
                  <div className="h-4 w-64 bg-gray-200 dark:bg-[#3a3a3a] rounded mb-3"></div>
                  <div className="flex items-center gap-4">
                    <div className="h-3 w-20 bg-gray-200 dark:bg-[#3a3a3a] rounded"></div>
                    <div className="h-3 w-24 bg-gray-200 dark:bg-[#3a3a3a] rounded"></div>
                    <div className="h-3 w-28 bg-gray-200 dark:bg-[#3a3a3a] rounded"></div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 bg-gray-200 dark:bg-[#3a3a3a] rounded-lg"></div>
                  <div className="w-9 h-9 bg-gray-200 dark:bg-[#3a3a3a] rounded-lg"></div>
                </div>
              </div>
              <div className="border-t border-gray-200 dark:border-[#3a3a3a] pt-4 grid grid-cols-4 gap-4">
                <div>
                  <div className="h-3 w-16 bg-gray-200 dark:bg-[#3a3a3a] rounded mb-2"></div>
                  <div className="h-6 w-8 bg-gray-200 dark:bg-[#3a3a3a] rounded"></div>
                </div>
                <div>
                  <div className="h-3 w-20 bg-gray-200 dark:bg-[#3a3a3a] rounded mb-2"></div>
                  <div className="h-6 w-8 bg-gray-200 dark:bg-[#3a3a3a] rounded"></div>
                </div>
                <div>
                  <div className="h-3 w-20 bg-gray-200 dark:bg-[#3a3a3a] rounded mb-2"></div>
                  <div className="h-6 w-12 bg-gray-200 dark:bg-[#3a3a3a] rounded"></div>
                </div>
                <div>
                  <div className="h-3 w-16 bg-gray-200 dark:bg-[#3a3a3a] rounded mb-2"></div>
                  <div className="h-6 w-16 bg-gray-200 dark:bg-[#3a3a3a] rounded"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : isBlocked ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="p-6 rounded-2xl bg-gradient-to-b from-gray-50 to-white dark:from-[#2a2a2a]/50 dark:to-[#1f1f1f]/50 border border-gray-200/60 dark:border-[#3a3a3a]/60">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-normal text-gray-400 dark:text-gray-500">...</h3>
                    <span className="px-2 py-1 text-xs bg-gray-100 text-gray-400 dark:bg-[#3a3a3a] dark:text-gray-500 rounded">...</span>
                  </div>
                  <p className="text-sm text-gray-400 dark:text-gray-500 mb-3">...</p>
                </div>
              </div>
              <div className="border-t border-gray-200 dark:border-[#3a3a3a] pt-4 grid grid-cols-4 gap-4">
                <div>
                  <div className="text-xs text-gray-400 dark:text-gray-500 mb-1">Executions</div>
                  <div className="text-lg font-normal text-gray-400 dark:text-gray-500">...</div>
                </div>
                <div>
                  <div className="text-xs text-gray-400 dark:text-gray-500 mb-1">Actions Taken</div>
                  <div className="text-lg font-normal text-gray-400 dark:text-gray-500">...</div>
                </div>
                <div>
                  <div className="text-xs text-gray-400 dark:text-gray-500 mb-1">Success Rate</div>
                  <div className="text-lg font-normal text-gray-400 dark:text-gray-500">...</div>
                </div>
                <div>
                  <div className="text-xs text-gray-400 dark:text-gray-500 mb-1">Cost Saved</div>
                  <div className="text-lg font-normal text-gray-400 dark:text-gray-500">...</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : rules.length === 0 ? (
        <GlassCard className="p-12">
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <StatusIcon variant="neutral" size="xl" icon={Cpu} />
            </div>
            <h3 className="text-lg font-normal text-gray-900 dark:text-white mb-2">
              No Automation Rules Yet
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
              Create your first automation rule to start optimizing your ad campaigns automatically
              based on real profitability data.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => setShowTemplates(true)}
                className="btn btn-secondary"
              >
                <LayoutGrid className="btn-icon w-4 h-4" />
                Start with Template
              </button>
              <button
                onClick={() => setShowRuleBuilder(true)}
                className="btn btn-primary"
              >
                <Plus className="btn-icon w-4 h-4" />
                Create Custom Rule
              </button>
            </div>
          </div>
        </GlassCard>
      ) : (
        <div className="space-y-4">
          {rules.map((rule) => (
            <RuleCard
              key={rule.id}
              rule={rule}
              metrics={metrics[rule.id]}
              onToggleStatus={() => handleToggleStatus(rule)}
              onEdit={() => {
                setEditingRule(rule);
                setShowRuleBuilder(true);
              }}
              onDuplicate={() => handleDuplicate(rule)}
              onDelete={() => handleDelete(rule)}
            />
          ))}
        </div>
      )}

      {showRuleBuilder && (
        <RuleBuilderModal
          isOpen={showRuleBuilder}
          onClose={() => {
            setShowRuleBuilder(false);
            setEditingRule(null);
          }}
          onSave={editingRule ? handleUpdateRule : handleCreateRule}
          initialData={
            editingRule
              ? {
                  name: editingRule.name,
                  description: editingRule.description || '',
                  entity_type: editingRule.entity_type,
                  ad_account_id: editingRule.ad_account_id,
                  condition_logic: editingRule.condition_logic,
                  conditions: editingRule.conditions.map((c) => ({
                    metric_type: c.metric_type,
                    operator: c.operator,
                    threshold_value: c.threshold_value,
                    threshold_value_max: c.threshold_value_max || undefined,
                    time_window_days: c.time_window_days,
                  })),
                  actions: editingRule.actions.map((a) => ({
                    action_type: a.action_type,
                    action_params: a.action_params,
                    budget_change_type: a.budget_change_type || undefined,
                    budget_change_value: a.budget_change_value || undefined,
                    min_budget: a.min_budget || undefined,
                    max_budget: a.max_budget || undefined,
                    notification_channels: a.notification_channels,
                    notification_message: a.notification_message || undefined,
                  })),
                  check_frequency_minutes: editingRule.check_frequency_minutes,
                  max_daily_actions: editingRule.max_daily_actions || 100,
                  require_approval: editingRule.require_approval,
                  dry_run: editingRule.dry_run,
                }
              : undefined
          }
        />
      )}

      {showTemplates && (
        <RuleTemplatesModal
          isOpen={showTemplates}
          onClose={() => setShowTemplates(false)}
          onSelectTemplate={handleSelectTemplate}
        />
      )}

      {deleteConfirmRule && (
        <Modal
          isOpen={true}
          onClose={() => setDeleteConfirmRule(null)}
          title="Delete Automation Rule"
        >
          <div className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Are you sure you want to delete "<span className="font-medium text-gray-900 dark:text-white">{deleteConfirmRule.name}</span>"?
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-500">
              This action cannot be undone. All execution history for this rule will be preserved.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setDeleteConfirmRule(null)}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="btn btn-danger"
              >
                Delete Rule
              </button>
            </div>
          </div>
        </Modal>
      )}
      </div>
    </SubscriptionPageWrapper>
  );
};

interface RuleCardProps {
  rule: RuleWithDetails;
  metrics?: RulePerformanceMetrics;
  onToggleStatus: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

const RuleCard: React.FC<RuleCardProps> = ({
  rule,
  metrics,
  onToggleStatus,
  onEdit,
  onDuplicate,
  onDelete,
}) => {
  const [showMenu, setShowMenu] = useState(false);

  const statusColors = {
    active: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    paused: 'bg-gray-100 text-gray-700 dark:bg-[#3a3a3a] dark:text-gray-400',
    draft: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  };

  return (
    <GlassCard className="p-4 sm:p-6">
      <div className="flex items-start justify-between mb-4 gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <h3 className="text-base sm:text-lg font-normal text-gray-900 dark:text-white break-words">{rule.name}</h3>
            <span className={`px-2 py-1 text-xs rounded whitespace-nowrap ${statusColors[rule.status]}`}>
              {rule.status}
            </span>
            {rule.dry_run && (
              <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 rounded whitespace-nowrap">
                Test Mode
              </span>
            )}
            {rule.require_approval && (
              <span className="px-2 py-1 text-xs bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 rounded whitespace-nowrap">
                Needs Approval
              </span>
            )}
          </div>
          {rule.description && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{rule.description}</p>
          )}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
            <span className="whitespace-nowrap">Applies to: {rule.entity_type}s</span>
            <span className="hidden sm:inline">•</span>
            <span className="whitespace-nowrap">
              Checks every {rule.check_frequency_minutes >= 60 ? `${rule.check_frequency_minutes / 60}h` : `${rule.check_frequency_minutes}m`}
            </span>
            <span className="hidden sm:inline">•</span>
            <span className="whitespace-nowrap">
              {rule.conditions.length} condition{rule.conditions.length !== 1 ? 's' : ''} ({rule.condition_logic})
            </span>
            <span className="hidden sm:inline">•</span>
            <span className="whitespace-nowrap">
              {rule.actions.length} action{rule.actions.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={onToggleStatus}
            className={`p-2 rounded-lg transition-colors flex items-center justify-center ${
              rule.status === 'active'
                ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50'
                : 'bg-gray-100 dark:bg-[#3a3a3a] text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-[#4a4a4a]'
            }`}
            title={rule.status === 'active' ? 'Pause rule' : 'Activate rule'}
          >
            {rule.status === 'active' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>

          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-[#3a3a3a] rounded-lg transition-colors"
            >
              <MoreVertical className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            </button>

            {showMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-dark border border-gray-200 dark:border-[#3a3a3a] rounded-lg shadow-lg z-20">
                  <button
                    onClick={() => {
                      onEdit();
                      setShowMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#3a3a3a] first:rounded-t-lg flex items-center gap-2"
                  >
                    <Pencil className="w-4 h-4" />
                    Edit Rule
                  </button>
                  <button
                    onClick={() => {
                      onDuplicate();
                      setShowMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#3a3a3a] flex items-center gap-2"
                  >
                    <Copy className="w-4 h-4" />
                    Duplicate
                  </button>
                  <button
                    onClick={() => {
                      onDelete();
                      setShowMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 last:rounded-b-lg flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {metrics && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 pt-4 border-t border-gray-200 dark:border-[#3a3a3a]">
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Executions</div>
            <div className="text-base sm:text-lg font-normal text-gray-900 dark:text-white">
              {metrics.total_executions.toLocaleString()}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Actions Taken</div>
            <div className="text-base sm:text-lg font-normal text-gray-900 dark:text-white">
              {metrics.total_actions_taken.toLocaleString()}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Success Rate</div>
            <div className="text-base sm:text-lg font-normal text-gray-900 dark:text-white">
              {metrics.success_rate.toFixed(1)}%
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Cost Saved</div>
            <div className="text-base sm:text-lg font-normal text-green-600 dark:text-green-400">
              ${metrics.total_cost_saved.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
        </div>
      )}

      {rule.status === 'active' && !rule.dry_run && rule.conditions.some(c => ['profit', 'profit_margin', 'net_roas'].includes(c.metric_type)) && (
        <div className="mt-4 p-3 bg-gradient-to-r from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-2">
          <Sparkles className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-red-600 dark:text-red-400">
            This rule uses profit-aware metrics powered by your real supplier COGS data
          </p>
        </div>
      )}
    </GlassCard>
  );
};

export default AutomationRules;
