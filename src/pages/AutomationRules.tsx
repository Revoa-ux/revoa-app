import React, { useState, useEffect } from 'react';
import { Plus, Play, Pause, Copy, Trash2, MoreVertical, Sparkles, TrendingUp, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { automationRulesService } from '@/lib/automationRulesService';
import RuleBuilderModal from '@/components/automation/RuleBuilderModal';
import RuleTemplatesModal from '@/components/automation/RuleTemplatesModal';
import GlassCard from '@/components/GlassCard';
import { toast } from 'sonner';
import type { RuleWithDetails, RuleBuilderFormData, RulePerformanceMetrics } from '@/types/automation';

const AutomationRules: React.FC = () => {
  const { user } = useAuth();
  const [rules, setRules] = useState<RuleWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRuleBuilder, setShowRuleBuilder] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [editingRule, setEditingRule] = useState<RuleWithDetails | null>(null);
  const [metrics, setMetrics] = useState<Record<string, RulePerformanceMetrics>>({});

  useEffect(() => {
    if (user) {
      loadRules();
    }
  }, [user]);

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
    if (!user) return;

    if (!confirm(`Are you sure you want to delete "${rule.name}"?`)) {
      return;
    }

    try {
      await automationRulesService.deleteRule(rule.id, user.id);
      toast.success('Rule deleted successfully');
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-normal text-gray-900 dark:text-white mb-2">
            Automation Rules
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Automate your ad management with profit-aware rules
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowTemplates(true)}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <Sparkles className="w-4 h-4" />
            Browse Templates
          </button>
          <button
            onClick={() => setShowRuleBuilder(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Rule
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600 dark:text-gray-400 text-sm">Active Rules</span>
            <Play className="w-5 h-5 text-green-500" />
          </div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white">{activeRules}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">of {rules.length} total</div>
        </GlassCard>

        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600 dark:text-gray-400 text-sm">Total Executions</span>
            <TrendingUp className="w-5 h-5 text-blue-500" />
          </div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white">
            {totalExecutions.toLocaleString()}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">All time</div>
        </GlassCard>

        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600 dark:text-gray-400 text-sm">Actions Taken</span>
            <Sparkles className="w-5 h-5 text-purple-500" />
          </div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white">
            {totalActionsTaken.toLocaleString()}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Automated changes</div>
        </GlassCard>

        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600 dark:text-gray-400 text-sm">Est. Cost Saved</span>
            <TrendingUp className="w-5 h-5 text-green-500" />
          </div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white">
            ${totalCostSaved.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Total savings</div>
        </GlassCard>
      </div>

      {loading ? (
        <GlassCard className="p-12 flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </GlassCard>
      ) : rules.length === 0 ? (
        <GlassCard className="p-12">
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              No Automation Rules Yet
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
              Create your first automation rule to start optimizing your ad campaigns automatically
              based on real profitability data.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => setShowTemplates(true)}
                className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <Sparkles className="w-4 h-4" />
                Start with Template
              </button>
              <button
                onClick={() => setShowRuleBuilder(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
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
    </div>
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
    paused: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400',
    draft: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  };

  return (
    <GlassCard className="p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{rule.name}</h3>
            <span className={`px-2 py-1 text-xs font-medium rounded ${statusColors[rule.status]}`}>
              {rule.status}
            </span>
            {rule.dry_run && (
              <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 rounded">
                Test Mode
              </span>
            )}
            {rule.require_approval && (
              <span className="px-2 py-1 text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 rounded">
                Needs Approval
              </span>
            )}
          </div>
          {rule.description && (
            <p className="text-sm text-gray-600 dark:text-gray-400">{rule.description}</p>
          )}
          <div className="flex items-center gap-4 mt-3 text-xs text-gray-500 dark:text-gray-400">
            <span>Applies to: {rule.entity_type}s</span>
            <span>•</span>
            <span>
              Checks every {rule.check_frequency_minutes >= 60 ? `${rule.check_frequency_minutes / 60}h` : `${rule.check_frequency_minutes}m`}
            </span>
            <span>•</span>
            <span>
              {rule.conditions.length} condition{rule.conditions.length !== 1 ? 's' : ''} ({rule.condition_logic})
            </span>
            <span>•</span>
            <span>
              {rule.actions.length} action{rule.actions.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onToggleStatus}
            className={`p-2 rounded-lg transition-colors ${
              rule.status === 'active'
                ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
            title={rule.status === 'active' ? 'Pause rule' : 'Activate rule'}
          >
            {rule.status === 'active' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>

          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <MoreVertical className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            </button>

            {showMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-20">
                  <button
                    onClick={() => {
                      onEdit();
                      setShowMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 first:rounded-t-lg"
                  >
                    Edit Rule
                  </button>
                  <button
                    onClick={() => {
                      onDuplicate();
                      setShowMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
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
        <div className="grid grid-cols-4 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Executions</div>
            <div className="text-lg font-semibold text-gray-900 dark:text-white">
              {metrics.total_executions.toLocaleString()}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Actions Taken</div>
            <div className="text-lg font-semibold text-gray-900 dark:text-white">
              {metrics.total_actions_taken.toLocaleString()}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Success Rate</div>
            <div className="text-lg font-semibold text-gray-900 dark:text-white">
              {metrics.success_rate.toFixed(1)}%
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Cost Saved</div>
            <div className="text-lg font-semibold text-green-600 dark:text-green-400">
              ${metrics.total_cost_saved.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
        </div>
      )}

      {rule.status === 'active' && !rule.dry_run && rule.conditions.some(c => ['profit', 'profit_margin', 'net_roas'].includes(c.metric_type)) && (
        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg flex items-start gap-2">
          <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-blue-600 dark:text-blue-400">
            This rule uses profit-aware metrics powered by your real supplier COGS data
          </p>
        </div>
      )}
    </GlassCard>
  );
};

export default AutomationRules;
