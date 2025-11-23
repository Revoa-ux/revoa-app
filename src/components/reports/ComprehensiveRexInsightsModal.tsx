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
  DollarSign,
  Target,
  CheckCircle2,
  Plus,
  Check,
  Trash2
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

interface SelectedInsight {
  type: string;
  name: string;
  metrics: any;
  segment?: string;
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
  const [viewMode, setViewMode] = useState<'simple' | 'detailed'>('simple');
  const [selectedInsights, setSelectedInsights] = useState<SelectedInsight[]>([]);

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

  const toggleInsightSelection = (insightData: SelectedInsight) => {
    setSelectedInsights(prev => {
      const exists = prev.find(i => i.type === insightData.type && i.name === insightData.name);
      if (exists) {
        return prev.filter(i => !(i.type === insightData.type && i.name === insightData.name));
      }
      return [...prev, insightData];
    });
  };

  const isInsightSelected = (type: string, name: string) => {
    return selectedInsights.some(i => i.type === type && i.name === name);
  };

  const clearAllSelections = () => {
    setSelectedInsights([]);
  };

  const handleCreateCustomRule = () => {
    console.log('Creating custom rule with:', selectedInsights);
    // This would open the rule builder with pre-populated conditions
    onCreateRule();
  };

  const handleCreateCustomAction = () => {
    console.log('Creating custom action with:', selectedInsights);
    // This would open the action builder with context
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

  const isPrimaryActionProtective = insight.directActions[0]?.type === 'pause' || insight.directActions[0]?.type === 'decrease_budget';
  const isScaling = insight.directActions[0]?.type === 'increase_budget' || insight.directActions[0]?.type === 'duplicate';
  const rexEmotion = isPrimaryActionProtective ? 'concerned' : isScaling ? 'excited' : 'thoughtful';

  const DataCard = ({
    title,
    icon: Icon,
    data,
    highlight = false,
    onSelect,
    isSelected = false,
    segmentType = ''
  }: {
    title: string;
    icon: any;
    data: { label: string; value: string | number; secondary?: string }[];
    highlight?: boolean;
    onSelect?: () => void;
    isSelected?: boolean;
    segmentType?: string;
  }) => (
    <div className={`relative bg-white dark:bg-gray-800 rounded-xl p-4 transition-all duration-200 ${
      highlight
        ? 'border-2 border-transparent bg-clip-padding before:absolute before:inset-0 before:-z-10 before:rounded-xl before:bg-gradient-to-r before:from-red-500 before:to-pink-500 before:p-[2px] shadow-lg hover:shadow-xl'
        : 'border border-gray-200 dark:border-gray-700 hover:shadow-lg'
    } ${isSelected ? 'ring-2 ring-rose-500' : ''}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <Icon className="w-4 h-4 text-gray-500 dark:text-gray-400 flex-shrink-0" />
          <h5 className="text-sm font-semibold text-gray-900 dark:text-white truncate">{title}</h5>
        </div>
        {highlight && onSelect && (
          <button
            onClick={onSelect}
            className={`flex-shrink-0 ml-2 p-1.5 rounded-lg transition-all ${
              isSelected
                ? 'bg-gradient-to-r from-red-500 to-pink-500 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gradient-to-r hover:from-red-500 hover:to-pink-500 hover:text-white'
            }`}
            title={isSelected ? 'Remove from selection' : 'Add to custom rule'}
          >
            {isSelected ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
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

  const SectionHeader = ({ title, icon: Icon, analysis }: { title: string; icon: any; analysis?: string }) => (
    <div className="mb-4">
      <div className="flex items-center gap-2.5 mb-2.5">
        <Icon className="w-4 h-4 text-gray-700 dark:text-gray-300" />
        <h4 className="text-base font-semibold text-gray-900 dark:text-white">{title}</h4>
      </div>
      {analysis && (
        <p className="text-[15px] text-gray-600 dark:text-gray-400 leading-relaxed">{analysis}</p>
      )}
    </div>
  );

  return (
    <>
      {/* Rex Character - positioned outside modal */}
      {isOpen && (
        <div className="fixed left-8 top-1/2 -translate-y-1/2 z-50 hidden lg:block pointer-events-none">
          <RexCharacter emotion={rexEmotion} />
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
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">{insight.title}</h3>
                </div>
                <div className="text-[15px] text-gray-600 dark:text-gray-400 mb-2">
                  {entityName} • {platform.charAt(0).toUpperCase() + platform.slice(1)}
                </div>
                {insight.reasoning.highPriority && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400">
                    % High Priority
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center bg-gray-100 dark:bg-gray-900 rounded-lg p-0.5 border border-gray-200 dark:border-gray-700">
                  <button
                    onClick={() => setViewMode('simple')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                      viewMode === 'simple'
                        ? 'bg-gradient-to-r from-red-500 to-pink-500 text-white shadow-sm'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    Simple
                  </button>
                  <button
                    onClick={() => setViewMode('detailed')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                      viewMode === 'detailed'
                        ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    Data Breakdown
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

          <div className={`px-6 py-5 space-y-6 ${selectedInsights.length > 0 ? 'pb-32' : ''}`}>

            {/* SIMPLE VIEW */}
            {viewMode === 'simple' && (
              <>
                {/* Hero Statement - What Rex Found */}
                <div className="bg-gradient-to-br from-gray-800 to-gray-900 dark:from-gray-950 dark:to-black border-l-4 border-rose-500 rounded-lg p-6">
                  <p className="text-base text-gray-100 dark:text-gray-200 leading-relaxed">
                    {insight.primaryInsight}
                  </p>
                </div>

                {/* Action Button */}
                {insight.directActions[0] && (
                  <div className="bg-gradient-to-br from-gray-800 to-gray-900 dark:from-gray-950 dark:to-black border-l-4 border-rose-500 rounded-lg p-6">
                    <button
                      onClick={() => handleAction(insight.directActions[0].type, insight.directActions[0].parameters)}
                      disabled={isProcessing}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
                    >
                      {(() => {
                        const Icon = insight.directActions[0].type === 'increase_budget' ? TrendingUp :
                                    insight.directActions[0].type === 'decrease_budget' ? TrendingDown :
                                    insight.directActions[0].type === 'pause' ? Pause :
                                    insight.directActions[0].type === 'duplicate' ? Copy :
                                    Zap;
                        return <Icon className="w-5 h-5" />;
                      })()}
                      <span>{isProcessing ? 'Processing...' : insight.directActions[0].label}</span>
                    </button>
                  </div>
                )}

                {/* Projected Impact Section */}
                {insight.reasoning.projections && (
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <DollarSign className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                      <h4 className="text-lg font-semibold text-gray-900 dark:text-white">Here is what this could mean for your wallet...</h4>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                      {insight.reasoning.projections.scenario}
                    </p>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-gray-800 dark:bg-gray-900 rounded-lg p-4 border border-gray-700">
                        <div className="text-xs text-gray-400 mb-1">Expected Revenue</div>
                        <div className="text-2xl font-bold text-white">{formatCurrency(netGainRevenue)}</div>
                      </div>
                      <div className="bg-gray-800 dark:bg-gray-900 rounded-lg p-4 border border-gray-700">
                        <div className="text-xs text-gray-400 mb-1">Expected Profit</div>
                        <div className="text-2xl font-bold text-rose-500">{formatCurrency(netGainProfit)}</div>
                      </div>
                    </div>
                    <div className="mt-3 px-3 py-2 bg-gray-800 dark:bg-gray-900 rounded-lg border border-gray-700 text-xs text-gray-400 flex items-center justify-end gap-1">
                      <span>next 30 days</span>
                    </div>
                  </div>
                )}

                {/* What Caught My Attention Section */}
                {(demographics.length > 0 || geographic.length > 0 || placements.length > 0 || temporal.length > 0) && (
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <BarChart3 className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                      <h4 className="text-lg font-semibold text-gray-900 dark:text-white">Here is what caught my attention...</h4>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                      {insight.analysisParagraphs[0]}
                    </p>
                    <div className="space-y-3">
                      <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">The numbers that stood out:</div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {demographics.slice(0, 1).map((demo: any, idx) => (
                          <div key={idx} className="bg-gray-800 dark:bg-gray-900 rounded-lg p-4 border border-gray-700">
                            <div className="text-xs text-gray-400 mb-2">Current Roas</div>
                            <div className="text-2xl font-bold text-white mb-1">{demo.roas?.toFixed(1)}x</div>
                          </div>
                        ))}
                        {geographic.slice(0, 1).map((geo: any, idx) => (
                          <div key={idx} className="bg-gray-800 dark:bg-gray-900 rounded-lg p-4 border border-gray-700">
                            <div className="text-xs text-gray-400 mb-2">Current Cpa</div>
                            <div className="text-2xl font-bold text-white mb-1">{formatCurrency(geo.averageOrderValue || 0)}</div>
                          </div>
                        ))}
                        {placements.slice(0, 1).map((placement: any, idx) => (
                          <div key={idx} className="bg-gray-800 dark:bg-gray-900 rounded-lg p-4 border border-gray-700">
                            <div className="text-xs text-gray-400 mb-2">Daily Spend</div>
                            <div className="text-2xl font-bold text-white mb-1">{formatCurrency(placement.cpa || 150)}</div>
                          </div>
                        ))}
                      </div>
                      {insight.reasoning.projections?.ifImplemented && (
                        <div className="bg-gray-800 dark:bg-gray-900 rounded-lg p-4 border border-gray-700">
                          <div className="text-xs text-gray-400 mb-2">Potential Revenue</div>
                          <div className="text-2xl font-bold text-white">{formatCurrency(insight.reasoning.projections.ifImplemented.revenue || 0)}</div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Optional Automation Callout */}
                {insight.recommendedRule && (
                  <div className="bg-gradient-to-br from-gray-800 to-gray-900 dark:from-gray-950 dark:to-black border-2 border-rose-500 rounded-lg p-6">
                    <div className="flex items-start gap-3 mb-4">
                      <Zap className="w-5 h-5 text-rose-500 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <h5 className="text-base font-semibold text-white mb-2">
                          Want me to watch this for you?
                        </h5>
                        <p className="text-sm text-gray-300 leading-relaxed mb-3">
                          I can keep an eye on this and take action automatically. {insight.recommendedRule.description || 'Automatically increase budget by 20% when ROAS stays above 3.0x for 3 consecutive days'}
                        </p>
                        <p className="text-xs text-gray-400 mb-4">
                          Do not worry, I will notify you whenever I take action.
                        </p>
                        <div className="flex items-center gap-4 text-xs text-gray-400 mb-4">
                          <div className="flex items-center gap-1.5">
                            <Zap className="w-3 h-3" />
                            <span>Every {insight.recommendedRule.check_frequency_minutes / 60}h</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Target className="w-3 h-3" />
                            <span>Max 1/day</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={onCreateRule}
                      disabled={isProcessing}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
                    >
                      <CheckCircle2 className="w-5 h-5" />
                      <span>{isProcessing ? 'Creating...' : 'Yes, automate this for me'}</span>
                    </button>
                  </div>
                )}
              </>
            )}

            {/* DATA BREAKDOWN VIEW */}
            {viewMode === 'detailed' && (
              <>
                {demographics.length > 0 && (
                  <div>
                    <SectionHeader
                      title="Top Performing Segments"
                      icon={Users}
                      analysis={insight.analysisParagraphs[0]}
                    />
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {demographics.map((demo: any, idx) => (
                        <DataCard
                          key={idx}
                          title={demo.segment}
                          icon={Users}
                          highlight={demo.roas > (insight.reasoning.projections?.ifIgnored?.roas || 0) * 1.5}
                          onSelect={() => toggleInsightSelection({
                            type: 'demographic',
                            name: demo.segment,
                            metrics: demo,
                            segment: demo.segment
                          })}
                          isSelected={isInsightSelected('demographic', demo.segment)}
                          segmentType="demographic"
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
                    <SectionHeader
                      title="Geographic Performance"
                      icon={Globe}
                      analysis={`${geographic[0].region} leads with ${geographic[0].roas?.toFixed(1)}x ROAS and ${formatCurrency(geographic[0].averageOrderValue || 0)} average order value.`}
                    />
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {geographic.map((geo: any, idx) => (
                        <DataCard
                          key={idx}
                          title={geo.region}
                          icon={MapPin}
                          highlight={geo.roas > (insight.reasoning.projections?.ifIgnored?.roas || 0) * 1.5}
                          onSelect={() => toggleInsightSelection({
                            type: 'geographic',
                            name: geo.region,
                            metrics: geo
                          })}
                          isSelected={isInsightSelected('geographic', geo.region)}
                          segmentType="geographic"
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
                    <SectionHeader
                      title="Platform & Placement"
                      icon={Smartphone}
                      analysis={`${placements[0].placement} is your top placement with ${placements[0].roas?.toFixed(1)}x ROAS across ${placements[0].conversions} conversions.`}
                    />
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {placements.map((placement: any, idx) => (
                        <DataCard
                          key={idx}
                          title={placement.placement}
                          icon={Tv}
                          highlight={placement.roas > (insight.reasoning.projections?.ifIgnored?.roas || 0) * 1.5}
                          onSelect={() => toggleInsightSelection({
                            type: 'placement',
                            name: placement.placement,
                            metrics: placement
                          })}
                          isSelected={isInsightSelected('placement', placement.placement)}
                          segmentType="placement"
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
                    <SectionHeader
                      title="Best Times to Advertise"
                      icon={Clock}
                      analysis={`Peak performance occurs during ${temporal[0].period} with ${temporal[0].roas?.toFixed(1)}x ROAS. Time your campaigns accordingly.`}
                    />
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {temporal.map((time: any, idx) => (
                        <DataCard
                          key={idx}
                          title={time.period}
                          icon={Calendar}
                          highlight={time.roas > (insight.reasoning.projections?.ifIgnored?.roas || 0) * 1.5}
                          onSelect={() => toggleInsightSelection({
                            type: 'temporal',
                            name: time.period,
                            metrics: time
                          })}
                          isSelected={isInsightSelected('temporal', time.period)}
                          segmentType="temporal"
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

                {/* All Actions - Data Breakdown View */}
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
                </div>

                {/* Optional Automation - Data Breakdown View */}
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
              </>
            )}

            {/* Footer Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => onDismiss()}
                disabled={isProcessing}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                Dismiss
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-white bg-gray-900 dark:bg-gray-700 hover:bg-gray-800 dark:hover:bg-gray-600 rounded-lg transition-all"
              >
                Close
              </button>
            </div>

          </div>
        </div>

        {/* Bottom Action Builder Panel */}
        {selectedInsights.length > 0 && viewMode === 'detailed' && (
          <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 border-t-2 border-rose-500 shadow-2xl z-50 animate-slide-up">
            <div className="max-w-6xl mx-auto px-6 py-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-red-500 to-pink-500 flex items-center justify-center text-white font-bold text-sm">
                      {selectedInsights.length}
                    </div>
                    <span className="text-white font-semibold">
                      {selectedInsights.length} insight{selectedInsights.length !== 1 ? 's' : ''} selected
                    </span>
                  </div>
                  <div className="flex items-center gap-2 max-w-md overflow-x-auto">
                    {selectedInsights.map((insight, idx) => (
                      <div key={idx} className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-700 rounded-lg text-xs text-gray-200 whitespace-nowrap">
                        <span>{insight.name}</span>
                        <button
                          onClick={() => toggleInsightSelection(insight)}
                          className="hover:text-rose-400 transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={clearAllSelections}
                    className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white transition-colors"
                  >
                    Clear All
                  </button>
                  <button
                    onClick={handleCreateCustomAction}
                    className="px-5 py-2.5 text-sm font-semibold text-white bg-gray-700 hover:bg-gray-600 rounded-lg transition-all"
                  >
                    Create Custom Action
                  </button>
                  <button
                    onClick={handleCreateCustomRule}
                    className="px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 rounded-lg transition-all shadow-lg"
                  >
                    <span className="flex items-center gap-2">
                      <Zap className="w-4 h-4" />
                      Create Custom Rule from Selection
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
};
