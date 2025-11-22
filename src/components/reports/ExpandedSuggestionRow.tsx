import React, { useState, useEffect, useRef } from 'react';
import { TrendingUp, TrendingDown, AlertTriangle, Target, DollarSign, CheckCircle2, Zap, Pause, Copy, Settings, Activity, Brain, BarChart3, ArrowUpRight, ArrowDownRight } from 'lucide-react';
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
        className="flex items-center justify-center gap-2 px-8 py-3.5 text-sm font-semibold text-white bg-gradient-to-r from-red-500 via-red-600 to-pink-600 hover:from-red-600 hover:via-red-700 hover:to-pink-700 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl hover:scale-[1.02] transform"
      >
        <Icon className="w-5 h-5" />
        <span>{isExecutingAction ? 'Executing...' : action.label}</span>
      </button>
    );
  };

  const getRiskBadge = () => {
    const riskConfig = {
      low: { color: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-300 dark:border-green-700', label: 'Low Risk' },
      medium: { color: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 border-yellow-300 dark:border-yellow-700', label: 'Medium Risk' },
      high: { color: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-300 dark:border-red-700', label: 'High Risk' }
    };

    const riskLevel = suggestion.reasoning?.riskLevel || 'medium';
    const config = riskConfig[riskLevel];

    if (!config) return null;

    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border ${config.color}`}>
        <Activity className="w-3.5 h-3.5" />
        {config.label}
      </span>
    );
  };

  const getConfidenceLabel = (score: number) => {
    if (score >= 90) return { label: 'Very High', color: 'text-emerald-600 dark:text-emerald-400' };
    if (score >= 75) return { label: 'High', color: 'text-green-600 dark:text-green-400' };
    if (score >= 60) return { label: 'Moderate', color: 'text-yellow-600 dark:text-yellow-400' };
    return { label: 'Low', color: 'text-orange-600 dark:text-orange-400' };
  };

  const confidence = getConfidenceLabel(suggestion.confidence_score);
  const canAccept = suggestion.status === 'pending' || suggestion.status === 'viewed';
  const canDismiss = suggestion.status !== 'dismissed' && suggestion.status !== 'expired' && suggestion.status !== 'completed';

  const MetricComparison = ({ label, baseline, current, format = 'number' }: { label: string; baseline: number; current: number; format?: 'number' | 'currency' | 'percent' | 'multiplier' }) => {
    const delta = current - baseline;
    const deltaPercent = baseline !== 0 ? ((delta / baseline) * 100) : 0;
    const isPositive = delta > 0;

    const formatValue = (val: number) => {
      if (format === 'currency') return `$${val.toFixed(2)}`;
      if (format === 'percent') return `${val.toFixed(2)}%`;
      if (format === 'multiplier') return `${val.toFixed(2)}x`;
      return val.toLocaleString();
    };

    return (
      <div className="bg-gradient-to-br from-gray-50 to-gray-100/50 dark:from-gray-800/50 dark:to-gray-900/50 rounded-lg p-4 border border-gray-200/50 dark:border-gray-700/50">
        <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-3 uppercase tracking-wider">{label}</div>
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1">
            <div className="text-xs text-gray-500 dark:text-gray-500 mb-1">Before</div>
            <div className="text-base font-bold text-gray-700 dark:text-gray-300">{formatValue(baseline)}</div>
          </div>
          <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg ${isPositive ? 'bg-green-100 dark:bg-green-900/40' : 'bg-red-100 dark:bg-red-900/40'}`}>
            {isPositive ? <ArrowUpRight className="w-4 h-4 text-green-600 dark:text-green-400" /> : <ArrowDownRight className="w-4 h-4 text-red-600 dark:text-red-400" />}
            <span className={`text-sm font-bold ${isPositive ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
              {Math.abs(deltaPercent).toFixed(1)}%
            </span>
          </div>
          <div className="flex-1 text-right">
            <div className="text-xs text-gray-500 dark:text-gray-500 mb-1">Current</div>
            <div className={`text-base font-bold ${isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>{formatValue(current)}</div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div
      ref={contentRef}
      className={`transition-all duration-300 ease-in-out overflow-hidden ${
        isExpanded ? 'max-h-[3000px] opacity-100' : 'max-h-0 opacity-0'
      }`}
    >
      <div className="relative bg-gradient-to-br from-white/80 via-white/70 to-gray-50/80 dark:from-gray-900/80 dark:via-gray-900/70 dark:to-gray-800/80 backdrop-blur-2xl rounded-b-xl shadow-2xl border-t-2 border-red-500/20">
        {showDismissReason && (
          <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700 p-4">
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

        <div className="p-8">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-start gap-4">
              <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-red-500 via-red-600 to-pink-600 shadow-xl">
                <Brain className="w-8 h-8 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                    AI Intelligence Report
                  </h3>
                  {getRiskBadge()}
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                  {suggestion.entity_name} • <span className="capitalize">{suggestion.platform}</span>
                </p>
              </div>
            </div>
            {canDismiss && !showDismissReason && (
              <button
                onClick={() => setShowDismissReason(true)}
                className="text-xs text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 underline transition-colors font-medium"
              >
                Dismiss suggestion
              </button>
            )}
          </div>

          <div className="grid grid-cols-3 gap-4 mb-8 p-5 bg-gradient-to-r from-red-50/80 via-pink-50/80 to-red-50/80 dark:from-red-900/20 dark:via-pink-900/20 dark:to-red-900/20 rounded-2xl border border-red-200/50 dark:border-red-800/50 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-red-500 to-pink-600 shadow-md">
                <Target className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-0.5">AI Confidence</div>
                <div className="flex items-baseline gap-2">
                  <span className={`text-2xl font-black ${confidence.color}`}>{suggestion.confidence_score}%</span>
                  <span className={`text-xs font-semibold ${confidence.color}`}>{confidence.label}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 shadow-md">
                <AlertTriangle className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-0.5">Priority</div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-gray-900 dark:text-white">{suggestion.priority_score}</span>
                  <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">/ 100</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 shadow-md">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-0.5">Triggered By</div>
                <div className="text-lg font-black text-gray-900 dark:text-white">
                  {suggestion.reasoning?.triggeredBy?.length || 0} Rule{(suggestion.reasoning?.triggeredBy?.length || 0) !== 1 ? 's' : ''}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            <div className="space-y-6">
              {canAccept && (
                <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-2 mb-4">
                    <Zap className="w-5 h-5 text-red-500" />
                    <h4 className="text-lg font-bold text-gray-900 dark:text-white">Recommended Action</h4>
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed mb-5">
                    <span className="font-bold text-red-600 dark:text-red-400">AI recommends:</span> {suggestion.message}
                  </p>
                  {getActionButton()}
                </div>
              )}

              <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2 mb-4">
                  <Brain className="w-5 h-5 text-red-500" />
                  <h4 className="text-lg font-bold text-gray-900 dark:text-white">Deep Analysis</h4>
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed mb-5">
                  {suggestion.reasoning?.analysis || 'No detailed analysis available.'}
                </p>

                {suggestion.reasoning?.triggeredBy && suggestion.reasoning.triggeredBy.length > 0 && (
                  <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-3">
                      Triggered Conditions
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {suggestion.reasoning.triggeredBy.map((condition, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1.5 px-3 py-2 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg text-xs font-semibold border border-red-200 dark:border-red-800"
                        >
                          <AlertTriangle className="w-3.5 h-3.5" />
                          {condition}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {suggestion.estimated_impact && (
                <div className="bg-gradient-to-br from-green-50/80 to-emerald-50/80 dark:from-green-900/20 dark:to-emerald-900/20 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-green-200 dark:border-green-800/50">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-5 h-5 text-green-600 dark:text-green-400" />
                      <h4 className="text-lg font-bold text-gray-900 dark:text-white">Financial Impact</h4>
                    </div>
                    <span className="text-xs px-3 py-1.5 bg-white/70 dark:bg-gray-800/70 text-gray-700 dark:text-gray-300 rounded-full font-bold">
                      {suggestion.estimated_impact.timeframeDays}d forecast
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-300 mb-5 leading-relaxed">
                    {suggestion.estimated_impact.breakdown}
                  </p>
                  <div className="grid grid-cols-3 gap-3">
                    {suggestion.estimated_impact.expectedSavings !== undefined && (
                      <div className="bg-white/70 dark:bg-gray-800/70 rounded-xl p-3 border border-green-200 dark:border-green-800">
                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-1 font-semibold">Savings</div>
                        <div className="text-lg font-black text-green-600 dark:text-green-400">
                          ${suggestion.estimated_impact.expectedSavings.toFixed(0)}
                        </div>
                      </div>
                    )}
                    {suggestion.estimated_impact.expectedRevenue !== undefined && (
                      <div className="bg-white/70 dark:bg-gray-800/70 rounded-xl p-3 border border-green-200 dark:border-green-800">
                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-1 font-semibold">Revenue</div>
                        <div className="text-lg font-black text-gray-900 dark:text-white">
                          ${suggestion.estimated_impact.expectedRevenue.toFixed(0)}
                        </div>
                      </div>
                    )}
                    {suggestion.estimated_impact.expectedProfit !== undefined && (
                      <div className="bg-white/70 dark:bg-gray-800/70 rounded-xl p-3 border border-green-200 dark:border-green-800">
                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-1 font-semibold">Profit</div>
                        <div className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                          ${suggestion.estimated_impact.expectedProfit.toFixed(0)}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-6">
              {suggestion.performance && (
                <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-red-500" />
                      <h4 className="text-lg font-bold text-gray-900 dark:text-white">Performance Tracking</h4>
                    </div>
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border ${
                      suggestion.performance.is_improving
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-300 dark:border-green-700'
                        : 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 border-orange-300 dark:border-orange-700'
                    }`}>
                      {suggestion.performance.is_improving ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                      {suggestion.performance.is_improving ? 'Improving' : 'Declining'}
                    </span>
                  </div>

                  <div className="space-y-3">
                    <MetricComparison
                      label="Revenue"
                      baseline={suggestion.performance.baseline_revenue}
                      current={suggestion.performance.current_revenue}
                      format="currency"
                    />
                    <MetricComparison
                      label="Profit"
                      baseline={suggestion.performance.baseline_profit}
                      current={suggestion.performance.current_profit}
                      format="currency"
                    />
                    <MetricComparison
                      label="ROAS"
                      baseline={suggestion.performance.baseline_roas}
                      current={suggestion.performance.current_roas}
                      format="multiplier"
                    />
                    <MetricComparison
                      label="CPA"
                      baseline={suggestion.performance.baseline_cpa}
                      current={suggestion.performance.current_cpa}
                      format="currency"
                    />
                    <MetricComparison
                      label="CTR"
                      baseline={suggestion.performance.baseline_ctr}
                      current={suggestion.performance.current_ctr}
                      format="percent"
                    />
                    <MetricComparison
                      label="Conversions"
                      baseline={suggestion.performance.baseline_conversions}
                      current={suggestion.performance.current_conversions}
                    />
                  </div>
                </div>
              )}

              {suggestion.recommended_rule && canAccept && (
                <div className="bg-gradient-to-br from-blue-50/80 to-indigo-50/80 dark:from-blue-900/20 dark:to-indigo-900/20 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-blue-200 dark:border-blue-800/50">
                  <div className="flex items-center gap-2 mb-4">
                    <Zap className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    <h4 className="text-lg font-bold text-gray-900 dark:text-white">Automate This</h4>
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                    <span className="font-bold text-blue-600 dark:text-blue-400">Let AI manage this automatically:</span> {suggestion.recommended_rule.description}
                  </p>
                  <div className="flex flex-wrap gap-2 mb-5">
                    <span className="inline-flex items-center gap-1.5 bg-white/70 dark:bg-gray-800/70 px-3 py-2 rounded-lg text-xs font-semibold text-gray-700 dark:text-gray-300 border border-blue-200 dark:border-blue-800">
                      <Zap className="w-3.5 h-3.5" />
                      Every {suggestion.recommended_rule.check_frequency_minutes}min
                    </span>
                    <span className="inline-flex items-center gap-1.5 bg-white/70 dark:bg-gray-800/70 px-3 py-2 rounded-lg text-xs font-semibold text-gray-700 dark:text-gray-300 border border-blue-200 dark:border-blue-800">
                      <Target className="w-3.5 h-3.5" />
                      Max {suggestion.recommended_rule.max_daily_actions}/day
                    </span>
                    {suggestion.recommended_rule.require_approval && (
                      <span className="inline-flex items-center gap-1.5 bg-white/70 dark:bg-gray-800/70 px-3 py-2 rounded-lg text-xs font-semibold text-gray-700 dark:text-gray-300 border border-blue-200 dark:border-blue-800">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        Requires approval
                      </span>
                    )}
                  </div>
                  <button
                    onClick={handleAccept}
                    disabled={isAccepting}
                    className="w-full flex items-center justify-center gap-2 px-8 py-3.5 text-sm font-semibold text-white bg-gradient-to-r from-blue-500 via-blue-600 to-indigo-600 hover:from-blue-600 hover:via-blue-700 hover:to-indigo-700 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl hover:scale-[1.02] transform"
                  >
                    <CheckCircle2 className="w-5 h-5" />
                    <span>{isAccepting ? 'Creating Rule...' : 'Create Automated Rule'}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
