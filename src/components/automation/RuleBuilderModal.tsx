import React, { useState } from 'react';
import { X, Plus, Trash2, AlertCircle, ChevronDown } from 'lucide-react';
import ConditionBuilder from './ConditionBuilder';
import ActionBuilder from './ActionBuilder';
import { CustomCheckbox } from '@/components/CustomCheckbox';
import type {
  RuleBuilderFormData,
  RuleConditionConfig,
  RuleActionConfig,
  EntityType,
  ConditionLogic,
} from '@/types/automation';

interface RuleBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (formData: RuleBuilderFormData) => Promise<void>;
  initialData?: Partial<RuleBuilderFormData>;
  adAccountId?: string;
}

const RuleBuilderModal: React.FC<RuleBuilderModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  adAccountId,
}) => {
  const [formData, setFormData] = useState<RuleBuilderFormData>({
    name: initialData?.name || '',
    description: initialData?.description || '',
    entity_type: initialData?.entity_type || 'campaign',
    ad_account_id: adAccountId || initialData?.ad_account_id || null,
    platform: 'facebook',
    condition_logic: initialData?.condition_logic || 'AND',
    conditions: initialData?.conditions || [
      {
        metric_type: 'profit',
        operator: 'less_than',
        threshold_value: 0,
        time_window_days: 7,
      },
    ],
    actions: initialData?.actions || [
      {
        action_type: 'pause_entity',
        notification_channels: ['in_app'],
      },
    ],
    check_frequency_minutes: initialData?.check_frequency_minutes || 60,
    max_daily_actions: initialData?.max_daily_actions || 100,
    require_approval: initialData?.require_approval || false,
    dry_run: initialData?.dry_run || true,
  });

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAddCondition = () => {
    setFormData({
      ...formData,
      conditions: [
        ...formData.conditions,
        {
          metric_type: 'profit',
          operator: 'less_than',
          threshold_value: 0,
          time_window_days: 7,
        },
      ],
    });
  };

  const handleRemoveCondition = (index: number) => {
    if (formData.conditions.length === 1) {
      setError('You must have at least one condition');
      return;
    }
    setFormData({
      ...formData,
      conditions: formData.conditions.filter((_, i) => i !== index),
    });
    setError(null);
  };

  const handleUpdateCondition = (index: number, condition: RuleConditionConfig) => {
    const updatedConditions = [...formData.conditions];
    updatedConditions[index] = condition;
    setFormData({ ...formData, conditions: updatedConditions });
  };

  const handleAddAction = () => {
    setFormData({
      ...formData,
      actions: [
        ...formData.actions,
        {
          action_type: 'send_notification',
          notification_channels: ['in_app'],
        },
      ],
    });
  };

  const handleRemoveAction = (index: number) => {
    if (formData.actions.length === 1) {
      setError('You must have at least one action');
      return;
    }
    setFormData({
      ...formData,
      actions: formData.actions.filter((_, i) => i !== index),
    });
    setError(null);
  };

  const handleUpdateAction = (index: number, action: RuleActionConfig) => {
    const updatedActions = [...formData.actions];
    updatedActions[index] = action;
    setFormData({ ...formData, actions: updatedActions });
  };

  const handleSubmit = async () => {
    setError(null);

    if (!formData.name.trim()) {
      setError('Rule name is required');
      return;
    }

    if (formData.conditions.length === 0) {
      setError('At least one condition is required');
      return;
    }

    if (formData.actions.length === 0) {
      setError('At least one action is required');
      return;
    }

    setIsSaving(true);
    try {
      await onSave(formData);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save rule');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {initialData ? 'Edit Automated Rule' : 'Create Automated Rule'}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {error && (
            <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Rule Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., Pause Unprofitable Campaigns"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Description (Optional)
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                placeholder="Describe what this rule does and when it should be used"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Ad Platform
              </label>
              <div className="relative">
                <select
                  value={formData.platform}
                  onChange={(e) =>
                    setFormData({ ...formData, platform: e.target.value as 'facebook' | 'tiktok' | 'google' })
                  }
                  className="w-full px-4 py-2.5 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500 focus:border-transparent appearance-none cursor-pointer"
                >
                  <option value="facebook">Facebook / Instagram</option>
                  <option value="google">Google Ads</option>
                  <option value="tiktok">TikTok Ads</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 dark:text-gray-400 pointer-events-none" />
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">
                Select which ad platform this rule will apply to
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Apply to
                </label>
                <div className="relative">
                  <select
                    value={formData.entity_type}
                    onChange={(e) =>
                      setFormData({ ...formData, entity_type: e.target.value as EntityType })
                    }
                    className="w-full px-4 py-2.5 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500 focus:border-transparent appearance-none cursor-pointer"
                  >
                    <option value="campaign">Campaigns</option>
                    <option value="ad_set">Ad Sets</option>
                    <option value="ad">Ads</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 dark:text-gray-400 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Check Frequency
                </label>
                <div className="relative">
                  <select
                    value={formData.check_frequency_minutes}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        check_frequency_minutes: parseInt(e.target.value),
                      })
                    }
                    className="w-full px-4 py-2.5 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500 focus:border-transparent appearance-none cursor-pointer"
                  >
                    <option value={15}>Every 15 minutes</option>
                    <option value={30}>Every 30 minutes</option>
                    <option value={60}>Every hour</option>
                    <option value={180}>Every 3 hours</option>
                    <option value={360}>Every 6 hours</option>
                    <option value={720}>Every 12 hours</option>
                    <option value={1440}>Daily</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 dark:text-gray-400 pointer-events-none" />
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Conditions</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  When should this rule trigger?
                </p>
              </div>
              {formData.conditions.length > 1 && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Logic:</span>
                  <div className="relative">
                    <select
                      value={formData.condition_logic}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          condition_logic: e.target.value as ConditionLogic,
                        })
                      }
                      className="pl-3 pr-8 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500 focus:border-transparent appearance-none cursor-pointer"
                    >
                      <option value="AND">Match ALL conditions</option>
                      <option value="OR">Match ANY condition</option>
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500 dark:text-gray-400 pointer-events-none" />
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-3">
              {formData.conditions.map((condition, index) => (
                <div key={index} className="relative">
                  <ConditionBuilder
                    condition={condition}
                    onChange={(updated) => handleUpdateCondition(index, updated)}
                  />
                  {formData.conditions.length > 1 && (
                    <button
                      onClick={() => handleRemoveCondition(index)}
                      className="absolute -top-2 -right-2 p-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <button
              onClick={handleAddCondition}
              className="w-full py-2.5 px-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-400 hover:border-blue-500 hover:text-blue-500 dark:hover:border-blue-400 dark:hover:text-blue-400 transition-colors flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Another Condition
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Actions</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                What should happen when conditions are met?
              </p>
            </div>

            <div className="space-y-3">
              {formData.actions.map((action, index) => (
                <div key={index} className="relative">
                  <ActionBuilder
                    action={action}
                    onChange={(updated) => handleUpdateAction(index, updated)}
                  />
                  {formData.actions.length > 1 && (
                    <button
                      onClick={() => handleRemoveAction(index)}
                      className="absolute -top-2 -right-2 p-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <button
              onClick={handleAddAction}
              className="w-full py-2.5 px-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-400 hover:border-blue-500 hover:text-blue-500 dark:hover:border-blue-400 dark:hover:text-blue-400 transition-colors flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Another Action
            </button>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Safety Settings</h3>

            <div className="space-y-3">
              <label className="flex items-start gap-3 cursor-pointer group">
                <CustomCheckbox
                  checked={formData.dry_run}
                  onChange={(e) => setFormData({ ...formData, dry_run: e.target.checked })}
                  className="mt-0.5"
                />
                <div>
                  <div className="text-sm font-medium text-gray-900 dark:text-white transition-colors">
                    Test Mode (Recommended)
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Rule will check conditions and log actions without actually executing them
                  </div>
                </div>
              </label>

              <label className="flex items-start gap-3 cursor-pointer group">
                <CustomCheckbox
                  checked={formData.require_approval}
                  onChange={(e) =>
                    setFormData({ ...formData, require_approval: e.target.checked })
                  }
                  className="mt-0.5"
                />
                <div>
                  <div className="text-sm font-medium text-gray-900 dark:text-white transition-colors">
                    Require Manual Approval
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Actions will wait for your approval before being executed
                  </div>
                </div>
              </label>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Max Daily Actions
                </label>
                <input
                  type="number"
                  value={formData.max_daily_actions}
                  onChange={(e) =>
                    setFormData({ ...formData, max_daily_actions: parseInt(e.target.value) || 0 })
                  }
                  min={1}
                  max={1000}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Prevents the rule from making too many changes in a single day
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <button
            onClick={onClose}
            disabled={isSaving}
            className="px-6 py-2.5 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSaving}
            className="px-6 py-2.5 bg-gray-900 dark:bg-gray-800 text-white hover:bg-gray-800 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {isSaving ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Saving...
              </>
            ) : (
              'Save Rule'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RuleBuilderModal;
