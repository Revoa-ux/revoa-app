import React, { useState, useEffect, useRef } from 'react';
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Target,
  DollarSign,
  CheckCircle2,
  Zap,
  Pause,
  Copy,
  Settings,
  XCircle,
  Users,
  MapPin,
  Clock,
  Smartphone,
  BarChart3,
  Brain,
  FileText,
  TrendingUpIcon
} from 'lucide-react';
import type { RexSuggestionWithPerformance } from '@/types/rex';
// BuildConfiguration type for segment building
interface BuildConfiguration {
  buildType: 'new_campaign' | 'add_to_campaign';
  selectedSegments: any[];
  bidStrategy: string;
  bidAmount?: number;
  budget: number;
  createWideOpen: boolean;
  pauseSource: boolean;
}
import { supabase } from '@/lib/supabase';
import { toast } from '../../lib/toast';

interface ExpandedSuggestionRowProps {
  suggestion: RexSuggestionWithPerformance;
  onAccept?: () => Promise<void>;
  onDismiss: (reason?: string) => Promise<void>;
  onClose: () => void;
  onExecuteAction?: (actionType: string, parameters: any) => Promise<{ success: boolean; message: string }>;
  entityData?: {
    id: string;
    name: string;
    status?: string;
    platform?: string;
    spend?: number;
    revenue?: number;
    roas?: number;
    profit?: number;
    conversions?: number;
    cpa?: number;
    ctr?: number;
    impressions?: number;
    clicks?: number;
  };
}

