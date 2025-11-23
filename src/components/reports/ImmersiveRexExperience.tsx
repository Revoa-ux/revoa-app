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
  const [scrollProgress, setScrollProgress] = useState(0);
  const [rexExpression, setRexExpression] = useState<RexExpression>('greeting');
  const [showGreeting, setShowGreeting] = useState(true);
  const contentRef = useRef<HTMLDivElement>(null);

  // Determine Rex's emotional state based on suggestion
  useEffect(() => {
    if (!isOpen) return;

    setShowGreeting(true);
    setTimeout(() => setShowGreeting(false), 3000);

    if (suggestion.priority_score >= 85) {
      setRexExpression('concerned');
    } else if (suggestion.estimated_impact?.expectedProfit && suggestion.estimated_impact.expectedProfit > 0) {
      setRexExpression('excited');
    } else {
      setRexExpression('thoughtful');
    }
  }, [isOpen, suggestion]);

  // Track scroll progress
  useEffect(() => {
    const handleScroll = () => {
      if (!contentRef.current) return;
      const { scrollTop, scrollHeight, clientHeight } = contentRef.current;
      const progress = scrollTop / (scrollHeight - clientHeight);
      setScrollProgress(Math.min(progress, 1));

      // Change Rex's expression based on scroll
      if (progress < 0.3) {
        setRexExpression('greeting');
      } else if (progress < 0.6) {
        setRexExpression('thoughtful');
      } else {
        setRexExpression('excited');
      }
    };

    const contentElement = contentRef.current;
    if (contentElement) {
      contentElement.addEventListener('scroll', handleScroll);
      return () => contentElement.removeEventListener('scroll', handleScroll);
    }
  }, []);

  const handleAccept = async () => {
    setIsAccepting(true);
    setRexExpression('celebrating');
    try {
      await onAccept();
      setTimeout(() => onClose(), 500);
    } catch (error) {
      console.error('Error accepting suggestion:', error);
      setRexExpression('concerned');
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
    setRexExpression('celebrating');
    try {
      console.log('Executing action:', suggestion.suggestion_type);
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      console.error('Error executing action:', error);
      setRexExpression('concerned');
    } finally {
      setIsExecutingAction(false);
      setRexExpression('excited');
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
        className="flex items-center gap-2 px-6 py-3 text-base text-white bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl hover:scale-105"
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

          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-20 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-200/50 dark:hover:bg-gray-700/50 rounded-xl transition-all"
          >
            <X className="w-6 h-6" />
          </button>

          {/* Left Side - Rex Character */}
          <div className="relative w-full md:w-[380px] bg-gradient-to-br from-red-500 via-pink-500 to-orange-500 p-8 flex flex-col items-center justify-center overflow-hidden md:min-h-0 min-h-[300px]">
            {/* Animated Background Pattern */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 left-0 w-32 h-32 bg-white rounded-full blur-3xl animate-pulse" />
              <div className="absolute bottom-0 right-0 w-40 h-40 bg-white rounded-full blur-3xl animate-pulse delay-700" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-36 h-36 bg-white rounded-full blur-3xl animate-pulse delay-300" />
            </div>

            {/* Rex Character - Large and Animated */}
            <div className="relative z-10">
              <AnimatedRex expression={rexExpression} size="large" />
            </div>

            {/* Greeting Text with Typewriter Effect */}
            {showGreeting && (
              <div className="relative z-10 mt-6 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
                <p className="text-white text-lg font-semibold">
                  {getGreeting()}
                </p>
              </div>
            )}

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
            <div ref={contentRef} className="flex-1 overflow-y-auto px-6 md:px-8 py-6 space-y-6">

              {/* Rex's Message */}
              <div className="bg-gradient-to-r from-red-500/10 to-pink-500/10 dark:from-red-500/20 dark:to-pink-500/20 border-l-4 border-red-500 rounded-r-2xl p-6">
                <div className="flex items-start gap-3 mb-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-red-500 flex items-center justify-center text-white text-sm font-bold">
                    R
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-red-600 dark:text-red-400 mb-1">Rex here!</p>
                  </div>
                </div>
                <p className="text-base md:text-lg text-gray-700 dark:text-gray-300 leading-relaxed">
                  {suggestion.message}
                </p>
                {canAccept && (
                  <div className="mt-4">
                    {getActionButton()}
                  </div>
                )}
              </div>


              {/* Financial Impact */}
              {suggestion.estimated_impact && (
                <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-gray-200 dark:border-gray-700 rounded-2xl p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <DollarSign className="w-5 h-5 text-green-500" />
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                      Here's what this could mean for your wallet...
                    </h3>
                    <span className="text-xs px-3 py-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-full font-medium ml-auto">
                      next {suggestion.estimated_impact.timeframeDays} days
                    </span>
                  </div>

                  <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
                    <span className="font-medium">{getFinancialContext()}</span>, here's what I'm projecting:
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    {suggestion.estimated_impact.breakdown}
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {suggestion.estimated_impact.expectedSavings !== undefined && (
                      <div className="bg-gradient-to-br from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20 rounded-xl p-4">
                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-1 font-medium">Potential Savings</div>
                        <div className="text-2xl font-black text-red-600 dark:text-red-400">
                          ${suggestion.estimated_impact.expectedSavings.toFixed(2)}
                        </div>
                      </div>
                    )}
                    {suggestion.estimated_impact.expectedRevenue !== undefined && (
                      <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-xl p-4">
                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-1 font-medium">Expected Revenue</div>
                        <div className="text-2xl font-black text-gray-900 dark:text-white">
                          ${suggestion.estimated_impact.expectedRevenue.toFixed(2)}
                        </div>
                      </div>
                    )}
                    {suggestion.estimated_impact.expectedProfit !== undefined && (
                      <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl p-4">
                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-1 font-medium">Expected Profit</div>
                        <div className="text-2xl font-black text-green-600 dark:text-green-400">
                          ${suggestion.estimated_impact.expectedProfit.toFixed(2)}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Analysis Details */}
              <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-gray-200 dark:border-gray-700 rounded-2xl p-6">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                  Here's what caught my attention...
                </h3>
                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed mb-3">
                  {suggestion.reasoning.analysis}
                </p>

                {/* Metrics Grid */}
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 font-medium">
                  The numbers that stood out:
                </p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {Object.entries(suggestion.reasoning.metrics).map(([key, value]) => (
                    <div key={key} className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3">
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

              {/* Performance Tracking */}
              {suggestion.performance && (
                <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-gray-200 dark:border-gray-700 rounded-2xl p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <TrendingUp className="w-5 h-5 text-blue-500" />
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                      Update: How things have changed...
                    </h3>
                    <span className={`text-xs px-3 py-1 rounded-full font-medium ml-auto ${
                      suggestion.performance.is_improving
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                    }`}>
                      {suggestion.performance.is_improving ? 'Improving' : 'Declining'}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Profit Change</div>
                      <div className={`text-2xl font-bold ${
                        suggestion.performance.profit_delta > 0
                          ? 'text-green-600 dark:text-green-400'
                          : 'text-red-600 dark:text-red-400'
                      }`}>
                        {suggestion.performance.profit_delta > 0 ? '+' : ''}${suggestion.performance.profit_delta.toFixed(2)}
                      </div>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">ROAS Change</div>
                      <div className={`text-2xl font-bold ${
                        suggestion.performance.roas_delta > 0
                          ? 'text-green-600 dark:text-green-400'
                          : 'text-red-600 dark:text-red-400'
                      }`}>
                        {suggestion.performance.roas_delta > 0 ? '+' : ''}{suggestion.performance.roas_delta.toFixed(2)}x
                      </div>
                    </div>
                    {suggestion.performance.performance_change_percent && (
                      <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Overall Change</div>
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

              {/* Recommended Rule */}
              {suggestion.recommended_rule && canAccept && (
                <div className="bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 border-2 border-purple-200 dark:border-purple-800 rounded-2xl p-6">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                    <Zap className="w-5 h-5 text-purple-500" />
                    Want me to watch this for you?
                  </h3>
                  <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
                    I can keep an eye on this and take action automatically. {suggestion.recommended_rule.description}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-4">
                    Don't worry, I'll notify you whenever I take action.
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
                    className="flex items-center gap-2 px-6 py-3 text-base font-semibold text-white bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 rounded-xl shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:shadow-xl hover:scale-105"
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

// Animated Rex Character Component
interface AnimatedRexProps {
  expression: RexExpression;
  size?: 'small' | 'medium' | 'large';
}

const AnimatedRex: React.FC<AnimatedRexProps> = ({ expression, size = 'large' }) => {
  const sizeClasses = {
    small: 'w-16 h-16',
    medium: 'w-32 h-32',
    large: 'w-48 h-48'
  };

  const getExpressionStyles = () => {
    switch (expression) {
      case 'greeting':
        return { animation: 'animate-bounce', eyes: 'excited', mouth: 'smile' };
      case 'excited':
        return { animation: 'animate-pulse', eyes: 'wide', mouth: 'big-smile' };
      case 'concerned':
        return { animation: 'animate-pulse', eyes: 'worried', mouth: 'frown' };
      case 'thoughtful':
        return { animation: '', eyes: 'normal', mouth: 'neutral' };
      case 'celebrating':
        return { animation: 'animate-bounce', eyes: 'excited', mouth: 'big-smile' };
      default:
        return { animation: '', eyes: 'normal', mouth: 'smile' };
    }
  };

  const styles = getExpressionStyles();

  return (
    <div className="relative">
      {/* Glow Effect */}
      <div className="absolute inset-0 bg-white rounded-full blur-3xl opacity-30 animate-pulse" />

      {/* Rex Character */}
      <div className={`relative ${sizeClasses[size]} ${styles.animation}`}>
        <div className="w-full h-full rounded-full bg-white/20 backdrop-blur-sm border-4 border-white/50 flex items-center justify-center shadow-2xl">
          <svg
            viewBox="0 0 100 100"
            className="w-3/4 h-3/4 text-white drop-shadow-2xl"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {/* Robot head */}
            <rect x="20" y="25" width="60" height="55" rx="10" fill="currentColor" opacity="0.95" />

            {/* Eyes */}
            {styles.eyes === 'excited' && (
              <>
                <circle cx="35" cy="42" r="5" fill="white" />
                <circle cx="65" cy="42" r="5" fill="white" />
                <circle cx="35" cy="42" r="2.5" fill="currentColor" />
                <circle cx="65" cy="42" r="2.5" fill="currentColor" />
              </>
            )}
            {styles.eyes === 'wide' && (
              <>
                <circle cx="35" cy="42" r="6" fill="white" />
                <circle cx="65" cy="42" r="6" fill="white" />
                <circle cx="35" cy="42" r="3" fill="currentColor" />
                <circle cx="65" cy="42" r="3" fill="currentColor" />
              </>
            )}
            {styles.eyes === 'worried' && (
              <>
                <line x1="30" y1="40" x2="40" y2="42" stroke="white" strokeWidth="3" />
                <line x1="60" y1="42" x2="70" y2="40" stroke="white" strokeWidth="3" />
              </>
            )}
            {styles.eyes === 'normal' && (
              <>
                <circle cx="35" cy="42" r="4" fill="white" />
                <circle cx="65" cy="42" r="4" fill="white" />
                <circle cx="35" cy="42" r="2" fill="currentColor" />
                <circle cx="65" cy="42" r="2" fill="currentColor" />
              </>
            )}

            {/* Mouth */}
            {styles.mouth === 'smile' && (
              <path d="M 32 60 Q 50 68 68 60" stroke="white" strokeWidth="3" fill="none" />
            )}
            {styles.mouth === 'big-smile' && (
              <path d="M 30 58 Q 50 72 70 58" stroke="white" strokeWidth="3.5" fill="none" />
            )}
            {styles.mouth === 'frown' && (
              <path d="M 32 68 Q 50 60 68 68" stroke="white" strokeWidth="3" fill="none" />
            )}
            {styles.mouth === 'neutral' && (
              <line x1="32" y1="64" x2="68" y2="64" stroke="white" strokeWidth="3" />
            )}

            {/* Antenna */}
            <line x1="50" y1="25" x2="50" y2="15" stroke="currentColor" strokeWidth="3" />
            <circle cx="50" cy="12" r="4" fill="currentColor" />
            <circle cx="50" cy="12" r="2" fill="white" className="animate-ping" />
          </svg>
        </div>

        {/* Floating Particles */}
        <div className="absolute -top-2 -right-2 w-3 h-3 bg-white rounded-full animate-ping" />
        <div className="absolute -bottom-2 -left-2 w-2 h-2 bg-white rounded-full animate-pulse delay-300" />
        <div className="absolute top-1/4 -right-3 w-2.5 h-2.5 bg-white rounded-full animate-bounce delay-500" />
      </div>
    </div>
  );
};
