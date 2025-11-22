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
  Package,
  Tag,
  MessageCircle,
  Link2,
  Activity,
  Crosshair,
  LayoutGrid,
  ChevronRight,
  TrendingUp as TrendingUpAlt,
  Sparkles
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

  const GlassCard = ({
    children,
    className = '',
    hover = false
  }: {
    children: React.ReactNode;
    className?: string;
    hover?: boolean;
  }) => (
    <div className={`
      bg-white/60 dark:bg-gray-800/60
      backdrop-blur-xl
      border border-gray-200/50 dark:border-gray-700/50
      rounded-2xl
      shadow-sm
      ${hover ? 'hover:shadow-lg hover:bg-white/70 dark:hover:bg-gray-800/70 transition-all duration-300' : ''}
      ${className}
    `}>
      {children}
    </div>
  );

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
    <GlassCard
      hover
      className={`p-4 ${highlight ? 'ring-2 ring-rose-500/20' : ''}`}
    >
      <div className="flex items-center gap-2 mb-3">
        <div className="p-1.5 bg-gray-100/80 dark:bg-gray-700/80 backdrop-blur-sm rounded-lg">
          <Icon className="w-4 h-4 text-gray-700 dark:text-gray-300" />
        </div>
        <h5 className="text-[13px] font-semibold text-gray-900 dark:text-white">{title}</h5>
      </div>
      <div className="space-y-2">
        {data.map((item, idx) => (
          <div key={idx} className="text-xs bg-gray-50/50 dark:bg-gray-900/30 backdrop-blur-sm rounded-lg p-2.5 border border-gray-200/30 dark:border-gray-700/30">
            <div className="flex justify-between items-center mb-1">
              <span className="font-medium text-gray-700 dark:text-gray-300 truncate text-[13px]">{item.label}</span>
              <span className={`font-bold text-sm ${
                item.trend === 'up' ? 'text-green-600 dark:text-green-400' :
                item.trend === 'down' ? 'text-rose-600 dark:text-rose-400' :
                'text-gray-900 dark:text-white'
              }`}>
                {item.value}
              </span>
            </div>
            {item.secondary && (
              <div className="text-gray-600 dark:text-gray-400 text-[11px] mt-1">
                {item.secondary}
              </div>
            )}
          </div>
        ))}
      </div>
    </GlassCard>
  );

  const SectionHeader = ({ title, icon: Icon, count }: { title: string; icon: any; count?: number }) => (
    <div className="flex items-center gap-3 mb-4">
      <div className="p-2 bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl rounded-xl border border-gray-200/50 dark:border-gray-700/50">
        <Icon className="w-5 h-5 text-gray-900 dark:text-white" />
      </div>
      <div className="flex-1">
        <h4 className="text-base font-semibold text-gray-900 dark:text-white">{title}</h4>
        {count && <span className="text-xs text-gray-600 dark:text-gray-400">{count} insights</span>}
      </div>
    </div>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="max-w-6xl">
      <div className="max-h-[85vh] overflow-y-auto">

        {/* Header */}
        <div className="sticky top-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl z-20 border-b border-gray-200/50 dark:border-gray-700/50 px-6 py-5">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 bg-gradient-to-br from-rose-500 to-pink-500 rounded-lg">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  Rex Optimization Insight
                </h3>
              </div>
              <div className="text-[13px] text-gray-600 dark:text-gray-400">
                {entityName} • {platform.charAt(0).toUpperCase() + platform.slice(1)} • {formatNumber(insight.reasoning.dataPointsAnalyzed || 0)} data points analyzed
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Simple/Detailed Toggle */}
              <div className="flex items-center bg-gray-100/80 dark:bg-gray-900/80 backdrop-blur-sm rounded-xl p-1 border border-gray-200/50 dark:border-gray-700/50">
                <button
                  onClick={() => setViewMode('simple')}
                  className={`px-4 py-2 text-[13px] font-medium rounded-lg transition-all ${
                    viewMode === 'simple'
                      ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  Simple
                </button>
                <button
                  onClick={() => setViewMode('detailed')}
                  className={`px-4 py-2 text-[13px] font-medium rounded-lg transition-all ${
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
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors bg-gray-100/80 dark:bg-gray-900/80 backdrop-blur-sm rounded-xl border border-gray-200/50 dark:border-gray-700/50"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Projected Impact Summary */}
          <GlassCard className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <Target className="w-5 h-5 text-gray-700 dark:text-gray-300" />
              <h4 className="text-base font-semibold text-gray-900 dark:text-white">Projected Impact</h4>
            </div>
            <div className="grid grid-cols-4 gap-3">
              <div className="text-center">
                <div className="text-[11px] text-gray-600 dark:text-gray-400 mb-1 uppercase tracking-wide">Revenue</div>
                <div className="text-xl font-bold text-green-600 dark:text-green-400">
                  +{formatCurrency(netGainRevenue)}
                </div>
              </div>
              <div className="text-center">
                <div className="text-[11px] text-gray-600 dark:text-gray-400 mb-1 uppercase tracking-wide">Profit</div>
                <div className="text-xl font-bold text-green-600 dark:text-green-400">
                  +{formatCurrency(netGainProfit)}
                </div>
              </div>
              <div className="text-center">
                <div className="text-[11px] text-gray-600 dark:text-gray-400 mb-1 uppercase tracking-wide">ROAS</div>
                <div className="text-xl font-bold text-gray-900 dark:text-white">
                  +{netGainROAS.toFixed(1)}x
                </div>
              </div>
              <div className="text-center">
                <div className="text-[11px] text-gray-600 dark:text-gray-400 mb-1 uppercase tracking-wide">Customers</div>
                <div className="text-xl font-bold text-gray-900 dark:text-white">
                  +{formatNumber(netGainConversions)}
                </div>
              </div>
            </div>
          </GlassCard>
        </div>

        <div className="px-6 py-6 space-y-6">

          {/* SIMPLE VIEW */}
          {viewMode === 'simple' && (
            <>
              {/* Key Finding */}
              <GlassCard className="p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Award className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                  <h4 className="text-base font-semibold text-gray-900 dark:text-white">Key Finding</h4>
                </div>
                <div className="space-y-3 text-[15px] text-gray-700 dark:text-gray-300 leading-relaxed">
                  {insight.analysisParagraphs.slice(0, 2).map((paragraph, idx) => (
                    <p key={idx}>{paragraph}</p>
                  ))}
                </div>
              </GlassCard>

              {/* Top 3-5 Most Important Metrics */}
              {(demographics.length > 0 || geographic.length > 0 || placements.length > 0) && (
                <div>
                  <SectionHeader title="Top Performing Segments" icon={BarChart3} count={Math.min(5, demographics.length + geographic.length + placements.length)} />
                  <div className="grid grid-cols-3 gap-4">
                    {demographics.slice(0, 2).map((demo: any, idx) => (
                      <DataCard
                        key={idx}
                        title={demo.segment}
                        icon={Users}
                        data={[
                          { label: 'ROAS', value: `${demo.roas?.toFixed(1)}x`, trend: 'up' },
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
                          { label: 'ROAS', value: `${geo.roas?.toFixed(1)}x`, trend: 'up' },
                          { label: 'AOV', value: formatCurrency(geo.averageOrderValue || 0) }
                        ]}
                      />
                    ))}
                    {placements.slice(0, 2).map((placement: any, idx) => (
                      <DataCard
                        key={`p-${idx}`}
                        title={placement.placement}
                        icon={Smartphone}
                        data={[
                          { label: 'ROAS', value: `${placement.roas?.toFixed(1)}x`, trend: 'up' },
                          { label: 'Conversions', value: placement.conversions }
                        ]}
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* DETAILED VIEW */}
          {viewMode === 'detailed' && (
            <>
              {/* Full Analysis */}
              <GlassCard className="p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Award className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                  <h4 className="text-base font-semibold text-gray-900 dark:text-white">Complete Analysis</h4>
                </div>
                <div className="space-y-3 text-[15px] text-gray-700 dark:text-gray-300 leading-relaxed">
                  {insight.analysisParagraphs.map((paragraph, idx) => (
                    <p key={idx}>{paragraph}</p>
                  ))}
                </div>
              </GlassCard>

              {/* Demographics */}
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

              {/* Geographic */}
              {geographic.length > 0 && (
                <div>
                  <SectionHeader title="Geographic Performance" icon={Globe} count={geographic.length} />
                  <div className="grid grid-cols-3 gap-4">
                    {geographic.map((geo: any, idx) => (
                      <DataCard
                        key={idx}
                        title={geo.region}
                        icon={MapPin}
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

              {/* Platform & Placement */}
              {placements.length > 0 && (
                <div>
                  <SectionHeader title="Platform & Placement" icon={Smartphone} count={placements.length} />
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

              {/* Temporal */}
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

              {/* Customer Behavior */}
              {customerBehavior && (
                <div>
                  <SectionHeader title="Customer Behavior" icon={ShoppingBag} count={2} />
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

              {/* Attribution Analysis - Placeholder for future implementation */}
              <div>
                <SectionHeader title="Attribution Analysis" icon={Link2} />
                <GlassCard className="p-5">
                  <div className="text-center py-8 text-gray-600 dark:text-gray-400 text-[13px]">
                    <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>Attribution insights will appear here when data is available</p>
                  </div>
                </GlassCard>
              </div>

              {/* Campaign/Ad Set/Ad Specific - Placeholder */}
              <div>
                <SectionHeader title="Campaign Performance Details" icon={LayoutGrid} />
                <GlassCard className="p-5">
                  <div className="text-center py-8 text-gray-600 dark:text-gray-400 text-[13px]">
                    <Crosshair className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>Campaign-specific metrics will appear here when available</p>
                  </div>
                </GlassCard>
              </div>
            </>
          )}

          {/* Financial Impact (Both Views) */}
          <div>
            <SectionHeader title="Financial Impact" icon={DollarSign} />
            <div className="grid grid-cols-2 gap-5">
              {/* If Implemented */}
              <GlassCard className="p-5 ring-1 ring-green-500/20">
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-2 bg-green-100/80 dark:bg-green-900/30 backdrop-blur-sm rounded-lg">
                    <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
                  </div>
                  <span className="text-base font-semibold text-gray-900 dark:text-white">If Implemented</span>
                </div>
                {insight.reasoning.projections?.ifImplemented && (
                  <div className="space-y-3">
                    <div className="flex justify-between items-baseline py-2 border-b border-gray-200/30 dark:border-gray-700/30">
                      <span className="text-[13px] text-gray-600 dark:text-gray-400">Revenue</span>
                      <span className="text-lg font-bold text-green-600 dark:text-green-400">
                        {formatCurrency(insight.reasoning.projections.ifImplemented.revenue || 0)}
                      </span>
                    </div>
                    <div className="flex justify-between items-baseline py-2 border-b border-gray-200/30 dark:border-gray-700/30">
                      <span className="text-[13px] text-gray-600 dark:text-gray-400">Profit</span>
                      <span className="text-lg font-bold text-green-600 dark:text-green-400">
                        {formatCurrency(insight.reasoning.projections.ifImplemented.profit || 0)}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <div>
                        <div className="text-[11px] text-gray-600 dark:text-gray-400 mb-1 uppercase tracking-wide">ROAS</div>
                        <div className="text-base font-bold text-gray-900 dark:text-white">
                          {insight.reasoning.projections.ifImplemented.roas?.toFixed(1)}x
                        </div>
                      </div>
                      <div>
                        <div className="text-[11px] text-gray-600 dark:text-gray-400 mb-1 uppercase tracking-wide">Customers</div>
                        <div className="text-base font-bold text-gray-900 dark:text-white">
                          {insight.reasoning.projections.ifImplemented.conversions || 0}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </GlassCard>

              {/* If Ignored */}
              <GlassCard className="p-5 ring-1 ring-rose-500/20">
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-2 bg-rose-100/80 dark:bg-rose-900/30 backdrop-blur-sm rounded-lg">
                    <TrendingDown className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                  </div>
                  <span className="text-base font-semibold text-gray-900 dark:text-white">If Ignored</span>
                </div>
                {insight.reasoning.projections?.ifIgnored && (
                  <div className="space-y-3">
                    <div className="flex justify-between items-baseline py-2 border-b border-gray-200/30 dark:border-gray-700/30">
                      <span className="text-[13px] text-gray-600 dark:text-gray-400">Wasted Spend</span>
                      <span className="text-lg font-bold text-rose-600 dark:text-rose-400">
                        {formatCurrency(Math.abs(insight.reasoning.projections.ifIgnored.spend || 0))}
                      </span>
                    </div>
                    <div className="flex justify-between items-baseline py-2 border-b border-gray-200/30 dark:border-gray-700/30">
                      <span className="text-[13px] text-gray-600 dark:text-gray-400">Missed Revenue</span>
                      <span className="text-lg font-bold text-rose-600 dark:text-rose-400">
                        {formatCurrency(Math.abs(insight.reasoning.projections.ifIgnored.revenue || 0))}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <div>
                        <div className="text-[11px] text-gray-600 dark:text-gray-400 mb-1 uppercase tracking-wide">Lost Profit</div>
                        <div className="text-base font-bold text-gray-900 dark:text-white">
                          {formatCurrency(Math.abs(insight.reasoning.projections.ifIgnored.profit || 0))}
                        </div>
                      </div>
                      <div>
                        <div className="text-[11px] text-gray-600 dark:text-gray-400 mb-1 uppercase tracking-wide">Lost Customers</div>
                        <div className="text-base font-bold text-gray-900 dark:text-white">
                          {Math.abs(insight.reasoning.projections.ifImplemented?.conversions || 0)}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </GlassCard>
            </div>
          </div>

          {/* Actions - Dynamic Grid */}
          <div>
            <SectionHeader title="Recommended Actions" icon={Zap} />
            <div className={`grid gap-3 ${
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
                      group relative overflow-hidden
                      flex flex-col items-start gap-2 px-5 py-4 text-left text-[13px]
                      bg-white/60 dark:bg-gray-800/60
                      backdrop-blur-xl
                      border ${isPrimary
                        ? 'border-rose-200/50 dark:border-rose-800/50 ring-2 ring-rose-500/20'
                        : isDestructive
                        ? 'border-rose-200/30 dark:border-rose-800/30'
                        : 'border-gray-200/50 dark:border-gray-700/50'
                      }
                      rounded-2xl font-medium
                      transition-all duration-300
                      disabled:opacity-50 disabled:cursor-not-allowed
                      shadow-sm hover:shadow-lg
                      hover:scale-[1.02]
                      hover:bg-white/70 dark:hover:bg-gray-800/70
                    `}
                  >
                    <div className="flex items-center gap-2 w-full">
                      <div className={`p-1.5 rounded-lg backdrop-blur-sm ${
                        isPrimary
                          ? 'bg-gradient-to-br from-rose-500 to-pink-500'
                          : isDestructive
                          ? 'bg-rose-100/80 dark:bg-rose-900/30'
                          : 'bg-gray-100/80 dark:bg-gray-700/80'
                      }`}>
                        <Icon className={`w-4 h-4 ${
                          isPrimary ? 'text-white' :
                          isDestructive ? 'text-rose-600 dark:text-rose-400' :
                          'text-gray-700 dark:text-gray-300'
                        }`} />
                      </div>
                      <span className={`font-semibold text-sm ${
                        isPrimary ? 'text-rose-600 dark:text-rose-400' : 'text-gray-900 dark:text-white'
                      }`}>{action.label}</span>
                      <ChevronRight className={`w-4 h-4 ml-auto transition-transform group-hover:translate-x-1 ${
                        isPrimary ? 'text-rose-600 dark:text-rose-400' : 'text-gray-400'
                      }`} />
                    </div>
                    <span className="text-gray-600 dark:text-gray-400 leading-tight">{action.description}</span>
                  </button>
                );
              })}
            </div>

            {/* Automated Rule */}
            {insight.recommendedRule && (
              <GlassCard className="p-5 mt-4 ring-1 ring-gray-200/50 dark:ring-gray-700/50">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-gray-100/80 dark:bg-gray-700/80 backdrop-blur-sm rounded-xl flex-shrink-0">
                    <Shield className="w-6 h-6 text-gray-700 dark:text-gray-300" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h5 className="text-base font-semibold text-gray-900 dark:text-white mb-2">
                      Automated Safeguard
                    </h5>
                    <p className="text-[13px] text-gray-600 dark:text-gray-400 mb-4 leading-relaxed">
                      {insight.recommendedRule.description}
                    </p>
                    <div className="bg-gray-50/50 dark:bg-gray-900/30 backdrop-blur-sm rounded-xl p-4 mb-4 border border-gray-200/30 dark:border-gray-700/30">
                      <div className="font-semibold text-gray-900 dark:text-white mb-3 text-[13px]">
                        {insight.recommendedRule.name}
                      </div>
                      <div className="grid grid-cols-3 gap-3 text-xs">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-gray-900 dark:text-white">{insight.recommendedRule.conditions.length}</div>
                          <div className="text-[11px] text-gray-600 dark:text-gray-400">Conditions</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-gray-900 dark:text-white">{insight.recommendedRule.actions.length}</div>
                          <div className="text-[11px] text-gray-600 dark:text-gray-400">Actions</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-gray-900 dark:text-white">{insight.recommendedRule.check_frequency_minutes / 60}h</div>
                          <div className="text-[11px] text-gray-600 dark:text-gray-400">Check Every</div>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={onCreateRule}
                      disabled={isProcessing}
                      className="group w-full flex items-center justify-center gap-2 px-5 py-3 text-[13px] bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white rounded-xl font-semibold transition-all disabled:opacity-50 shadow-lg hover:shadow-xl hover:scale-[1.02]"
                    >
                      <PlayCircle className="w-5 h-5" />
                      <span>Create This Rule</span>
                      <ArrowRight className="w-4 h-4 ml-auto group-hover:translate-x-1 transition-transform" />
                    </button>
                  </div>
                </div>
              </GlassCard>
            )}

            {/* Not Now Button */}
            <button
              onClick={() => onDismiss()}
              disabled={isProcessing}
              className="w-full mt-3 px-5 py-3 text-[13px] text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white bg-white/60 dark:bg-gray-800/60 hover:bg-white/80 dark:hover:bg-gray-800/80 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 hover:border-gray-300/50 dark:hover:border-gray-600/50 rounded-2xl font-medium transition-all disabled:opacity-50 shadow-sm hover:shadow-md"
            >
              Not Now
            </button>
          </div>

        </div>
      </div>
    </Modal>
  );
};
