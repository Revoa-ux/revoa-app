import React, { useState, useMemo } from 'react';
import {
  X,
  Layers,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Clock,
  AlertTriangle,
  Sparkles,
  ChevronRight,
  Zap,
  ArrowRightLeft,
  Target,
  BarChart3
} from 'lucide-react';
import Modal from '@/components/Modal';
import type { RexSuggestion, RexSuggestionCategory } from '@/types/rex';
import { PLATFORM_COLORS, PLATFORM_LABELS, type AdPlatform } from '@/types/crossPlatform';

interface CrossPlatformRexModalProps {
  isOpen: boolean;
  onClose: () => void;
  suggestions: RexSuggestion[];
  filter?: RexSuggestionCategory;
  onExecuteAction?: (suggestion: RexSuggestion, actionType: string) => Promise<void>;
  onDismiss?: (suggestion: RexSuggestion, reason?: string) => Promise<void>;
  onCreateRule?: (suggestion: RexSuggestion) => Promise<void>;
}

const CROSS_PLATFORM_TYPE_INFO: Record<string, { icon: any; label: string; description: string }> = {
  // Cross-platform specific types
  cross_platform_budget_reallocation: {
    icon: ArrowRightLeft,
    label: 'Budget Reallocation',
    description: 'Optimize budget distribution across platforms'
  },
  cross_platform_time_optimization: {
    icon: Clock,
    label: 'Time Optimization',
    description: 'Adjust ad schedules based on platform performance'
  },
  cross_platform_trend_alert: {
    icon: TrendingUp,
    label: 'Trend Alert',
    description: 'Significant performance trend detected'
  },
  cross_platform_efficiency_opportunity: {
    icon: Target,
    label: 'Efficiency Opportunity',
    description: 'Improve overall cross-platform efficiency'
  },
  // Common campaign-level types
  adjust_targeting: {
    icon: Target,
    label: 'Adjust Targeting',
    description: 'Optimize your audience targeting'
  },
  refresh_creative: {
    icon: Sparkles,
    label: 'Refresh Creative',
    description: 'Update creative assets to improve performance'
  },
  increase_budget: {
    icon: TrendingUp,
    label: 'Scale',
    description: 'Increase budget for high performers'
  },
  scale_high_performer: {
    icon: TrendingUp,
    label: 'Scale',
    description: 'Scale budget for this high performer'
  },
  pause_underperforming: {
    icon: AlertTriangle,
    label: 'Pause',
    description: 'Pause underperforming entity'
  },
  pause_negative_roi: {
    icon: AlertTriangle,
    label: 'Pause',
    description: 'Pause entity with negative ROI'
  },
  review_underperformer: {
    icon: BarChart3,
    label: 'Review',
    description: 'Review underperforming entity'
  },
  optimize_campaign: {
    icon: Zap,
    label: 'Optimize',
    description: 'Optimize campaign settings'
  },
  switch_to_abo: {
    icon: ArrowRightLeft,
    label: 'Switch to ABO',
    description: 'Switch to Ad Set Budget Optimization'
  }
};

