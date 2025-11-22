import React, { useState, useEffect, useRef } from 'react';
import { TrendingUp, TrendingDown, AlertTriangle, Target, DollarSign, CheckCircle2, Zap, Pause, Copy, Settings, XCircle } from 'lucide-react';
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
      pause_entity: { label: 'Pause Now', icon: Pause },
    };

    const action = actionMap[suggestion.suggestion_type];
    if (!action) return null;

    const Icon = action.icon;
    return (
      <button
        onClick={handleImmediateAction}
        disabled={isExecutingAction}
        className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
      >
        <Icon className="w-4 h-4" />
        <span>{isExecutingAction ? 'Executing...' : action.label}</span>
      </button>
    );
  };

  const getFinancialImpactContext = () => {
    const typeMap: Record<string, string> = {
      pause_underperforming: 'If you pause this underperforming ad',
      scale_high_performer: 'If you scale this high-performing ad',
      refresh_creative: 'If you refresh this creative',
      adjust_targeting: 'If you adjust targeting',
      reduce_budget: 'If you reduce budget',
      increase_budget: 'If you increase budget',
      pause_negative_roi: 'If you pause this negative ROI ad',
      reallocate_budget: 'If you reallocate budget',
      test_new_creative: 'If you test new creative',
      optimize_schedule: 'If you optimize schedule',
      pause_entity: 'If you pause this entity',
    };

    return typeMap[suggestion.suggestion_type] || 'If you implement this suggestion';
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

  return (
    <div
      ref={contentRef}
      className={`transition-all duration-300 ease-in-out overflow-hidden ${
        isExpanded ? 'max-h-[3000px] opacity-100' : 'max-h-0 opacity-0'
      }`}
    >
      <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-x border-b border-gray-200/50 dark:border-gray-700/50 rounded-b-xl shadow-lg">
        <div className="bg-gradient-to-r from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-1.5">
              {suggestion.title}
            </h2>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {suggestion.entity_type === 'campaign' ? 'Campaign' : suggestion.entity_type === 'ad_set' ? 'Ad Set' : 'Ad'}: {suggestion.entity_name}
              </span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getRiskLevelColor(suggestion.reasoning?.riskLevel || 'medium')}`}>
                {suggestion.reasoning?.riskLevel || 'medium'} risk
              </span>
              {suggestion.priority_score >= 85 && (
                <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                  High Priority
                </span>
              )}
            </div>
          </div>
          {canDismiss && (
            <button
              onClick={onClose}
              className="text-xs text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 underline transition-colors font-medium ml-3"
            >
              Close
            </button>
          )}
        </div>

        <div className="px-6 py-5">
          <div className="space-y-5">
            <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-xl p-5">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3">
                AI Intelligence Analysis
              </h3>
              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                {suggestion.message}
              </p>
              {canAccept && getActionButton()}
            </div>

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

                <div className="mb-4 p-3 bg-gradient-to-r from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20 border border-red-200/50 dark:border-red-800/50 rounded-lg">
                  <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                    {getFinancialImpactContext()}:
                  </p>
                  <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                    {suggestion.estimated_impact.breakdown}
                  </p>
                </div>

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

            <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-xl p-5">
              <h4 className="text-base font-semibold text-gray-900 dark:text-white mb-3">
                Algorithmic Pattern Recognition
              </h4>
              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                {suggestion.reasoning?.analysis || 'No detailed analysis available.'}
              </p>

              {suggestion.reasoning?.metrics && Object.keys(suggestion.reasoning.metrics).length > 0 && (
                <div className="grid grid-cols-3 gap-3">
                  {Object.entries(suggestion.reasoning.metrics).map(([key, value]) => (
                    <div key={key} className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg p-3">
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
              )}
            </div>

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
                  {suggestion.performance.performance_change_percent !== undefined && (
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

            {suggestion.recommended_rule && canAccept && (
              <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-xl p-5">
                <h4 className="text-base font-semibold text-gray-900 dark:text-white mb-2">
                  Recommended Automated Rule
                </h4>
                <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
                  {suggestion.recommended_rule.description}
                </p>
                <div className="flex flex-wrap gap-2 text-xs text-gray-600 dark:text-gray-400 mb-4">
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

                <button
                  onClick={handleAccept}
                  disabled={isAccepting}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 rounded-lg shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:shadow-md"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isAccepting ? 'Creating...' : 'Create New Automated Rule'}</span>
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 px-6 py-4">
          {showDismissReason ? (
            <div className="flex items-center gap-3">
              <input
                type="text"
                placeholder="Why are you dismissing this? (optional)"
                value={dismissReason}
                onChange={(e) => setDismissReason(e.target.value)}
                className="flex-1 px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 dark:focus:ring-red-500"
                autoFocus
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
          )}
        </div>
      </div>
    </div>
  );
};
