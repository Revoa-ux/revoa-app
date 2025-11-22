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
  Shield,
  PlayCircle,
  DollarSign,
  Target,
  Award,
  ArrowRight,
  Image,
  Video,
  MousePointer,
  Layers,
  Calendar,
  Globe,
  Tv,
  Monitor,
  Tablet,
  Eye,
  Repeat,
  TrendingUp as TrendingUpAlt,
  Package,
  Tag,
  MessageCircle
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
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['all']));

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

  // Extract all data
  const demographics = insight.reasoning.supportingData?.demographics || [];
  const placements = insight.reasoning.supportingData?.placements || [];
  const geographic = insight.reasoning.supportingData?.geographic || [];
  const temporal = insight.reasoning.supportingData?.temporal || [];
  const customerBehavior = insight.reasoning.supportingData?.customerBehavior;

  // Calculate net gain
  const netGainRevenue = (insight.reasoning.projections?.ifImplemented?.revenue || 0) - (insight.reasoning.projections?.ifIgnored?.revenue || 0);
  const netGainProfit = (insight.reasoning.projections?.ifImplemented?.profit || 0) - (insight.reasoning.projections?.ifIgnored?.profit || 0);
  const netGainROAS = (insight.reasoning.projections?.ifImplemented?.roas || 0) - (insight.reasoning.projections?.ifIgnored?.roas || 0);
  const netGainConversions = (insight.reasoning.projections?.ifImplemented?.conversions || 0) - (insight.reasoning.projections?.ifIgnored?.conversions || 0);

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const DataCard = ({
    title,
    icon: Icon,
    data,
    highlight = false
  }: {
    title: string;
    icon: any;
    data: { label: string; value: string | number; trend?: 'up' | 'down' | 'neutral'; secondary?: string }[];
    highlight?: boolean;
  }) => (
    <div className={`bg-white dark:bg-gray-800 rounded-lg p-4 border-2 transition-all duration-200 hover:shadow-md ${
      highlight
        ? 'border-red-500 dark:border-red-600'
        : 'border-gray-200 dark:border-gray-700'
    }`}>
      <div className="flex items-center gap-2 mb-3">
        <div className="p-1.5 bg-gray-100 dark:bg-gray-700 rounded">
          <Icon className="w-4 h-4 text-gray-700 dark:text-gray-300" />
        </div>
        <h5 className="text-sm font-bold text-gray-900 dark:text-white">{title}</h5>
      </div>
      <div className="space-y-2">
        {data.map((item, idx) => (
          <div key={idx} className="text-xs bg-gray-50 dark:bg-gray-900 rounded p-2 border border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center mb-1">
              <span className="font-semibold text-gray-900 dark:text-white truncate">{item.label}</span>
              <span className={`font-bold text-sm ${
                item.trend === 'up' ? 'text-green-600 dark:text-green-400' :
                item.trend === 'down' ? 'text-red-600 dark:text-red-400' :
                'text-gray-900 dark:text-white'
              }`}>
                {item.value}
              </span>
            </div>
            {item.secondary && (
              <div className="text-gray-600 dark:text-gray-400 text-[11px]">
                {item.secondary}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  const SectionHeader = ({ title, icon: Icon, count }: { title: string; icon: any; count?: number }) => (
    <div className="flex items-center gap-3 mb-4 sticky top-0 bg-gray-50 dark:bg-gray-900 py-3 px-4 rounded-lg border border-gray-200 dark:border-gray-700 z-10">
      <div className="p-2 bg-white dark:bg-gray-800 rounded-lg border-2 border-gray-300 dark:border-gray-600">
        <Icon className="w-5 h-5 text-gray-900 dark:text-white" />
      </div>
      <div className="flex-1">
        <h4 className="text-base font-bold text-gray-900 dark:text-white">{title}</h4>
        {count && <span className="text-xs text-gray-600 dark:text-gray-400">{count} insights</span>}
      </div>
    </div>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="max-w-7xl">
      <div className="max-h-[85vh] overflow-y-auto">

        {/* Header with Net Gain */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 z-20 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-6 h-6 text-red-600 dark:text-red-400" />
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  High-Priority Optimization Opportunity
                </h3>
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {entityName} • {platform.charAt(0).toUpperCase() + platform.slice(1)} • Last {insight.reasoning.dateRange?.start && insight.reasoning.dateRange?.end ?
                  `${Math.ceil((new Date(insight.reasoning.dateRange.end).getTime() - new Date(insight.reasoning.dateRange.start).getTime()) / (1000 * 60 * 60 * 24))} days` :
                  '30 days'} • {formatNumber(insight.reasoning.dataPointsAnalyzed || 0)} data points analyzed
              </div>
            </div>
          </div>

          {/* Net Gain Summary */}
          <div className="rounded-xl border-2 border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Target className="w-5 h-5 text-red-600 dark:text-red-400" />
              <h4 className="text-base font-bold text-gray-900 dark:text-white">Projected Net Gain</h4>
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-red-600 text-white ml-auto">
                HIGH PRIORITY
              </span>
            </div>
            <div className="grid grid-cols-4 gap-3">
              <div className="text-center bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Additional Revenue</div>
                <div className="text-lg font-bold text-green-600 dark:text-green-400">
                  +{formatCurrency(netGainRevenue)}
                </div>
              </div>
              <div className="text-center bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Additional Profit</div>
                <div className="text-lg font-bold text-green-600 dark:text-green-400">
                  +{formatCurrency(netGainProfit)}
                </div>
              </div>
              <div className="text-center bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">ROAS Improvement</div>
                <div className="text-lg font-bold text-green-600 dark:text-green-400">
                  +{netGainROAS.toFixed(1)}x
                </div>
              </div>
              <div className="text-center bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">New Customers</div>
                <div className="text-lg font-bold text-green-600 dark:text-green-400">
                  +{formatNumber(netGainConversions)}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 py-6 space-y-8">

          {/* What Rex Found */}
          <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-4">
              <Award className="w-5 h-5 text-gray-700 dark:text-gray-300" />
              <h4 className="text-base font-bold text-gray-900 dark:text-white">What Rex Found</h4>
            </div>
            <div className="space-y-3 text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
              {insight.analysisParagraphs.map((paragraph, idx) => (
                <p key={idx} className="pl-4 border-l-2 border-gray-300 dark:border-gray-600">{paragraph}</p>
              ))}
            </div>
          </div>

          {/* SECTION A: Demographics Analysis */}
          {demographics.length > 0 && (
            <div>
              <SectionHeader title="Demographic Performance" icon={Users} count={demographics.length} />
              <div className="grid grid-cols-3 gap-4">
                {demographics.map((demo: any, idx) => (
                  <DataCard
                    key={idx}
                    title={demo.segment}
                    icon={Users}
                    highlight={demo.roas > (insight.reasoning.projections?.ifIgnored?.roas || 0) * 1.5}
                    data={[
                      { label: 'ROAS', value: `${demo.roas?.toFixed(1)}x`, trend: 'up' },
                      { label: 'Conversions', value: demo.conversions, secondary: `${formatCurrency(demo.cpa || 0)} CPA` },
                      { label: 'Revenue Share', value: formatPercent(demo.contribution || 0), secondary: `${formatCurrency(demo.revenue || 0)} total` }
                    ]}
                  />
                ))}
              </div>
            </div>
          )}

          {/* SECTION B: Geographic Performance */}
          {geographic.length > 0 && (
            <div>
              <SectionHeader title="Geographic Performance" icon={MapPin} count={geographic.length} />
              <div className="grid grid-cols-3 gap-4">
                {geographic.map((geo: any, idx) => (
                  <DataCard
                    key={idx}
                    title={geo.region}
                    icon={Globe}
                    highlight={geo.roas > (insight.reasoning.projections?.ifIgnored?.roas || 0) * 1.5}
                    data={[
                      { label: 'ROAS', value: `${geo.roas?.toFixed(1)}x`, trend: 'up' },
                      { label: 'AOV', value: formatCurrency(geo.averageOrderValue || 0), trend: 'up' },
                      { label: 'Conversions', value: geo.conversions, secondary: `${formatCurrency(geo.spend || 0)} spent` }
                    ]}
                  />
                ))}
              </div>
            </div>
          )}

          {/* SECTION C: Platform & Placement Performance */}
          {placements.length > 0 && (
            <div>
              <SectionHeader title="Platform & Placement Performance" icon={Smartphone} count={placements.length} />
              <div className="grid grid-cols-3 gap-4">
                {placements.map((placement: any, idx) => (
                  <DataCard
                    key={idx}
                    title={placement.placement}
                    icon={Tv}
                    highlight={placement.roas > (insight.reasoning.projections?.ifIgnored?.roas || 0) * 1.5}
                    data={[
                      { label: 'ROAS', value: `${placement.roas?.toFixed(1)}x`, trend: 'up' },
                      { label: 'Conversions', value: placement.conversions, secondary: `${formatCurrency(placement.cpa || 0)} CPA` },
                      { label: 'Revenue Share', value: formatPercent(placement.contribution || 0) }
                    ]}
                  />
                ))}
              </div>
            </div>
          )}

          {/* SECTION D: Temporal Performance */}
          {temporal.length > 0 && (
            <div>
              <SectionHeader title="Best Times to Advertise" icon={Clock} count={temporal.length} />
              <div className="grid grid-cols-3 gap-4">
                {temporal.map((time: any, idx) => (
                  <DataCard
                    key={idx}
                    title={time.period}
                    icon={Calendar}
                    highlight={time.roas > (insight.reasoning.projections?.ifIgnored?.roas || 0) * 1.5}
                    data={[
                      { label: 'ROAS', value: `${time.roas?.toFixed(1)}x`, trend: 'up' },
                      { label: 'Conversions', value: time.conversions, secondary: `${formatCurrency(time.spend || 0)} spent` },
                      { label: 'Revenue Share', value: formatPercent(time.contribution || 0) }
                    ]}
                  />
                ))}
              </div>
            </div>
          )}

          {/* SECTION E: Customer Behavior */}
          {customerBehavior && (
            <div>
              <SectionHeader title="Customer Behavior & Segmentation" icon={ShoppingBag} count={2} />
              <div className="grid grid-cols-3 gap-4">
                <DataCard
                  title="New Customers"
                  icon={Users}
                  data={[
                    {
                      label: 'Share',
                      value: formatPercent((customerBehavior.newVsReturning.new.conversions / (customerBehavior.newVsReturning.new.conversions + customerBehavior.newVsReturning.returning.conversions)) * 100)
                    },
                    { label: 'AOV', value: formatCurrency(customerBehavior.newVsReturning.new.averageOrderValue || 0), trend: 'up' },
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
                    { label: 'AOV', value: formatCurrency(customerBehavior.newVsReturning.returning.averageOrderValue || 0), trend: 'up' },
                    { label: 'CPA', value: formatCurrency(customerBehavior.newVsReturning.returning.cpa || 0) }
                  ]}
                />
              </div>
            </div>
          )}

          {/* Financial Impact Projection */}
          <div>
            <SectionHeader title="Financial Impact Projection" icon={DollarSign} />
            <div className="grid grid-cols-2 gap-5">
              <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-900/20 rounded-xl p-5 border-2 border-green-500 dark:border-green-700 shadow-lg">
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-2 bg-green-600 rounded-lg">
                    <TrendingUp className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-base font-bold text-green-900 dark:text-green-100">If Implemented</span>
                </div>
                {insight.reasoning.projections?.ifImplemented && (
                  <div className="space-y-3">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-green-200 dark:border-green-800">
                      <div className="flex justify-between items-baseline">
                        <span className="text-xs text-green-700 dark:text-green-400">Revenue</span>
                        <span className="text-lg font-bold text-green-700 dark:text-green-300">
                          +{formatCurrency(insight.reasoning.projections.ifImplemented.revenue || 0)}
                        </span>
                      </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-green-200 dark:border-green-800">
                      <div className="flex justify-between items-baseline">
                        <span className="text-xs text-green-700 dark:text-green-400">Profit</span>
                        <span className="text-lg font-bold text-green-700 dark:text-green-300">
                          +{formatCurrency(insight.reasoning.projections.ifImplemented.profit || 0)}
                        </span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-green-200 dark:border-green-800">
                        <div className="text-xs text-green-700 dark:text-green-400 mb-1">ROAS</div>
                        <div className="text-base font-bold text-green-700 dark:text-green-300">
                          {insight.reasoning.projections.ifImplemented.roas?.toFixed(1)}x
                        </div>
                      </div>
                      <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-green-200 dark:border-green-800">
                        <div className="text-xs text-green-700 dark:text-green-400 mb-1">Customers</div>
                        <div className="text-base font-bold text-green-700 dark:text-green-300">
                          +{insight.reasoning.projections.ifImplemented.conversions || 0}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/30 dark:to-red-900/20 rounded-xl p-5 border-2 border-red-500 dark:border-red-700 shadow-lg">
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-2 bg-red-600 rounded-lg">
                    <TrendingDown className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-base font-bold text-red-900 dark:text-red-100">If Ignored</span>
                </div>
                {insight.reasoning.projections?.ifIgnored && (
                  <div className="space-y-3">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-red-200 dark:border-red-800">
                      <div className="flex justify-between items-baseline">
                        <span className="text-xs text-red-700 dark:text-red-400">Wasted Spend</span>
                        <span className="text-lg font-bold text-red-700 dark:text-red-300">
                          -{formatCurrency(Math.abs(insight.reasoning.projections.ifIgnored.spend || 0))}
                        </span>
                      </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-red-200 dark:border-red-800">
                      <div className="flex justify-between items-baseline">
                        <span className="text-xs text-red-700 dark:text-red-400">Missed Revenue</span>
                        <span className="text-lg font-bold text-red-700 dark:text-red-300">
                          -{formatCurrency(Math.abs(insight.reasoning.projections.ifIgnored.revenue || 0))}
                        </span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-red-200 dark:border-red-800">
                        <div className="text-xs text-red-700 dark:text-red-400 mb-1">Lost Profit</div>
                        <div className="text-base font-bold text-red-700 dark:text-red-300">
                          -{formatCurrency(Math.abs(insight.reasoning.projections.ifIgnored.profit || 0))}
                        </div>
                      </div>
                      <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-red-200 dark:border-red-800">
                        <div className="text-xs text-red-700 dark:text-red-400 mb-1">Lost Customers</div>
                        <div className="text-base font-bold text-red-700 dark:text-red-300">
                          -{Math.abs(insight.reasoning.projections.ifImplemented?.conversions || 0)}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-4">
            <SectionHeader title="Take Action Now" icon={Zap} />
            <div className="grid grid-cols-3 gap-3">
              {insight.directActions.slice(0, 3).map((action, idx) => {
                const Icon = action.type === 'increase_budget' ? TrendingUp :
                            action.type === 'decrease_budget' ? TrendingDown :
                            action.type === 'pause' ? Pause :
                            action.type === 'duplicate' ? Copy :
                            Zap;

                const buttonClass = action.type === 'increase_budget'
                  ? 'bg-green-600 hover:bg-green-700 border-green-500'
                  : action.type === 'decrease_budget' || action.type === 'pause'
                  ? 'bg-red-600 hover:bg-red-700 border-red-500'
                  : 'bg-[linear-gradient(135deg,#E11D48_40%,#EC4899_80%,#E8795A_100%)] hover:opacity-90 border-red-500';

                return (
                  <button
                    key={idx}
                    onClick={() => handleAction(action.type, action.parameters)}
                    disabled={isProcessing}
                    className={`group flex flex-col items-start gap-2 px-4 py-4 text-left text-sm ${buttonClass} text-white rounded-xl font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl hover:scale-105 border-2`}
                  >
                    <div className="flex items-center gap-2 w-full">
                      <div className="p-1.5 bg-white/20 rounded-lg group-hover:bg-white/30 transition-colors">
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="font-bold text-sm">{action.label}</span>
                      <ArrowRight className="w-4 h-4 ml-auto group-hover:translate-x-1 transition-transform" />
                    </div>
                    <span className="text-xs text-white/90 leading-tight">{action.description}</span>
                  </button>
                );
              })}
            </div>

            {/* Automated Rule Card */}
            {insight.recommendedRule && (
              <div className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/30 dark:to-red-900/20 rounded-xl p-5 border-2 border-red-500 dark:border-red-700 shadow-md">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-red-600 rounded-xl flex-shrink-0">
                    <Shield className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h5 className="text-base font-bold text-red-900 dark:text-red-100 mb-2">
                      Recommended Safeguard Rule
                    </h5>
                    <p className="text-sm text-red-800 dark:text-red-300 mb-4 leading-relaxed">
                      {insight.recommendedRule.description}
                    </p>
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 mb-4 border border-red-200 dark:border-red-800">
                      <div className="font-bold text-gray-900 dark:text-white mb-3 text-sm">
                        {insight.recommendedRule.name}
                      </div>
                      <div className="grid grid-cols-3 gap-3 text-xs">
                        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-2 border border-gray-200 dark:border-gray-700">
                          <div className="text-gray-700 dark:text-gray-400 mb-1">Conditions</div>
                          <div className="text-lg font-bold text-gray-900 dark:text-white">{insight.recommendedRule.conditions.length}</div>
                          <div className="text-[10px] text-gray-600 dark:text-gray-400">checks</div>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-2 border border-gray-200 dark:border-gray-700">
                          <div className="text-gray-700 dark:text-gray-400 mb-1">Actions</div>
                          <div className="text-lg font-bold text-gray-900 dark:text-white">{insight.recommendedRule.actions.length}</div>
                          <div className="text-[10px] text-gray-600 dark:text-gray-400">automated</div>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-2 border border-gray-200 dark:border-gray-700">
                          <div className="text-gray-700 dark:text-gray-400 mb-1">Check Every</div>
                          <div className="text-lg font-bold text-gray-900 dark:text-white">{insight.recommendedRule.check_frequency_minutes / 60}</div>
                          <div className="text-[10px] text-gray-600 dark:text-gray-400">hours</div>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={onCreateRule}
                      disabled={isProcessing}
                      className="group w-full flex items-center justify-center gap-2 px-6 py-3 text-sm bg-[linear-gradient(135deg,#E11D48_40%,#EC4899_80%,#E8795A_100%)] hover:opacity-90 text-white rounded-xl font-bold transition-all disabled:opacity-50 shadow-lg hover:shadow-xl hover:scale-105 border-2 border-red-500"
                    >
                      <PlayCircle className="w-5 h-5" />
                      <span>Create This Rule</span>
                      <ArrowRight className="w-4 h-4 ml-auto group-hover:translate-x-1 transition-transform" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Dismiss Button */}
            <button
              onClick={() => onDismiss()}
              disabled={isProcessing}
              className="w-full px-6 py-3 text-sm text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 rounded-xl font-semibold transition-all disabled:opacity-50 shadow-sm hover:shadow-md"
            >
              Not Now
            </button>
          </div>

        </div>
      </div>
    </Modal>
  );
};
