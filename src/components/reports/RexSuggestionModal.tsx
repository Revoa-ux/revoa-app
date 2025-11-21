import React, { useState } from 'react';
import { X, Sparkles, TrendingUp, AlertTriangle, Target, DollarSign, CheckCircle2, XCircle } from 'lucide-react';
import Modal from '@/components/Modal';
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
    if (score >= 85) return { label: 'Very Confident', color: 'text-green-600 dark:text-green-400' };
    if (score >= 70) return { label: 'Confident', color: 'text-red-600 dark:text-red-400' };
    if (score >= 50) return { label: 'Moderately Confident', color: 'text-yellow-600 dark:text-yellow-400' };
    return { label: 'Somewhat Confident', color: 'text-gray-600 dark:text-gray-400' };
  };

  const confidence = getConfidenceLabel(suggestion.confidence_score);
  const canAccept = suggestion.status === 'pending' || suggestion.status === 'viewed';
  const canDismiss = suggestion.status !== 'dismissed' && suggestion.status !== 'expired' && suggestion.status !== 'completed';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="" size="large">
      <div className="space-y-6">
        <div className="flex items-start space-x-4">
          <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-red-500 to-pink-500 rounded-xl flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">
              {suggestion.title}
            </h3>
            <div className="flex items-center space-x-3">
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {suggestion.entity_type === 'campaign' ? 'Campaign' : suggestion.entity_type === 'ad_set' ? 'Ad Set' : 'Ad'}: {suggestion.entity_name}
              </span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${getRiskLevelColor(suggestion.reasoning.riskLevel)}`}>
                {suggestion.reasoning.riskLevel} risk
              </span>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
            {suggestion.message}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <Target className="w-4 h-4 text-gray-400" />
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Rex's Confidence
              </span>
            </div>
            <div className="flex items-baseline space-x-2">
              <span className={`text-2xl font-bold ${confidence.color}`}>
                {suggestion.confidence_score}%
              </span>
              <span className={`text-sm ${confidence.color}`}>
                {confidence.label}
              </span>
            </div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-gray-400" />
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Priority Score
              </span>
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="text-2xl font-bold text-gray-900 dark:text-white">
                {suggestion.priority_score}
              </span>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                / 100
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <h4 className="font-medium text-gray-900 dark:text-white flex items-center space-x-2">
            <span>Rex's Analysis</span>
          </h4>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {suggestion.reasoning.analysis}
          </p>

          <div className="grid grid-cols-2 gap-3 mt-4">
            {Object.entries(suggestion.reasoning.metrics).map(([key, value]) => (
              <div key={key} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1 capitalize">
                  {key.replace(/_/g, ' ')}
                </div>
                <div className="text-lg font-semibold text-gray-900 dark:text-white">
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

        {suggestion.estimated_impact && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-3">
              <DollarSign className="w-5 h-5 text-green-600 dark:text-green-400" />
              <h4 className="font-medium text-gray-900 dark:text-white">
                Estimated Impact
              </h4>
              <span className="text-xs px-2 py-0.5 bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 rounded-full">
                {suggestion.estimated_impact.timeframeDays} days
              </span>
            </div>
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
              {suggestion.estimated_impact.breakdown}
            </p>
            <div className="grid grid-cols-3 gap-3">
              {suggestion.estimated_impact.expectedSavings !== undefined && (
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Potential Savings</div>
                  <div className="text-lg font-bold text-green-600 dark:text-green-400">
                    ${suggestion.estimated_impact.expectedSavings.toFixed(2)}
                  </div>
                </div>
              )}
              {suggestion.estimated_impact.expectedRevenue !== undefined && (
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Expected Revenue</div>
                  <div className="text-lg font-bold text-red-600 dark:text-red-400">
                    ${suggestion.estimated_impact.expectedRevenue.toFixed(2)}
                  </div>
                </div>
              )}
              {suggestion.estimated_impact.expectedProfit !== undefined && (
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Expected Profit</div>
                  <div className="text-lg font-bold text-green-600 dark:text-green-400">
                    ${suggestion.estimated_impact.expectedProfit.toFixed(2)}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {suggestion.performance && (
          <div className="bg-gradient-to-r from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-3">
              <TrendingUp className="w-5 h-5 text-red-600 dark:text-red-400" />
              <h4 className="font-medium text-gray-900 dark:text-white">
                Performance Impact
              </h4>
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                suggestion.performance.is_improving
                  ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300'
                  : 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300'
              }`}>
                {suggestion.performance.is_improving ? 'Improving' : 'Declining'}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Profit Change</div>
                <div className={`text-lg font-bold ${
                  suggestion.performance.profit_delta > 0
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-red-600 dark:text-red-400'
                }`}>
                  {suggestion.performance.profit_delta > 0 ? '+' : ''}${suggestion.performance.profit_delta.toFixed(2)}
                </div>
              </div>
              <div>
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
                <div>
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
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 dark:text-white mb-2">
              Rex's Recommended Automation Rule
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              {suggestion.recommended_rule.description}
            </p>
            <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
              <div>Checks every {suggestion.recommended_rule.check_frequency_minutes} minutes</div>
              <div>Max {suggestion.recommended_rule.max_daily_actions} action(s) per day</div>
              {suggestion.recommended_rule.require_approval && (
                <div className="text-yellow-600 dark:text-yellow-400">Requires approval before taking action</div>
              )}
            </div>
          </div>
        )}

        <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          {showDismissReason ? (
            <div className="flex-1 flex items-center space-x-2">
              <input
                type="text"
                placeholder="Why are you dismissing this? (optional)"
                value={dismissReason}
                onChange={(e) => setDismissReason(e.target.value)}
                className="flex-1 px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-300 dark:focus:ring-gray-600"
              />
              <button
                onClick={() => {
                  setShowDismissReason(false);
                  setDismissReason('');
                }}
                className="px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleDismiss}
                disabled={isDismissing}
                className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-white bg-gray-600 hover:bg-gray-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <XCircle className="w-4 h-4" />
                <span>{isDismissing ? 'Dismissing...' : 'Confirm Dismiss'}</span>
              </button>
            </div>
          ) : (
            <>
              {canDismiss && (
                <button
                  onClick={() => setShowDismissReason(true)}
                  disabled={isDismissing}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Dismiss
                </button>
              )}
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600"
              >
                Close
              </button>
              {canAccept && (
                <button
                  onClick={handleAccept}
                  disabled={isAccepting}
                  className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 rounded-lg shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isAccepting ? 'Creating Rule...' : 'Accept Rex\'s Rule'}</span>
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </Modal>
  );
};
