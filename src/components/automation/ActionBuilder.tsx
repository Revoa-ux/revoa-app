import React from 'react';
import { CustomCheckbox } from '@/components/CustomCheckbox';
import { CustomSelect } from '@/components/CustomSelect';
import type { RuleActionConfig, ActionType, BudgetChangeType } from '@/types/automation';

interface ActionBuilderProps {
  action: RuleActionConfig;
  onChange: (action: RuleActionConfig) => void;
}

const actionOptions: { value: ActionType; label: string; description: string }[] = [
  {
    value: 'pause_entity',
    label: 'Pause Ad/Set/Campaign',
    description: 'Stop the entity from running',
  },
  {
    value: 'resume_entity',
    label: 'Resume Ad/Set/Campaign',
    description: 'Restart a paused entity',
  },
  {
    value: 'adjust_budget',
    label: 'Adjust Budget',
    description: 'Increase or decrease budget',
  },
  {
    value: 'send_notification',
    label: 'Send Notification',
    description: 'Alert you about the condition',
  },
  {
    value: 'change_status',
    label: 'Change Status',
    description: 'Update campaign/ad set status',
  },
];

const ActionBuilder: React.FC<ActionBuilderProps> = ({ action, onChange }) => {
  const selectedAction = actionOptions.find((a) => a.value === action.action_type);
  const showBudgetSettings = action.action_type === 'adjust_budget';
  const showNotificationSettings =
    action.action_type === 'send_notification' || action.action_type === 'pause_entity';

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-900/50">
      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
            Action Type
          </label>
          <CustomSelect
            value={action.action_type}
            onChange={(value) =>
              onChange({ ...action, action_type: value as ActionType })
            }
            options={actionOptions.map(opt => ({ value: opt.value, label: opt.label }))}
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {selectedAction?.description}
          </p>
        </div>

        {showBudgetSettings && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Adjustment Type
                </label>
                <CustomSelect
                  value={action.budget_change_type || 'percent'}
                  onChange={(value) =>
                    onChange({
                      ...action,
                      budget_change_type: value as BudgetChangeType,
                    })
                  }
                  options={[
                    { value: 'percent', label: 'Percentage' },
                    { value: 'fixed_amount', label: 'Fixed Amount' },
                  ]}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  {action.budget_change_type === 'percent' ? 'Change by %' : 'Change by $'}
                </label>
                <input
                  type="number"
                  value={action.budget_change_value || 0}
                  onChange={(e) =>
                    onChange({
                      ...action,
                      budget_change_value: parseFloat(e.target.value) || 0,
                    })
                  }
                  step="1"
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder={action.budget_change_type === 'percent' ? '20' : '50'}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Min Budget ($)
                </label>
                <input
                  type="number"
                  value={action.min_budget || 0}
                  onChange={(e) =>
                    onChange({
                      ...action,
                      min_budget: parseFloat(e.target.value) || 0,
                    })
                  }
                  step="1"
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="10"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Max Budget ($)
                </label>
                <input
                  type="number"
                  value={action.max_budget || 0}
                  onChange={(e) =>
                    onChange({
                      ...action,
                      max_budget: parseFloat(e.target.value) || 0,
                    })
                  }
                  step="1"
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="1000"
                />
              </div>
            </div>

            <div className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded p-2">
              {action.budget_change_type === 'percent'
                ? `Will ${(action.budget_change_value || 0) > 0 ? 'increase' : 'decrease'} budget by ${Math.abs(action.budget_change_value || 0)}%`
                : `Will ${(action.budget_change_value || 0) > 0 ? 'increase' : 'decrease'} budget by $${Math.abs(action.budget_change_value || 0)}`}
              {action.min_budget ? ` (minimum $${action.min_budget})` : ''}
              {action.max_budget ? ` (maximum $${action.max_budget})` : ''}
            </div>
          </>
        )}

        {showNotificationSettings && (
          <>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                Notification Channels
              </label>
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <CustomCheckbox
                    checked={action.notification_channels?.includes('in_app') || false}
                    onChange={(checked) => {
                      const channels = action.notification_channels || [];
                      if (checked) {
                        onChange({
                          ...action,
                          notification_channels: [...channels, 'in_app'],
                        });
                      } else {
                        onChange({
                          ...action,
                          notification_channels: channels.filter((c) => c !== 'in_app'),
                        });
                      }
                    }}
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">In-app notification</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <CustomCheckbox
                    checked={action.notification_channels?.includes('email') || false}
                    onChange={(checked) => {
                      const channels = action.notification_channels || [];
                      if (checked) {
                        onChange({
                          ...action,
                          notification_channels: [...channels, 'email'],
                        });
                      } else {
                        onChange({
                          ...action,
                          notification_channels: channels.filter((c) => c !== 'email'),
                        });
                      }
                    }}
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Email notification</span>
                </label>
              </div>
            </div>

            {action.action_type === 'send_notification' && (
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Custom Message (Optional)
                </label>
                <input
                  type="text"
                  value={action.notification_message || ''}
                  onChange={(e) =>
                    onChange({
                      ...action,
                      notification_message: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="e.g., Campaign spending exceeded threshold"
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ActionBuilder;
