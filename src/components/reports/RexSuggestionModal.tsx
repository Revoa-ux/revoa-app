import React, { useState } from 'react';
import { X, Brain, TrendingUp, AlertTriangle, Target, DollarSign, CheckCircle2, XCircle, Activity, Zap, Pause, Play, TrendingDown, Copy, Settings } from 'lucide-react';
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
      // TODO: Implement immediate action execution based on suggestion_type
      console.log('Executing action:', suggestion.suggestion_type);
      // This will call the appropriate API endpoint to pause/scale/adjust the entity
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulated API call
    } catch (error) {
      console.error('Error executing action:', error);
    } finally {
      setIsExecutingAction(false);
    }
  };

  const getActionButton = () => {
    const actionMap: Record<string, { label: string; icon: any; color: string }> = {
      pause_underperforming: { label: 'Pause Now', icon: Pause, color: 'bg-orange-600 hover:bg-orange-700' },
      scale_high_performer: { label: 'Scale Budget', icon: TrendingUp, color: 'bg-green-600 hover:bg-green-700' },
      refresh_creative: { label: 'Duplicate & Refresh', icon: Copy, color: 'bg-blue-600 hover:bg-blue-700' },
      adjust_targeting: { label: 'Adjust Targeting', icon: Target, color: 'bg-purple-600 hover:bg-purple-700' },
      reduce_budget: { label: 'Reduce Budget', icon: TrendingDown, color: 'bg-orange-600 hover:bg-orange-700' },
      increase_budget: { label: 'Increase Budget', icon: TrendingUp, color: 'bg-green-600 hover:bg-green-700' },
      pause_negative_roi: { label: 'Pause Now', icon: Pause, color: 'bg-red-600 hover:bg-red-700' },
      reallocate_budget: { label: 'Reallocate', icon: Activity, color: 'bg-blue-600 hover:bg-blue-700' },
      test_new_creative: { label: 'Start Test', icon: Zap, color: 'bg-purple-600 hover:bg-purple-700' },
      optimize_schedule: { label: 'Optimize', icon: Settings, color: 'bg-blue-600 hover:bg-blue-700' },
    };

    const action = actionMap[suggestion.suggestion_type];
    if (!action) return null;

    const Icon = action.icon;
    return (
      <button
        onClick={handleImmediateAction}
        disabled={isExecutingAction}
        className={`flex items-center gap-2 px-6 py-3 text-white ${action.color} rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl`}
      >
        <Icon className="w-5 h-5" />
        <span>{isExecutingAction ? 'Executing...' : action.label}</span>
      </button>
    );
  };

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'high':
        return 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30';
      case 'medium':
        return 'text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30';
      case 'low':
        return 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30';
      default:
        return 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700';
    }
  };

  const getConfidenceLabel = (score: number) => {
    if (score >= 90) return { label: 'Very High Confidence', color: 'text-green-600 dark:text-green-400' };
    if (score >= 75) return { label: 'High Confidence', color: 'text-green-600 dark:text-green-400' };
    if (score >= 60) return { label: 'Moderate Confidence', color: 'text-yellow-600 dark:text-yellow-400' };
    return { label: 'Low Confidence', color: 'text-gray-600 dark:text-gray-400' };
  };

  const confidence = getConfidenceLabel(suggestion.confidence_score);
  const canAccept = suggestion.status === 'pending' || suggestion.status === 'viewed';
  const canDismiss = suggestion.status !== 'dismissed' && suggestion.status !== 'expired' && suggestion.status !== 'completed';

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-750 border-b border-gray-200 dark:border-gray-700 px-8 py-6 flex items-start justify-between">
          <div className="flex items-start gap-4 flex-1">
            <div className="flex-shrink-0 w-14 h-14 bg-gradient-to-br from-gray-700 to-gray-900 dark:from-gray-600 dark:to-gray-800 rounded-xl flex items-center justify-center shadow-lg">
              <Brain className="w-7 h-7 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
                {suggestion.title}
              </h2>
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                  {suggestion.entity_type === 'campaign' ? 'Campaign' : suggestion.entity_type === 'ad_set' ? 'Ad Set' : 'Ad'}: {suggestion.entity_name}
                </span>
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${getRiskLevelColor(suggestion.reasoning.riskLevel)}`}>
                  {suggestion.reasoning.riskLevel} risk
                </span>
                {suggestion.priority_score >= 85 && (
                  <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                    High Priority
                  </span>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-all"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto px-8 py-6">
          <div className="space-y-6">
            {/* AI Intelligence Summary */}
            <div className="bg-gradient-to-br from-gray-50 to-gray-100/50 dark:from-gray-900/50 dark:to-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
              <div className="flex items-start gap-3 mb-4">
                <Activity className="w-5 h-5 text-gray-600 dark:text-gray-400 mt-0.5" />
                <div>
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2">
                    AI Intelligence Analysis
                  </h3>
                  <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                    {suggestion.message}
                  </p>
                </div>
              </div>
            </div>

            {/* Confidence & Priority */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Target className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                  <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    AI Confidence Score
                  </span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className={`text-3xl font-bold ${confidence.color}`}>
                    {suggestion.confidence_score}%
                  </span>
                  <span className={`text-sm font-medium ${confidence.color}`}>
                    {confidence.label}
                  </span>
                </div>
                <div className="mt-3 h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${confidence.color.replace('text-', 'bg-')}`}
                    style={{ width: `${suggestion.confidence_score}%` }}
                  />
                </div>
              </div>

              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                  <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Priority Score
                  </span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-gray-900 dark:text-white">
                    {suggestion.priority_score}
                  </span>
                  <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    / 100
                  </span>
                </div>
                <div className="mt-3 h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${
                      suggestion.priority_score >= 85
                        ? 'bg-red-500'
                        : suggestion.priority_score >= 70
                        ? 'bg-orange-500'
                        : 'bg-yellow-500'
                    }`}
                    style={{ width: `${suggestion.priority_score}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Pattern Recognition & Multi-Dimensional Analysis */}
            <div className="space-y-4">
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Brain className="w-5 h-5" />
                Algorithmic Pattern Recognition
              </h4>
              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                {suggestion.reasoning.analysis}
              </p>

              {/* Performance Metrics Grid */}
              <div className="grid grid-cols-3 gap-3 mt-4">
                {Object.entries(suggestion.reasoning.metrics).map(([key, value]) => (
                  <div key={key} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1.5 capitalize font-medium">
                      {key.replace(/_/g, ' ')}
                    </div>
                    <div className="text-lg font-bold text-gray-900 dark:text-white">
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
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800 rounded-xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <DollarSign className="w-6 h-6 text-green-600 dark:text-green-400" />
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Projected Financial Impact
                  </h4>
                  <span className="text-xs px-2.5 py-1 bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 rounded-full font-medium ml-auto">
                    {suggestion.estimated_impact.timeframeDays} day forecast
                  </span>
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-300 mb-4 leading-relaxed">
                  {suggestion.estimated_impact.breakdown}
                </p>
                <div className="grid grid-cols-3 gap-4">
                  {suggestion.estimated_impact.expectedSavings !== undefined && (
                    <div className="bg-white dark:bg-gray-900/50 rounded-lg p-4 border border-green-200 dark:border-green-800">
                      <div className="text-xs text-gray-600 dark:text-gray-400 mb-1 font-medium">Potential Savings</div>
                      <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                        ${suggestion.estimated_impact.expectedSavings.toFixed(2)}
                      </div>
                    </div>
                  )}
                  {suggestion.estimated_impact.expectedRevenue !== undefined && (
                    <div className="bg-white dark:bg-gray-900/50 rounded-lg p-4 border border-green-200 dark:border-green-800">
                      <div className="text-xs text-gray-600 dark:text-gray-400 mb-1 font-medium">Expected Revenue</div>
                      <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                        ${suggestion.estimated_impact.expectedRevenue.toFixed(2)}
                      </div>
                    </div>
                  )}
                  {suggestion.estimated_impact.expectedProfit !== undefined && (
                    <div className="bg-white dark:bg-gray-900/50 rounded-lg p-4 border border-green-200 dark:border-green-800">
                      <div className="text-xs text-gray-600 dark:text-gray-400 mb-1 font-medium">Expected Profit</div>
                      <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                        ${suggestion.estimated_impact.expectedProfit.toFixed(2)}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Performance Tracking */}
            {suggestion.performance && (
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Real-Time Performance Impact
                  </h4>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ml-auto ${
                    suggestion.performance.is_improving
                      ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300'
                      : 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300'
                  }`}>
                    {suggestion.performance.is_improving ? 'Improving' : 'Declining'}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-white dark:bg-gray-900/50 rounded-lg p-4">
                    <div className="text-xs text-gray-600 dark:text-gray-400 mb-1 font-medium">Profit Change</div>
                    <div className={`text-2xl font-bold ${
                      suggestion.performance.profit_delta > 0
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-red-600 dark:text-red-400'
                    }`}>
                      {suggestion.performance.profit_delta > 0 ? '+' : ''}${suggestion.performance.profit_delta.toFixed(2)}
                    </div>
                  </div>
                  <div className="bg-white dark:bg-gray-900/50 rounded-lg p-4">
                    <div className="text-xs text-gray-600 dark:text-gray-400 mb-1 font-medium">ROAS Change</div>
                    <div className={`text-2xl font-bold ${
                      suggestion.performance.roas_delta > 0
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-red-600 dark:text-red-400'
                    }`}>
                      {suggestion.performance.roas_delta > 0 ? '+' : ''}{suggestion.performance.roas_delta.toFixed(2)}x
                    </div>
                  </div>
                  {suggestion.performance.performance_change_percent && (
                    <div className="bg-white dark:bg-gray-900/50 rounded-lg p-4">
                      <div className="text-xs text-gray-600 dark:text-gray-400 mb-1 font-medium">Overall Change</div>
                      <div className={`text-2xl font-bold ${
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
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  <Zap className="w-5 h-5" />
                  Recommended Automation Rule
                </h4>
                <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
                  {suggestion.recommended_rule.description}
                </p>
                <div className="flex flex-wrap gap-3 text-xs text-gray-600 dark:text-gray-400">
                  <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-gray-800 px-3 py-1.5 rounded-lg">
                    <Activity className="w-3.5 h-3.5" />
                    <span>Checks every {suggestion.recommended_rule.check_frequency_minutes} min</span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-gray-800 px-3 py-1.5 rounded-lg">
                    <Target className="w-3.5 h-3.5" />
                    <span>Max {suggestion.recommended_rule.max_daily_actions} actions/day</span>
                  </div>
                  {suggestion.recommended_rule.require_approval && (
                    <div className="flex items-center gap-1.5 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 px-3 py-1.5 rounded-lg">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>Requires approval</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer - Actions */}
        <div className="bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 px-8 py-5">
          {showDismissReason ? (
            <div className="flex items-center gap-3">
              <input
                type="text"
                placeholder="Why are you dismissing this? (optional)"
                value={dismissReason}
                onChange={(e) => setDismissReason(e.target.value)}
                className="flex-1 px-4 py-2.5 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500"
              />
              <button
                onClick={() => {
                  setShowDismissReason(false);
                  setDismissReason('');
                }}
                className="px-4 py-2.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleDismiss}
                disabled={isDismissing}
                className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-gray-600 hover:bg-gray-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <XCircle className="w-4 h-4" />
                <span>{isDismissing ? 'Dismissing...' : 'Confirm'}</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                {canDismiss && (
                  <button
                    onClick={() => setShowDismissReason(true)}
                    disabled={isDismissing}
                    className="px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Dismiss
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Close
                </button>
              </div>

              <div className="flex items-center gap-3">
                {canAccept && getActionButton()}
                {canAccept && (
                  <button
                    onClick={handleAccept}
                    disabled={isAccepting}
                    className="flex items-center gap-2 px-6 py-3 text-sm font-medium text-white bg-gradient-to-r from-gray-700 to-gray-900 hover:from-gray-800 hover:to-black rounded-lg shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:shadow-xl"
                  >
                    <CheckCircle2 className="w-5 h-5" />
                    <span>{isAccepting ? 'Creating Automation...' : 'Create Automation Rule'}</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