export const ExpandedSuggestionRow: React.FC<ExpandedSuggestionRowProps> = ({
  suggestion,
  onAccept,
  onDismiss,
  onClose,
  onExecuteAction,
  entityData
}) => {
  const [isAccepting, setIsAccepting] = useState(false);
  const [isDismissing, setIsDismissing] = useState(false);
  const [isExecutingAction, setIsExecutingAction] = useState(false);
  const [showDismissReason, setShowDismissReason] = useState(false);
  const [dismissReason, setDismissReason] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<'quick_actions' | 'builder'>('quick_actions');
  const contentRef = useRef<HTMLDivElement>(null);

  // Determine if Builder tab should be shown
  const showBuilderTab = suggestion.entity_type === 'campaign' || suggestion.entity_type === 'ad_set';

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

  const mapSuggestionTypeToAction = (suggestionType: string): { actionType: string; parameters: any } | null => {
    const currentBudget = entityData?.spend || suggestion.reasoning?.metrics?.spend || 50;

    switch (suggestionType) {
      case 'scale_high_performer':
      case 'increase_budget':
        return {
          actionType: 'increase_budget',
          parameters: {
            current: currentBudget,
            proposed: Math.round(currentBudget * 1.2 * 100) / 100,
            increase_percentage: 20
          }
        };
      case 'reduce_budget':
      case 'decrease_budget':
        return {
          actionType: 'decrease_budget',
          parameters: {
            current: currentBudget,
            proposed: Math.round(currentBudget * 0.8 * 100) / 100,
            decrease_percentage: 20
          }
        };
      case 'pause_underperforming':
      case 'pause_negative_roi':
      case 'pause_entity':
        return {
          actionType: 'pause',
          parameters: {}
        };
      case 'refresh_creative':
      case 'test_new_creative':
        return {
          actionType: 'duplicate',
          parameters: { nameSuffix: 'Rex Creative Test' }
        };
      case 'adjust_targeting':
      case 'optimize_demographics':
      case 'optimize_placements':
      case 'optimize_geographic':
        return {
          actionType: 'adjust_targeting',
          parameters: { targeting: suggestion.reasoning?.supportingData }
        };
      case 'reallocate_budget':
        return {
          actionType: 'increase_budget',
          parameters: {
            current: currentBudget,
            proposed: Math.round(currentBudget * 1.15 * 100) / 100,
            increase_percentage: 15
          }
        };
      case 'optimize_campaign':
      case 'review_underperformer':
      case 'switch_to_abo':
      case 'optimize_schedule':
      case 'enable_dayparting':
      case 'expand_winning_region':
      case 'target_high_ltv_segment':
        return null;
      default:
        return null;
    }
  };

  const handleImmediateAction = async () => {
    if (!onExecuteAction) {
      toast.error('Action execution not available');
      return;
    }

    const actionMapping = mapSuggestionTypeToAction(suggestion.suggestion_type);
    if (!actionMapping) {
      toast.info('This action requires manual review in your ad platform');
      return;
    }

    setIsExecutingAction(true);
    try {
      console.log('[ExpandedSuggestionRow] Executing action:', actionMapping.actionType, 'with params:', actionMapping.parameters);

      const result = await onExecuteAction(actionMapping.actionType, actionMapping.parameters);

      if (result.success) {
        toast.success(`${suggestion.entity_name} was updated successfully`);
        onClose();
      } else {
        toast.error(result.message || 'Action failed');
      }
    } catch (error) {
      console.error('Error executing action:', error);
      toast.error('Failed to execute action');
    } finally {
      setIsExecutingAction(false);
    }
  };

  const handleBuildCampaign = async (config: BuildConfiguration) => {
    try {
      toast.loading('Building campaign with selected segments...');

      // Call the enhanced duplicate function
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/facebook-ads-duplicate-entity`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          userId: suggestion.user_id,
          platform: suggestion.platform,
          entityType: suggestion.entity_type === 'ad_set' ? 'adset' : 'campaign',
          entityId: suggestion.platform_entity_id,
          nameSuffix: 'Segments',
          selectedSegments: config.selectedSegments,
          bidStrategy: config.bidStrategy,
          bidAmount: config.bidAmount,
          budget: config.budget,
          createWideOpen: config.createWideOpen,
          pauseSource: config.pauseSource,
          buildType: config.buildType
        })
      });

      const result = await response.json();

      if (result.success) {
        toast.success(result.message || 'Successfully created segment-based campaign!');
        onClose();
      } else {
        toast.error(result.message || 'Failed to build campaign');
      }
    } catch (error) {
      console.error('Error building campaign:', error);
      toast.error('Failed to build campaign');
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

    const action = actionMap[suggestion.suggestion_type];
    if (!action) return null;

    const Icon = action.icon;
    return (
      <button
        onClick={handleImmediateAction}
        disabled={isExecutingAction}
        className="btn btn-danger flex items-center gap-2"
      >
        <Icon className="btn-icon w-4 h-4" />
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
    if (abbreviations[lowerKey]) return abbreviations[lowerKey];
    return key.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
  };

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'high':
        return 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30';
      case 'medium':
        return 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-[#3a3a3a]';
      case 'low':
        return 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-[#3a3a3a]';
      default:
        return 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-[#3a3a3a]';
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

  const demographics = suggestion.reasoning.supportingData?.demographics;
  const placements = suggestion.reasoning.supportingData?.placements;
  const geographic = suggestion.reasoning.supportingData?.geographic;
  const temporal = suggestion.reasoning.supportingData?.temporal;
  const customerBehavior = suggestion.reasoning.supportingData?.customerBehavior;

  return (
    <div
      ref={contentRef}
      className={`transition-all duration-300 ease-in-out overflow-hidden ${
        isExpanded ? 'max-h-[5000px] opacity-100' : 'max-h-0 opacity-0'
      }`}
    >
      <div className="bg-white/95 dark:bg-dark/95 backdrop-blur-xl border-x border-b border-gray-200/50 dark:border-[#3a3a3a]/50 rounded-b-xl shadow-lg">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20 border-b border-gray-200 dark:border-[#3a3a3a] px-6 py-4">
          <div className="flex items-start justify-between">
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
                {suggestion.reasoning.patternType === 'hidden' && (
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                    Hidden Pattern
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-xs text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 underline transition-colors font-medium ml-3"
            >
              Close
            </button>
          </div>
        </div>

        {/* Tabs Navigation */}
        {showBuilderTab && (
          <div className="border-b border-gray-200 dark:border-[#3a3a3a] px-6">
            <div className="flex gap-4">
              <button
                onClick={() => setActiveTab('quick_actions')}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'quick_actions'
                    ? 'border-red-500 text-red-600 dark:text-red-400'
                    : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                Quick Actions
              </button>
              <button
                onClick={() => setActiveTab('builder')}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'builder'
                    ? 'border-red-500 text-red-600 dark:text-red-400'
                    : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  Builder
                </div>
              </button>
            </div>
          </div>
        )}

        <div className="px-6 py-5">
          {activeTab === 'quick_actions' ? (
            <div className="space-y-5">
              {/* 1. What I Found - Pattern Discovery */}
            <div className="bg-white/80 dark:bg-dark/80 backdrop-blur-sm border border-gray-200/50 dark:border-[#3a3a3a]/50 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <Brain className="w-5 h-5 text-red-500" />
                <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                  What I Found
                </h3>
                {suggestion.reasoning.dataPointsAnalyzed && (
                  <span className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-dark text-gray-600 dark:text-gray-400 rounded-full font-medium ml-auto">
                    {suggestion.reasoning.dataPointsAnalyzed.toLocaleString()} data points analyzed
                  </span>
                )}
              </div>

              {suggestion.reasoning.primaryInsight && (
                <div className="mb-3 p-3 bg-gradient-to-r from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20 border border-red-200/50 dark:border-red-800/50 rounded-lg">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    {suggestion.reasoning.primaryInsight}
                  </p>
                </div>
              )}

              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                {suggestion.message}
              </p>

              <div className="flex items-center gap-3 text-xs text-gray-600 dark:text-gray-400">
                {suggestion.reasoning.analysisDepth && (
                  <div className="flex items-center gap-1.5">
                    <BarChart3 className="w-3.5 h-3.5" />
                    <span className="capitalize">{suggestion.reasoning.analysisDepth} analysis</span>
                  </div>
                )}
                {suggestion.reasoning.patternType && (
                  <div className="flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5" />
                    <span className="capitalize">{suggestion.reasoning.patternType} pattern</span>
                  </div>
                )}
                {suggestion.reasoning.urgency && (
                  <div className="flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span className="capitalize">{suggestion.reasoning.urgency} urgency</span>
                  </div>
                )}
              </div>

              {canAccept && (
                <div className="mt-4">
                  {getActionButton()}
                </div>
              )}
            </div>

            {/* 2. The Numbers Don't Lie - Breakdown Data */}
            {(demographics || placements || geographic || temporal || customerBehavior) && (
              <div className="bg-white/80 dark:bg-dark/80 backdrop-blur-sm border border-gray-200/50 dark:border-[#3a3a3a]/50 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <BarChart3 className="w-5 h-5 text-red-500" />
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                    The Numbers Don't Lie
                  </h3>
                </div>

                <div className="space-y-4">
                  {/* Demographics Breakdown */}
                  {demographics && demographics.topPerforming.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Users className="w-4 h-4 text-gray-400" />
                        <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                          Top Performing Demographics
                        </h4>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50 dark:bg-dark">
                            <tr>
                              <th className="px-3 py-2 text-left font-medium text-gray-700 dark:text-gray-300">Segment</th>
                              <th className="px-3 py-2 text-right font-medium text-gray-700 dark:text-gray-300">ROAS</th>
                              <th className="px-3 py-2 text-right font-medium text-gray-700 dark:text-gray-300">Conversions</th>
                              <th className="px-3 py-2 text-right font-medium text-gray-700 dark:text-gray-300">Improvement</th>
                            </tr>
                          </thead>
                          <tbody>
                            {demographics.topPerforming.map((demo, idx) => (
                              <tr key={idx} className="border-t border-gray-200 dark:border-[#3a3a3a]">
                                <td className="px-3 py-2 text-gray-900 dark:text-white">{demo.ageRange} {demo.gender}</td>
                                <td className="px-3 py-2 text-right font-medium text-gray-900 dark:text-white">{demo.roas.toFixed(2)}x</td>
                                <td className="px-3 py-2 text-right text-gray-700 dark:text-gray-300">{demo.conversions}</td>
                                <td className="px-3 py-2 text-right font-medium text-green-600 dark:text-green-400">+{demo.improvement.toFixed(0)}%</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {demographics.insights && demographics.insights.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {demographics.insights.map((insight, idx) => (
                            <p key={idx} className="text-xs text-gray-600 dark:text-gray-400 flex items-start gap-1.5">
                              <span className="text-red-500 mt-0.5">•</span>
                              <span>{insight}</span>
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Placements Breakdown */}
                  {placements && placements.topPerforming.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Smartphone className="w-4 h-4 text-gray-400" />
                        <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                          Top Performing Placements
                        </h4>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50 dark:bg-dark">
                            <tr>
                              <th className="px-3 py-2 text-left font-medium text-gray-700 dark:text-gray-300">Placement</th>
                              <th className="px-3 py-2 text-right font-medium text-gray-700 dark:text-gray-300">Device</th>
                              <th className="px-3 py-2 text-right font-medium text-gray-700 dark:text-gray-300">ROAS</th>
                              <th className="px-3 py-2 text-right font-medium text-gray-700 dark:text-gray-300">CTR</th>
                            </tr>
                          </thead>
                          <tbody>
                            {placements.topPerforming.map((place, idx) => (
                              <tr key={idx} className="border-t border-gray-200 dark:border-[#3a3a3a]">
                                <td className="px-3 py-2 text-gray-900 dark:text-white capitalize">{place.placementType}</td>
                                <td className="px-3 py-2 text-right text-gray-700 dark:text-gray-300 capitalize">{place.deviceType}</td>
                                <td className="px-3 py-2 text-right font-medium text-gray-900 dark:text-white">{place.roas.toFixed(2)}x</td>
                                <td className="px-3 py-2 text-right text-gray-700 dark:text-gray-300">{place.ctr.toFixed(2)}%</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Geographic Breakdown */}
                  {geographic && geographic.topPerforming.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <MapPin className="w-4 h-4 text-gray-400" />
                        <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                          Top Performing Regions
                        </h4>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        {geographic.topPerforming.slice(0, 4).map((geo, idx) => (
                          <div key={idx} className="bg-gray-50 dark:bg-dark/50 rounded-lg p-3">
                            <div className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                              {geo.country} {geo.region && `- ${geo.region}`}
                            </div>
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-gray-600 dark:text-gray-400">ROAS:</span>
                              <span className="font-bold text-gray-900 dark:text-white">{geo.roas.toFixed(2)}x</span>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-gray-600 dark:text-gray-400">AOV:</span>
                              <span className="text-gray-700 dark:text-gray-300">${geo.averageOrderValue.toFixed(2)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Temporal Patterns */}
                  {temporal && temporal.bestPerforming.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                          Best Time Slots
                        </h4>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {temporal.bestPerforming.map((time, idx) => (
                          <div key={idx} className="bg-gray-50 dark:bg-dark/50 rounded-lg p-2 text-center">
                            <div className="text-xs font-medium text-gray-900 dark:text-white">{time.dayOfWeek}</div>
                            <div className="text-xs text-gray-600 dark:text-gray-400">{time.hourRange}</div>
                            <div className="text-sm font-bold text-red-600 dark:text-red-400 mt-1">{time.roas.toFixed(2)}x</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 3. Confidence & Priority Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/80 dark:bg-dark/80 backdrop-blur-sm border border-gray-200/50 dark:border-[#3a3a3a]/50 rounded-xl p-4">
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

              <div className="bg-white/80 dark:bg-dark/80 backdrop-blur-sm border border-gray-200/50 dark:border-[#3a3a3a]/50 rounded-xl p-4">
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

            {/* 4. Why This Matters - Financial Impact */}
            {suggestion.estimated_impact && (
              <div className="bg-white/80 dark:bg-dark/80 backdrop-blur-sm border border-gray-200/50 dark:border-[#3a3a3a]/50 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <DollarSign className="w-5 h-5 text-red-500" />
                  <h4 className="text-base font-semibold text-gray-900 dark:text-white">
                    Why This Matters
                  </h4>
                  <span className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-dark text-gray-600 dark:text-gray-400 rounded-full font-medium ml-auto">
                    {suggestion.estimated_impact.timeframeDays}d forecast
                  </span>
                </div>

                <div className="mb-4 p-3 bg-gradient-to-r from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20 border border-red-200/50 dark:border-red-800/50 rounded-lg">
                  <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                    Financial Impact:
                  </p>
                  <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                    {suggestion.estimated_impact.breakdown}
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  {suggestion.estimated_impact.expectedSavings !== undefined && (
                    <div className="bg-gray-50 dark:bg-dark/50 rounded-lg p-3">
                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Potential Savings</div>
                      <div className="text-lg font-bold text-red-600 dark:text-red-400">
                        ${suggestion.estimated_impact.expectedSavings.toFixed(2)}
                      </div>
                    </div>
                  )}
                  {suggestion.estimated_impact.expectedRevenue !== undefined && (
                    <div className="bg-gray-50 dark:bg-dark/50 rounded-lg p-3">
                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Expected Revenue</div>
                      <div className="text-lg font-bold text-gray-900 dark:text-white">
                        ${suggestion.estimated_impact.expectedRevenue.toFixed(2)}
                      </div>
                    </div>
                  )}
                  {suggestion.estimated_impact.expectedProfit !== undefined && (
                    <div className="bg-gray-50 dark:bg-dark/50 rounded-lg p-3">
                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Expected Profit</div>
                      <div className="text-lg font-bold text-gray-900 dark:text-white">
                        ${suggestion.estimated_impact.expectedProfit.toFixed(2)}
                      </div>
                    </div>
                  )}
                </div>

                {/* Projections Comparison */}
                {suggestion.reasoning.projections && (
                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-[#3a3a3a]">
                    <div className="grid grid-cols-2 gap-3">
                      {suggestion.reasoning.projections.ifImplemented && (
                        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
                          <div className="text-xs font-semibold text-green-700 dark:text-green-400 mb-2 flex items-center gap-1">
                            <TrendingUpIcon className="w-3 h-3" />
                            If Implemented
                          </div>
                          <div className="space-y-1 text-xs">
                            {suggestion.reasoning.projections.ifImplemented.profit !== undefined && (
                              <div className="flex justify-between">
                                <span className="text-green-700 dark:text-green-400">Profit:</span>
                                <span className="font-medium text-green-900 dark:text-green-300">
                                  ${suggestion.reasoning.projections.ifImplemented.profit.toFixed(2)}
                                </span>
                              </div>
                            )}
                            {suggestion.reasoning.projections.ifImplemented.roas !== undefined && (
                              <div className="flex justify-between">
                                <span className="text-green-700 dark:text-green-400">ROAS:</span>
                                <span className="font-medium text-green-900 dark:text-green-300">
                                  {suggestion.reasoning.projections.ifImplemented.roas.toFixed(2)}x
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      {suggestion.reasoning.projections.ifIgnored && (
                        <div className="bg-gray-50 dark:bg-dark/50 rounded-lg p-3">
                          <div className="text-xs font-semibold text-gray-700 dark:text-gray-400 mb-2 flex items-center gap-1">
                            <TrendingDown className="w-3 h-3" />
                            If Ignored
                          </div>
                          <div className="space-y-1 text-xs">
                            {suggestion.reasoning.projections.ifIgnored.profit !== undefined && (
                              <div className="flex justify-between">
                                <span className="text-gray-600 dark:text-gray-400">Profit:</span>
                                <span className="font-medium text-gray-900 dark:text-white">
                                  ${suggestion.reasoning.projections.ifIgnored.profit.toFixed(2)}
                                </span>
                              </div>
                            )}
                            {suggestion.reasoning.projections.ifIgnored.roas !== undefined && (
                              <div className="flex justify-between">
                                <span className="text-gray-600 dark:text-gray-400">ROAS:</span>
                                <span className="font-medium text-gray-900 dark:text-white">
                                  {suggestion.reasoning.projections.ifIgnored.roas.toFixed(2)}x
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 5. Algorithmic Pattern Recognition */}
            <div className="bg-white/80 dark:bg-dark/80 backdrop-blur-sm border border-gray-200/50 dark:border-[#3a3a3a]/50 rounded-xl p-5">
              <h4 className="text-base font-semibold text-gray-900 dark:text-white mb-3">
                Algorithmic Pattern Recognition
              </h4>
              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                {suggestion.reasoning.analysis}
              </p>

              {suggestion.reasoning.metrics && Object.keys(suggestion.reasoning.metrics).length > 0 && (
                <div className="grid grid-cols-3 gap-3">
                  {Object.entries(suggestion.reasoning.metrics).map(([key, value]) => (
                    <div key={key} className="bg-gray-50 dark:bg-dark/50 border border-gray-200 dark:border-[#3a3a3a] rounded-lg p-3">
                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1 font-medium">
                        {formatMetricLabel(key)}
                      </div>
                      <div className="text-base font-bold text-gray-900 dark:text-white">
                        {typeof value === 'number' ?
                          (key.toLowerCase().includes('percentage') || key.toLowerCase().includes('score') || key.toLowerCase().includes('ctr') ?
                            `${value.toFixed(1)}%` :
                            key.toLowerCase().includes('spend') || key.toLowerCase().includes('profit') || key.toLowerCase().includes('revenue') || key.toLowerCase().includes('savings') ?
                              `$${value.toFixed(2)}` :
                              value.toLocaleString())
                          : value}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 6. Real-Time Performance Impact */}
            {suggestion.performance && (
              <div className="bg-white/80 dark:bg-dark/80 backdrop-blur-sm border border-gray-200/50 dark:border-[#3a3a3a]/50 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="w-4 h-4 text-gray-400" />
                  <h4 className="text-base font-semibold text-gray-900 dark:text-white">
                    Real-Time Performance Impact
                  </h4>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ml-auto ${
                    suggestion.performance.is_improving
                      ? 'bg-gray-100 dark:bg-dark text-gray-600 dark:text-gray-400'
                      : 'bg-gray-100 dark:bg-dark text-gray-600 dark:text-gray-400'
                  }`}>
                    {suggestion.performance.is_improving ? 'Improving' : 'Declining'}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-gray-50 dark:bg-dark/50 rounded-lg p-3">
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Profit Change</div>
                    <div className={`text-lg font-bold ${
                      suggestion.performance.profit_delta > 0
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-red-600 dark:text-red-400'
                    }`}>
                      {suggestion.performance.profit_delta > 0 ? '+' : ''}${suggestion.performance.profit_delta.toFixed(2)}
                    </div>
                  </div>
                  <div className="bg-gray-50 dark:bg-dark/50 rounded-lg p-3">
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
                    <div className="bg-gray-50 dark:bg-dark/50 rounded-lg p-3">
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

            {/* 7. Smart Action Plan - Automated Rule */}
            {suggestion.recommended_rule && canAccept && (
              <div className="bg-white/80 dark:bg-dark/80 backdrop-blur-sm border border-gray-200/50 dark:border-[#3a3a3a]/50 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="w-5 h-5 text-red-500" />
                  <h4 className="text-base font-semibold text-gray-900 dark:text-white">
                    Smart Action Plan
                  </h4>
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
                  {suggestion.recommended_rule.description}
                </p>
                <div className="flex flex-wrap gap-2 text-xs text-gray-600 dark:text-gray-400 mb-4">
                  <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-dark px-2.5 py-1 rounded-lg">
                    <Zap className="w-3 h-3" />
                    <span>Every {suggestion.recommended_rule.check_frequency_minutes}min</span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-dark px-2.5 py-1 rounded-lg">
                    <Target className="w-3 h-3" />
                    <span>Max {suggestion.recommended_rule.max_daily_actions}/day</span>
                  </div>
                  {suggestion.recommended_rule.require_approval && (
                    <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-dark px-2.5 py-1 rounded-lg">
                      <AlertTriangle className="w-3 h-3" />
                      <span>Requires approval</span>
                    </div>
                  )}
                </div>

                <button
                  onClick={handleAccept}
                  disabled={isAccepting}
                  className="btn btn-danger flex items-center gap-2"
                >
                  <CheckCircle2 className="btn-icon w-4 h-4" />
                  <span>{isAccepting ? 'Creating...' : 'Create New Automated Rule'}</span>
                </button>
              </div>
            )}

            {/* 8. Evidence Trail */}
            {(suggestion.reasoning.methodology || suggestion.reasoning.sampleDataPoints) && (
              <div className="bg-white/80 dark:bg-dark/80 backdrop-blur-sm border border-gray-200/50 dark:border-[#3a3a3a]/50 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="w-5 h-5 text-red-500" />
                  <h4 className="text-base font-semibold text-gray-900 dark:text-white">
                    Evidence Trail
                  </h4>
                </div>

                {suggestion.reasoning.methodology && (
                  <div className="mb-3">
                    <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                      Methodology
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      {suggestion.reasoning.methodology}
                    </p>
                  </div>
                )}

                {suggestion.reasoning.sampleDataPoints && suggestion.reasoning.sampleDataPoints.length > 0 && (
                  <div>
                    <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                      Sample Data Points ({suggestion.reasoning.sampleDataPoints.length})
                    </div>
                    <div className="space-y-2">
                      {suggestion.reasoning.sampleDataPoints.slice(0, 3).map((sample: any, idx: number) => (
                        <div key={idx} className="bg-gray-50 dark:bg-dark/50 rounded-lg p-2 text-xs font-mono">
                          <pre className="text-gray-700 dark:text-gray-300 overflow-x-auto">
                            {JSON.stringify(sample, null, 2)}
                          </pre>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            </div>
          ) : (
            <div className="space-y-5">
              {/* Builder Tab - Temporarily disabled, use ComprehensiveRexInsightsModal Builder tab instead */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6 text-center">
                <FileText className="w-12 h-12 text-blue-500 mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Use Builder Tab for Segment Building</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  To build campaigns with selected segments, click on a suggestion to open the insights modal and use the Builder tab.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 dark:bg-[#3a3a3a]/50 border-t border-gray-200 dark:border-[#3a3a3a] px-6 py-4">
          {showDismissReason ? (
            <div className="flex items-center gap-3">
              <input
                type="text"
                placeholder="Why are you dismissing this? (optional)"
                value={dismissReason}
                onChange={(e) => setDismissReason(e.target.value)}
                className="flex-1 px-3 py-2 text-sm bg-white dark:bg-dark border border-gray-300 dark:border-[#4a4a4a] rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 dark:focus:ring-red-500"
                autoFocus
              />
              <button
                onClick={() => {
                  setShowDismissReason(false);
                  setDismissReason('');
                }}
                className="btn btn-ghost"
              >
                Cancel
              </button>
              <button
                onClick={handleDismiss}
                disabled={isDismissing}
                className="btn btn-primary flex items-center gap-2"
              >
                <XCircle className="btn-icon w-4 h-4" />
                <span>{isDismissing ? 'Dismissing...' : 'Confirm'}</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              {canDismiss && (
                <button
                  onClick={() => setShowDismissReason(true)}
                  disabled={isDismissing}
                  className="btn btn-secondary"
                >
                  Dismiss
                </button>
              )}
              <button
                onClick={onClose}
                className="btn btn-secondary"
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
