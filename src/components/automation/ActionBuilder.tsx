import React from 'react';
import { CustomCheckbox } from '@/components/CustomCheckbox';
import { CustomSelect } from '@/components/CustomSelect';
import type {
  RuleActionConfig,
  ActionType,
  BudgetChangeType,
  GoogleDeviceType,
  GoogleBiddingStrategyType,
  GoogleNegativeKeywordMatchType,
} from '@/types/automation';
import { GOOGLE_ADS_ACTIONS } from '@/types/automation';

interface ActionBuilderProps {
  action: RuleActionConfig;
  onChange: (action: RuleActionConfig) => void;
  platform?: 'facebook' | 'tiktok' | 'google';
}

const baseActionOptions: { value: ActionType; label: string; description: string }[] = [
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

const deviceOptions: { value: GoogleDeviceType; label: string }[] = [
  { value: 'MOBILE', label: 'Mobile' },
  { value: 'DESKTOP', label: 'Desktop' },
  { value: 'TABLET', label: 'Tablet' },
  { value: 'CONNECTED_TV', label: 'Connected TV' },
];

const biddingStrategyOptions: { value: GoogleBiddingStrategyType; label: string; description: string }[] = [
  { value: 'MANUAL_CPC', label: 'Manual CPC', description: 'Set your own max CPC bids' },
  { value: 'ENHANCED_CPC', label: 'Enhanced CPC', description: 'Auto-adjust bids for likely conversions' },
  { value: 'TARGET_CPA', label: 'Target CPA', description: 'Get conversions at target cost' },
  { value: 'TARGET_ROAS', label: 'Target ROAS', description: 'Get conversion value at target return' },
  { value: 'MAXIMIZE_CONVERSIONS', label: 'Maximize Conversions', description: 'Get most conversions in budget' },
  { value: 'MAXIMIZE_CONVERSION_VALUE', label: 'Maximize Value', description: 'Get highest value in budget' },
  { value: 'MAXIMIZE_CLICKS', label: 'Maximize Clicks', description: 'Get most clicks in budget' },
  { value: 'TARGET_IMPRESSION_SHARE', label: 'Target Impression Share', description: 'Show ads in specific position' },
];

const negativeKeywordMatchOptions: { value: GoogleNegativeKeywordMatchType; label: string }[] = [
  { value: 'BROAD', label: 'Broad Match' },
  { value: 'PHRASE', label: 'Phrase Match' },
  { value: 'EXACT', label: 'Exact Match' },
];

const dayOfWeekOptions = [
  { value: 'MONDAY', label: 'Monday' },
  { value: 'TUESDAY', label: 'Tuesday' },
  { value: 'WEDNESDAY', label: 'Wednesday' },
  { value: 'THURSDAY', label: 'Thursday' },
  { value: 'FRIDAY', label: 'Friday' },
  { value: 'SATURDAY', label: 'Saturday' },
  { value: 'SUNDAY', label: 'Sunday' },
];

const hourOptions = Array.from({ length: 24 }, (_, i) => ({
  value: i.toString(),
  label: i === 0 ? '12:00 AM' : i < 12 ? `${i}:00 AM` : i === 12 ? '12:00 PM' : `${i - 12}:00 PM`,
}));

const ActionBuilder: React.FC<ActionBuilderProps> = ({ action, onChange, platform = 'facebook' }) => {
  const isGoogle = platform === 'google';

  const actionOptions = isGoogle
    ? [...baseActionOptions, ...GOOGLE_ADS_ACTIONS.map(a => ({ value: a.value, label: a.label, description: a.description }))]
    : baseActionOptions;

  const selectedAction = actionOptions.find((a) => a.value === action.action_type);
  const showBudgetSettings = action.action_type === 'adjust_budget';
  const showNotificationSettings =
    action.action_type === 'send_notification' || action.action_type === 'pause_entity';

  const showDeviceBidSettings = action.action_type === 'adjust_device_bid';
  const showLocationBidSettings = action.action_type === 'adjust_location_bid';
  const showAudienceBidSettings = action.action_type === 'adjust_audience_bid';
  const showAdScheduleBidSettings = action.action_type === 'adjust_ad_schedule_bid';
  const showKeywordBidSettings = action.action_type === 'adjust_keyword_bid';
  const showNegativeKeywordSettings = action.action_type === 'add_negative_keyword';
  const showPlacementExclusionSettings = action.action_type === 'exclude_placement';
  const showBiddingStrategySettings = action.action_type === 'change_bidding_strategy';

  const getActionParams = () => action.action_params || {};
  const setActionParams = (params: Record<string, unknown>) => {
    onChange({ ...action, action_params: { ...getActionParams(), ...params } });
  };

  return (
    <div className="border border-gray-200 dark:border-[#3a3a3a] rounded-lg p-4 bg-gray-50 dark:bg-dark/50">
      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
            Action Type
          </label>
          <CustomSelect
            value={action.action_type}
            onChange={(value) =>
              onChange({ ...action, action_type: value as ActionType, action_params: {} })
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
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-[#4a4a4a] rounded-lg bg-white dark:bg-dark text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent"
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
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-[#4a4a4a] rounded-lg bg-white dark:bg-dark text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent"
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
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-[#4a4a4a] rounded-lg bg-white dark:bg-dark text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent"
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

        {showDeviceBidSettings && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Device Type
                </label>
                <CustomSelect
                  value={getActionParams().device_type as string || 'MOBILE'}
                  onChange={(value) => setActionParams({ device_type: value })}
                  options={deviceOptions}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Bid Adjustment (%)
                </label>
                <input
                  type="number"
                  value={getActionParams().bid_modifier_percent as number || 0}
                  onChange={(e) => setActionParams({ bid_modifier_percent: parseFloat(e.target.value) || 0 })}
                  step="5"
                  min="-90"
                  max="900"
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-[#4a4a4a] rounded-lg bg-white dark:bg-dark text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="20"
                />
              </div>
            </div>
            <div className="text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded p-2">
              {(getActionParams().bid_modifier_percent as number || 0) > 0 ? 'Increase' : 'Decrease'} bids by {Math.abs(getActionParams().bid_modifier_percent as number || 0)}% for {(getActionParams().device_type as string || 'MOBILE').toLowerCase()} devices.
              Range: -90% to +900%. Use -100% to exclude device.
            </div>
          </>
        )}

        {showLocationBidSettings && (
          <>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                Location (City, State, or Country)
              </label>
              <input
                type="text"
                value={getActionParams().location_name as string || ''}
                onChange={(e) => setActionParams({ location_name: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-[#4a4a4a] rounded-lg bg-white dark:bg-dark text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent"
                placeholder="e.g., California, New York City, United States"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                Bid Adjustment (%)
              </label>
              <input
                type="number"
                value={getActionParams().bid_modifier_percent as number || 0}
                onChange={(e) => setActionParams({ bid_modifier_percent: parseFloat(e.target.value) || 0 })}
                step="5"
                min="-90"
                max="900"
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-[#4a4a4a] rounded-lg bg-white dark:bg-dark text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent"
                placeholder="20"
              />
            </div>
            <div className="text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded p-2">
              Adjust bids by {Math.abs(getActionParams().bid_modifier_percent as number || 0)}% for users in {getActionParams().location_name as string || 'specified location'}.
            </div>
          </>
        )}

        {showAudienceBidSettings && (
          <>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                Audience Name or ID
              </label>
              <input
                type="text"
                value={getActionParams().audience_name as string || ''}
                onChange={(e) => setActionParams({ audience_name: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-[#4a4a4a] rounded-lg bg-white dark:bg-dark text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent"
                placeholder="e.g., In-Market: Auto Buyers"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Audience Type
                </label>
                <CustomSelect
                  value={getActionParams().audience_type as string || 'REMARKETING'}
                  onChange={(value) => setActionParams({ audience_type: value })}
                  options={[
                    { value: 'IN_MARKET', label: 'In-Market' },
                    { value: 'AFFINITY', label: 'Affinity' },
                    { value: 'REMARKETING', label: 'Remarketing' },
                    { value: 'SIMILAR', label: 'Similar Audiences' },
                    { value: 'CUSTOM_INTENT', label: 'Custom Intent' },
                    { value: 'COMBINED', label: 'Combined' },
                  ]}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Bid Adjustment (%)
                </label>
                <input
                  type="number"
                  value={getActionParams().bid_modifier_percent as number || 0}
                  onChange={(e) => setActionParams({ bid_modifier_percent: parseFloat(e.target.value) || 0 })}
                  step="5"
                  min="-90"
                  max="900"
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-[#4a4a4a] rounded-lg bg-white dark:bg-dark text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="30"
                />
              </div>
            </div>
          </>
        )}

        {showAdScheduleBidSettings && (
          <>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Day of Week
                </label>
                <CustomSelect
                  value={getActionParams().day_of_week as string || 'MONDAY'}
                  onChange={(value) => setActionParams({ day_of_week: value })}
                  options={dayOfWeekOptions}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Start Hour
                </label>
                <CustomSelect
                  value={(getActionParams().start_hour as number || 0).toString()}
                  onChange={(value) => setActionParams({ start_hour: parseInt(value) })}
                  options={hourOptions}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  End Hour
                </label>
                <CustomSelect
                  value={(getActionParams().end_hour as number || 23).toString()}
                  onChange={(value) => setActionParams({ end_hour: parseInt(value) })}
                  options={hourOptions}
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                Bid Adjustment (%)
              </label>
              <input
                type="number"
                value={getActionParams().bid_modifier_percent as number || 0}
                onChange={(e) => setActionParams({ bid_modifier_percent: parseFloat(e.target.value) || 0 })}
                step="5"
                min="-90"
                max="900"
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-[#4a4a4a] rounded-lg bg-white dark:bg-dark text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent"
                placeholder="25"
              />
            </div>
          </>
        )}

        {showKeywordBidSettings && (
          <>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                Keyword
              </label>
              <input
                type="text"
                value={getActionParams().keyword_text as string || ''}
                onChange={(e) => setActionParams({ keyword_text: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-[#4a4a4a] rounded-lg bg-white dark:bg-dark text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent"
                placeholder="Enter keyword"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Match Type
                </label>
                <CustomSelect
                  value={getActionParams().match_type as string || 'BROAD'}
                  onChange={(value) => setActionParams({ match_type: value })}
                  options={[
                    { value: 'BROAD', label: 'Broad Match' },
                    { value: 'PHRASE', label: 'Phrase Match' },
                    { value: 'EXACT', label: 'Exact Match' },
                  ]}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Max CPC ($)
                </label>
                <input
                  type="number"
                  value={(getActionParams().bid_micros as number || 0) / 1000000}
                  onChange={(e) => setActionParams({ bid_micros: (parseFloat(e.target.value) || 0) * 1000000 })}
                  step="0.01"
                  min="0"
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-[#4a4a4a] rounded-lg bg-white dark:bg-dark text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="2.50"
                />
              </div>
            </div>
          </>
        )}

        {showNegativeKeywordSettings && (
          <>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                Negative Keyword
              </label>
              <input
                type="text"
                value={getActionParams().keyword_text as string || ''}
                onChange={(e) => setActionParams({ keyword_text: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-[#4a4a4a] rounded-lg bg-white dark:bg-dark text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent"
                placeholder="e.g., free, cheap, discount"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Match Type
                </label>
                <CustomSelect
                  value={getActionParams().match_type as string || 'PHRASE'}
                  onChange={(value) => setActionParams({ match_type: value })}
                  options={negativeKeywordMatchOptions}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Apply At Level
                </label>
                <CustomSelect
                  value={getActionParams().level as string || 'campaign'}
                  onChange={(value) => setActionParams({ level: value })}
                  options={[
                    { value: 'campaign', label: 'Campaign Level' },
                    { value: 'ad_group', label: 'Ad Group Level' },
                  ]}
                />
              </div>
            </div>
            <div className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded p-2">
              Ads will not show for searches containing "{getActionParams().keyword_text as string || 'keyword'}" ({(getActionParams().match_type as string || 'PHRASE').toLowerCase()} match)
            </div>
          </>
        )}

        {showPlacementExclusionSettings && (
          <>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                Placement URL or Domain
              </label>
              <input
                type="text"
                value={getActionParams().placement_url as string || ''}
                onChange={(e) => setActionParams({ placement_url: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-[#4a4a4a] rounded-lg bg-white dark:bg-dark text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent"
                placeholder="e.g., example.com or mobileapp::2-com.example.app"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                Apply At Level
              </label>
              <CustomSelect
                value={getActionParams().level as string || 'campaign'}
                onChange={(value) => setActionParams({ level: value })}
                options={[
                  { value: 'campaign', label: 'Campaign Level' },
                  { value: 'ad_group', label: 'Ad Group Level' },
                ]}
              />
            </div>
            <div className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded p-2">
              Ads will be blocked from showing on {getActionParams().placement_url as string || 'specified placement'}
            </div>
          </>
        )}

        {showBiddingStrategySettings && (
          <>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                Bidding Strategy
              </label>
              <CustomSelect
                value={getActionParams().strategy_type as string || 'TARGET_CPA'}
                onChange={(value) => setActionParams({ strategy_type: value })}
                options={biddingStrategyOptions.map(s => ({ value: s.value, label: s.label }))}
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {biddingStrategyOptions.find(s => s.value === (getActionParams().strategy_type as string || 'TARGET_CPA'))?.description}
              </p>
            </div>

            {(getActionParams().strategy_type === 'TARGET_CPA' || !getActionParams().strategy_type) && (
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Target CPA ($)
                </label>
                <input
                  type="number"
                  value={(getActionParams().target_cpa_micros as number || 0) / 1000000}
                  onChange={(e) => setActionParams({ target_cpa_micros: (parseFloat(e.target.value) || 0) * 1000000 })}
                  step="0.50"
                  min="0"
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-[#4a4a4a] rounded-lg bg-white dark:bg-dark text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="25.00"
                />
              </div>
            )}

            {getActionParams().strategy_type === 'TARGET_ROAS' && (
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Target ROAS (%)
                </label>
                <input
                  type="number"
                  value={(getActionParams().target_roas as number || 0) * 100}
                  onChange={(e) => setActionParams({ target_roas: (parseFloat(e.target.value) || 0) / 100 })}
                  step="10"
                  min="0"
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-[#4a4a4a] rounded-lg bg-white dark:bg-dark text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="400"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  e.g., 400% means $4 revenue for every $1 spent
                </p>
              </div>
            )}

            {getActionParams().strategy_type === 'TARGET_IMPRESSION_SHARE' && (
              <>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                    Target Position
                  </label>
                  <CustomSelect
                    value={getActionParams().target_impression_share_location as string || 'TOP_OF_PAGE'}
                    onChange={(value) => setActionParams({ target_impression_share_location: value })}
                    options={[
                      { value: 'ANYWHERE_ON_PAGE', label: 'Anywhere on Page' },
                      { value: 'TOP_OF_PAGE', label: 'Top of Page' },
                      { value: 'ABSOLUTE_TOP_OF_PAGE', label: 'Absolute Top (Position 1)' },
                    ]}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                    Target Impression Share (%)
                  </label>
                  <input
                    type="number"
                    value={(getActionParams().target_impression_share as number || 0) * 100}
                    onChange={(e) => setActionParams({ target_impression_share: (parseFloat(e.target.value) || 0) / 100 })}
                    step="5"
                    min="0"
                    max="100"
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-[#4a4a4a] rounded-lg bg-white dark:bg-dark text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    placeholder="80"
                  />
                </div>
              </>
            )}
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
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-[#4a4a4a] rounded-lg bg-white dark:bg-dark text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent"
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