export const CrossPlatformRexModal: React.FC<CrossPlatformRexModalProps> = ({
  isOpen,
  onClose,
  suggestions,
  filter,
  onExecuteAction,
  onDismiss,
  onCreateRule
}) => {
  const [selectedSuggestion, setSelectedSuggestion] = useState<RexSuggestion | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'cross_platform' | 'campaign_level'>(filter || 'all');

  const filteredSuggestions = useMemo(() => {
    if (activeTab === 'all') return suggestions;
    return suggestions.filter(s => s.suggestion_category === activeTab);
  }, [suggestions, activeTab]);

  const crossPlatformSuggestions = useMemo(() => {
    return suggestions.filter(s => s.suggestion_category === 'cross_platform');
  }, [suggestions]);

  const campaignSuggestions = useMemo(() => {
    return suggestions.filter(s => s.suggestion_category !== 'cross_platform');
  }, [suggestions]);

  const formatCurrency = (value: number) =>
    `$${Math.abs(value).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  const handleAction = async (suggestion: RexSuggestion, actionType: string) => {
    if (!onExecuteAction) return;
    setIsProcessing(true);
    try {
      await onExecuteAction(suggestion, actionType);
    } catch (error) {
      console.error('Action failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDismiss = async (suggestion: RexSuggestion) => {
    if (!onDismiss) return;
    setIsProcessing(true);
    try {
      await onDismiss(suggestion);
      setSelectedSuggestion(null);
    } catch (error) {
      console.error('Dismiss failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const getPlatformsFromSuggestion = (suggestion: RexSuggestion): AdPlatform[] => {
    const platforms: AdPlatform[] = [];
    const platform = suggestion.platform?.toLowerCase();
    if (platform === 'facebook' || platform === 'meta') platforms.push('facebook');
    if (platform === 'google') platforms.push('google');
    if (platform === 'tiktok') platforms.push('tiktok');

    if (suggestion.suggestion_category === 'cross_platform' && platforms.length === 0) {
      return ['facebook', 'google', 'tiktok'];
    }
    return platforms.length > 0 ? platforms : ['facebook'];
  };

  const renderSuggestionCard = (suggestion: RexSuggestion) => {
    const typeInfo = CROSS_PLATFORM_TYPE_INFO[suggestion.suggestion_type] || {
      icon: Sparkles,
      label: suggestion.suggestion_type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      description: ''
    };
    const Icon = typeInfo.icon;
    const platforms = getPlatformsFromSuggestion(suggestion);
    const isCrossPlatform = suggestion.suggestion_category === 'cross_platform';
    const isSelected = selectedSuggestion?.id === suggestion.id;

    return (
      <button
        key={suggestion.id}
        onClick={() => setSelectedSuggestion(isSelected ? null : suggestion)}
        className={`w-full text-left p-4 rounded-xl border-2 transition-all hover:shadow-lg ${
          isSelected
            ? 'border-rose-400 dark:border-rose-500 bg-rose-50/50 dark:bg-rose-900/10'
            : 'border-gray-200 dark:border-[#3a3a3a] bg-white dark:bg-dark hover:border-gray-300 dark:hover:border-gray-600'
        }`}
      >
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg ${
            isCrossPlatform
              ? 'bg-gradient-to-br from-blue-500/10 to-emerald-500/10'
              : 'bg-gray-100 dark:bg-[#3a3a3a]'
          }`}>
            <Icon className={`w-5 h-5 ${
              isCrossPlatform ? 'text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400'
            }`} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                {suggestion.title}
              </h4>
              {suggestion.priority_score >= 80 && (
                <span className="px-1.5 py-0.5 text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded">
                  High Priority
                </span>
              )}
            </div>

            <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 mb-2">
              {suggestion.message}
            </p>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                {platforms.map(platform => (
                  <span
                    key={platform}
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: PLATFORM_COLORS[platform] }}
                    title={PLATFORM_LABELS[platform]}
                  />
                ))}
              </div>

              {suggestion.estimated_impact && (
                <span className={`text-xs font-medium ${
                  (suggestion.estimated_impact.expectedProfit || 0) > 0
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-gray-600 dark:text-gray-400'
                }`}>
                  {(suggestion.estimated_impact.expectedProfit || 0) > 0 ? '+' : ''}
                  {formatCurrency(suggestion.estimated_impact.expectedProfit || 0)}
                </span>
              )}

              <span className="text-xs text-gray-500 dark:text-gray-500">
                {suggestion.confidence_score}% confidence
              </span>

              <ChevronRight className={`w-4 h-4 ml-auto text-gray-400 transition-transform ${
                isSelected ? 'rotate-90' : ''
              }`} />
            </div>
          </div>
        </div>

        {isSelected && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-[#3a3a3a] space-y-4">
            <div className="bg-gray-50 dark:bg-[#3a3a3a]/50 rounded-lg p-3">
              <h5 className="text-xs font-semibold text-gray-900 dark:text-white mb-2">Analysis</h5>
              <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">
                {suggestion.reasoning.analysis}
              </p>
            </div>

            {suggestion.reasoning.metrics && Object.keys(suggestion.reasoning.metrics).length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {Object.entries(suggestion.reasoning.metrics).slice(0, 3).map(([key, value]) => (
                  <div key={key} className="bg-gray-50 dark:bg-[#3a3a3a]/50 rounded-lg p-2">
                    <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {key.replace(/_/g, ' ')}
                    </div>
                    <div className="text-sm font-semibold text-gray-900 dark:text-white">
                      {typeof value === 'number' ? value.toFixed(2) : value}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleAction(suggestion, suggestion.suggestion_type);
                }}
                disabled={isProcessing}
                className="btn btn-danger flex-1"
              >
                <Zap className="btn-icon" />
                Take Action
              </button>

              {onCreateRule && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onCreateRule(suggestion);
                  }}
                  disabled={isProcessing}
                  className="btn btn-secondary"
                >
                  Create Rule
                </button>
              )}

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDismiss(suggestion);
                }}
                disabled={isProcessing}
                className="btn btn-ghost"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}
      </button>
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="max-w-4xl">
      <div className="max-h-[85vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-6 border-b border-gray-200 dark:border-[#3a3a3a]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-rose-500/10 to-pink-500/10 rounded-lg">
              <Sparkles className="w-5 h-5 text-rose-500" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Revoa AI Insights</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {filteredSuggestions.length} {filter === 'cross_platform' ? 'cross-platform' : ''} suggestions
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#3a3a3a] rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center gap-2 px-6 py-3 border-b border-gray-200 dark:border-[#3a3a3a] bg-gray-50 dark:bg-[#3a3a3a]/50">
          <button
            onClick={() => setActiveTab('all')}
            className={activeTab === 'all' ? 'btn btn-secondary' : 'btn btn-ghost'}
          >
            All ({suggestions.length})
          </button>
          <button
            onClick={() => setActiveTab('cross_platform')}
            className={activeTab === 'cross_platform' ? 'btn btn-secondary' : 'btn btn-ghost'}
          >
            <Layers className="btn-icon" />
            Cross-Platform ({crossPlatformSuggestions.length})
          </button>
          <button
            onClick={() => setActiveTab('campaign_level')}
            className={activeTab === 'campaign_level' ? 'btn btn-secondary' : 'btn btn-ghost'}
          >
            <BarChart3 className="btn-icon" />
            Campaign ({campaignSuggestions.length})
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {filteredSuggestions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="inline-flex items-center justify-center p-0.5 backdrop-blur-sm rounded-full shadow-sm mb-4" style={{ backgroundColor: 'rgba(107, 114, 128, 0.15)' }}>
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center"
                  style={{
                    backgroundColor: '#6B7280',
                    boxShadow: 'inset 0px 3px 10px 0px rgba(255,255,255,0.4), inset 0px -2px 3px 0px rgba(0,0,0,0.2)'
                  }}
                >
                  <Sparkles className="w-8 h-8 text-white" strokeWidth={2.5} />
                </div>
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No {activeTab === 'cross_platform' ? 'Cross-Platform ' : activeTab === 'campaign_level' ? 'Campaign ' : ''}Suggestions
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md">
                {activeTab === 'cross_platform'
                  ? 'Revoa AI is analyzing your cross-platform performance. Check back soon for insights.'
                  : 'Revoa AI is analyzing your campaigns. New suggestions will appear here.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredSuggestions.map(renderSuggestionCard)}
            </div>
          )}
        </div>

        {filteredSuggestions.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-200 dark:border-[#3a3a3a] bg-gray-50 dark:bg-[#3a3a3a]/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: PLATFORM_COLORS.facebook }} />
                  <span>{PLATFORM_LABELS.facebook}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: PLATFORM_COLORS.google }} />
                  <span>{PLATFORM_LABELS.google}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: PLATFORM_COLORS.tiktok }} />
                  <span>{PLATFORM_LABELS.tiktok}</span>
                </div>
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-500">
                Powered by Revoa AI
              </span>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
