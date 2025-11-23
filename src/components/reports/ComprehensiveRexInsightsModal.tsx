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
  Bot,
  Calendar,
  Globe,
  Tv,
  Repeat,
  Link2,
  Activity,
  Crosshair,
  LayoutGrid,
  ChevronRight,
  Info,
  ArrowRight
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
  const [viewMode, setViewMode] = useState<'simple' | 'detailed'>('simple');

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

  // Determine if this is a protective or scaling rule
  const isPrimaryActionProtective = insight.directActions[0]?.type === 'pause' || insight.directActions[0]?.type === 'decrease_budget';
  const isScaling = insight.directActions[0]?.type === 'increase_budget' || insight.directActions[0]?.type === 'duplicate';

  const DataCard = ({
    title,
    icon: Icon,
    data,
    highlight = false
  }: {
    title: string;
    icon: any;
    data: { label: string; value: string | number; secondary?: string }[];
    highlight?: boolean;
  }) => (
    <div className={`bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 hover:shadow-md transition-all ${highlight ? 'ring-2 ring-rose-500/30' : ''}`}>
      <div className="flex items-center gap-1.5 mb-2.5">
        <Icon className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
        <h5 className="text-xs font-semibold text-gray-900 dark:text-white truncate">{title}</h5>
      </div>
      <div className="space-y-1.5">
        {data.map((item, idx) => (
          <div key={idx} className="bg-gray-50 dark:bg-gray-900/50 rounded p-2 border border-gray-100 dark:border-gray-800">
            <div className="flex justify-between items-center">
              <span className="text-[11px] font-medium text-gray-600 dark:text-gray-400">{item.label}</span>
              <span className="text-xs font-bold text-gray-900 dark:text-white">{item.value}</span>
            </div>
            {item.secondary && (
              <div className="text-[10px] text-gray-500 dark:text-gray-500 mt-0.5">{item.secondary}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  const SectionHeader = ({ title, icon: Icon, analysis }: { title: string; icon: any; analysis?: string }) => (
    <div className="mb-3">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4 text-gray-700 dark:text-gray-300" />
        <h4 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h4>
      </div>
      {analysis && (
        <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">{analysis}</p>
      )}
    </div>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="max-w-6xl">
      <div className="max-h-[85vh] overflow-y-auto">

        {/* Header */}
        <div className="border-b border-gray-200 dark:border-gray-700 px-5 py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1.5">
                <div className="p-1.5 bg-gradient-to-br from-rose-500 via-pink-500 to-cyan-500 rounded-lg">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Rex Insight</h3>
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">
                {entityName} • {platform.charAt(0).toUpperCase() + platform.slice(1)} • {formatNumber(insight.reasoning.dataPointsAnalyzed || 0)} data points
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
                  onClick={() => setViewMode('detailed')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                    viewMode === 'detailed'
                      ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  Detailed
                </button>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors bg-gray-100 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="px-5 py-4 space-y-4">

          {/* Analysis with Info Icon */}
          <div className="bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg p-3.5">
            <div className="flex gap-2">
              <Info className="w-4 h-4 text-gray-500 dark:text-gray-400 flex-shrink-0 mt-0.5" />
              <div className="space-y-2 text-xs text-gray-700 dark:text-gray-300 leading-relaxed">
                {viewMode === 'simple'
                  ? insight.analysisParagraphs.slice(0, 2).map((paragraph, idx) => <p key={idx}>{paragraph}</p>)
                  : insight.analysisParagraphs.map((paragraph, idx) => <p key={idx}>{paragraph}</p>)
                }
              </div>
            </div>
          </div>

          {/* SIMPLE VIEW */}
          {viewMode === 'simple' && (demographics.length > 0 || geographic.length > 0 || placements.length > 0) && (
            <div>
              <SectionHeader
                title="Top Performing Segments"
                icon={BarChart3}
                analysis="These segments are driving the best results and warrant your attention."
              />
              <div className="grid grid-cols-3 gap-3">
                {demographics.slice(0, 1).map((demo: any, idx) => (
                  <DataCard
                    key={idx}
                    title={demo.segment}
                    icon={Users}
                    data={[
                      { label: 'ROAS', value: `${demo.roas?.toFixed(1)}x` },
                      { label: 'Revenue', value: formatCurrency(demo.revenue || 0) }
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
                      { label: 'AOV', value: formatCurrency(geo.averageOrderValue || 0) }
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
                      { label: 'Conversions', value: placement.conversions }
                    ]}
                  />
                ))}
              </div>
            </div>
          )}

          {/* DETAILED VIEW */}
          {viewMode === 'detailed' && (
            <>
              {demographics.length > 0 && (
                <div>
                  <SectionHeader
                    title="Demographic Performance"
                    icon={Users}
                    analysis={`${demographics[0].segment} is your strongest demographic with ${demographics[0].roas?.toFixed(1)}x ROAS, significantly outperforming other segments.`}
                  />
                  <div className="grid grid-cols-3 gap-3">
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
                  <SectionHeader
                    title="Geographic Performance"
                    icon={Globe}
                    analysis={`${geographic[0].region} leads with ${geographic[0].roas?.toFixed(1)}x ROAS and ${formatCurrency(geographic[0].averageOrderValue || 0)} average order value.`}
                  />
                  <div className="grid grid-cols-3 gap-3">
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
                  <SectionHeader
                    title="Platform & Placement"
                    icon={Smartphone}
                    analysis={`${placements[0].placement} is your top placement with ${placements[0].roas?.toFixed(1)}x ROAS across ${placements[0].conversions} conversions.`}
                  />
                  <div className="grid grid-cols-3 gap-3">
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
                  <SectionHeader
                    title="Best Times to Advertise"
                    icon={Clock}
                    analysis={`Peak performance occurs during ${temporal[0].period} with ${temporal[0].roas?.toFixed(1)}x ROAS. Time your campaigns accordingly.`}
                  />
                  <div className="grid grid-cols-3 gap-3">
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
                  <SectionHeader
                    title="Customer Behavior"
                    icon={ShoppingBag}
                    analysis="Understanding new vs returning customer patterns helps optimize your acquisition and retention strategies."
                  />
                  <div className="grid grid-cols-3 gap-3">
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

              <div>
                <SectionHeader title="Attribution Analysis" icon={Link2} />
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-8 text-center">
                  <Activity className="w-6 h-6 mx-auto mb-2 text-gray-400" />
                  <p className="text-xs text-gray-500 dark:text-gray-400">Attribution data will appear here when available</p>
                </div>
              </div>

              <div>
                <SectionHeader title="Campaign Performance Details" icon={LayoutGrid} />
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-8 text-center">
                  <Crosshair className="w-6 h-6 mx-auto mb-2 text-gray-400" />
                  <p className="text-xs text-gray-500 dark:text-gray-400">Detailed campaign metrics will appear here when available</p>
                </div>
              </div>
            </>
          )}

          {/* Recommended Actions with Inline Impact */}
          <div>
            <SectionHeader title="Recommended Actions" icon={Zap} />
            <div className={`grid gap-2.5 ${
              insight.directActions.length === 1 ? 'grid-cols-1' :
              insight.directActions.length === 2 ? 'grid-cols-2' :
              insight.directActions.length <= 4 ? 'grid-cols-2' :
              'grid-cols-3'
            }`}>
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
                      group relative
                      flex flex-col items-start gap-2 p-3.5 text-left
                      bg-white dark:bg-gray-800
                      border ${isPrimary
                        ? 'border-rose-300 dark:border-rose-800 ring-2 ring-rose-500/20'
                        : isDestructive
                        ? 'border-red-200 dark:border-red-900'
                        : 'border-gray-200 dark:border-gray-700'
                      }
                      rounded-lg
                      transition-all duration-200
                      disabled:opacity-50 disabled:cursor-not-allowed
                      hover:shadow-md
                    `}
                  >
                    <div className="flex items-center gap-2 w-full">
                      <div className={`p-1 rounded ${
                        isPrimary
                          ? 'bg-gradient-to-br from-rose-500 to-pink-500'
                          : isDestructive
                          ? 'bg-red-50 dark:bg-red-900/20'
                          : 'bg-gray-100 dark:bg-gray-700'
                      }`}>
                        <Icon className={`w-3.5 h-3.5 ${
                          isPrimary ? 'text-white' :
                          isDestructive ? 'text-red-600 dark:text-red-400' :
                          'text-gray-600 dark:text-gray-300'
                        }`} />
                      </div>
                      <span className={`text-xs font-semibold ${
                        isPrimary ? 'text-rose-600 dark:text-rose-400' : 'text-gray-900 dark:text-white'
                      }`}>{action.label}</span>
                      <ChevronRight className={`w-3.5 h-3.5 ml-auto transition-transform group-hover:translate-x-0.5 ${
                        isPrimary ? 'text-rose-600 dark:text-rose-400' : 'text-gray-400'
                      }`} />
                    </div>
                    <span className="text-[11px] text-gray-600 dark:text-gray-400 leading-snug">{action.description}</span>

                    {/* Inline Impact */}
                    <div className="w-full pt-2 border-t border-gray-100 dark:border-gray-700">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-green-600 dark:text-green-400 font-semibold">
                          +{formatCurrency(netGainRevenue)}
                        </span>
                        <span className="text-gray-500 dark:text-gray-500">
                          +{formatNumber(netGainConversions)} customers
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Automated Rule - Right After Actions */}
          {insight.recommendedRule && (
            <div className="bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <h5 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                Automate This with a Rule
              </h5>
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-3 leading-relaxed">
                {isPrimaryActionProtective
                  ? "Create an automated rule to protect your budget and prevent wasteful spending when performance deteriorates."
                  : isScaling
                  ? "Create an automated rule to scale winning campaigns and maximize profitable opportunities as they emerge."
                  : "Create an automated rule to maintain optimal performance and automatically adjust based on real-time data."}
              </p>
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 mb-3">
                <div className="text-xs font-medium text-gray-900 dark:text-white mb-2">
                  {insight.recommendedRule.name}
                </div>
                <div className="flex items-center gap-4 text-[10px] text-gray-600 dark:text-gray-400">
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
                className="inline-flex items-center gap-2 px-4 py-2 text-xs bg-gray-900 dark:bg-white hover:bg-gray-800 dark:hover:bg-gray-100 text-white dark:text-gray-900 rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                <span>Create Rule</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Dismiss Button */}
          <button
            onClick={() => onDismiss()}
            disabled={isProcessing}
            className="w-full px-4 py-2.5 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 rounded-lg font-medium transition-all disabled:opacity-50"
          >
            Not Now
          </button>

        </div>
      </div>
    </Modal>
  );
};
