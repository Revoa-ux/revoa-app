import React, { useState, useEffect, useRef } from 'react';
import { TrendingUp, AlertTriangle, Target, DollarSign, CheckCircle2, Zap, Pause, TrendingDown, Copy, Settings, X } from 'lucide-react';
import type { RexSuggestionWithPerformance } from '@/types/rex';

interface ExpandedSuggestionRowProps {
  suggestion: RexSuggestionWithPerformance;
  onAccept: () => Promise<void>;
  onDismiss: (reason?: string) => Promise<void>;
  onClose: () => void;
}

export const ExpandedSuggestionRow: React.FC<ExpandedSuggestionRowProps> = ({
  suggestion,
  onAccept,
  onDismiss,
  onClose
}) => {
  const [isAccepting, setIsAccepting] = useState(false);
  const [isDismissing, setIsDismissing] = useState(false);
  const [isExecutingAction, setIsExecutingAction] = useState(false);
  const [showDismissReason, setShowDismissReason] = useState(false);
  const [dismissReason, setDismissReason] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setTimeout(() => setIsExpanded(true), 10);
    if (contentRef.current) {
      contentRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, []);

  const handleAccept = async () => {
    setIsAccepting(true);
    try {
      await onAccept();
      onClose();
    } catch (error) {
      console.error('Error accepting suggestion:', error);
    } finally {
      setIsAccepting(false);
    }
  };

  const handleDismiss = async () => {
    setIsDismissing(true);
    try {
      await onDismiss(dismissReason || undefined);
      onClose();
    } catch (error) {
      console.error('Error dismissing suggestion:', error);
    } finally {
      setIsDismissing(false);
    }
  };

  const handleImmediateAction = async () => {
    setIsExecutingAction(true);
    try {
      console.log('Executing action:', suggestion.suggestion_type);
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      console.error('Error executing action:', error);
    } finally {
      setIsExecutingAction(false);
    }
  };

  const getActionButton = () => {
    const actionMap: Record<string, { label: string; icon: any }> = {
      pause_underperforming: { label: 'Pause Now', icon: Pause },
      scale_high_performer: { label: 'Scale Budget', icon: TrendingUp },
      refresh_creative: { label: 'Duplicate & Refresh', icon: Copy },
      adjust_targeting: { label: 'Adjust Targeting', icon: Target },
      reduce_budget: { label: 'Reduce Budget', icon: TrendingDown },
      increase_budget: { label: 'Increase Budget', icon: TrendingUp },
      pause_negative_roi: { label: 'Pause Now', icon: Pause },
      reallocate_budget: { label: 'Reallocate', icon: Zap },
      test_new_creative: { label: 'Start Test', icon: Zap },
      optimize_schedule: { label: 'Optimize', icon: Settings },
      pause_entity: { label: 'Pause Now', icon: Pause },
    };

    const action = actionMap[suggestion.suggestion_type];
    if (!action) return null;

    const Icon = action.icon;
    return (
      <button
        onClick={handleImmediateAction}
        disabled={isExecutingAction}
        className="flex items-center gap-2 px-6 py-3 text-sm font-medium text-white bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
      >
        <Icon className="w-4 h-4" />
        <span>{isExecutingAction ? 'Executing...' : action.label}</span>
      </button>
    );
  };

  const formatMetricLabel = (key: string): string => {
    const abbreviations: Record<string, string> = {
      ctr: 'CTR',
      cpa: 'CPA',
      roas: 'ROAS',
      roi: 'ROI',
      cpc: 'CPC',
      cpm: 'CPM',
    };

    const lowerKey = key.toLowerCase();
    if (abbreviations[lowerKey]) {
      return abbreviations[lowerKey];
    }

    return key.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
  };

  const getConfidenceLabel = (score: number) => {
    if (score >= 90) return { label: 'Very High', color: 'text-gray-900 dark:text-white' };
    if (score >= 75) return { label: 'High', color: 'text-gray-900 dark:text-white' };
    if (score >= 60) return { label: 'Moderate', color: 'text-gray-600 dark:text-gray-400' };
    return { label: 'Low', color: 'text-gray-600 dark:text-gray-400' };
  };

  const confidence = getConfidenceLabel(suggestion.confidence_score);
  const canAccept = suggestion.status === 'pending' || suggestion.status === 'viewed';
  const canDismiss = suggestion.status !== 'dismissed' && suggestion.status !== 'expired' && suggestion.status !== 'completed';

  return (
    <div
      ref={contentRef}
      className={`transition-all duration-300 ease-in-out overflow-hidden ${
        isExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
      }`}
    >
      <div className="relative bg-white/60 dark:bg-gray-900/60 backdrop-blur-xl rounded-b-lg shadow-xl">
        {/* Dismiss Reason Prompt */}
        {showDismissReason && (
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <input
                type="text"
                placeholder="Why are you dismissing this? (optional)"
                value={dismissReason}
                onChange={(e) => setDismissReason(e.target.value)}
                className="flex-1 px-4 py-2 text-sm bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 dark:focus:ring-red-400"
                autoFocus
              />
              <button
                onClick={() => {
                  setShowDismissReason(false);
                  setDismissReason('');
                }}
                className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDismiss}
                disabled={isDismissing}
                className="px-4 py-2 text-sm font-medium text-white bg-gray-600 hover:bg-gray-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isDismissing ? 'Dismissing...' : 'Confirm'}
              </button>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="p-6 space-y-6">
          {/* Dismiss Link at Top */}
          {canDismiss && !showDismissReason && (
            <div className="flex justify-end">
              <button
                onClick={() => setShowDismissReason(true)}
                disabled={isDismissing}
                className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 underline transition-colors"
              >
                Dismiss suggestion
              </button>
            </div>
          )}
          {/* Top Stats Row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-red-50 dark:bg-red-900/20">
                <Target className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  AI Confidence
                </div>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className={`text-xl font-bold ${confidence.color}`}>
                    {suggestion.confidence_score}%
                  </span>
                  <span className={`text-xs ${confidence.color}`}>
                    {confidence.label}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-red-50 dark:bg-red-900/20">
                <AlertTriangle className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Priority Score
                </div>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="text-xl font-bold text-gray-900 dark:text-white">
                    {suggestion.priority_score}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    / 100
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-gray-200 dark:border-gray-700"></div>

          {/* Recommended Action Section */}
          {canAccept && (
            <div className="space-y-3">
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                Recommended Action
              </h4>
              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                <span className="font-medium">AI recommends:</span> {suggestion.description}
              </p>
              <div className="pt-2">
                {getActionButton()}
              </div>
            </div>
          )}

          {/* Pattern Recognition */}
          <div className="space-y-3">
            <h4 className="text-base font-semibold text-gray-900 dark:text-white">
              Analysis
            </h4>
            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
              {suggestion.reasoning.analysis}
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              {Object.entries(suggestion.reasoning.metrics).map(([key, value]) => (
                <div key={key} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1 font-medium">
                    {formatMetricLabel(key)}
                  </div>
                  <div className="text-base font-bold text-gray-900 dark:text-white">
                    {typeof value === 'number' ?
                      (key.toLowerCase().includes('percentage') || key.toLowerCase().includes('score') || key.toLowerCase().includes('ctr') ?
                        `${value.toFixed(1)}%` :
                        key.toLowerCase().includes('spend') || key.toLowerCase().includes('profit') || key.toLowerCase().includes('revenue') ?
                          `$${value.toFixed(2)}` :
                          value.toLocaleString())
                      : value}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Financial Impact */}
          {suggestion.estimated_impact && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  Financial Impact
                </h4>
                <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-full font-medium">
                  {suggestion.estimated_impact.timeframeDays}d forecast
                </span>
              </div>

              <div className="p-4 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/50 rounded-lg">
                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                  {suggestion.estimated_impact.breakdown}
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {suggestion.estimated_impact.expectedSavings !== undefined && (
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Savings</div>
                    <div className="text-lg font-bold text-green-600 dark:text-green-400">
                      ${suggestion.estimated_impact.expectedSavings.toFixed(2)}
                    </div>
                  </div>
                )}
                {suggestion.estimated_impact.expectedRevenue !== undefined && (
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Revenue</div>
                    <div className="text-lg font-bold text-gray-900 dark:text-white">
                      ${suggestion.estimated_impact.expectedRevenue.toFixed(2)}
                    </div>
                  </div>
                )}
                {suggestion.estimated_impact.expectedProfit !== undefined && (
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Profit</div>
                    <div className="text-lg font-bold text-gray-900 dark:text-white">
                      ${suggestion.estimated_impact.expectedProfit.toFixed(2)}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Performance Tracking */}
          {suggestion.performance && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Performance Impact
                </h4>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                  suggestion.performance.is_improving
                    ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400'
                    : 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400'
                }`}>
                  {suggestion.performance.is_improving ? 'Improving' : 'Declining'}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Profit Change</div>
                  <div className={`text-lg font-bold ${
                    suggestion.performance.profit_delta > 0
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-red-600 dark:text-red-400'
                  }`}>
                    {suggestion.performance.profit_delta > 0 ? '+' : ''}${suggestion.performance.profit_delta.toFixed(2)}
                  </div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">ROAS Change</div>
                  <div className={`text-lg font-bold ${
                    suggestion.performance.roas_delta > 0
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-red-600 dark:text-red-400'
                  }`}>
                    {suggestion.performance.roas_delta > 0 ? '+' : ''}{suggestion.performance.roas_delta.toFixed(2)}x
                  </div>
                </div>
                {suggestion.performance.performance_change_percent && (
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Overall</div>
                    <div className={`text-lg font-bold ${
                      suggestion.performance.performance_change_percent > 0
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-red-600 dark:text-red-400'
                    }`}>
                      {suggestion.performance.performance_change_percent > 0 ? '+' : ''}{suggestion.performance.performance_change_percent.toFixed(1)}%
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Automated Rule Section */}
          {suggestion.recommended_rule && canAccept && (
            <div className="space-y-3 pt-2 border-t border-gray-200 dark:border-gray-700">
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                Set Up Automation
              </h4>
              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                <span className="font-medium">Let AI manage this automatically:</span> {suggestion.recommended_rule.description}
              </p>
              <div className="flex flex-wrap gap-2 text-xs text-gray-600 dark:text-gray-400">
                <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-gray-800 px-3 py-1.5 rounded-lg">
                  <Zap className="w-3 h-3" />
                  <span>Every {suggestion.recommended_rule.check_frequency_minutes}min</span>
                </div>
                <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-gray-800 px-3 py-1.5 rounded-lg">
                  <Target className="w-3 h-3" />
                  <span>Max {suggestion.recommended_rule.max_daily_actions}/day</span>
                </div>
                {suggestion.recommended_rule.require_approval && (
                  <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-gray-800 px-3 py-1.5 rounded-lg">
                    <AlertTriangle className="w-3 h-3" />
                    <span>Requires approval</span>
                  </div>
                )}
              </div>

              <button
                onClick={handleAccept}
                disabled={isAccepting}
                className="flex items-center gap-2 px-6 py-3 text-sm font-medium text-white bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 rounded-lg shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:shadow-lg"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isAccepting ? 'Creating...' : 'Create Automated Rule'}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
