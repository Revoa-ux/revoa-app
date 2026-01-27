import React, { useState, useEffect, useRef } from 'react';
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Target,
  DollarSign,
  Zap,
  Pause,
  Copy,
  Settings,
  Users,
  MapPin,
  Clock,
  Smartphone,
  Brain,
  BarChart3,
  X
} from 'lucide-react';
import type { RexSuggestionWithPerformance } from '@/types/rex';

interface IntelligentSuggestionDropdownProps {
  suggestion: RexSuggestionWithPerformance;
  onAccept: () => Promise<void>;
  onDismiss: (reason?: string) => Promise<void>;
  onClose: () => void;
}

export const IntelligentSuggestionDropdown: React.FC<IntelligentSuggestionDropdownProps> = ({
  suggestion,
  onAccept,
  onDismiss,
  onClose
}) => {
  const [isAccepting, setIsAccepting] = useState(false);
  const [isDismissing, setIsDismissing] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setTimeout(() => setIsExpanded(true), 10);
  }, []);

  const handleAccept = async () => {
    setIsAccepting(true);
    try {
      await onAccept();
    } catch (error) {
      console.error('Error accepting suggestion:', error);
    } finally {
      setIsAccepting(false);
    }
  };

  const handleDismiss = async () => {
    setIsDismissing(true);
    try {
      await onDismiss();
    } catch (error) {
      console.error('Error dismissing suggestion:', error);
    } finally {
      setIsDismissing(false);
    }
  };

  const getActionButton = () => {
    const actionMap: Record<string, { label: string; icon: any }> = {
      pause_underperforming: { label: 'Pause Now', icon: Pause },
      scale_high_performer: { label: 'Increase Budget', icon: TrendingUp },
      refresh_creative: { label: 'Duplicate & Refresh', icon: Copy },
      adjust_targeting: { label: 'Adjust Targeting', icon: Target },
      reduce_budget: { label: 'Reduce Budget', icon: TrendingDown },
      increase_budget: { label: 'Increase Budget', icon: TrendingUp },
      pause_negative_roi: { label: 'Pause Now', icon: Pause },
      review_underperformer: { label: 'Review Performance', icon: Settings },
      optimize_campaign: { label: 'Optimize Campaign', icon: Settings },
      switch_to_abo: { label: 'Switch to ABO', icon: Settings },
      reallocate_budget: { label: 'Reallocate', icon: Zap },
      test_new_creative: { label: 'Start Test', icon: Zap },
      optimize_schedule: { label: 'Optimize', icon: Settings },
      pause_entity: { label: 'Pause Now', icon: Pause },
      optimize_demographics: { label: 'Optimize Audience', icon: Users },
      optimize_placements: { label: 'Optimize Placements', icon: Smartphone },
      optimize_geographic: { label: 'Adjust Geo-Targeting', icon: MapPin },
      enable_dayparting: { label: 'Enable Dayparting', icon: Clock },
      expand_winning_region: { label: 'Scale Region', icon: MapPin },
      target_high_ltv_segment: { label: 'Create Lookalike', icon: Target },
    };

    const action = actionMap[suggestion.suggestion_type] || { label: 'Take Action', icon: Zap };
    const Icon = action.icon;

    return (
      <button
        onClick={handleAccept}
        disabled={isAccepting}
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm text-white bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
      >
        <Icon className="w-4 h-4" />
        <span>{isAccepting ? 'Processing...' : action.label}</span>
      </button>
    );
  };

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'high':
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      case 'medium':
        return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'low':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-[#3a3a3a] dark:text-gray-400';
    }
  };

  const demographics = suggestion.reasoning.supportingData?.demographics;
  const placements = suggestion.reasoning.supportingData?.placements;
  const geographic = suggestion.reasoning.supportingData?.geographic;
  const temporal = suggestion.reasoning.supportingData?.temporal;

  const topDemographics = demographics?.slice(0, 3) || [];
  const topPlacements = placements?.slice(0, 3) || [];
  const topRegions = geographic?.slice(0, 3) || [];
  const topTimes = temporal?.slice(0, 3) || [];

  const formatCurrency = (value: number) => `$${Math.abs(value).toFixed(2)}`;
  const formatPercentage = (value: number) => `${value.toFixed(1)}%`;

  return (
    <div
      ref={contentRef}
      className={`transition-all duration-300 ease-in-out overflow-hidden ${
        isExpanded ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'
      }`}
    >
      <div className="bg-white dark:bg-dark border-x border-b border-gray-200 dark:border-[#3a3a3a]">
        {/* Header Section with Gradient */}
        <div className="bg-gradient-to-r from-red-50 via-pink-50 to-orange-50 dark:from-red-900/20 dark:via-pink-900/20 dark:to-orange-900/20 px-6 py-4 border-b border-gray-200 dark:border-[#3a3a3a]">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <Brain className="w-5 h-5 text-red-500" />
                <h3 className="text-base font-semibold text-gray-900 dark:text-white">What I Found</h3>
              </div>
              {suggestion.reasoning.primaryInsight && (
                <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                  {suggestion.reasoning.primaryInsight}
                </p>
              )}
              <p className="text-sm text-gray-700 dark:text-gray-300">
                {suggestion.message}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#3a3a3a] rounded-lg transition-colors flex-shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Main Content - Fixed Height Grid */}
        <div className="px-6 py-4">
          <div className="grid grid-cols-3 gap-4" style={{ height: '340px' }}>
            {/* Left Column: 2x2 Breakdown Cards (60% width) */}
            <div className="col-span-2 grid grid-cols-2 gap-3">
              {/* Demographics Card */}
              <div className="bg-gray-50 dark:bg-dark/50 rounded-lg p-3 border border-gray-200 dark:border-[#3a3a3a]">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="w-4 h-4 text-blue-500" />
                  <h4 className="text-xs font-semibold text-gray-900 dark:text-white">Top Demographics</h4>
                </div>
                <div className="space-y-1.5">
                  {topDemographics.length > 0 ? topDemographics.map((demo, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs">
                      <span className="text-gray-700 dark:text-gray-300 truncate">{demo.segment}</span>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-gray-600 dark:text-gray-400">{demo.roas?.toFixed(1)}x</span>
                        <span className="text-gray-500 dark:text-gray-500">({formatPercentage(demo.contribution)})</span>
                      </div>
                    </div>
                  )) : (
                    <p className="text-xs text-gray-500 dark:text-gray-400">No data available</p>
                  )}
                </div>
              </div>

              {/* Placements Card */}
              <div className="bg-gray-50 dark:bg-dark/50 rounded-lg p-3 border border-gray-200 dark:border-[#3a3a3a]">
                <div className="flex items-center gap-2 mb-2">
                  <Smartphone className="w-4 h-4 text-purple-500" />
                  <h4 className="text-xs font-semibold text-gray-900 dark:text-white">Top Placements</h4>
                </div>
                <div className="space-y-1.5">
                  {topPlacements.length > 0 ? topPlacements.map((placement, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs">
                      <span className="text-gray-700 dark:text-gray-300 truncate">{placement.placement}</span>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-gray-600 dark:text-gray-400">{placement.roas?.toFixed(1)}x</span>
                        <span className="text-gray-500 dark:text-gray-500">({formatPercentage(placement.contribution)})</span>
                      </div>
                    </div>
                  )) : (
                    <p className="text-xs text-gray-500 dark:text-gray-400">No data available</p>
                  )}
                </div>
              </div>

              {/* Geographic Card */}
              <div className="bg-gray-50 dark:bg-dark/50 rounded-lg p-3 border border-gray-200 dark:border-[#3a3a3a]">
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="w-4 h-4 text-green-500" />
                  <h4 className="text-xs font-semibold text-gray-900 dark:text-white">Top Regions</h4>
                </div>
                <div className="space-y-1.5">
                  {topRegions.length > 0 ? topRegions.map((region, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs">
                      <span className="text-gray-700 dark:text-gray-300 truncate">{region.region}</span>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-gray-600 dark:text-gray-400">{region.roas?.toFixed(1)}x</span>
                        <span className="text-gray-500 dark:text-gray-500">({formatPercentage(region.contribution)})</span>
                      </div>
                    </div>
                  )) : (
                    <p className="text-xs text-gray-500 dark:text-gray-400">No data available</p>
                  )}
                </div>
              </div>

              {/* Temporal Card */}
              <div className="bg-gray-50 dark:bg-dark/50 rounded-lg p-3 border border-gray-200 dark:border-[#3a3a3a]">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4 text-orange-500" />
                  <h4 className="text-xs font-semibold text-gray-900 dark:text-white">Best Times</h4>
                </div>
                <div className="space-y-1.5">
                  {topTimes.length > 0 ? topTimes.map((time, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs">
                      <span className="text-gray-700 dark:text-gray-300 truncate">{time.period}</span>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-gray-600 dark:text-gray-400">{time.roas?.toFixed(1)}x</span>
                        <span className="text-gray-500 dark:text-gray-500">({formatPercentage(time.contribution)})</span>
                      </div>
                    </div>
                  )) : (
                    <p className="text-xs text-gray-500 dark:text-gray-400">No data available</p>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column: Metrics & Actions (40% width) */}
            <div className="space-y-3">
              {/* AI Confidence */}
              <div className="bg-white dark:bg-dark rounded-lg p-3 border border-gray-200 dark:border-[#3a3a3a]">
                <div className="flex items-center gap-2 mb-1">
                  <BarChart3 className="w-4 h-4 text-gray-500" />
                  <span className="text-xs font-medium text-gray-600 dark:text-gray-400">AI Confidence</span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-gray-900 dark:text-white">
                    {suggestion.confidence_score}%
                  </span>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {suggestion.confidence_score >= 75 ? 'High' : suggestion.confidence_score >= 60 ? 'Moderate' : 'Low'}
                  </span>
                </div>
              </div>

              {/* Priority Score */}
              <div className="bg-white dark:bg-dark rounded-lg p-3 border border-gray-200 dark:border-[#3a3a3a]">
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle className="w-4 h-4 text-gray-500" />
                  <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Priority</span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-gray-900 dark:text-white">
                    {suggestion.priority_score}
                  </span>
                  <span className="text-sm text-gray-600 dark:text-gray-400">/ 100</span>
                </div>
              </div>

              {/* Key Metrics */}
              <div className="bg-white dark:bg-dark rounded-lg p-3 border border-gray-200 dark:border-[#3a3a3a]">
                <h4 className="text-xs font-semibold text-gray-900 dark:text-white mb-2">Key Metrics</h4>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Current ROAS</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {suggestion.performance?.current_roas?.toFixed(2) || '0.00'}x
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Current CPA</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {formatCurrency(suggestion.performance?.current_cpa || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Daily Spend</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {formatCurrency(suggestion.performance?.daily_spend || 0)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div>
                {getActionButton()}
              </div>

              {/* Dismiss Button */}
              <button
                onClick={handleDismiss}
                disabled={isDismissing}
                className="w-full px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white border border-gray-300 dark:border-[#4a4a4a] hover:border-gray-400 dark:hover:border-gray-500 rounded-lg font-medium transition-all disabled:opacity-50"
              >
                {isDismissing ? 'Dismissing...' : 'Dismiss'}
              </button>
            </div>
          </div>

          {/* Financial Impact - Bottom Section */}
          <div className="mt-4 grid grid-cols-2 gap-3 pt-3 border-t border-gray-200 dark:border-[#3a3a3a]">
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 border border-green-200 dark:border-green-800">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400" />
                <span className="text-xs font-medium text-green-700 dark:text-green-300">If Implemented</span>
              </div>
              <div className="text-lg font-bold text-green-700 dark:text-green-300">
                +{formatCurrency(suggestion.estimated_impact?.revenue_impact || 0)}
              </div>
              <div className="text-xs text-green-600 dark:text-green-400">
                Projected 30-day revenue increase
              </div>
            </div>

            <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3 border border-red-200 dark:border-red-800">
              <div className="flex items-center gap-2 mb-1">
                <TrendingDown className="w-4 h-4 text-red-600 dark:text-red-400" />
                <span className="text-xs font-medium text-red-700 dark:text-red-300">If Ignored</span>
              </div>
              <div className="text-lg font-bold text-red-700 dark:text-red-300">
                -{formatCurrency(suggestion.estimated_impact?.cost_if_ignored || 0)}
              </div>
              <div className="text-xs text-red-600 dark:text-red-400">
                Potential 30-day loss from inaction
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
