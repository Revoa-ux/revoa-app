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
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import Modal from '@/components/Modal';
import { RexCharacter } from './RexCharacter';
import type { GeneratedInsight } from '@/lib/rexInsightGenerator';

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
  const [viewMode, setViewMode] = useState<'simple' | 'expert'>('simple');
  const [queuedActions, setQueuedActions] = useState<Array<{ type: 'action' | 'rule'; data: any; source: string }>>([]);
  const [expandedActionIndex, setExpandedActionIndex] = useState<number | null>(null);

  const handleAction = async (actionType: string, parameters: any) => {
    setIsProcessing(true);
    try {
      await onExecuteAction(actionType, parameters);
    } catch (error) {
      console.error('Error executing action:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const formatCurrency = (value: number) => `$${Math.abs(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const formatNumber = (value: number) => value.toLocaleString('en-US');
  const formatPercent = (value: number) => `${value.toFixed(1)}%`;

  const demographics = insight.reasoning.supportingData?.demographics || [];
  const placements = insight.reasoning.supportingData?.placements || [];
  const geographic = insight.reasoning.supportingData?.geographic || [];
  const temporal = insight.reasoning.supportingData?.temporal || [];
  const customerBehavior = insight.reasoning.supportingData?.customerBehavior;

  const netGainRevenue = (insight.reasoning.projections?.ifImplemented?.revenue || 0) - (insight.reasoning.projections?.ifIgnored?.revenue || 0);
  const netGainProfit = (insight.reasoning.projections?.ifImplemented?.profit || 0) - (insight.reasoning.projections?.ifIgnored?.profit || 0);
  const netGainConversions = (insight.reasoning.projections?.ifImplemented?.conversions || 0) - (insight.reasoning.projections?.ifIgnored?.conversions || 0);

  // Determine Rex's emotion based on insight type
  const isPrimaryActionProtective = insight.directActions[0]?.type === 'pause' || insight.directActions[0]?.type === 'decrease_budget';
  const isScaling = insight.directActions[0]?.type === 'increase_budget' || insight.directActions[0]?.type === 'duplicate';

  const rexEmotion = isPrimaryActionProtective ? 'concerned' : isScaling ? 'excited' : 'thoughtful';

  // Determine dynamic title
  const getInsightTitle = () => {
    if (isPrimaryActionProtective) return 'Rex detected a performance issue';
    if (isScaling) return 'Rex found a winning opportunity';
    return 'Rex spotted an optimization';
  };

  const handleAddToQueue = (type: 'action' | 'rule', data: any, source: string) => {
    setQueuedActions([...queuedActions, { type, data, source }]);
  };

  const handleRemoveFromQueue = (index: number) => {
    setQueuedActions(queuedActions.filter((_, i) => i !== index));
  };

  const DataCard = ({
    title,
    icon: Icon,
    data,
    highlight = false,
    onAddRule
  }: {
    title: string;
    icon: any;
    data: { label: string; value: string | number; secondary?: string }[];
    highlight?: boolean;
    onAddRule?: () => void;
  }) => (
    <div className={`relative bg-white dark:bg-gray-800 rounded-xl p-4 transition-all duration-200 group ${
      highlight
        ? 'border-2 border-transparent bg-gradient-to-br from-white via-white to-rose-50 dark:from-gray-800 dark:via-gray-800 dark:to-rose-950/20 shadow-lg hover:shadow-xl [background-clip:padding-box] before:absolute before:inset-0 before:rounded-xl before:p-[2px] before:bg-gradient-to-br before:from-rose-400 before:via-pink-400 before:to-orange-400 before:-z-10'
        : 'border border-gray-200 dark:border-gray-700 hover:shadow-lg'
    }`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <Icon className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          <h5 className="text-sm font-semibold text-gray-900 dark:text-white truncate">{title}</h5>
        </div>
        {viewMode === 'expert' && onAddRule && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAddRule();
            }}
            className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg bg-gradient-to-br from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white shadow-md hover:shadow-lg"
            title="Create automated rule from this data"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      <div className="space-y-2.5">
        {data.map((item, idx) => (
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
    </div>
  );

  const SectionHeader = ({ title, icon: Icon, analysis, onAddAction }: { title: string; icon: any; analysis?: string; onAddAction?: () => void }) => (
    <div className="mb-4">
      <div className="flex items-center gap-2.5 mb-2.5">
        <Icon className="w-4 h-4 text-gray-700 dark:text-gray-300" />
        <h4 className="text-base font-semibold text-gray-900 dark:text-white">{title}</h4>
      </div>
      {analysis && (
        <div className="relative group">
          <p className="text-[15px] text-gray-600 dark:text-gray-400 leading-relaxed">{analysis}</p>
          {viewMode === 'expert' && onAddAction && (
            <button
              onClick={onAddAction}
              className="absolute -right-2 top-0 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 shadow-md"
              title="Create action from this insight"
            >
              <Plus className="w-3.5 h-3.5 text-gray-600 dark:text-gray-400" />
            </button>
          )}
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Rex Character - positioned outside modal */}
      {isOpen && (
        <div className="fixed left-8 top-1/2 -translate-y-1/2 z-50 hidden lg:block pointer-events-none">
          <RexCharacter emotion={rexEmotion} />

          {/* Connection line from Rex to modal */}
          <div className="absolute top-1/2 left-full w-12 h-0.5 bg-gradient-to-r from-rose-500/50 to-transparent"></div>
        </div>
      )}

      <Modal isOpen={isOpen} onClose={onClose} maxWidth="max-w-6xl">
        <div className="max-h-[85vh] overflow-y-auto" style={{ fontFamily: "'Inter var', 'Inter', system-ui, sans-serif" }}>

          {/* Header */}
          <div className="border-b border-gray-200 dark:border-gray-700 px-6 py-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2">
                  {/* Small Rex avatar in header for mobile */}
                  <div className="lg:hidden">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-500 via-rose-500 to-orange-500 flex items-center justify-center border-2 border-white dark:border-gray-900 shadow-lg">
                      <svg viewBox="0 0 100 100" className="w-6 h-6 text-white" fill="currentColor">
                        <rect x="25" y="30" width="50" height="45" rx="8" opacity="0.9" />
                        <circle cx="38" cy="45" r="3" fill="white" />
                        <circle cx="62" cy="45" r="3" fill="white" />
                        <line x1="50" y1="30" x2="50" y2="22" stroke="currentColor" strokeWidth="2.5" />
                        <circle cx="50" cy="20" r="3" />
                      </svg>
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">{getInsightTitle()}</h3>
                </div>
                <div className="text-[15px] text-gray-600 dark:text-gray-400">
                  {entityName} • {platform.charAt(0).toUpperCase() + platform.slice(1)} • {formatNumber(insight.reasoning.dataPointsAnalyzed || 0)} data points analyzed
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center bg-gray-100 dark:bg-gray-900 rounded-lg p-0.5 border border-gray-200 dark:border-gray-700">
                  <button
                    onClick={() => setViewMode('simple')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                      viewMode === 'simple'
                        ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    Simple
                  </button>
                  <button
                    onClick={() => setViewMode('expert')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                      viewMode === 'expert'
                        ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    Expert
                  </button>
                </div>
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

          <div className="px-6 py-5 space-y-6">

            {/* Hero Statement - What Rex Found */}
            <div className="bg-gradient-to-br from-rose-50 to-orange-50 dark:from-rose-950/20 dark:to-orange-950/20 border-2 border-rose-200 dark:border-rose-800 rounded-xl p-5">
              <div className="flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5" />
                <p className="text-lg font-semibold text-gray-900 dark:text-white leading-relaxed">
                  {insight.primaryInsight}
                </p>
              </div>
            </div>

            {/* Data Visualization Views */}
            <>
                {/* SIMPLE VIEW */}
                {viewMode === 'simple' && (demographics.length > 0 || geographic.length > 0 || placements.length > 0) && (
                  <div>
                    <SectionHeader
                      title="Here's what the data shows"
                      icon={BarChart3}
                      analysis={insight.analysisParagraphs[0]}
                    />
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {demographics.slice(0, 1).map((demo: any, idx) => (
                        <DataCard
                          key={idx}
                          title={demo.segment}
                          icon={Users}
                          highlight
                          data={[
                            { label: 'ROAS', value: `${demo.roas?.toFixed(1)}x` },
                            { label: 'Revenue', value: formatCurrency(demo.revenue || 0) },
                            { label: 'Conversions', value: demo.conversions }
                          ]}
                        />
                      ))}
                      {geographic.slice(0, 1).map((geo: any, idx) => (
                        <DataCard
                          key={idx}
                          title={geo.region}
                          icon={MapPin}
                          data={[
                            { label: 'ROAS', value: `${geo.roas?.toFixed(1)}x` },
                            { label: 'AOV', value: formatCurrency(geo.averageOrderValue || 0) },
                            { label: 'Conversions', value: geo.conversions }
                          ]}
                        />
                      ))}
                      {placements.slice(0, 1).map((placement: any, idx) => (
                        <DataCard
                          key={`p-${idx}`}
                          title={placement.placement}
                          icon={Smartphone}
                          data={[
                            { label: 'ROAS', value: `${placement.roas?.toFixed(1)}x` },
                            { label: 'Conversions', value: placement.conversions },
                            { label: 'CPA', value: formatCurrency(placement.cpa || 0) }
                          ]}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* EXPERT VIEW */}
                {viewMode === 'expert' && (
                  <div className="space-y-6">
                    {demographics.length > 0 && (
                      <div>
                        <SectionHeader
                          title="Top Performing Segments"
                          icon={Users}
                          analysis={insight.analysisParagraphs[0]}
                          onAddAction={() => handleAddToQueue('action', { type: 'demographic_insight', paragraph: insight.analysisParagraphs[0] }, 'Top Performing Segments')}
                        />
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {demographics.map((demo: any, idx) => (
                            <DataCard
                              key={idx}
                              title={demo.segment}
                              icon={Users}
                              highlight={demo.roas > (insight.reasoning.projections?.ifIgnored?.roas || 0) * 1.5}
                              data={[
                                { label: 'ROAS', value: `${demo.roas?.toFixed(1)}x` },
                                { label: 'Conversions', value: demo.conversions, secondary: `${formatCurrency(demo.cpa || 0)} CPA` },
                                { label: 'Revenue', value: formatCurrency(demo.revenue || 0), secondary: `${formatPercent(demo.contribution || 0)} of total` }
                              ]}
                              onAddRule={() => handleAddToQueue('rule', { segment: demo.segment, roas: demo.roas, cpa: demo.cpa }, `Scale ${demo.segment}`)}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {geographic.length > 0 && (
                      <div>
                        <SectionHeader
                          title="Geographic Performance"
                          icon={Globe}
                          analysis={`${geographic[0].region} leads with ${geographic[0].roas?.toFixed(1)}x ROAS and ${formatCurrency(geographic[0].averageOrderValue || 0)} average order value.`}
                          onAddAction={() => handleAddToQueue('action', { type: 'geographic_insight', region: geographic[0].region }, 'Geographic Performance')}
                        />
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {geographic.map((geo: any, idx) => (
                            <DataCard
                              key={idx}
                              title={geo.region}
                              icon={MapPin}
                              highlight={geo.roas > (insight.reasoning.projections?.ifIgnored?.roas || 0) * 1.5}
                              data={[
                                { label: 'ROAS', value: `${geo.roas?.toFixed(1)}x` },
                                { label: 'AOV', value: formatCurrency(geo.averageOrderValue || 0) },
                                { label: 'Conversions', value: geo.conversions, secondary: `${formatCurrency(geo.spend || 0)} spent` }
                              ]}
                              onAddRule={() => handleAddToQueue('rule', { region: geo.region, roas: geo.roas }, `Target ${geo.region}`)}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {placements.length > 0 && (
                      <div>
                        <SectionHeader
                          title="Platform & Placement"
                          icon={Smartphone}
                          analysis={`${placements[0].placement} is your top placement with ${placements[0].roas?.toFixed(1)}x ROAS across ${placements[0].conversions} conversions.`}
                          onAddAction={() => handleAddToQueue('action', { type: 'placement_insight', placement: placements[0].placement }, 'Platform & Placement')}
                        />
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {placements.map((placement: any, idx) => (
                            <DataCard
                              key={idx}
                              title={placement.placement}
                              icon={Tv}
                              highlight={placement.roas > (insight.reasoning.projections?.ifIgnored?.roas || 0) * 1.5}
                              data={[
                                { label: 'ROAS', value: `${placement.roas?.toFixed(1)}x` },
                                { label: 'Conversions', value: placement.conversions, secondary: `${formatCurrency(placement.cpa || 0)} CPA` },
                                { label: 'Share', value: formatPercent(placement.contribution || 0) }
                              ]}
                              onAddRule={() => handleAddToQueue('rule', { placement: placement.placement, roas: placement.roas }, `Optimize ${placement.placement}`)}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {temporal.length > 0 && (
                      <div>
                        <SectionHeader
                          title="Best Times to Advertise"
                          icon={Clock}
                          analysis={`Peak performance occurs during ${temporal[0].period} with ${temporal[0].roas?.toFixed(1)}x ROAS. Time your campaigns accordingly.`}
                          onAddAction={() => handleAddToQueue('action', { type: 'temporal_insight', period: temporal[0].period }, 'Best Times to Advertise')}
                        />
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {temporal.map((time: any, idx) => (
                            <DataCard
                              key={idx}
                              title={time.period}
                              icon={Calendar}
                              highlight={time.roas > (insight.reasoning.projections?.ifIgnored?.roas || 0) * 1.5}
                              data={[
                                { label: 'ROAS', value: `${time.roas?.toFixed(1)}x` },
                                { label: 'Conversions', value: time.conversions, secondary: `${formatCurrency(time.spend || 0)} spent` },
                                { label: 'Share', value: formatPercent(time.contribution || 0) }
                              ]}
                              onAddRule={() => handleAddToQueue('rule', { period: time.period, roas: time.roas }, `Schedule for ${time.period}`)}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {customerBehavior && (
                      <div>
                        <SectionHeader
                          title="Customer Behavior"
                          icon={ShoppingBag}
                          analysis="Understanding new vs returning customer patterns helps optimize your acquisition and retention strategies."
                        />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <DataCard
                            title="New Customers"
                            icon={Users}
                            data={[
                              {
                                label: 'Share',
                                value: formatPercent((customerBehavior.newVsReturning.new.conversions / (customerBehavior.newVsReturning.new.conversions + customerBehavior.newVsReturning.returning.conversions)) * 100)
                              },
                              { label: 'AOV', value: formatCurrency(customerBehavior.newVsReturning.new.averageOrderValue || 0) },
                              { label: 'CPA', value: formatCurrency(customerBehavior.newVsReturning.new.cpa || 0) }
                            ]}
                          />
                          <DataCard
                            title="Returning Customers"
                            icon={Repeat}
                            data={[
                              {
                                label: 'Share',
                                value: formatPercent((customerBehavior.newVsReturning.returning.conversions / (customerBehavior.newVsReturning.new.conversions + customerBehavior.newVsReturning.returning.conversions)) * 100)
                              },
                              { label: 'AOV', value: formatCurrency(customerBehavior.newVsReturning.returning.averageOrderValue || 0) },
                              { label: 'CPA', value: formatCurrency(customerBehavior.newVsReturning.returning.cpa || 0) }
                            ]}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </>

            {/* Recommended Actions - Expandable Template-Style Cards */}
            <div>
              <SectionHeader title="What you should do" icon={Zap} />
              <div className="space-y-3">
                {insight.directActions.map((action, idx) => {
                  const Icon = action.type === 'increase_budget' ? TrendingUp :
                              action.type === 'decrease_budget' ? TrendingDown :
                              action.type === 'pause' ? Pause :
                              action.type === 'duplicate' ? Copy :
                              Zap;

                  const isPrimary = idx === 0;
                  const isDestructive = action.type === 'decrease_budget' || action.type === 'pause';
                  const isExpanded = expandedActionIndex === idx;

                  // Get relevant supporting data for this action
                  const getRelevantData = () => {
                    if (action.type === 'increase_budget' && demographics.length > 0) {
                      return demographics.slice(0, 3);
                    }
                    if (action.type === 'duplicate' && placements.length > 0) {
                      return placements.slice(0, 3);
                    }
                    if (action.type === 'pause' && demographics.length > 0) {
                      return demographics.filter((d: any) => d.roas < (insight.reasoning.projections?.ifIgnored?.roas || 0)).slice(0, 3);
                    }
                    return geographic.slice(0, 3);
                  };

                  const relevantData = getRelevantData();

                  return (
                    <div
                      key={idx}
                      className={`
                        relative w-full
                        bg-white dark:bg-gray-800
                        border-2 ${isPrimary
                          ? 'border-transparent bg-gradient-to-br from-white via-white to-rose-50 dark:from-gray-800 dark:via-gray-800 dark:to-rose-950/20 shadow-lg [background-clip:padding-box] before:absolute before:inset-0 before:rounded-xl before:p-[2px] before:bg-gradient-to-br before:from-rose-400 before:via-pink-400 before:to-orange-400 before:-z-10'
                          : isDestructive
                          ? 'border-red-300 dark:border-red-800'
                          : 'border-gray-200 dark:border-gray-700'
                        }
                        rounded-xl
                        transition-all duration-200
                        ${ isExpanded ? 'shadow-xl' : 'hover:shadow-lg' }
                      `}
                    >
                      <button
                        onClick={() => setExpandedActionIndex(isExpanded ? null : idx)}
                        disabled={isProcessing}
                        className="w-full flex flex-col items-start gap-3 p-5 text-left disabled:opacity-50"
                      >
                        <div className="flex items-center gap-3 w-full">
                          <div className={`p-2.5 rounded-lg ${
                            isPrimary
                              ? 'bg-gradient-to-br from-rose-500 to-pink-500'
                              : isDestructive
                              ? 'bg-red-50 dark:bg-red-900/20'
                              : 'bg-gray-100 dark:bg-gray-700'
                          }`}>
                            <Icon className={`w-5 h-5 ${
                              isPrimary ? 'text-white' :
                              isDestructive ? 'text-red-600 dark:text-red-400' :
                              'text-gray-600 dark:text-gray-300'
                            }`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className={`text-base font-bold mb-1 ${
                              isPrimary ? 'text-rose-600 dark:text-rose-400' : 'text-gray-900 dark:text-white'
                            }`}>
                              {action.label}
                            </div>
                            <div className="text-[15px] text-gray-600 dark:text-gray-400 leading-relaxed">
                              {action.description}
                            </div>
                          </div>
                          {isExpanded ? (
                            <ChevronUp className={`w-5 h-5 ${
                              isPrimary ? 'text-rose-600 dark:text-rose-400' : 'text-gray-400'
                            }`} />
                          ) : (
                            <ChevronDown className={`w-5 h-5 ${
                              isPrimary ? 'text-rose-600 dark:text-rose-400' : 'text-gray-400'
                            }`} />
                          )}
                        </div>

                        {/* Impact metrics */}
                        <div className="w-full pt-3 border-t border-gray-100 dark:border-gray-700">
                          <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-4">
                              <span className="text-green-600 dark:text-green-400 font-semibold">
                                +{formatCurrency(netGainRevenue)} revenue
                              </span>
                              <span className="text-gray-500 dark:text-gray-500">
                                +{formatNumber(netGainConversions)} conversions
                              </span>
                            </div>
                            <span className="text-xs text-gray-400">30-day projection</span>
                          </div>
                        </div>
                      </button>

                      {/* Expanded content with supporting data */}
                      {isExpanded && relevantData.length > 0 && (
                        <div className="px-5 pb-5 space-y-3 border-t border-gray-100 dark:border-gray-700 pt-4">
                          <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                            Supporting data for this recommendation:
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            {relevantData.map((item: any, dataIdx: number) => (
                              <div
                                key={dataIdx}
                                className="bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg p-3"
                              >
                                <div className="text-xs font-semibold text-gray-900 dark:text-white mb-2">
                                  {item.segment || item.region || item.placement || item.period}
                                </div>
                                <div className="space-y-1.5">
                                  <div className="flex justify-between text-xs">
                                    <span className="text-gray-600 dark:text-gray-400">ROAS</span>
                                    <span className="font-semibold text-gray-900 dark:text-white">{item.roas?.toFixed(1)}x</span>
                                  </div>
                                  <div className="flex justify-between text-xs">
                                    <span className="text-gray-600 dark:text-gray-400">Conversions</span>
                                    <span className="font-semibold text-gray-900 dark:text-white">{item.conversions}</span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAction(action.type, action.parameters);
                            }}
                            disabled={isProcessing}
                            className="w-full mt-3 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white rounded-lg font-medium transition-all disabled:opacity-50 shadow-md hover:shadow-lg"
                          >
                            Execute This Action
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Optional Automation Callout */}
            {insight.recommendedRule && (
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900/50 dark:to-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
                <div className="flex items-start gap-3 mb-4">
                  <div className="p-2 rounded-lg bg-gray-200 dark:bg-gray-700">
                    <Zap className="w-4 h-4 text-gray-700 dark:text-gray-300" />
                  </div>
                  <div className="flex-1">
                    <h5 className="text-base font-semibold text-gray-900 dark:text-white mb-1">
                      Want me to watch for this automatically?
                    </h5>
                    <p className="text-[15px] text-gray-600 dark:text-gray-400 leading-relaxed">
                      {isPrimaryActionProtective
                        ? "I can monitor this and protect your budget if performance deteriorates."
                        : isScaling
                        ? "I can watch for similar opportunities and scale them automatically."
                        : "I can maintain optimal performance and adjust based on real-time data."}
                    </p>
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 mb-4">
                  <div className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                    {insight.recommendedRule.name}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-600 dark:text-gray-400">
                    <span>{insight.recommendedRule.conditions.length} conditions</span>
                    <span>•</span>
                    <span>{insight.recommendedRule.actions.length} actions</span>
                    <span>•</span>
                    <span>Checks every {insight.recommendedRule.check_frequency_minutes / 60}h</span>
                  </div>
                </div>

                <button
                  onClick={onCreateRule}
                  disabled={isProcessing}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-sm bg-gray-900 dark:bg-white hover:bg-gray-800 dark:hover:bg-gray-100 text-white dark:text-gray-900 rounded-lg font-semibold transition-all disabled:opacity-50 shadow-lg hover:shadow-xl"
                >
                  <span>Create Automation Rule</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Subtle Dismiss Link */}
            <div className="flex justify-center pt-2">
              <button
                onClick={() => onDismiss()}
                disabled={isProcessing}
                className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 underline decoration-dotted underline-offset-4 transition-colors disabled:opacity-50"
              >
                I'll handle this myself
              </button>
            </div>

          </div>
        </div>

        {/* Bottom Action Queue - Sticky Bar */}
        {queuedActions.length > 0 && (
          <div className="sticky bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t-2 border-gray-200 dark:border-gray-700 px-6 py-4 shadow-[0_-4px_12px_rgba(0,0,0,0.1)]">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-rose-500 to-pink-500 flex items-center justify-center text-white font-bold text-sm">
                    {queuedActions.length}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-gray-900 dark:text-white">
                      {queuedActions.filter(a => a.type === 'action').length} actions, {queuedActions.filter(a => a.type === 'rule').length} rules queued
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      Ready to automate
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 overflow-x-auto max-w-md">
                  {queuedActions.slice(0, 3).map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-100 dark:bg-gray-700 rounded-lg text-xs whitespace-nowrap group"
                    >
                      <span className="text-gray-700 dark:text-gray-300 truncate max-w-[120px]">{item.source}</span>
                      <button
                        onClick={() => handleRemoveFromQueue(idx)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
                      >
                        <X className="w-3 h-3 text-gray-500 dark:text-gray-400" />
                      </button>
                    </div>
                  ))}
                  {queuedActions.length > 3 && (
                    <div className="flex items-center px-2.5 py-1.5 bg-gray-100 dark:bg-gray-700 rounded-lg text-xs text-gray-600 dark:text-gray-400">
                      +{queuedActions.length - 3} more
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setQueuedActions([])}
                  className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Clear All
                </button>
                <button
                  onClick={async () => {
                    // Here you would typically open a builder modal with the queued items
                    // For now, we'll just show a toast
                    console.log('Create automations:', queuedActions);
                    // In a real implementation, this would open the rule builder with pre-filled data
                  }}
                  className="px-5 py-2 text-sm bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white rounded-lg font-semibold transition-all shadow-lg hover:shadow-xl flex items-center gap-2"
                >
                  <span>Complete Setup</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
};
