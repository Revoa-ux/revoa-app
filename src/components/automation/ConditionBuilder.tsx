import React from 'react';
import { ChevronDown } from 'lucide-react';
import type { RuleConditionConfig, MetricType, ConditionOperator } from '@/types/automation';

interface ConditionBuilderProps {
  condition: RuleConditionConfig;
  onChange: (condition: RuleConditionConfig) => void;
}

const metricOptions: { value: MetricType; label: string; profitAware?: boolean }[] = [
  { value: 'profit', label: 'Net Profit', profitAware: true },
  { value: 'profit_margin', label: 'Profit Margin %', profitAware: true },
  { value: 'net_roas', label: 'Net ROAS', profitAware: true },
  { value: 'roas', label: 'ROAS' },
  { value: 'cpa', label: 'Cost per Acquisition' },
  { value: 'cpc', label: 'Cost per Click' },
  { value: 'cpm', label: 'Cost per 1000 Impressions' },
  { value: 'ctr', label: 'Click-Through Rate %' },
  { value: 'spend', label: 'Ad Spend' },
  { value: 'conversions', label: 'Conversions' },
  { value: 'revenue', label: 'Revenue' },
  { value: 'clicks', label: 'Clicks' },
  { value: 'impressions', label: 'Impressions' },
  { value: 'frequency', label: 'Frequency' },
];

const operatorOptions: { value: ConditionOperator; label: string }[] = [
  { value: 'greater_than', label: 'Greater than' },
  { value: 'less_than', label: 'Less than' },
  { value: 'greater_or_equal', label: 'Greater than or equal to' },
  { value: 'less_or_equal', label: 'Less than or equal to' },
  { value: 'equals', label: 'Equals' },
  { value: 'not_equals', label: 'Not equals' },
  { value: 'between', label: 'Between' },
];

const ConditionBuilder: React.FC<ConditionBuilderProps> = ({ condition, onChange }) => {
  const selectedMetric = metricOptions.find((m) => m.value === condition.metric_type);
  const isBetween = condition.operator === 'between';

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-900/50">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
            Metric
          </label>
          <div className="relative">
            <select
              value={condition.metric_type}
              onChange={(e) => onChange({ ...condition, metric_type: e.target.value as MetricType })}
              className="w-full px-3 py-2 pr-8 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent appearance-none cursor-pointer"
            >
              <optgroup label="Profit-Aware Metrics (Unique to Revoa)">
                {metricOptions
                  .filter((m) => m.profitAware)
                  .map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
              </optgroup>
              <optgroup label="Standard Metrics">
                {metricOptions
                  .filter((m) => !m.profitAware)
                  .map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
              </optgroup>
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500 dark:text-gray-400 pointer-events-none" />
          </div>
          {selectedMetric?.profitAware && (
            <p className="text-xs text-green-600 dark:text-green-400 mt-1">
              Uses real COGS data
            </p>
          )}
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
            Operator
          </label>
          <div className="relative">
            <select
              value={condition.operator}
              onChange={(e) => onChange({ ...condition, operator: e.target.value as ConditionOperator })}
              className="w-full px-3 py-2 pr-8 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent appearance-none cursor-pointer"
            >
              {operatorOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500 dark:text-gray-400 pointer-events-none" />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
            {isBetween ? 'Min Value' : 'Value'}
          </label>
          <input
            type="number"
            value={condition.threshold_value}
            onChange={(e) =>
              onChange({ ...condition, threshold_value: parseFloat(e.target.value) || 0 })
            }
            step="0.01"
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent"
            placeholder="0"
          />
        </div>

        {isBetween && (
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              Max Value
            </label>
            <input
              type="number"
              value={condition.threshold_value_max || 0}
              onChange={(e) =>
                onChange({
                  ...condition,
                  threshold_value_max: parseFloat(e.target.value) || 0,
                })
              }
              step="0.01"
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent"
              placeholder="0"
            />
          </div>
        )}

        {!isBetween && (
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              Time Window
            </label>
            <div className="relative">
              <select
                value={condition.time_window_days}
                onChange={(e) =>
                  onChange({ ...condition, time_window_days: parseInt(e.target.value) })
                }
                className="w-full px-3 py-2 pr-8 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent appearance-none cursor-pointer"
              >
                <option value={1}>Last 24 hours</option>
                <option value={3}>Last 3 days</option>
                <option value={7}>Last 7 days</option>
                <option value={14}>Last 14 days</option>
                <option value={30}>Last 30 days</option>
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500 dark:text-gray-400 pointer-events-none" />
            </div>
          </div>
        )}
      </div>

      <div className="mt-3 text-xs text-gray-600 dark:text-gray-400">
        <strong>Reads as:</strong> If {selectedMetric?.label.toLowerCase()}{' '}
        {operatorOptions.find((o) => o.value === condition.operator)?.label.toLowerCase()}{' '}
        {condition.threshold_value}
        {isBetween && condition.threshold_value_max ? ` and ${condition.threshold_value_max}` : ''}{' '}
        in the last {condition.time_window_days} {condition.time_window_days === 1 ? 'day' : 'days'}
      </div>
    </div>
  );
};

export default ConditionBuilder;
