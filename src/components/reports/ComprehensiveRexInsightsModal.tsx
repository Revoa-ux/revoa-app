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
  const [viewMode, setViewMode] = useState<'simple' | 'expert' | 'advanced'>('simple');
  const [queuedActions, setQueuedActions] = useState<Array<{ type: 'action' | 'rule'; data: any; source: string }>>([]);
  const [expandedActionIndex, setExpandedActionIndex] = useState<number | null>(null);
  const [selectedActionIndex, setSelectedActionIndex] = useState<number | null>(null);
  const [showAutomationRule, setShowAutomationRule] = useState(false);

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

  // Determine insight type
  const isPrimaryActionProtective = insight.directActions[0]?.type === 'pause' || insight.directActions[0]?.type === 'decrease_budget';
  const isScaling = insight.directActions[0]?.type === 'increase_budget' || insight.directActions[0]?.type === 'duplicate';

  // Determine dynamic title
  const getInsightTitle = () => {
    if (isPrimaryActionProtective) return 'Revoa AI detected a performance issue';
    if (isScaling) return 'Revoa AI found a winning opportunity';
    return 'Revoa AI spotted an optimization';
  };

  const handleAddToQueue = (type: 'action' | 'rule', data: any, source: string) => {
    setQueuedActions([...queuedActions, { type, data, source }]);
  };

  const handleRemoveFromQueue = (index: number) => {
    setQueuedActions(queuedActions.filter((_, i) => i !== index));
  };

  // Get relevant data for a specific action
  const getRelevantDataForAction = (actionIndex: number) => {
    const action = insight.directActions[actionIndex];
    const avgRoas = insight.reasoning.projections?.ifIgnored?.roas || 0;
    let relevantData: any[] = [];

    if (action.type === 'increase_budget' || action.type === 'duplicate') {
      // Show top performers only
      const topDemographics = demographics.filter((d: any) => d.roas > avgRoas * 1.5);
      const topGeographic = geographic.filter((g: any) => g.roas > avgRoas * 1.5);
      const topPlacements = placements.filter((p: any) => p.roas > avgRoas * 1.5);
      const topTemporal = temporal.filter((t: any) => t.roas > avgRoas * 1.5);

      relevantData = [
        ...topDemographics.map((d: any) => ({ ...d, type: 'demographic', icon: Users })),
        ...topGeographic.map((g: any) => ({ ...g, type: 'geographic', icon: MapPin })),
        ...topPlacements.map((p: any) => ({ ...p, type: 'placement', icon: Tv })),
        ...topTemporal.map((t: any) => ({ ...t, type: 'temporal', icon: Calendar }))
      ];
    } else if (action.type === 'decrease_budget' || action.type === 'pause') {
      // Show underperformers only
      const underDemographics = demographics.filter((d: any) => d.roas < avgRoas);
      const underGeographic = geographic.filter((g: any) => g.roas < avgRoas);
      const underPlacements = placements.filter((p: any) => p.roas < avgRoas);
      const underTemporal = temporal.filter((t: any) => t.roas < avgRoas);

      relevantData = [
        ...underDemographics.map((d: any) => ({ ...d, type: 'demographic', icon: Users })),
        ...underGeographic.map((g: any) => ({ ...g, type: 'geographic', icon: MapPin })),
        ...underPlacements.map((p: any) => ({ ...p, type: 'placement', icon: Tv })),
        ...underTemporal.map((t: any) => ({ ...t, type: 'temporal', icon: Calendar }))
      ];
    }

    return relevantData.sort((a, b) => Math.abs(b.roas - avgRoas) - Math.abs(a.roas - avgRoas)).slice(0, 6);
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
    <div className={`relative bg-white dark:bg-gray-800 border rounded-xl p-4 transition-all duration-200 group ${
      highlight
        ? 'border-2 border-rose-400 dark:border-rose-500 shadow-lg shadow-rose-500/20 hover:shadow-xl hover:shadow-rose-500/30'
        : 'border-gray-200 dark:border-gray-700 hover:shadow-lg'
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
      <Modal isOpen={isOpen} onClose={onClose} maxWidth="max-w-6xl">
        <div className="max-h-[85vh] overflow-y-auto" style={{ fontFamily: "'Inter var', 'Inter', system-ui, sans-serif" }}>

          {/* Header */}
          <div className="border-b border-gray-200 dark:border-gray-700 px-6 py-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2">
                  {/* Revoa AI Bot Icon */}
                  <div className="w-10 h-10 rounded-lg overflow-hidden shadow-lg">
                    <img src="/Revoa-AI-Bot.png" alt="Revoa AI" className="w-full h-full object-cover" />
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
                  <button
                    onClick={() => setViewMode('advanced')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                      viewMode === 'advanced'
                        ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    Advanced
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

            {/* Hero Statement - What Revoa AI Found (Simple view only) */}
            {viewMode === 'simple' && (
              <div className="bg-gradient-to-br from-rose-50 to-orange-50 dark:from-rose-950/20 dark:to-orange-950/20 border-2 border-rose-200 dark:border-rose-800 rounded-xl p-5">
                <div className="flex items-start gap-3">
                  <Sparkles className="w-5 h-5 text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5" />
                  <p className="text-lg font-semibold text-gray-900 dark:text-white leading-relaxed">
                    {insight.primaryInsight}
                  </p>
                </div>
              </div>
            )}

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

                {/* EXPERT VIEW - Classic Data Display */}
                {viewMode === 'expert' && (
                  <div className="space-y-6">
                    {demographics.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-4">
                          <Users className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            Top Performing Segments
                          </h3>
                        </div>
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
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {geographic.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-4">
                          <Globe className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            Geographic Performance
                          </h3>
                        </div>
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
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {placements.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-4">
                          <Smartphone className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            Platform & Placement
                          </h3>
                        </div>
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
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {temporal.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-4">
                          <Clock className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            Best Times to Advertise
                          </h3>
                        </div>
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
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {customerBehavior && (
                      <div>
                        <div className="flex items-center gap-2 mb-4">
                          <ShoppingBag className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            Customer Behavior
                          </h3>
                        </div>
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

                {/* ADVANCED VIEW - Interactive Build Mode with Actions First */}
                {viewMode === 'advanced' && (
                  <div className="space-y-6">
                    {/* AI SUGGESTIONS SECTION - TOP */}
                    <div>
                      <div className="flex items-center gap-2 mb-4">
                        <Sparkles className="w-5 h-5 text-rose-500" />
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          AI Recommendations
                        </h3>
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          Select to view supporting data
                        </span>
                      </div>

                      <div className="space-y-3">
                        {insight.directActions.map((action, idx) => {
                          const Icon = action.type === 'increase_budget' ? TrendingUp :
                                      action.type === 'decrease_budget' ? TrendingDown :
                                      action.type === 'pause' ? Pause :
                                      action.type === 'duplicate' ? Copy :
                                      Zap;

                          const isPrimary = idx === 0;
                          const isSelected = selectedActionIndex === idx;
                          const isDestructive = action.type === 'decrease_budget' || action.type === 'pause';

                          // Count supporting data segments
                          const relevantData = getRelevantDataForAction(idx);

                          return (
                            <button
                              key={idx}
                              onClick={() => {
                                setSelectedActionIndex(isSelected ? null : idx);
                                setShowAutomationRule(false);
                              }}
                              disabled={isProcessing}
                              className={`
                                w-full text-left p-5 rounded-xl transition-all
                                ${
                                  isSelected
                                    ? 'bg-rose-50 dark:bg-rose-950/20 border-2 border-rose-400 dark:border-rose-500 shadow-lg'
                                    : isPrimary
                                    ? 'bg-white dark:bg-gray-800 border-2 border-rose-300 dark:border-rose-600 hover:border-rose-400 dark:hover:border-rose-500'
                                    : isDestructive
                                    ? 'bg-white dark:bg-gray-800 border-2 border-red-200 dark:border-red-800 hover:border-red-300'
                                    : 'bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 hover:border-gray-300'
                                }
                              `}
                            >
                              <div className="flex items-start gap-4">
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
                                  <div className="flex items-center justify-between mb-2">
                                    <h4 className={`text-base font-bold ${
                                      isPrimary ? 'text-rose-600 dark:text-rose-400' : 'text-gray-900 dark:text-white'
                                    }`}>
                                      {action.label}
                                    </h4>
                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                      {isSelected ? '✓ Viewing data below' : 'Click to view →'}
                                    </span>
                                  </div>

                                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                                    {action.description}
                                  </p>

                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4 text-sm">
                                      <span className="text-green-600 dark:text-green-400 font-semibold">
                                        +{formatCurrency(netGainRevenue)} revenue
                                      </span>
                                      <span className="text-gray-500">
                                        +{formatNumber(netGainConversions)} conversions
                                      </span>
                                    </div>
                                    <span className="text-xs px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                                      Based on {relevantData.length} segments
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {isSelected && (
                                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleAction(action.type, action.parameters);
                                    }}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white rounded-lg font-semibold transition-all"
                                  >
                                    {action.label}
                                    <ChevronRight className="w-4 h-4" />
                                  </button>
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* AUTOMATION RULE SECTION - IN ADVANCED VIEW */}
                    {insight.recommendedRule && (
                      <div>
                        <div className="flex items-center gap-2 mb-4">
                          <Zap className="w-5 h-5 text-rose-500" />
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            Automation Rule
                          </h3>
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            Set it and forget it
                          </span>
                        </div>

                        <button
                          onClick={() => {
                            setShowAutomationRule(!showAutomationRule);
                            setSelectedActionIndex(null);
                          }}
                          className={`
                            w-full text-left p-5 rounded-xl transition-all
                            ${
                              showAutomationRule
                                ? 'bg-rose-50 dark:bg-rose-950/20 border-2 border-rose-400 dark:border-rose-500 shadow-lg'
                                : 'bg-white dark:bg-gray-800 border-2 border-rose-200 dark:border-rose-700 hover:border-rose-300 dark:hover:border-rose-600'
                            }
                          `}
                        >
                          <div className="flex items-start gap-4">
                            <div className="p-2.5 rounded-lg bg-gradient-to-br from-rose-500 to-pink-500">
                              {isPrimaryActionProtective ? (
                                <Pause className="w-5 h-5 text-white" />
                              ) : (
                                <TrendingUp className="w-5 h-5 text-white" />
                              )}
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-2">
                                <h4 className="text-base font-bold text-rose-600 dark:text-rose-400">
                                  {isPrimaryActionProtective ? '🛡️ ' : '📈 '}
                                  {insight.recommendedRule.name}
                                </h4>
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                  {showAutomationRule ? '✓ Viewing conditions' : 'Click to view →'}
                                </span>
                              </div>

                              {/* IF/THEN Logic Display */}
                              <div className="space-y-3 mb-4">
                                {/* IF Section */}
                                <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                                  <div className="flex items-center gap-2 mb-2">
                                    <span className="text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-100 dark:bg-rose-900/30 px-2 py-0.5 rounded">
                                      IF
                                    </span>
                                    <span className="text-xs text-gray-500 dark:text-gray-400">Trigger Conditions</span>
                                  </div>
                                  <ul className="space-y-1.5 text-sm text-gray-700 dark:text-gray-300">
                                    {insight.recommendedRule.conditions.map((condition: any, idx: number) => (
                                      <li key={idx} className="flex items-start gap-2">
                                        <span className="text-rose-500 mt-0.5">•</span>
                                        <span>
                                          {condition.metric_type?.replace('_', ' ') || 'metric'} {condition.operator || '<'} {condition.threshold_value || '0'}{condition.metric_type?.includes('roas') ? 'x' : condition.metric_type?.includes('spend') ? '' : '%'}
                                          {condition.time_window_days && ` for ${condition.time_window_days} days`}
                                        </span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>

                                {/* THEN Section */}
                                <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                                  <div className="flex items-center gap-2 mb-2">
                                    <span className="text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-100 dark:bg-rose-900/30 px-2 py-0.5 rounded">
                                      THEN
                                    </span>
                                    <span className="text-xs text-gray-500 dark:text-gray-400">Automated Actions</span>
                                  </div>
                                  <ul className="space-y-1.5 text-sm text-gray-700 dark:text-gray-300">
                                    {insight.recommendedRule.actions.map((action: any, idx: number) => (
                                      <li key={idx} className="flex items-start gap-2">
                                        <span className="text-rose-500 mt-0.5">•</span>
                                        <span>
                                          {action.action_type?.replace('_', ' ').replace('budget', 'budget by') || 'Take action'}
                                          {action.value && ` ${action.value}%`}
                                        </span>
                                      </li>
                                    ))}
                                    <li className="flex items-start gap-2">
                                      <span className="text-rose-500 mt-0.5">•</span>
                                      <span>Send notification to you</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                      <span className="text-rose-500 mt-0.5">•</span>
                                      <span>Log decision in activity feed</span>
                                    </li>
                                  </ul>
                                </div>
                              </div>

                              {/* Rule Frequency */}
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                Checks every {insight.recommendedRule.check_frequency_minutes / 60} hours
                              </div>
                            </div>
                          </div>

                          {showAutomationRule && (
                            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onCreateRule();
                                }}
                                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white rounded-lg font-semibold transition-all"
                              >
                                <Zap className="w-4 h-4" />
                                Enable {isPrimaryActionProtective ? 'Safeguarding' : 'Scaling'} Rule
                                <ChevronRight className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </button>
                      </div>
                    )}

                    {/* FILTERED DATA CARDS SECTION */}
                    {(selectedActionIndex !== null || showAutomationRule) && (
                      <div>
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <BarChart3 className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                              Supporting Data
                            </h3>
                          </div>
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            {selectedActionIndex !== null
                              ? `Showing ${getRelevantDataForAction(selectedActionIndex).length} segments that ${insight.directActions[selectedActionIndex].type === 'pause' || insight.directActions[selectedActionIndex].type === 'decrease_budget' ? 'are underperforming' : 'triggered this opportunity'}`
                              : 'Showing segments that match rule conditions'
                            }
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {(selectedActionIndex !== null ? getRelevantDataForAction(selectedActionIndex) : []).map((item: any, idx: number) => {
                            const Icon = item.icon || Users;
                            const label = item.segment || item.region || item.placement || item.period || 'Segment';

                            return (
                              <DataCard
                                key={idx}
                                title={label}
                                icon={Icon}
                                highlight={true}
                                data={[
                                  { label: 'ROAS', value: `${item.roas?.toFixed(1)}x` },
                                  { label: 'Conversions', value: item.conversions, secondary: item.cpa ? `${formatCurrency(item.cpa)} CPA` : undefined },
                                  { label: 'Revenue', value: formatCurrency(item.revenue || 0), secondary: item.contribution ? `${formatPercent(item.contribution)} of total` : undefined }
                                ]}
                              />
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Empty state when nothing selected */}
                    {selectedActionIndex === null && !showAutomationRule && (
                      <div className="text-center py-12 px-4">
                        <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-4">
                          <ChevronUp className="w-8 h-8 text-gray-400" />
                        </div>
                        <p className="text-gray-600 dark:text-gray-400 text-base">
                          Select an AI recommendation above to view the supporting data
                        </p>
                      </div>
                    )}

                    {/* Old sections removed - data now shows only when filtered */}
                    {false && demographics.length > 0 && (
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

            {/* Recommended Actions */}
            <div>
              <SectionHeader title="What you should do" icon={Zap} />

              {/* Simple View - Original Design */}
              {viewMode === 'simple' && (
                <div className="space-y-3">
                  {insight.directActions.map((action, idx) => {
                    const Icon = action.type === 'increase_budget' ? TrendingUp :
                                action.type === 'decrease_budget' ? TrendingDown :
                                action.type === 'pause' ? Pause :
                                action.type === 'duplicate' ? Copy :
                                Zap;

                    const isPrimary = idx === 0;
                    const isDestructive = action.type === 'decrease_budget' || action.type === 'pause';

                    return (
                      <button
                        key={idx}
                        onClick={() => handleAction(action.type, action.parameters)}
                        disabled={isProcessing}
                        className={`
                          group relative w-full
                          flex flex-col items-start gap-3 p-5 text-left
                          bg-white dark:bg-gray-800
                          border-2 ${isPrimary
                            ? 'border-rose-400 dark:border-rose-600 shadow-lg shadow-rose-500/10'
                            : isDestructive
                            ? 'border-red-300 dark:border-red-800'
                            : 'border-gray-200 dark:border-gray-700'
                          }
                          rounded-xl
                          transition-all duration-200
                          disabled:opacity-50 disabled:cursor-not-allowed
                          hover:shadow-xl hover:-translate-y-0.5
                        `}
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
                          <ChevronRight className={`w-5 h-5 transition-transform group-hover:translate-x-1 ${
                            isPrimary ? 'text-rose-600 dark:text-rose-400' : 'text-gray-400'
                          }`} />
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
                    );
                  })}
                </div>
              )}

              {/* Expert View - Expandable Cards */}
              {viewMode === 'expert' && (
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

                    // Get relevant supporting data for this action - match to highlighted cards
                    const getRelevantData = () => {
                      const avgRoas = insight.reasoning.projections?.ifIgnored?.roas || 0;

                      if (action.type === 'increase_budget' || action.type === 'duplicate') {
                        // Show top performers (highlighted cards)
                        if (demographics.length > 0) {
                          return demographics.filter((d: any) => d.roas > avgRoas * 1.5).slice(0, 3);
                        }
                        if (placements.length > 0) {
                          return placements.filter((p: any) => p.roas > avgRoas * 1.5).slice(0, 3);
                        }
                        if (geographic.length > 0) {
                          return geographic.filter((g: any) => g.roas > avgRoas * 1.5).slice(0, 3);
                        }
                      }

                      if (action.type === 'decrease_budget' || action.type === 'pause') {
                        // Show underperformers (non-highlighted)
                        if (demographics.length > 0) {
                          return demographics.filter((d: any) => d.roas < avgRoas).slice(0, 3);
                        }
                        if (placements.length > 0) {
                          return placements.filter((p: any) => p.roas < avgRoas).slice(0, 3);
                        }
                      }

                      return [];
                    };

                    const relevantData = getRelevantData();

                    return (
                      <div
                        key={idx}
                        className={`
                          relative w-full
                          bg-white dark:bg-gray-800
                          border-2 ${isPrimary
                            ? 'border-rose-400 dark:border-rose-600 shadow-lg shadow-rose-500/20'
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
                          <div className="px-5 pb-5 space-y-4 border-t border-gray-100 dark:border-gray-700 pt-4">
                            <div className="text-sm font-semibold text-gray-900 dark:text-white">
                              {action.type === 'pause' || action.type === 'decrease_budget' ? 'Underperforming segments:' : 'Top performing segments:'}
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              {relevantData.map((item: any, dataIdx: number) => (
                                <div
                                  key={dataIdx}
                                  className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow"
                                >
                                  <div className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                                    {item.segment || item.region || item.placement || item.period}
                                  </div>
                                  <div className="space-y-2">
                                    <div className="flex justify-between items-center">
                                      <span className="text-xs text-gray-600 dark:text-gray-400">ROAS</span>
                                      <span className="text-sm font-bold text-gray-900 dark:text-white">{item.roas?.toFixed(1)}x</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                      <span className="text-xs text-gray-600 dark:text-gray-400">Conversions</span>
                                      <span className="text-sm font-bold text-gray-900 dark:text-white">{item.conversions}</span>
                                    </div>
                                    {item.revenue && (
                                      <div className="flex justify-between items-center">
                                        <span className="text-xs text-gray-600 dark:text-gray-400">Revenue</span>
                                        <span className="text-sm font-bold text-gray-900 dark:text-white">{formatCurrency(item.revenue)}</span>
                                      </div>
                                    )}
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
                              className="w-full mt-2 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white rounded-lg font-semibold transition-all disabled:opacity-50"
                            >
                              {action.label}
                              <ChevronRight className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Smart Automation Rules - Simple View Only */}
            {viewMode === 'simple' && insight.recommendedRule && (
              <div className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                {/* Rule Category Header - Consistent Branding */}
                <div className="px-5 py-3 bg-gradient-to-r from-rose-50 to-pink-50 dark:from-rose-950/20 dark:to-pink-950/20 border-b border-rose-200 dark:border-rose-800">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></div>
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">
                      {isPrimaryActionProtective ? '🛡️ Safeguarding Rule' : '📈 Scaling Rule'}
                    </span>
                  </div>
                </div>

                <div className="p-5 space-y-4">
                  {/* Smart Description */}
                  <div>
                    <h5 className="text-base font-semibold text-gray-900 dark:text-white mb-2">
                      {isPrimaryActionProtective
                        ? 'Protect your ad spend automatically'
                        : 'Scale winning opportunities automatically'}
                    </h5>
                    <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                      {isPrimaryActionProtective
                        ? `Revoa AI will monitor performance and automatically ${insight.directActions[0]?.type === 'pause' ? 'pause' : 'reduce budget on'} underperforming segments to prevent wasted spend. This rule activates when ROAS drops below ${(insight.reasoning.projections?.ifIgnored?.roas || 0).toFixed(1)}x or spend exceeds safe thresholds.`
                        : `Revoa AI will identify similar high-performing opportunities and automatically ${insight.directActions[0]?.type === 'increase_budget' ? 'increase budgets' : 'duplicate campaigns'} to maximize returns. This rule finds segments matching ${demographics[0]?.segment || 'winning patterns'} performance criteria.`}
                    </p>
                  </div>

                  {/* Rule Details Card */}
                  <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
                          {insight.recommendedRule.name}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {insight.recommendedRule.description}
                        </div>
                      </div>
                    </div>

                    {/* Rule Metrics */}
                    <div className="grid grid-cols-3 gap-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                      <div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Conditions</div>
                        <div className="text-sm font-semibold text-gray-900 dark:text-white">
                          {insight.recommendedRule.conditions.length}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Actions</div>
                        <div className="text-sm font-semibold text-gray-900 dark:text-white">
                          {insight.recommendedRule.actions.length}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Check Frequency</div>
                        <div className="text-sm font-semibold text-gray-900 dark:text-white">
                          Every {insight.recommendedRule.check_frequency_minutes / 60}h
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Action Button */}
                  <button
                    onClick={onCreateRule}
                    disabled={isProcessing}
                    className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white rounded-lg font-semibold transition-all disabled:opacity-50 shadow-md hover:shadow-lg"
                  >
                    <Zap className="w-4 h-4" />
                    <span>Enable {isPrimaryActionProtective ? 'Safeguarding' : 'Scaling'} Rule</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
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
