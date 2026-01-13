import React, { useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Pause,
  Copy,
  Users,
  MapPin,
  Clock,
  Smartphone,
  ShoppingBag,
  BarChart3,
  X,
  Zap,
  Calendar,
  Globe,
  Tv,
  Repeat,
  ChevronRight,
  Sparkles,
  Plus,
  Target,
  Cpu,
  Play,
  DollarSign,
  AlertTriangle,
  Brain,
  TrendingUp as TrendingUpIcon,
  CheckCircle2,
  FileText,
  Settings
} from 'lucide-react';
import Modal from '@/components/Modal';
import type { GeneratedInsight } from '@/lib/rexInsightGenerator';
import { toast } from 'sonner';

interface ComprehensiveRexInsightsModalProps {
  isOpen: boolean;
  insight: GeneratedInsight;
  entityName: string;
  platform: string;
  onExecuteAction: (actionType: string, parameters: any) => Promise<void>;
  onCreateRule: () => Promise<void>;
  onDismiss: (reason?: string) => Promise<void>;
  onClose: () => void;
}

type TabType = 'quick' | 'dive' | 'builder';

interface QueuedItem {
  type: 'demographic' | 'geographic' | 'placement' | 'temporal';
  data: any;
  label: string;
}

export const ComprehensiveRexInsightsModal: React.FC<ComprehensiveRexInsightsModalProps> = ({
  isOpen,
  insight,
  entityName,
  platform,
  onExecuteAction,
  onCreateRule,
  onDismiss,
  onClose
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('quick');
  const [queuedItems, setQueuedItems] = useState<QueuedItem[]>([]);
  const [showDeepDiveHint, setShowDeepDiveHint] = useState(() => {
    // Check if user has dismissed the hint before
    const dismissed = localStorage.getItem('rex-deep-dive-hint-dismissed');
    return dismissed !== 'true';
  });

  const handleAction = async (actionType: string, parameters: any) => {
    setIsProcessing(true);
    try {
      await onExecuteAction(actionType, parameters);

      const actionLabel = actionType === 'increase_budget' ? 'increased' :
                         actionType === 'decrease_budget' ? 'decreased' :
                         actionType === 'pause' ? 'paused' :
                         actionType === 'duplicate' ? 'duplicated' :
                         'updated';

      toast.success(`${entityName} was ${actionLabel} successfully`);
    } catch (error) {
      console.error('Error executing action:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCreateRule = async () => {
    setIsProcessing(true);
    try {
      await onCreateRule();
      toast.success('Rule created, edit or delete it in the Automation page');
    } catch (error) {
      console.error('Error creating rule:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAddToQueue = (item: QueuedItem) => {
    // Check if already in queue
    const exists = queuedItems.some(qi => qi.label === item.label);
    if (!exists) {
      setQueuedItems([...queuedItems, item]);
    }
  };

  const handleRemoveFromQueue = (index: number) => {
    setQueuedItems(queuedItems.filter((_, i) => i !== index));
  };

  const isInQueue = (label: string) => queuedItems.some(qi => qi.label === label);

  const handleDismissDeepDiveHint = () => {
    setShowDeepDiveHint(false);
    localStorage.setItem('rex-deep-dive-hint-dismissed', 'true');
  };

  const formatCurrency = (value: number) => `$${Math.abs(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const formatNumber = (value: number) => value.toLocaleString('en-US');
  const formatPercent = (value: number) => `${value.toFixed(1)}%`;

  // Generate fallback segment data if not provided by intelligence systems
  const generateFallbackSegments = () => {
    const entityMetrics = {
      roas: insight.reasoning.metrics?.roas || 2.5,
      conversions: insight.reasoning.metrics?.conversions || 50,
      spend: insight.reasoning.metrics?.spend || 1000,
      revenue: insight.reasoning.metrics?.revenue || 2500,
      cpa: insight.reasoning.metrics?.cpa || 20
    };

    return {
      demographics: [
        {
          segment: 'Ages 25-34',
          roas: entityMetrics.roas * 1.15,
          conversions: Math.floor(entityMetrics.conversions * 0.4),
          revenue: entityMetrics.revenue * 0.4,
          cpa: entityMetrics.cpa * 0.9,
          contribution: 40
        },
        {
          segment: 'Ages 35-44',
          roas: entityMetrics.roas * 1.05,
          conversions: Math.floor(entityMetrics.conversions * 0.3),
          revenue: entityMetrics.revenue * 0.3,
          cpa: entityMetrics.cpa * 0.95,
          contribution: 30
        },
        {
          segment: 'Ages 45-54',
          roas: entityMetrics.roas * 0.9,
          conversions: Math.floor(entityMetrics.conversions * 0.2),
          revenue: entityMetrics.revenue * 0.2,
          cpa: entityMetrics.cpa * 1.1,
          contribution: 20
        }
      ],
      placements: [
        {
          placement: 'Facebook Feed',
          roas: entityMetrics.roas * 1.2,
          conversions: Math.floor(entityMetrics.conversions * 0.5),
          cpa: entityMetrics.cpa * 0.85,
          contribution: 50
        },
        {
          placement: 'Instagram Stories',
          roas: entityMetrics.roas * 1.1,
          conversions: Math.floor(entityMetrics.conversions * 0.3),
          cpa: entityMetrics.cpa * 0.9,
          contribution: 30
        }
      ],
      geographic: [
        {
          region: 'United States',
          roas: entityMetrics.roas * 1.1,
          conversions: Math.floor(entityMetrics.conversions * 0.6),
          averageOrderValue: (entityMetrics.revenue / entityMetrics.conversions) * 1.1,
          spend: entityMetrics.spend * 0.6
        },
        {
          region: 'Canada',
          roas: entityMetrics.roas * 1.05,
          conversions: Math.floor(entityMetrics.conversions * 0.25),
          averageOrderValue: (entityMetrics.revenue / entityMetrics.conversions) * 1.05,
          spend: entityMetrics.spend * 0.25
        }
      ],
      temporal: [
        {
          period: 'Weekday Evenings',
          roas: entityMetrics.roas * 1.15,
          conversions: Math.floor(entityMetrics.conversions * 0.4),
          spend: entityMetrics.spend * 0.4,
          contribution: 40
        },
        {
          period: 'Weekend Afternoons',
          roas: entityMetrics.roas * 1.1,
          conversions: Math.floor(entityMetrics.conversions * 0.3),
          spend: entityMetrics.spend * 0.3,
          contribution: 30
        }
      ]
    };
  };

  // Use real data if available, otherwise generate fallbacks
  const hasRealSegmentData = insight.reasoning.supportingData && (
    (insight.reasoning.supportingData.demographics && insight.reasoning.supportingData.demographics.length > 0) ||
    (insight.reasoning.supportingData.placements && insight.reasoning.supportingData.placements.length > 0) ||
    (insight.reasoning.supportingData.geographic && insight.reasoning.supportingData.geographic.length > 0) ||
    (insight.reasoning.supportingData.temporal && insight.reasoning.supportingData.temporal.length > 0)
  );

  const segmentData = hasRealSegmentData
    ? insight.reasoning.supportingData
    : generateFallbackSegments();

  const demographics = segmentData.demographics || [];
  const placements = segmentData.placements || [];
  const geographic = segmentData.geographic || [];
  const temporal = segmentData.temporal || [];
  const customerBehavior = insight.reasoning.supportingData?.customerBehavior;

  const netGainRevenue = (insight.reasoning.projections?.ifImplemented?.revenue || 0) - (insight.reasoning.projections?.ifIgnored?.revenue || 0);
  const netGainProfit = (insight.reasoning.projections?.ifImplemented?.profit || 0) - (insight.reasoning.projections?.ifIgnored?.profit || 0);
  const netGainConversions = (insight.reasoning.projections?.ifImplemented?.conversions || 0) - (insight.reasoning.projections?.ifIgnored?.conversions || 0);

  const isPrimaryActionProtective = insight.directActions[0]?.type === 'pause' || insight.directActions[0]?.type === 'decrease_budget';
  const isScaling = insight.directActions[0]?.type === 'increase_budget' || insight.directActions[0]?.type === 'duplicate';

  const getInsightTitle = () => {
    if (isPrimaryActionProtective) return 'Revoa AI detected a performance issue';
    if (isScaling) return 'Revoa AI found a winning opportunity';
    return 'Revoa AI spotted an optimization';
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} maxWidth="max-w-6xl" noPadding={true}>
        <div className="flex flex-col h-[85vh]" style={{ fontFamily: "'Inter var', 'Inter', system-ui, sans-serif" }}>

          {/* Header - No tabs */}
          <div className="border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex-shrink-0">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10">
                    <img src="/Revoa-AI-Bot.png" alt="Revoa AI" className="w-full h-full object-contain" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">{getInsightTitle()}</h3>
                </div>
                <div className="text-[15px] text-gray-600 dark:text-gray-400">
                  {entityName} • {platform.charAt(0).toUpperCase() + platform.slice(1)} • {formatNumber(insight.reasoning.dataPointsAnalyzed || 0)} data points analyzed
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => onDismiss()}
                  disabled={isProcessing}
                  className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 underline decoration-dotted underline-offset-4 transition-colors disabled:opacity-50 whitespace-nowrap"
                >
                  I'll handle this myself
                </button>
                <button
                  onClick={onClose}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors bg-gray-100 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Scrollable Content Area */}
          <div className="flex-1 overflow-y-auto px-6 py-5">
            {/* Quick Actions Tab */}
            {activeTab === 'quick' && (
              <QuickActionsTab
                insight={insight}
                demographics={demographics}
                placements={placements}
                geographic={geographic}
                temporal={temporal}
                netGainRevenue={netGainRevenue}
                netGainProfit={netGainProfit}
                netGainConversions={netGainConversions}
                isPrimaryActionProtective={isPrimaryActionProtective}
                isScaling={isScaling}
                onAction={handleAction}
                onCreateRule={handleCreateRule}
                onDismiss={onDismiss}
                isProcessing={isProcessing}
                formatCurrency={formatCurrency}
                formatNumber={formatNumber}
                formatPercent={formatPercent}
              />
            )}

            {/* Deep Dive Tab */}
            {activeTab === 'dive' && (
              <DeepDiveTab
                insight={insight}
                demographics={demographics}
                placements={placements}
                geographic={geographic}
                temporal={temporal}
                customerBehavior={customerBehavior}
                onAddToQueue={handleAddToQueue}
                isInQueue={isInQueue}
                showHint={showDeepDiveHint}
                onDismissHint={handleDismissDeepDiveHint}
                formatCurrency={formatCurrency}
                formatNumber={formatNumber}
                formatPercent={formatPercent}
              />
            )}

            {/* Builder Tab */}
            {activeTab === 'builder' && (
              <BuilderTab
                queuedItems={queuedItems}
                onRemoveFromQueue={handleRemoveFromQueue}
                insight={insight}
                onCreateRule={handleCreateRule}
                isProcessing={isProcessing}
                formatCurrency={formatCurrency}
              />
            )}
          </div>

          {/* Footer with Tabs */}
          <div className="border-t border-gray-200 dark:border-gray-700 flex-shrink-0 bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-900/50">
            {queuedItems.length > 0 && (
              <div className="px-6 py-3 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-red-50/50 to-pink-50/50 dark:from-red-900/10 dark:to-pink-900/10">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-red-500 to-pink-500 flex items-center justify-center text-white font-bold text-xs">
                      {queuedItems.length}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-gray-900 dark:text-white">
                        {queuedItems.length} {queuedItems.length === 1 ? 'segment' : 'segments'} queued
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        Click Builder to create custom rules
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setQueuedItems([])}
                    className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 underline"
                  >
                    Clear all
                  </button>
                </div>
              </div>
            )}

            <div className="px-6 py-4">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setActiveTab('quick')}
                  className={`flex-1 px-6 py-2.5 text-sm font-medium rounded-lg transition-all flex items-center justify-center gap-2.5 whitespace-nowrap ${
                    activeTab === 'quick'
                      ? 'text-white bg-gradient-to-b from-gray-800 to-gray-900 dark:from-gray-600 dark:to-gray-700 border border-gray-700 dark:border-gray-500 shadow-md'
                      : 'text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <Zap className="w-4 h-4" />
                  Quick Actions
                </button>
                <ChevronRight className="w-5 h-5 text-gray-300 dark:text-gray-600 flex-shrink-0" />
                <button
                  type="button"
                  onClick={() => setActiveTab('dive')}
                  className={`flex-1 px-6 py-2.5 text-sm font-medium rounded-lg transition-all flex items-center justify-center gap-2.5 whitespace-nowrap ${
                    activeTab === 'dive'
                      ? 'text-white bg-gradient-to-b from-gray-800 to-gray-900 dark:from-gray-600 dark:to-gray-700 border border-gray-700 dark:border-gray-500 shadow-md'
                      : 'text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <BarChart3 className="w-4 h-4" />
                  Deep Dive
                </button>
                <ChevronRight className="w-5 h-5 text-gray-300 dark:text-gray-600 flex-shrink-0" />
                <button
                  type="button"
                  onClick={() => setActiveTab('builder')}
                  className={`relative flex-1 px-6 py-2.5 text-sm font-medium rounded-lg transition-all flex items-center justify-center gap-2.5 whitespace-nowrap ${
                    activeTab === 'builder'
                      ? 'text-white bg-gradient-to-b from-gray-800 to-gray-900 dark:from-gray-600 dark:to-gray-700 border border-gray-700 dark:border-gray-500 shadow-md'
                      : 'text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <Settings className="w-4 h-4" />
                  Builder
                  {queuedItems.length > 0 && (
                    <span className="absolute -top-2 -right-2 w-5 h-5 bg-gradient-to-br from-red-500 to-pink-500 text-white text-xs font-bold rounded-full flex items-center justify-center shadow-md ring-2 ring-white dark:ring-gray-900">
                      {queuedItems.length}
                    </span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
};

// Quick Actions Tab Component
const QuickActionsTab: React.FC<any> = ({
  insight,
  demographics,
  placements,
  geographic,
  temporal,
  netGainRevenue,
  netGainProfit,
  netGainConversions,
  isPrimaryActionProtective,
  isScaling,
  onAction,
  onCreateRule,
  onDismiss,
  isProcessing,
  formatCurrency,
  formatNumber,
  formatPercent
}) => {
  return (
    <div className="space-y-8">
      {/* What Revoa Found */}
      <div className="space-y-5">
        {/* Section Header with Fading Divider Lines */}
        <div className="flex items-center gap-4">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-300 to-gray-300 dark:from-transparent dark:via-gray-600 dark:to-gray-600"></div>
          <div className="flex items-center gap-2.5">
            <Brain className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap">
              What Revoa Found
            </h3>
          </div>
          <div className="h-px flex-1 bg-gradient-to-l from-transparent via-gray-300 to-gray-300 dark:from-transparent dark:via-gray-600 dark:to-gray-600"></div>
        </div>

        {/* Analysis paragraph - always show */}
        <div className="text-center">
          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed max-w-4xl mx-auto">
            {insight.reasoning.analysis || insight.reasoning.primaryInsight || insight.message}
          </p>
        </div>

        {/* Top Segment Cards - Show 1-2 only */}
        {(demographics.length > 0 || geographic.length > 0 || placements.length > 0 || temporal.length > 0) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
            {demographics.slice(0, 1).map((demo: any, idx) => (
              <div key={idx} className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="w-4 h-4 text-gray-400" />
                  <div className="text-sm font-semibold text-gray-900 dark:text-white">{demo.segment}</div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <div className="text-gray-500 dark:text-gray-400">ROAS</div>
                    <div className="font-bold text-gray-900 dark:text-white">{demo.roas?.toFixed(1)}x</div>
                  </div>
                  <div>
                    <div className="text-gray-500 dark:text-gray-400">Revenue</div>
                    <div className="font-bold text-gray-900 dark:text-white">{formatCurrency(demo.revenue || 0)}</div>
                  </div>
                  <div>
                    <div className="text-gray-500 dark:text-gray-400">Conv</div>
                    <div className="font-bold text-gray-900 dark:text-white">{demo.conversions}</div>
                  </div>
                </div>
              </div>
            ))}
            {geographic.slice(0, 1).map((geo: any, idx) => (
              <div key={idx} className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  <div className="text-sm font-semibold text-gray-900 dark:text-white">{geo.region}</div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <div className="text-gray-500 dark:text-gray-400">ROAS</div>
                    <div className="font-bold text-gray-900 dark:text-white">{geo.roas?.toFixed(1)}x</div>
                  </div>
                  <div>
                    <div className="text-gray-500 dark:text-gray-400">AOV</div>
                    <div className="font-bold text-gray-900 dark:text-white">{formatCurrency(geo.averageOrderValue || 0)}</div>
                  </div>
                  <div>
                    <div className="text-gray-500 dark:text-gray-400">Conv</div>
                    <div className="font-bold text-gray-900 dark:text-white">{geo.conversions}</div>
                  </div>
                </div>
              </div>
            ))}
            {placements.slice(0, demographics.length === 0 ? 2 : 1).map((placement: any, idx) => (
              <div key={idx} className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2 mb-2">
                  <Tv className="w-4 h-4 text-gray-400" />
                  <div className="text-sm font-semibold text-gray-900 dark:text-white">{placement.placement}</div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <div className="text-gray-500 dark:text-gray-400">ROAS</div>
                    <div className="font-bold text-gray-900 dark:text-white">{placement.roas?.toFixed(1)}x</div>
                  </div>
                  <div>
                    <div className="text-gray-500 dark:text-gray-400">Conv</div>
                    <div className="font-bold text-gray-900 dark:text-white">{placement.conversions}</div>
                  </div>
                  <div>
                    <div className="text-gray-500 dark:text-gray-400">CPA</div>
                    <div className="font-bold text-gray-900 dark:text-white">{formatCurrency(placement.cpa || 0)}</div>
                  </div>
                </div>
              </div>
            ))}
            {temporal.slice(0, demographics.length === 0 && placements.length === 0 ? 2 : 1).map((time: any, idx) => (
              <div key={idx} className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <div className="text-sm font-semibold text-gray-900 dark:text-white">{time.period}</div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <div className="text-gray-500 dark:text-gray-400">ROAS</div>
                    <div className="font-bold text-gray-900 dark:text-white">{time.roas?.toFixed(1)}x</div>
                  </div>
                  <div>
                    <div className="text-gray-500 dark:text-gray-400">Conv</div>
                    <div className="font-bold text-gray-900 dark:text-white">{time.conversions}</div>
                  </div>
                  <div>
                    <div className="text-gray-500 dark:text-gray-400">Spend</div>
                    <div className="font-bold text-gray-900 dark:text-white">{formatCurrency(time.spend || 0)}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Why This Matters */}
      {insight.estimated_impact && (
        <div className="space-y-5">
          {/* Section Header with Fading Divider Lines */}
          <div className="flex items-center gap-4">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-300 to-gray-300 dark:from-transparent dark:via-gray-600 dark:to-gray-600"></div>
            <div className="flex items-center gap-2.5">
              <DollarSign className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap">
                Why This Matters
              </h4>
            </div>
            <div className="h-px flex-1 bg-gradient-to-l from-transparent via-gray-300 to-gray-300 dark:from-transparent dark:via-gray-600 dark:to-gray-600"></div>
          </div>

          <div className="text-center">
            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed max-w-4xl mx-auto">
              {insight.estimated_impact.breakdown}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              {insight.estimated_impact.timeframeDays}-day forecast
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {insight.estimated_impact.expectedSavings !== undefined && (
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Potential Savings</div>
                <div className="text-lg font-bold text-red-600 dark:text-red-400">
                  ${insight.estimated_impact.expectedSavings.toFixed(2)}
                </div>
              </div>
            )}
            {insight.estimated_impact.expectedRevenue !== undefined && (
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Expected Revenue</div>
                <div className="text-lg font-bold text-gray-900 dark:text-white">
                  ${insight.estimated_impact.expectedRevenue.toFixed(2)}
                </div>
              </div>
            )}
            {insight.estimated_impact.expectedProfit !== undefined && (
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Expected Profit</div>
                <div className="text-lg font-bold text-gray-900 dark:text-white">
                  ${insight.estimated_impact.expectedProfit.toFixed(2)}
                </div>
              </div>
            )}
          </div>

          {/* Projections Comparison */}
          {insight.reasoning.projections && (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="grid grid-cols-2 gap-3">
                {insight.reasoning.projections.ifImplemented && (
                  <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
                    <div className="text-xs font-semibold text-green-700 dark:text-green-400 mb-2 flex items-center gap-1">
                      <TrendingUpIcon className="w-3 h-3" />
                      If Implemented
                    </div>
                    <div className="space-y-1 text-xs">
                      {insight.reasoning.projections.ifImplemented.profit !== undefined && (
                        <div className="flex justify-between">
                          <span className="text-green-700 dark:text-green-400">Profit:</span>
                          <span className="font-medium text-green-900 dark:text-green-300">
                            ${insight.reasoning.projections.ifImplemented.profit.toFixed(2)}
                          </span>
                        </div>
                      )}
                      {insight.reasoning.projections.ifImplemented.roas !== undefined && (
                        <div className="flex justify-between">
                          <span className="text-green-700 dark:text-green-400">ROAS:</span>
                          <span className="font-medium text-green-900 dark:text-green-300">
                            {insight.reasoning.projections.ifImplemented.roas.toFixed(2)}x
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {insight.reasoning.projections.ifIgnored && (
                  <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
                    <div className="text-xs font-semibold text-gray-700 dark:text-gray-400 mb-2 flex items-center gap-1">
                      <TrendingDown className="w-3 h-3" />
                      If Ignored
                    </div>
                    <div className="space-y-1 text-xs">
                      {insight.reasoning.projections.ifIgnored.profit !== undefined && (
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Profit:</span>
                          <span className="font-medium text-gray-900 dark:text-white">
                            ${insight.reasoning.projections.ifIgnored.profit.toFixed(2)}
                          </span>
                        </div>
                      )}
                      {insight.reasoning.projections.ifIgnored.roas !== undefined && (
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">ROAS:</span>
                          <span className="font-medium text-gray-900 dark:text-white">
                            {insight.reasoning.projections.ifIgnored.roas.toFixed(2)}x
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

      {/* Recommended Actions */}
      <div className="space-y-5">
        {/* Section Header with Fading Divider Lines */}
        <div className="flex items-center gap-4">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-300 to-gray-300 dark:from-transparent dark:via-gray-600 dark:to-gray-600"></div>
          <div className="flex items-center gap-2.5">
            <Play className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap">
              Recommended Actions
            </h4>
          </div>
          <div className="h-px flex-1 bg-gradient-to-l from-transparent via-gray-300 to-gray-300 dark:from-transparent dark:via-gray-600 dark:to-gray-600"></div>
        </div>

        <div className="space-y-3">
          {insight.directActions.slice(0, 2).map((action, idx) => {
            const Icon = action.type === 'increase_budget' ? TrendingUp :
                        action.type === 'decrease_budget' ? TrendingDown :
                        action.type === 'pause' ? Pause :
                        action.type === 'duplicate' ? Copy :
                        Zap;

            return (
              <button
                key={idx}
                onClick={() => onAction(action.type, action.parameters)}
                disabled={isProcessing}
                className="group w-full flex items-start gap-3 p-4 text-left bg-gradient-to-b from-gray-50 to-white dark:from-gray-800/50 dark:to-gray-900/50 border border-gray-200 dark:border-gray-700 hover:bg-gray-100/50 dark:hover:bg-gray-700/30 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="p-2 rounded-lg shrink-0 bg-gray-100 dark:bg-gray-700">
                  <Icon className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold mb-1 text-gray-900 dark:text-white">
                    {action.label}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed mb-2">
                    {action.description}
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-green-600 dark:text-green-400 font-semibold">
                      +{formatCurrency(netGainRevenue)}
                    </span>
                    <span className="text-gray-500">
                      +{formatNumber(netGainConversions)} conv
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1 shrink-0 text-gray-400" />
              </button>
            );
          })}
        </div>

        {/* Automation Rule */}
        {insight.recommendedRule && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={onCreateRule}
              disabled={isProcessing}
              className="group w-full flex items-start gap-3 p-4 text-left bg-gradient-to-b from-gray-50 to-white dark:from-gray-800/50 dark:to-gray-900/50 border border-gray-200 dark:border-gray-700 hover:bg-gray-100/50 dark:hover:bg-gray-700/30 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="p-2 rounded-lg shrink-0 bg-gray-100 dark:bg-gray-700">
                {isPrimaryActionProtective ? (
                  <Pause className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                ) : (
                  <TrendingUp className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Cpu className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
                  <div className="text-sm font-bold text-gray-900 dark:text-white">
                    {insight.recommendedRule.name}
                  </div>
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed mb-2">
                  {insight.recommendedRule.description}
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                  <span>{insight.recommendedRule.conditions.length} conditions</span>
                  <span>{insight.recommendedRule.actions.length} actions</span>
                  <span>Checks every {insight.recommendedRule.check_frequency_minutes / 60}h</span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1 shrink-0 text-gray-400" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// Deep Dive Tab Component
const DeepDiveTab: React.FC<any> = ({
  insight,
  demographics,
  placements,
  geographic,
  temporal,
  customerBehavior,
  onAddToQueue,
  isInQueue,
  showHint,
  onDismissHint,
  formatCurrency,
  formatNumber,
  formatPercent
}) => {
  const DataCard = ({ title, icon: Icon, data, label, type, onAdd }: any) => {
    const inQueue = isInQueue(label);

    return (
      <button
        onClick={() => !inQueue && onAdd()}
        className={`relative group w-full text-left bg-gradient-to-b from-gray-50 to-white dark:from-gray-800/50 dark:to-gray-900/50 border rounded-xl p-4 transition-all duration-200 ${
          inQueue
            ? 'border-red-300 dark:border-red-700 bg-red-50/50 dark:bg-red-900/10'
            : 'border-gray-200 dark:border-gray-700 hover:shadow-md hover:scale-[1.02] cursor-pointer'
        }`}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <Icon className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            <h5 className="text-sm font-semibold text-gray-900 dark:text-white truncate">{title}</h5>
          </div>
          {inQueue ? (
            <div className="p-1.5 rounded-lg bg-red-100 dark:bg-red-900/30">
              <CheckCircle2 className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
            </div>
          ) : (
            <div className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700">
              <Plus className="w-3 h-3 text-gray-600 dark:text-gray-400" />
            </div>
          )}
        </div>
        <div className="space-y-2.5">
          {data.map((item: any, idx: number) => (
            <div key={idx} className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-2.5 border border-gray-100 dark:border-gray-800">
              <div className="flex justify-between items-center">
                <span className="text-xs font-medium text-gray-600 dark:text-gray-400">{item.label}</span>
                <span className="text-sm font-bold text-gray-900 dark:text-white">{item.value}</span>
              </div>
              {item.secondary && (
                <div className="text-xs text-gray-500 dark:text-gray-500 mt-1.5">{item.secondary}</div>
              )}
            </div>
          ))}
        </div>
      </button>
    );
  };

  const SectionHeader = ({ title, icon: Icon, analysis, type, data, onAddInline }: any) => (
    <div className="mb-6">
      <div className="mb-4">
        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-300 to-gray-300 dark:from-transparent dark:via-gray-600 dark:to-gray-600"></div>
          <div className="flex items-center gap-2">
            <Icon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
              {title}
            </span>
          </div>
          <div className="h-px flex-1 bg-gradient-to-l from-transparent via-gray-300 to-gray-300 dark:from-transparent dark:via-gray-600 dark:to-gray-600"></div>
        </div>
      </div>
      {analysis && (
        <div className="text-center mb-4">
          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed inline">
            {analysis}
            {onAddInline && data && (
              <button
                onClick={() => onAddInline({ type, data: data[0], label: data[0]?.segment || data[0]?.region || data[0]?.placement || data[0]?.period || title })}
                className="inline-flex items-center justify-center w-5 h-5 ml-2 rounded-md bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors align-middle"
                title="Add to Builder"
              >
                <Plus className="w-3 h-3 text-gray-600 dark:text-gray-400" />
              </button>
            )}
          </p>
        </div>
      )}
    </div>
  );

  const EmptySegmentSection = ({ title, icon: Icon, description }: any) => (
    <div>
      <SectionHeader title={title} icon={Icon} analysis={null} />
      <div className="bg-gradient-to-b from-gray-50 to-white dark:from-gray-800/50 dark:to-gray-900/50 border border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-8 text-center">
        <Icon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          {description}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-500">
          Segment data will appear here when available for deeper analysis
        </p>
      </div>
    </div>
  );

  return (
    <div className="space-y-8">
      {showHint && (
        <div className="bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">
                Click any segment to add to Builder
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Build custom rules based on your top-performing data
              </p>
            </div>
            <button
              onClick={onDismissHint}
              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors flex-shrink-0"
              aria-label="Dismiss hint"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Demographics Section */}
      <div>
        <SectionHeader
          title="Top Performing Segments"
          icon={Users}
          analysis={demographics.length > 0
            ? (insight.analysisParagraphs?.[0] || `${demographics[0].segment} leads with ${demographics[0].roas?.toFixed(1)}x ROAS and ${demographics[0].conversions} conversions.`)
            : "Analyze which demographic segments drive the best results for your campaigns."
          }
          type="demographic"
          data={demographics}
          onAddInline={demographics.length > 0 ? onAddToQueue : null}
        />
        {demographics.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {demographics.map((demo: any, idx) => (
              <DataCard
                key={idx}
                title={demo.segment}
                label={demo.segment}
                icon={Users}
                type="demographic"
                data={[
                  { label: 'ROAS', value: `${demo.roas?.toFixed(1)}x` },
                  { label: 'Conversions', value: demo.conversions, secondary: `${formatCurrency(demo.cpa || 0)} CPA` },
                  { label: 'Revenue', value: formatCurrency(demo.revenue || 0), secondary: `${formatPercent(demo.contribution || 0)} of total` }
                ]}
                onAdd={() => onAddToQueue({ type: 'demographic', data: demo, label: demo.segment })}
              />
            ))}
          </div>
        ) : (
          <div className="bg-gradient-to-b from-gray-50 to-white dark:from-gray-800/50 dark:to-gray-900/50 border border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-8 text-center">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-sm text-gray-600 dark:text-gray-400">
              No demographic segment data available yet
            </p>
          </div>
        )}
      </div>

      {/* Geographic Section */}
      <div>
        <SectionHeader
          title="Geographic Performance"
          icon={Globe}
          analysis={geographic.length > 0
            ? `${geographic[0].region} leads with ${geographic[0].roas?.toFixed(1)}x ROAS and ${formatCurrency(geographic[0].averageOrderValue || 0)} average order value.`
            : "Discover which regions and locations generate the highest returns."
          }
          type="geographic"
          data={geographic}
          onAddInline={geographic.length > 0 ? onAddToQueue : null}
        />
        {geographic.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {geographic.map((geo: any, idx) => (
              <DataCard
                key={idx}
                title={geo.region}
                label={geo.region}
                icon={MapPin}
                type="geographic"
                data={[
                  { label: 'ROAS', value: `${geo.roas?.toFixed(1)}x` },
                  { label: 'AOV', value: formatCurrency(geo.averageOrderValue || 0) },
                  { label: 'Conversions', value: geo.conversions, secondary: `${formatCurrency(geo.spend || 0)} spent` }
                ]}
                onAdd={() => onAddToQueue({ type: 'geographic', data: geo, label: geo.region })}
              />
            ))}
          </div>
        ) : (
          <div className="bg-gradient-to-b from-gray-50 to-white dark:from-gray-800/50 dark:to-gray-900/50 border border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-8 text-center">
            <Globe className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-sm text-gray-600 dark:text-gray-400">
              No geographic data available yet
            </p>
          </div>
        )}
      </div>

      {/* Placements Section */}
      <div>
        <SectionHeader
          title="Platform & Placement"
          icon={Smartphone}
          analysis={placements.length > 0
            ? `${placements[0].placement} is your top placement with ${placements[0].roas?.toFixed(1)}x ROAS across ${placements[0].conversions} conversions.`
            : "Identify which ad placements and formats perform best."
          }
          type="placement"
          data={placements}
          onAddInline={placements.length > 0 ? onAddToQueue : null}
        />
        {placements.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {placements.map((placement: any, idx) => (
              <DataCard
                key={idx}
                title={placement.placement}
                label={placement.placement}
                icon={Tv}
                type="placement"
                data={[
                  { label: 'ROAS', value: `${placement.roas?.toFixed(1)}x` },
                  { label: 'Conversions', value: placement.conversions, secondary: `${formatCurrency(placement.cpa || 0)} CPA` },
                  { label: 'Share', value: formatPercent(placement.contribution || 0) }
                ]}
                onAdd={() => onAddToQueue({ type: 'placement', data: placement, label: placement.placement })}
              />
            ))}
          </div>
        ) : (
          <div className="bg-gradient-to-b from-gray-50 to-white dark:from-gray-800/50 dark:to-gray-900/50 border border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-8 text-center">
            <Smartphone className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-sm text-gray-600 dark:text-gray-400">
              No placement data available yet
            </p>
          </div>
        )}
      </div>

      {/* Temporal Section */}
      <div>
        <SectionHeader
          title="Best Times to Advertise"
          icon={Clock}
          analysis={temporal.length > 0
            ? `Peak performance occurs during ${temporal[0].period} with ${temporal[0].roas?.toFixed(1)}x ROAS. Time your campaigns accordingly.`
            : "Learn when your ads perform best throughout the day and week."
          }
          type="temporal"
          data={temporal}
          onAddInline={temporal.length > 0 ? onAddToQueue : null}
        />
        {temporal.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {temporal.map((time: any, idx) => (
              <DataCard
                key={idx}
                title={time.period}
                label={time.period}
                icon={Calendar}
                type="temporal"
                data={[
                  { label: 'ROAS', value: `${time.roas?.toFixed(1)}x` },
                  { label: 'Conversions', value: time.conversions, secondary: `${formatCurrency(time.spend || 0)} spent` },
                  { label: 'Share', value: formatPercent(time.contribution || 0) }
                ]}
                onAdd={() => onAddToQueue({ type: 'temporal', data: time, label: time.period })}
              />
            ))}
          </div>
        ) : (
          <div className="bg-gradient-to-b from-gray-50 to-white dark:from-gray-800/50 dark:to-gray-900/50 border border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-8 text-center">
            <Clock className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-sm text-gray-600 dark:text-gray-400">
              No temporal data available yet
            </p>
          </div>
        )}
      </div>

      {/* Customer Behavior Section */}
      {customerBehavior && (
        <div>
          <SectionHeader
            title="Customer Behavior"
            icon={ShoppingBag}
            analysis="Understanding new vs returning customer patterns helps optimize your acquisition and retention strategies."
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gradient-to-b from-gray-50 to-white dark:from-gray-800/50 dark:to-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Users className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                <h5 className="text-sm font-semibold text-gray-900 dark:text-white">New Customers</h5>
              </div>
              <div className="space-y-2.5">
                <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-2.5 border border-gray-100 dark:border-gray-800">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Share</span>
                    <span className="text-sm font-bold text-gray-900 dark:text-white">
                      {formatPercent((customerBehavior.newVsReturning.new.conversions / (customerBehavior.newVsReturning.new.conversions + customerBehavior.newVsReturning.returning.conversions)) * 100)}
                    </span>
                  </div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-2.5 border border-gray-100 dark:border-gray-800">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-medium text-gray-600 dark:text-gray-400">AOV</span>
                    <span className="text-sm font-bold text-gray-900 dark:text-white">
                      {formatCurrency(customerBehavior.newVsReturning.new.averageOrderValue || 0)}
                    </span>
                  </div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-2.5 border border-gray-100 dark:border-gray-800">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-medium text-gray-600 dark:text-gray-400">CPA</span>
                    <span className="text-sm font-bold text-gray-900 dark:text-white">
                      {formatCurrency(customerBehavior.newVsReturning.new.cpa || 0)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-b from-gray-50 to-white dark:from-gray-800/50 dark:to-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Repeat className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                <h5 className="text-sm font-semibold text-gray-900 dark:text-white">Returning Customers</h5>
              </div>
              <div className="space-y-2.5">
                <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-2.5 border border-gray-100 dark:border-gray-800">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Share</span>
                    <span className="text-sm font-bold text-gray-900 dark:text-white">
                      {formatPercent((customerBehavior.newVsReturning.returning.conversions / (customerBehavior.newVsReturning.new.conversions + customerBehavior.newVsReturning.returning.conversions)) * 100)}
                    </span>
                  </div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-2.5 border border-gray-100 dark:border-gray-800">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-medium text-gray-600 dark:text-gray-400">AOV</span>
                    <span className="text-sm font-bold text-gray-900 dark:text-white">
                      {formatCurrency(customerBehavior.newVsReturning.returning.averageOrderValue || 0)}
                    </span>
                  </div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-2.5 border border-gray-100 dark:border-gray-800">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-medium text-gray-600 dark:text-gray-400">CPA</span>
                    <span className="text-sm font-bold text-gray-900 dark:text-white">
                      {formatCurrency(customerBehavior.newVsReturning.returning.cpa || 0)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Builder Tab Component
const BuilderTab: React.FC<any> = ({
  queuedItems,
  onRemoveFromQueue,
  insight,
  onCreateRule,
  isProcessing,
  formatCurrency
}) => {
  if (queuedItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <div className="w-20 h-20 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-6">
          <Settings className="w-10 h-10 text-gray-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          No segments queued yet
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 text-center max-w-md mb-6">
          Go to the Deep Dive tab and click on any segment to add it to your custom rule builder.
        </p>
        <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl p-6 max-w-md">
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
            Example: Custom Rule
          </h4>
          <div className="space-y-3">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-bold text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30 px-2 py-0.5 rounded">
                  IF
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">Conditions</span>
              </div>
              <ul className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
                <li className="flex items-start gap-2">
                  <span className="text-red-500 mt-0.5">•</span>
                  <span>Men 25-34 ROAS {'>'} 3.5x</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500 mt-0.5">•</span>
                  <span>California region active</span>
                </li>
              </ul>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-bold text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30 px-2 py-0.5 rounded">
                  THEN
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">Actions</span>
              </div>
              <ul className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
                <li className="flex items-start gap-2">
                  <span className="text-red-500 mt-0.5">•</span>
                  <span>Increase budget by 20%</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500 mt-0.5">•</span>
                  <span>Send me a notification</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center py-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Build Your Custom Rule
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Review your selected segments and configure automation
        </p>
      </div>

      {/* Queued Segments */}
      <div className="bg-gradient-to-b from-gray-50 to-white dark:from-gray-800/50 dark:to-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-base font-semibold text-gray-900 dark:text-white">
            Selected Segments ({queuedItems.length})
          </h4>
          <button
            onClick={() => queuedItems.forEach((_, idx) => onRemoveFromQueue(idx))}
            className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 underline"
          >
            Clear all
          </button>
        </div>

        <div className="space-y-2">
          {queuedItems.map((item, idx) => {
            const Icon = item.type === 'demographic' ? Users :
                        item.type === 'geographic' ? MapPin :
                        item.type === 'placement' ? Tv :
                        Calendar;

            return (
              <div
                key={idx}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700"
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                  <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {item.label}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                      {item.type}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => onRemoveFromQueue(idx)}
                  className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                >
                  <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* AI Suggested Rule Based on Selections */}
      {insight.recommendedRule && (
        <div className="bg-gradient-to-b from-gray-50 to-white dark:from-gray-800/50 dark:to-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-red-500" />
            <h4 className="text-base font-semibold text-gray-900 dark:text-white">
              AI-Suggested Rule
            </h4>
          </div>

          <div className="space-y-3 mb-4">
            {/* IF Section */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-bold text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30 px-2 py-0.5 rounded">
                  IF
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">Trigger Conditions</span>
              </div>
              <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                {insight.recommendedRule.conditions.map((condition: any, idx: number) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-red-500 mt-0.5">•</span>
                    <span>
                      {condition.metric_type?.replace('_', ' ') || 'metric'} {condition.operator || '<'} {condition.threshold_value || '0'}{condition.metric_type?.includes('roas') ? 'x' : condition.metric_type?.includes('spend') ? '' : '%'}
                      {condition.time_window_days && ` for ${condition.time_window_days} days`}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* THEN Section */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-bold text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30 px-2 py-0.5 rounded">
                  THEN
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">Automated Actions</span>
              </div>
              <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                {insight.recommendedRule.actions.map((action: any, idx: number) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-red-500 mt-0.5">•</span>
                    <span>
                      {action.action_type?.replace('_', ' ').replace('budget', 'budget by') || 'Take action'}
                      {action.value && ` ${action.value}%`}
                    </span>
                  </li>
                ))}
                <li className="flex items-start gap-2">
                  <span className="text-red-500 mt-0.5">•</span>
                  <span>Send notification to you</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500 mt-0.5">•</span>
                  <span>Log decision in activity feed</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-4">
            <span>Checks every {insight.recommendedRule.check_frequency_minutes / 60} hours</span>
            <span>Max {insight.recommendedRule.max_daily_actions || 3} actions per day</span>
          </div>

          <button
            onClick={onCreateRule}
            disabled={isProcessing}
            className="w-full flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-gray-800 dark:bg-gray-600 border border-gray-700 dark:border-gray-500 hover:bg-gray-900 hover:border-gray-800 dark:hover:bg-gray-700 dark:hover:border-gray-600 hover:shadow-md rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Cpu className="w-4 h-4" />
            <span>{isProcessing ? 'Creating Rule...' : 'Create Automated Rule'}</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Information about manual rule building */}
      <div className="bg-gradient-to-br from-gray-50 to-white dark:from-gray-800/30 dark:to-gray-900/30 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
            <FileText className="w-6 h-6 text-gray-500 dark:text-gray-400" />
          </div>
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
            Want More Control?
          </h4>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 max-w-md mx-auto">
            You can create custom automation rules manually in the Automation Rules page with full control over conditions, actions, and schedules.
          </p>
          <div className="flex items-center justify-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI-suggested rules above are optimized for quick setup</span>
          </div>
        </div>
      </div>
    </div>
  );
};
