import React from 'react';
import { CustomSelect } from '@/components/CustomSelect';
import type { RuleConditionConfig, MetricType, ConditionOperator } from '@/types/automation';

interface ConditionBuilderProps {
  condition: RuleConditionConfig;
  onChange: (condition: RuleConditionConfig) => void;
  platform?: 'facebook' | 'tiktok' | 'google';
}

const baseMetricOptions: { value: MetricType; label: string; profitAware?: boolean }[] = [
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

const googleAdsMetricOptions: { value: MetricType; label: string; googleOnly?: boolean }[] = [
  { value: 'quality_score', label: 'Quality Score (1-10)', googleOnly: true },
  { value: 'search_impression_share', label: 'Search Impression Share %', googleOnly: true },
  { value: 'search_top_impression_share', label: 'Top Impression Share %', googleOnly: true },
  { value: 'search_abs_top_impression_share', label: 'Absolute Top IS %', googleOnly: true },
  { value: 'search_lost_impression_share_budget', label: 'Lost IS (Budget) %', googleOnly: true },
  { value: 'search_lost_impression_share_rank', label: 'Lost IS (Rank) %', googleOnly: true },
  { value: 'conversion_rate', label: 'Conversion Rate %' },
  { value: 'cost_per_conversion', label: 'Cost Per Conversion' },
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

const ConditionBuilder: React.FC<ConditionBuilderProps> = ({ condition, onChange, platform = 'facebook' }) => {
  const isGoogle = platform === 'google';

  const metricOptions = isGoogle
    ? [...baseMetricOptions, ...googleAdsMetricOptions]
    : baseMetricOptions;

  const selectedMetric = metricOptions.find((m) => m.value === condition.metric_type);
  const isBetween = condition.operator === 'between';
  const isGoogleOnlyMetric = googleAdsMetricOptions.some(m => m.value === condition.metric_type);

  return (
    <div className="border border-gray-200 dark:border-[#3a3a3a] rounded-lg p-4 bg-gray-50 dark:bg-dark/50">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
            Metric
          </label>
          <CustomSelect
            value={condition.metric_type}
            onChange={(value) => onChange({ ...condition, metric_type: value as MetricType })}
            options={metricOptions.map(m => ({ value: m.value, label: m.label }))}
          />
          {selectedMetric?.profitAware && (
            <p className="text-xs text-green-600 dark:text-green-400 mt-1">
              Uses real COGS data
            </p>
          )}
          {isGoogleOnlyMetric && (
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
              Google Ads metric
            </p>
          )}
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
            Operator
          </label>
          <CustomSelect
            value={condition.operator}
            onChange={(value) => onChange({ ...condition, operator: value as ConditionOperator })}
            options={operatorOptions}
          />
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
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-[#4a4a4a] rounded-lg bg-white dark:bg-dark text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent"
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
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-[#4a4a4a] rounded-lg bg-white dark:bg-dark text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent"
              placeholder="0"
            />
          </div>
        )}

        {!isBetween && (
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              Time Window
            </label>
            <CustomSelect
              value={condition.time_window_days}
              onChange={(value) =>
                onChange({ ...condition, time_window_days: Number(value) })
              }
              options={[
                { value: 1, label: 'Last 24 hours' },
                { value: 3, label: 'Last 3 days' },
                { value: 7, label: 'Last 7 days' },
                { value: 14, label: 'Last 14 days' },
                { value: 30, label: 'Last 30 days' },
              ]}
            />
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
