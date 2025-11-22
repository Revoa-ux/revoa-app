import React, { useState } from 'react';
import { X, Sparkles, TrendingUp, AlertTriangle, Target, DollarSign, CheckCircle2, XCircle, Zap, Pause, TrendingDown, Copy, Settings } from 'lucide-react';
import type { RexSuggestionWithPerformance } from '@/types/rex';

interface RexSuggestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  suggestion: RexSuggestionWithPerformance;
  onAccept: () => Promise<void>;
  onDismiss: (reason?: string) => Promise<void>;
}

export const RexSuggestionModal: React.FC<RexSuggestionModalProps> = ({
  isOpen,
  onClose,
  suggestion,
  onAccept,
  onDismiss
}) => {
  const [isAccepting, setIsAccepting] = useState(false);
  const [isDismissing, setIsDismissing] = useState(false);
  const [isExecutingAction, setIsExecutingAction] = useState(false);
  const [showDismissReason, setShowDismissReason] = useState(false);
  const [dismissReason, setDismissReason] = useState('');

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
      await onDismiss(dismissReason);
      onClose();
    } catch (error) {
      console.error('Error dismissing suggestion:', error);
    } finally {
      setIsDismissing(false);
      setShowDismissReason(false);
      setDismissReason('');
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
    };

    const action = actionMap[suggestion.suggestion_type];
    if (!action) return null;

    const Icon = action.icon;
    return (
      <button
        onClick={handleImmediateAction}
        disabled={isExecutingAction}
        className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
      >
        <Icon className="w-4 h-4" />
        <span>{isExecutingAction ? 'Executing...' : action.label}</span>
      </button>
    );
  };

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'high':
        return 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30';
      case 'medium':
        return 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700';
      case 'low':
        return 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700';
      default:
        return 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700';
    }
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" aria-hidden="true" />

      <div className="min-h-full flex items-center justify-center p-4">
        <div className="relative bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="bg-gradient-to-r from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-start justify-between">
            <div className="flex items-start gap-3 flex-1">
              <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center shadow-md">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-1.5">
                  {suggestion.title}
                </h2>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {suggestion.entity_type === 'campaign' ? 'Campaign' : suggestion.entity_type === 'ad_set' ? 'Ad Set' : 'Ad'}: {suggestion.entity_name}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getRiskLevelColor(suggestion.reasoning.riskLevel)}`}>
                    {suggestion.reasoning.riskLevel} risk
                  </span>
                  {suggestion.priority_score >= 85 && (
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                      High Priority
                    </span>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content - Scrollable */}
          <div className="flex-1 overflow-y-auto px-6 py-5">
            <div className="space-y-5">
              {/* AI Intelligence Analysis Card with Action Button */}
              <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-xl p-5">
                <div className="flex items-start gap-2 mb-3">
                  <Sparkles className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                    AI Intelligence Analysis
                  </h3>
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                  {suggestion.message}
                </p>
                {canAccept && getActionButton()}
              </div>

              {/* Confidence & Priority */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="w-4 h-4 text-gray-400" />
                    <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      AI Confidence
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className={`text-2xl font-bold ${confidence.color}`}>
                      {suggestion.confidence_score}%
                    </span>
                    <span className={`text-sm ${confidence.color}`}>
                      {confidence.label}
                    </span>
                  </div>
                </div>

                <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-4 h-4 text-gray-400" />
                    <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Priority Score
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-gray-900 dark:text-white">
                      {suggestion.priority_score}
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      / 100
                    </span>
                  </div>
                </div>
              </div>

              {/* Pattern Recognition */}
              <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-xl p-5">
                <h4 className="text-base font-semibold text-gray-900 dark:text-white mb-3">
                  Algorithmic Pattern Recognition
                </h4>
                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                  {suggestion.reasoning.analysis}
                </p>

                {/* Performance Metrics Grid */}
                <div className="grid grid-cols-3 gap-3">
                  {Object.entries(suggestion.reasoning.metrics).map(([key, value]) => (
                    <div key={key} className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1 capitalize font-medium">
                        {key.replace(/_/g, ' ')}
                      </div>
                      <div className="text-base font-bold text-gray-900 dark:text-white">
                        {typeof value === 'number' ?
                          (key.includes('percentage') || key.includes('score') || key.includes('ctr') ?
                            `${value.toFixed(1)}%` :
                            key.includes('spend') || key.includes('profit') || key.includes('revenue') ?
                              `$${value.toFixed(2)}` :
                              value.toLocaleString())
                          : value}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Estimated Impact */}
              {suggestion.estimated_impact && (
                <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-xl p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <DollarSign className="w-4 h-4 text-gray-400" />
                    <h4 className="text-base font-semibold text-gray-900 dark:text-white">
                      Projected Financial Impact
                    </h4>
                    <span className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-full font-medium ml-auto">
                      {suggestion.estimated_impact.timeframeDays}d forecast
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-300 mb-4 leading-relaxed">
                    {suggestion.estimated_impact.breakdown}
                  </p>
                  <div className="grid grid-cols-3 gap-3">
                    {suggestion.estimated_impact.expectedSavings !== undefined && (
                      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Potential Savings</div>
                        <div className="text-lg font-bold text-red-600 dark:text-red-400">
                          ${suggestion.estimated_impact.expectedSavings.toFixed(2)}
                        </div>
                      </div>
                    )}
                    {suggestion.estimated_impact.expectedRevenue !== undefined && (
                      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Expected Revenue</div>
                        <div className="text-lg font-bold text-gray-900 dark:text-white">
                          ${suggestion.estimated_impact.expectedRevenue.toFixed(2)}
                        </div>
                      </div>
                    )}
                    {suggestion.estimated_impact.expectedProfit !== undefined && (
                      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Expected Profit</div>
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
                <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-xl p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingUp className="w-4 h-4 text-gray-400" />
                    <h4 className="text-base font-semibold text-gray-900 dark:text-white">
                      Real-Time Performance Impact
                    </h4>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ml-auto ${
                      suggestion.performance.is_improving
                        ? 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                    }`}>
                      {suggestion.performance.is_improving ? 'Improving' : 'Declining'}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Profit Change</div>
                      <div className={`text-lg font-bold ${
                        suggestion.performance.profit_delta > 0
                          ? 'text-green-600 dark:text-green-400'
                          : 'text-red-600 dark:text-red-400'
                      }`}>
                        {suggestion.performance.profit_delta > 0 ? '+' : ''}${suggestion.performance.profit_delta.toFixed(2)}
                      </div>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
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
                      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Overall Change</div>
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

              {/* Recommended Automation Rule */}
              {suggestion.recommended_rule && canAccept && (
                <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-xl p-5">
                  <h4 className="text-base font-semibold text-gray-900 dark:text-white mb-2">
                    Recommended Automation Rule
                  </h4>
                  <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
                    {suggestion.recommended_rule.description}
                  </p>
                  <div className="flex flex-wrap gap-2 text-xs text-gray-600 dark:text-gray-400">
                    <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-gray-800 px-2.5 py-1 rounded-lg">
                      <Zap className="w-3 h-3" />
                      <span>Every {suggestion.recommended_rule.check_frequency_minutes}min</span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-gray-800 px-2.5 py-1 rounded-lg">
                      <Target className="w-3 h-3" />
                      <span>Max {suggestion.recommended_rule.max_daily_actions}/day</span>
                    </div>
                    {suggestion.recommended_rule.require_approval && (
                      <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-gray-800 px-2.5 py-1 rounded-lg">
                        <AlertTriangle className="w-3 h-3" />
                        <span>Requires approval</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer - Actions */}
          <div className="bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 px-6 py-4">
            {showDismissReason ? (
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  placeholder="Why are you dismissing this? (optional)"
                  value={dismissReason}
                  onChange={(e) => setDismissReason(e.target.value)}
                  className="flex-1 px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 dark:focus:ring-red-500"
                />
                <button
                  onClick={() => {
                    setShowDismissReason(false);
                    setDismissReason('');
                  }}
                  className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDismiss}
                  disabled={isDismissing}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gray-600 hover:bg-gray-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <XCircle className="w-4 h-4" />
                  <span>{isDismissing ? 'Dismissing...' : 'Confirm'}</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  {canDismiss && (
                    <button
                      onClick={() => setShowDismissReason(true)}
                      disabled={isDismissing}
                      className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Dismiss
                    </button>
                  )}
                  <button
                    onClick={onClose}
                    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    Close
                  </button>
                </div>

                {canAccept && (
                  <button
                    onClick={handleAccept}
                    disabled={isAccepting}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 rounded-lg shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:shadow-md"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{isAccepting ? 'Creating...' : 'Create New Automated Rule'}</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
