import React, { useState, useEffect, useRef } from 'react';
import { X, TrendingUp, AlertTriangle, Target, DollarSign, CheckCircle2, XCircle, Zap, Pause, TrendingDown, Copy, Settings, Sparkles } from 'lucide-react';
import type { RexSuggestionWithPerformance } from '@/types/rex';

interface ImmersiveRexExperienceProps {
  isOpen: boolean;
  onClose: () => void;
  suggestion: RexSuggestionWithPerformance;
  onAccept: () => Promise<void>;
  onDismiss: (reason?: string) => Promise<void>;
}

type RexExpression = 'greeting' | 'excited' | 'concerned' | 'thoughtful' | 'celebrating';

export const ImmersiveRexExperience: React.FC<ImmersiveRexExperienceProps> = ({
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
  const [viewMode, setViewMode] = useState<'simple' | 'detailed' | 'flow'>('simple');
  const [showGreeting, setShowGreeting] = useState(true);
  const contentRef = useRef<HTMLDivElement>(null);

  // Show greeting on modal open
  useEffect(() => {
    if (!isOpen) return;

    setShowGreeting(true);
    setTimeout(() => setShowGreeting(false), 3000);
  }, [isOpen]);

  // Rex stays calm with a single friendly expression - no changes based on scroll

  const handleAccept = async () => {
    setIsAccepting(true);
    try {
      await onAccept();
      setTimeout(() => onClose(), 500);
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

  // Get dynamic greeting based on suggestion type and priority
  const getGreeting = () => {
    if (suggestion.priority_score >= 85) {
      return "Hold on, I need to show you something...";
    }
    if (suggestion.estimated_impact?.expectedProfit && suggestion.estimated_impact.expectedProfit > 0) {
      return "Hey! I found something exciting...";
    }
    if (suggestion.suggestion_type.includes('pause') || suggestion.suggestion_type.includes('negative')) {
      return "Heads up, something's not looking right...";
    }
    return "I noticed something you should know about...";
  };

  // Get conversational context for financial impact
  const getFinancialContext = () => {
    const typeMap: Record<string, string> = {
      pause_underperforming: 'If you pause this underperforming ad',
      scale_high_performer: 'If you scale this high-performing ad',
      refresh_creative: 'If you refresh this creative',
      adjust_targeting: 'If you adjust targeting',
      reduce_budget: 'If you reduce the budget',
      increase_budget: 'If you increase the budget',
      pause_negative_roi: 'If you pause this negative ROI ad',
      reallocate_budget: 'If you reallocate the budget',
      test_new_creative: 'If you test new creative',
      optimize_schedule: 'If you optimize the schedule',
    };

    return typeMap[suggestion.suggestion_type] || 'If you implement this suggestion';
  };

  // Format metric values with proper symbols
  const formatMetricValue = (key: string, value: any): string => {
    if (typeof value !== 'number') return value;

    const lowerKey = key.toLowerCase();

    // Percentage values
    if (lowerKey.includes('percentage') || lowerKey.includes('score') ||
        lowerKey.includes('ctr') || lowerKey.includes('rate')) {
      return `${value.toFixed(1)}%`;
    }

    // Currency values
    if (lowerKey.includes('spend') || lowerKey.includes('profit') ||
        lowerKey.includes('revenue') || lowerKey.includes('cpa') ||
        lowerKey.includes('cpc') || lowerKey.includes('cpm')) {
      return `$${value.toFixed(2)}`;
    }

    // ROAS (return on ad spend)
    if (lowerKey.includes('roas')) {
      return `${value.toFixed(2)}x`;
    }

    // Regular numbers
    return value.toLocaleString();
  };

  // Format metric label
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
        className="flex items-center gap-2 px-6 py-3 text-base text-white bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 rounded-xl font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Icon className="w-5 h-5" />
        <span>{isExecutingAction ? 'Executing...' : action.label}</span>
      </button>
    );
  };

  const canAccept = suggestion.status === 'pending' || suggestion.status === 'viewed';
  const canDismiss = suggestion.status !== 'dismissed' && suggestion.status !== 'expired' && suggestion.status !== 'completed';

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden animate-in fade-in duration-300">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose} />

      {/* Main Container */}
      <div className="relative h-full w-full flex items-center justify-center p-4 md:p-8">
        <div className="relative w-full h-full max-w-7xl max-h-[90vh] flex flex-col md:flex-row bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-8 duration-500">

          {/* Top Right Controls */}
          <div className="absolute top-4 right-4 z-20 flex items-center gap-3">
            {/* View Toggle - Three modes */}
            <div className="flex items-center bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-xl p-1 shadow-sm">
              <button
                onClick={() => setViewMode('simple')}
                className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  viewMode === 'simple'
                    ? 'bg-gradient-to-r from-red-500 to-pink-500 text-white'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                Chat
              </button>
              <button
                onClick={() => setViewMode('detailed')}
                className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  viewMode === 'detailed'
                    ? 'bg-gradient-to-r from-red-500 to-pink-500 text-white'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                Detailed
              </button>
              <button
                onClick={() => setViewMode('flow')}
                className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  viewMode === 'flow'
                    ? 'bg-gradient-to-r from-red-500 to-pink-500 text-white'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                Flow
              </button>
            </div>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-200/50 dark:hover:bg-gray-700/50 rounded-xl transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Left Side - Rex Character */}
          <div className="relative w-full md:w-[380px] bg-gradient-to-br from-red-500 via-pink-500 to-orange-500 p-8 flex flex-col items-center justify-center overflow-hidden md:min-h-0 min-h-[300px]">
            {/* Animated Background Particles - 8 varied particles */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-[10%] left-[15%] w-24 h-24 bg-white rounded-full blur-3xl animate-[pulse_12s_ease-in-out_infinite]" />
              <div className="absolute top-[25%] right-[10%] w-32 h-32 bg-white rounded-full blur-3xl animate-[pulse_15s_ease-in-out_infinite_2s]" />
              <div className="absolute top-[60%] left-[5%] w-28 h-28 bg-white rounded-full blur-3xl animate-[pulse_18s_ease-in-out_infinite_4s]" />
              <div className="absolute bottom-[15%] right-[20%] w-36 h-36 bg-white rounded-full blur-3xl animate-[pulse_20s_ease-in-out_infinite_6s]" />
              <div className="absolute top-[45%] left-[40%] w-20 h-20 bg-white rounded-full blur-3xl animate-[pulse_14s_ease-in-out_infinite_3s]" />
              <div className="absolute top-[75%] left-[50%] w-30 h-30 bg-white rounded-full blur-3xl animate-[pulse_16s_ease-in-out_infinite_5s]" />
              <div className="absolute top-[35%] right-[35%] w-26 h-26 bg-white rounded-full blur-3xl animate-[pulse_13s_ease-in-out_infinite_1s]" />
              <div className="absolute bottom-[40%] right-[8%] w-22 h-22 bg-white rounded-full blur-3xl animate-[pulse_17s_ease-in-out_infinite_7s]" />
            </div>

            {/* Rex Character - Gentle Float Animation */}
            <div className="relative z-10 animate-[float_6s_ease-in-out_infinite]">
              <AnimatedRex size="large" />
            </div>

            {/* Name Badge */}
            <div className="relative z-10 mt-4">
              <div className="bg-white/90 backdrop-blur-sm rounded-full px-4 py-2 shadow-lg">
                <p className="text-red-600 font-bold text-sm">Rex</p>
              </div>
            </div>

            {/* Speech Bubble - Always visible, underneath name badge */}
            <div className="relative z-10 mt-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="relative bg-white rounded-2xl px-6 py-4 shadow-lg max-w-[280px]">
                {/* Speech bubble tail pointing up */}
                <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-8 border-l-transparent border-r-8 border-r-transparent border-b-8 border-b-white" />
                <p className="text-gray-900 text-sm font-medium text-center leading-relaxed">
                  {getGreeting()}
                </p>
              </div>
            </div>

            {/* Speech Bubble Tail - Hidden on mobile, visible on desktop */}
            <div className="hidden md:block absolute -right-4 top-1/2 -translate-y-1/2 w-0 h-0 border-t-[20px] border-t-transparent border-l-[20px] border-l-red-500 border-b-[20px] border-b-transparent" />
          </div>

          {/* Right Side - Content */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Content Header */}
            <div className="bg-gradient-to-r from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20 border-b border-gray-200 dark:border-gray-700 px-6 md:px-8 py-6">
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-2">
                {suggestion.title}
              </h2>
              <div className="flex items-center gap-3 flex-wrap text-sm">
                <span className="text-gray-600 dark:text-gray-400">
                  {suggestion.entity_type === 'campaign' ? 'Campaign' : suggestion.entity_type === 'ad_set' ? 'Ad Set' : 'Ad'}: {suggestion.entity_name}
                </span>
                {suggestion.priority_score >= 85 && (
                  <span className="px-3 py-1 rounded-full font-semibold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    High Priority
                  </span>
                )}
              </div>
            </div>

            {/* Scrollable Content */}
            <div ref={contentRef} className="flex-1 overflow-y-auto px-6 md:px-8 py-6 space-y-4">

              {/* CHAT VIEW - Conversational Bubbles */}
              {viewMode === 'simple' && (
                <div className="space-y-4 max-w-4xl">
                  {/* Rex's Message Bubble - Left aligned */}
                  <div className="flex justify-start">
                    <div className="max-w-[85%] bg-gradient-to-br from-red-50 to-pink-50 dark:from-red-900/30 dark:to-pink-900/30 rounded-3xl rounded-tl-sm p-5 shadow-sm border border-red-200/50 dark:border-red-800/50">
                      <p className="text-base text-gray-800 dark:text-gray-200 leading-relaxed">
                        {suggestion.message}
                      </p>
                      {canAccept && (
                        <div className="mt-4">
                          {getActionButton()}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Financial Impact Bubble - Right aligned (Your Response) */}
                  {suggestion.estimated_impact && (
                    <div className="flex justify-end">
                      <div className="max-w-[85%] bg-white dark:bg-gray-800 rounded-3xl rounded-tr-sm p-5 shadow-sm border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-2 mb-3">
                          <DollarSign className="w-4 h-4 text-red-500" />
                          <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                            Here is what this could mean...
                          </h4>
                          <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full ml-auto">
                            {suggestion.estimated_impact.timeframeDays}d
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                          {suggestion.estimated_impact.breakdown}
                        </p>
                        <div className="grid grid-cols-3 gap-2">
                          {suggestion.estimated_impact.expectedSavings !== undefined && (
                            <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3 text-center">
                              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Savings</div>
                              <div className="text-lg font-black text-red-600 dark:text-red-400">
                                ${suggestion.estimated_impact.expectedSavings.toFixed(0)}
                              </div>
                            </div>
                          )}
                          {suggestion.estimated_impact.expectedRevenue !== undefined && (
                            <div className="bg-gray-100 dark:bg-gray-700/50 rounded-lg p-3 text-center">
                              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Revenue</div>
                              <div className="text-lg font-black text-gray-900 dark:text-white">
                                ${suggestion.estimated_impact.expectedRevenue.toFixed(0)}
                              </div>
                            </div>
                          )}
                          {suggestion.estimated_impact.expectedProfit !== undefined && (
                            <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3 text-center">
                              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Profit</div>
                              <div className="text-lg font-black text-red-600 dark:text-red-400">
                                ${suggestion.estimated_impact.expectedProfit.toFixed(0)}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Analysis Bubble - Left aligned (Rex continues) */}
                  <div className="flex justify-start">
                    <div className="max-w-[85%] bg-gradient-to-br from-red-50 to-pink-50 dark:from-red-900/30 dark:to-pink-900/30 rounded-3xl rounded-tl-sm p-5 shadow-sm border border-red-200/50 dark:border-red-800/50">
                      <h4 className="text-base font-bold text-gray-900 dark:text-white mb-3">
                        Here is what caught my attention...
                      </h4>
                      <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                        {suggestion.reasoning.analysis}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 font-medium">
                        Key metrics:
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        {Object.entries(suggestion.reasoning.metrics).slice(0, 6).map(([key, value]) => (
                          <div key={key} className="bg-white/60 dark:bg-gray-900/40 rounded-lg p-2">
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {formatMetricLabel(key)}
                            </div>
                            <div className="text-sm font-bold text-gray-900 dark:text-white">
                              {formatMetricValue(key, value)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Automation Offer Bubble - Left aligned (Rex offers help) */}
                  {suggestion.recommended_rule && canAccept && (
                    <div className="flex justify-start">
                      <div className="max-w-[85%] bg-gradient-to-br from-red-50 to-pink-50 dark:from-red-900/30 dark:to-pink-900/30 rounded-3xl rounded-tl-sm p-5 shadow-sm border border-red-200/50 dark:border-red-800/50">
                        <h4 className="text-base font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                          <Zap className="w-4 h-4 text-red-500" />
                          Want me to watch this for you?
                        </h4>
                        <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                          I can keep an eye on this and take action automatically. {suggestion.recommended_rule.description}
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                          Do not worry, I will notify you whenever I take action.
                        </p>
                        <div className="flex flex-wrap gap-2 text-xs text-gray-600 dark:text-gray-400 mb-4">
                          <div className="flex items-center gap-1.5 bg-white/60 dark:bg-gray-900/40 px-2 py-1 rounded-lg">
                            <Zap className="w-3 h-3" />
                            <span>Every {suggestion.recommended_rule.check_frequency_minutes}min</span>
                          </div>
                          <div className="flex items-center gap-1.5 bg-white/60 dark:bg-gray-900/40 px-2 py-1 rounded-lg">
                            <Target className="w-3 h-3" />
                            <span>Max {suggestion.recommended_rule.max_daily_actions}/day</span>
                          </div>
                        </div>
                        <button
                          onClick={handleAccept}
                          disabled={isAccepting}
                          className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold text-white bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>{isAccepting ? 'Setting it up...' : 'Yes, automate this for me'}</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* FLOW VIEW - Visual Process Flow */}
              {viewMode === 'flow' && (
                <div className="max-w-5xl mx-auto">
                  <div className="bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 rounded-2xl p-8 border border-gray-200 dark:border-gray-700">
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 text-center">
                      Rex's Recommendation Flow
                    </h3>
                    <p className="text-center text-gray-600 dark:text-gray-400 mb-8">
                      Flow diagram view coming soon - will show visual process of how Rex analyzed this suggestion
                    </p>
                    {/* Placeholder for flow diagram */}
                    <div className="text-center text-sm text-gray-500 dark:text-gray-400">
                      This will include: Data observation → Pattern detection → Impact calculation → Automation setup
                    </div>
                  </div>
                </div>
              )}

              {/* DETAILED VIEW - Comprehensive Analytics */}
              {viewMode === 'detailed' && (
                <div className="space-y-6">
                  <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-6 shadow-sm">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                      Here is what caught my attention...
                    </h3>
                    <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                      {suggestion.reasoning.analysis}
                    </p>

                    {/* All Metrics in Detailed View */}
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 font-medium">
                      Complete metric breakdown:
                    </p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {Object.entries(suggestion.reasoning.metrics).map(([key, value]) => (
                        <div key={key} className="bg-white dark:bg-gray-900/50 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1 font-medium">
                            {formatMetricLabel(key)}
                          </div>
                          <div className="text-lg font-bold text-gray-900 dark:text-white">
                            {formatMetricValue(key, value)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Additional Technical Details */}
                  <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-6 shadow-sm">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">
                      Technical Details
                    </h3>
                    <div className="space-y-3">
                      <div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-1">Confidence Score</div>
                        <div className="text-base text-gray-900 dark:text-white">{suggestion.confidence_score}%</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-1">Priority Level</div>
                        <div className="text-base text-gray-900 dark:text-white">{suggestion.priority_score}/100</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-1">Risk Assessment</div>
                        <div className="text-base text-gray-900 dark:text-white capitalize">{suggestion.reasoning.riskLevel || 'Medium'}</div>
                      </div>
                      {suggestion.reasoning.triggeredBy && (
                        <div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-1">Triggered By</div>
                          <div className="flex flex-wrap gap-2">
                            {suggestion.reasoning.triggeredBy.map((trigger, idx) => (
                              <span key={idx} className="text-xs px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-md">
                                {trigger.replace(/_/g, ' ')}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Performance Tracking */}
              {suggestion.performance && (
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-6 shadow-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <TrendingUp className="w-5 h-5 text-red-500" />
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                      Update: How things have changed...
                    </h3>
                    <span className={`text-xs px-3 py-1 rounded-full font-medium ml-auto ${
                      suggestion.performance.is_improving
                        ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                        : 'bg-gray-200 text-gray-700 dark:bg-gray-700/30 dark:text-gray-400'
                    }`}>
                      {suggestion.performance.is_improving ? 'Improving' : 'Declining'}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white dark:bg-gray-900/50 rounded-lg p-4">
                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Profit Change</div>
                      <div className={`text-2xl font-bold ${
                        suggestion.performance.profit_delta > 0
                          ? 'text-red-600 dark:text-red-400'
                          : 'text-gray-600 dark:text-gray-400'
                      }`}>
                        {suggestion.performance.profit_delta > 0 ? '+' : ''}${suggestion.performance.profit_delta.toFixed(2)}
                      </div>
                    </div>
                    <div className="bg-white dark:bg-gray-900/50 rounded-lg p-4">
                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">ROAS Change</div>
                      <div className={`text-2xl font-bold ${
                        suggestion.performance.roas_delta > 0
                          ? 'text-red-600 dark:text-red-400'
                          : 'text-gray-600 dark:text-gray-400'
                      }`}>
                        {suggestion.performance.roas_delta > 0 ? '+' : ''}{suggestion.performance.roas_delta.toFixed(2)}x
                      </div>
                    </div>
                    {suggestion.performance.performance_change_percent && (
                      <div className="bg-white dark:bg-gray-900/50 rounded-lg p-4">
                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Overall Change</div>
                        <div className={`text-2xl font-bold ${
                          suggestion.performance.performance_change_percent > 0
                            ? 'text-red-600 dark:text-red-400'
                            : 'text-gray-600 dark:text-gray-400'
                        }`}>
                          {suggestion.performance.performance_change_percent > 0 ? '+' : ''}{suggestion.performance.performance_change_percent.toFixed(1)}%
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Recommended Rule - Automation Offer */}
              {suggestion.recommended_rule && canAccept && (
                <div className="bg-gradient-to-br from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20 border-2 border-red-200 dark:border-red-800 rounded-2xl p-6 shadow-sm">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                    <Zap className="w-5 h-5 text-red-500" />
                    Want me to watch this for you?
                  </h3>
                  <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
                    I can keep an eye on this and take action automatically. {suggestion.recommended_rule.description}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-4">
                    Do not worry, I will notify you whenever I take action.
                  </p>
                  <div className="flex flex-wrap gap-2 text-xs text-gray-600 dark:text-gray-400 mb-4">
                    <div className="flex items-center gap-1.5 bg-white dark:bg-gray-800 px-3 py-1.5 rounded-lg">
                      <Zap className="w-3 h-3" />
                      <span>Every {suggestion.recommended_rule.check_frequency_minutes}min</span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-white dark:bg-gray-800 px-3 py-1.5 rounded-lg">
                      <Target className="w-3 h-3" />
                      <span>Max {suggestion.recommended_rule.max_daily_actions}/day</span>
                    </div>
                  </div>

                  <button
                    onClick={handleAccept}
                    disabled={isAccepting}
                    className="flex items-center gap-2 px-6 py-3 text-base font-semibold text-white bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <CheckCircle2 className="w-5 h-5" />
                    <span>{isAccepting ? 'Setting it up...' : 'Yes, automate this for me'}</span>
                  </button>
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 px-6 md:px-8 py-4">
              {showDismissReason ? (
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    placeholder="Why are you dismissing this? (optional)"
                    value={dismissReason}
                    onChange={(e) => setDismissReason(e.target.value)}
                    className="flex-1 px-4 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500"
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
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gray-600 hover:bg-gray-700 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <XCircle className="w-4 h-4" />
                    <span>{isDismissing ? 'Dismissing...' : 'Confirm'}</span>
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-3 justify-end">
                  {canDismiss && (
                    <button
                      onClick={() => setShowDismissReason(true)}
                      disabled={isDismissing}
                      className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Dismiss
                    </button>
                  )}
                  <button
                    onClick={onClose}
                    className="px-6 py-2 text-sm font-medium text-white bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 rounded-xl"
                  >
                    Close
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

// Calm Rex Character Component - Single friendly expression
interface AnimatedRexProps {
  size?: 'small' | 'medium' | 'large';
}

const AnimatedRex: React.FC<AnimatedRexProps> = ({ size = 'large' }) => {
  const sizeClasses = {
    small: 'w-16 h-16',
    medium: 'w-32 h-32',
    large: 'w-48 h-48'
  };

  return (
    <div className="relative">
      {/* Pulsing Glow Effect */}
      <div className="absolute inset-0 bg-white rounded-full blur-3xl opacity-30 animate-[pulse_3s_ease-in-out_infinite]" />

      {/* Rex Character - with breathing animation */}
      <div className={`relative ${sizeClasses[size]} animate-[breathe_4s_ease-in-out_infinite]`}>
        <div className="w-full h-full rounded-full bg-white/20 backdrop-blur-sm border-4 border-white/50 flex items-center justify-center shadow-2xl">
          <svg
            viewBox="0 0 100 100"
            className="w-3/4 h-3/4 text-white drop-shadow-2xl"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {/* Robot head */}
            <rect x="15" y="20" width="70" height="60" rx="12" fill="currentColor" opacity="0.98" />

            {/* Eyes - BIGGER and more visible */}
            <circle cx="33" cy="40" r="7" fill="white" />
            <circle cx="67" cy="40" r="7" fill="white" />
            <circle cx="33" cy="40" r="3.5" fill="currentColor" className="animate-[blink_5s_ease-in-out_infinite]" />
            <circle cx="67" cy="40" r="3.5" fill="currentColor" className="animate-[blink_5s_ease-in-out_infinite]" />

            {/* Eye Shine - makes eyes pop */}
            <circle cx="31" cy="38" r="2" fill="white" opacity="0.8" />
            <circle cx="65" cy="38" r="2" fill="white" opacity="0.8" />

            {/* Mouth - BIG prominent smile */}
            <path d="M 25 58 Q 50 72 75 58" stroke="white" strokeWidth="4" fill="none" />

            {/* Optional: Cheek marks for extra cartooniness */}
            <circle cx="20" cy="52" r="3" fill="white" opacity="0.4" />
            <circle cx="80" cy="52" r="3" fill="white" opacity="0.4" />

            {/* Antenna with animated tip */}
            <line x1="50" y1="20" x2="50" y2="8" stroke="currentColor" strokeWidth="3" />
            <circle cx="50" cy="6" r="5" fill="currentColor" />
            <circle cx="50" cy="6" r="2.5" fill="white" className="animate-[ping_2s_ease-in-out_infinite]" />
          </svg>
        </div>
      </div>
    </div>
  );
};
