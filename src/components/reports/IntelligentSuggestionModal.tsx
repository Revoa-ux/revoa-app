import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Brain,
  BarChart3,
  Users,
  MapPin,
  Clock,
  TrendingUp,
  DollarSign,
  CheckCircle2,
  Target,
  AlertTriangle,
  Sparkles,
  Eye,
} from 'lucide-react';
import type { RexSuggestionWithPerformance } from '@/types/rex';

interface IntelligentSuggestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  suggestion: RexSuggestionWithPerformance;
  onAccept: () => Promise<void>;
  onDismiss: (reason?: string) => Promise<void>;
}

export const IntelligentSuggestionModal: React.FC<IntelligentSuggestionModalProps> = ({
  isOpen,
  onClose,
  suggestion,
  onAccept,
  onDismiss,
}) => {
  const [isAccepting, setIsAccepting] = useState(false);
  const [isDismissing, setIsDismissing] = useState(false);

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
      await onDismiss();
      onClose();
    } catch (error) {
      console.error('Error dismissing suggestion:', error);
    } finally {
      setIsDismissing(false);
    }
  };

  const supportingData = suggestion.reasoning.supportingData;
  const hasDeepData = supportingData && (
    supportingData.demographics?.length ||
    supportingData.placements?.length ||
    supportingData.geographic?.length ||
    supportingData.temporal?.length
  );

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="relative bg-white dark:bg-dark rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col border border-gray-200 dark:border-[#3a3a3a]">
        <div className="bg-gradient-to-r from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20 border-b border-gray-200 dark:border-[#3a3a3a] px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white dark:bg-dark rounded-lg">
              <Sparkles className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {suggestion.title}
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {suggestion.entity_type === 'ad' ? 'Ad' : suggestion.entity_type === 'campaign' ? 'Campaign' : 'Ad Set'}: {suggestion.entity_name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#3a3a3a] rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="grid grid-cols-3 gap-6">
            <div className="col-span-2 space-y-6">
              <div className="bg-gradient-to-br from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20 border border-red-200/50 dark:border-red-800/50 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Brain className="w-5 h-5 text-red-600 dark:text-red-400" />
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">What I Found</h3>
                  {supportingData?.crossDimensionalPattern && (
                    <span className="px-2 py-0.5 text-xs bg-red-600 text-white rounded-full">
                      Hidden Pattern
                    </span>
                  )}
                </div>
                <p className="text-gray-900 dark:text-white leading-relaxed font-medium">
                  {suggestion.message}
                </p>
                {suggestion.reasoning.metrics.data_points_analyzed && (
                  <div className="mt-3 flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                    <div className="flex items-center gap-1.5">
                      <Eye className="w-4 h-4" />
                      <span>{suggestion.reasoning.metrics.data_points_analyzed} data points analyzed</span>
                    </div>
                    {supportingData?.methodology && (
                      <div className="flex items-center gap-1.5">
                        <Target className="w-4 h-4" />
                        <span>Deep analysis</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {hasDeepData && (
                <div className="grid grid-cols-2 gap-4">
                  {supportingData.demographics && supportingData.demographics.length > 0 && (
                    <div className="bg-white dark:bg-dark border border-gray-200 dark:border-[#3a3a3a] rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Users className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                        <h4 className="font-semibold text-gray-900 dark:text-white">Top Demographics</h4>
                      </div>
                      <div className="space-y-2">
                        {supportingData.demographics.slice(0, 3).map((demo, idx) => (
                          <div key={idx} className="flex items-center justify-between text-sm">
                            <span className="text-gray-700 dark:text-gray-300">
                              {demo.age_range} {demo.gender}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-gray-900 dark:text-white">
                                {demo.roas.toFixed(1)}x
                              </span>
                              <span className="text-green-600 dark:text-green-400 text-xs">
                                +{demo.improvement_vs_average.toFixed(0)}%
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {supportingData.placements && supportingData.placements.length > 0 && (
                    <div className="bg-white dark:bg-dark border border-gray-200 dark:border-[#3a3a3a] rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <BarChart3 className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                        <h4 className="font-semibold text-gray-900 dark:text-white">Top Placements</h4>
                      </div>
                      <div className="space-y-2">
                        {supportingData.placements.slice(0, 3).map((placement, idx) => (
                          <div key={idx} className="flex items-center justify-between text-sm">
                            <span className="text-gray-700 dark:text-gray-300 truncate">
                              {placement.publisher_platform} / {placement.platform_position}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-gray-900 dark:text-white">
                                {placement.roas.toFixed(1)}x
                              </span>
                              <span className="text-green-600 dark:text-green-400 text-xs">
                                +{placement.improvement_vs_average.toFixed(0)}%
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {supportingData.geographic && supportingData.geographic.length > 0 && (
                    <div className="bg-white dark:bg-dark border border-gray-200 dark:border-[#3a3a3a] rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <MapPin className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                        <h4 className="font-semibold text-gray-900 dark:text-white">Top Regions</h4>
                      </div>
                      <div className="space-y-2">
                        {supportingData.geographic.slice(0, 3).map((geo, idx) => (
                          <div key={idx} className="flex items-center justify-between text-sm">
                            <span className="text-gray-700 dark:text-gray-300">
                              {geo.region}, {geo.country}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-gray-900 dark:text-white">
                                {geo.roas.toFixed(1)}x
                              </span>
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                ${geo.aov.toFixed(0)} AOV
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {supportingData.temporal && supportingData.temporal.length > 0 && (
                    <div className="bg-white dark:bg-dark border border-gray-200 dark:border-[#3a3a3a] rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Clock className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                        <h4 className="font-semibold text-gray-900 dark:text-white">Best Times</h4>
                      </div>
                      <div className="space-y-2">
                        {supportingData.temporal.slice(0, 3).map((time, idx) => (
                          <div key={idx} className="flex items-center justify-between text-sm">
                            <span className="text-gray-700 dark:text-gray-300">
                              {time.day_of_week} @ {time.hour}:00
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-gray-900 dark:text-white">
                                {time.roas.toFixed(1)}x
                              </span>
                              <span className="text-green-600 dark:text-green-400 text-xs">
                                {time.conversions} conv
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {suggestion.estimated_impact && (
                <div className="bg-white dark:bg-dark border border-gray-200 dark:border-[#3a3a3a] rounded-xl p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <DollarSign className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">Financial Impact</h3>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                      <div className="text-xs font-medium text-green-700 dark:text-green-400 mb-1">If Implemented</div>
                      <div className="text-2xl font-bold text-green-900 dark:text-green-200 mb-1">
                        ${suggestion.estimated_impact.expectedProfit?.toFixed(2) || '0.00'}
                      </div>
                      <div className="text-xs text-green-700 dark:text-green-400">
                        Projected profit • {suggestion.estimated_impact.timeframeDays}d
                      </div>
                    </div>

                    <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                      <div className="text-xs font-medium text-red-700 dark:text-red-400 mb-1">If Ignored</div>
                      <div className="text-2xl font-bold text-red-900 dark:text-red-200 mb-1">
                        ${suggestion.estimated_impact.expectedSavings?.toFixed(2) || '0.00'}
                      </div>
                      <div className="text-xs text-red-700 dark:text-red-400">
                        Lost opportunity • {suggestion.estimated_impact.timeframeDays}d
                      </div>
                    </div>
                  </div>

                  <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                    {suggestion.estimated_impact.breakdown}
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="bg-white dark:bg-dark border border-gray-200 dark:border-[#3a3a3a] rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Target className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                  <h4 className="font-semibold text-gray-900 dark:text-white">AI Confidence</h4>
                </div>
                <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
                  {suggestion.confidence_score}%
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {suggestion.confidence_score >= 90 ? 'Very High' : suggestion.confidence_score >= 75 ? 'High' : 'Moderate'}
                </div>
              </div>

              <div className="bg-white dark:bg-dark border border-gray-200 dark:border-[#3a3a3a] rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                  <h4 className="font-semibold text-gray-900 dark:text-white">Priority</h4>
                </div>
                <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
                  {suggestion.priority_score}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">/ 100</div>
              </div>

              <div className="bg-white dark:bg-dark border border-gray-200 dark:border-[#3a3a3a] rounded-xl p-4">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Key Metrics</h4>
                <div className="space-y-2 text-sm">
                  {suggestion.reasoning.metrics.roas && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">ROAS</span>
                      <span className="font-bold text-gray-900 dark:text-white">
                        {suggestion.reasoning.metrics.roas.toFixed(1)}x
                      </span>
                    </div>
                  )}
                  {suggestion.reasoning.metrics.spend && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Spend</span>
                      <span className="font-bold text-gray-900 dark:text-white">
                        ${suggestion.reasoning.metrics.spend.toFixed(2)}
                      </span>
                    </div>
                  )}
                  {suggestion.reasoning.metrics.conversions && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Conversions</span>
                      <span className="font-bold text-gray-900 dark:text-white">
                        {suggestion.reasoning.metrics.conversions}
                      </span>
                    </div>
                  )}
                  {suggestion.reasoning.metrics.profit && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Profit</span>
                      <span className="font-bold text-gray-900 dark:text-white">
                        ${suggestion.reasoning.metrics.profit.toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {suggestion.recommended_rule && (
                <div className="bg-gradient-to-br from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                    Automated Rule
                  </h4>
                  <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
                    {suggestion.recommended_rule.description}
                  </p>
                  <button
                    onClick={handleAccept}
                    disabled={isAccepting}
                    className="btn btn-danger w-full"
                  >
                    <CheckCircle2 className="btn-icon" />
                    <span>{isAccepting ? 'Creating...' : 'Create Automated Rule'}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="border-t border-gray-200 dark:border-[#3a3a3a] px-6 py-4 flex items-center justify-between bg-gray-50 dark:bg-[#3a3a3a]/50">
          <button
            onClick={handleDismiss}
            disabled={isDismissing}
            className="btn btn-ghost"
          >
            Dismiss
          </button>
          <button
            onClick={onClose}
            className="btn btn-secondary"
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
