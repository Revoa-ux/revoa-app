import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Pause,
  Copy,
  Users,
  MapPin,
  Clock,
  Smartphone,
  ShoppingBag,
  BarChart3,
  ChevronDown,
  ChevronUp,
  X,
  Zap,
  Shield,
  PlayCircle,
  DollarSign,
  Target,
  Award,
  ArrowRight
} from 'lucide-react';
import type { GeneratedInsight } from '@/lib/rexInsightGenerator';

interface ComprehensiveIntelligentDropdownProps {
  insight: GeneratedInsight;
  entityName: string;
  platform: string;
  onExecuteAction: (actionType: string, parameters: any) => Promise<void>;
  onCreateRule: () => Promise<void>;
  onDismiss: (reason?: string) => Promise<void>;
  onClose: () => void;
}

export const ComprehensiveIntelligentDropdown: React.FC<ComprehensiveIntelligentDropdownProps> = ({
  insight,
  entityName,
  platform,
  onExecuteAction,
  onCreateRule,
  onDismiss,
  onClose
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showMethodology, setShowMethodology] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    setTimeout(() => setIsExpanded(true), 10);
  }, []);

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

  // Get urgency color
  const getUrgencyColor = () => {
    if (insight.priority >= 90) return 'text-red-600 dark:text-red-400';
    if (insight.priority >= 75) return 'text-orange-600 dark:text-orange-400';
    return 'text-yellow-600 dark:text-yellow-400';
  };

  const getUrgencyBgColor = () => {
    if (insight.priority >= 90) return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
    if (insight.priority >= 75) return 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800';
    return 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800';
  };

  return (
    <div
      className={`transition-all duration-300 ease-in-out ${
        isExpanded ? 'max-h-[2000px] opacity-100 overflow-visible' : 'max-h-0 opacity-0 overflow-hidden'
      }`}
    >
      <div className="bg-white dark:bg-dark border-x border-b border-gray-200 dark:border-[#3a3a3a]">

        {/* SECTION A: Enhanced Intelligence Header with Net Gain Summary */}
        <div className="px-6 py-6 border-b border-gray-200 dark:border-[#3a3a3a] bg-gradient-to-br from-gray-50 to-white dark:from-[#2a2a2a] dark:to-[#2a2a2a]">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-5 h-5 text-red-600 dark:text-red-400" />
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  High-Priority Optimization Opportunity Detected
                </h3>
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                {entityName} • {platform.charAt(0).toUpperCase() + platform.slice(1)} • Last {insight.reasoning.dateRange?.start && insight.reasoning.dateRange?.end ?
                  `${Math.ceil((new Date(insight.reasoning.dateRange.end).getTime() - new Date(insight.reasoning.dateRange.start).getTime()) / (1000 * 60 * 60 * 24))} days` :
                  '30 days'}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-500">
                Analyzed {formatNumber(insight.reasoning.dataPointsAnalyzed || 0)} data points • {insight.confidence}% confidence
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#3a3a3a] rounded-lg transition-colors flex-shrink-0"
              aria-label="Close insight"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Net Gain Summary - The "Why You Should Care" Section */}
          <div className={`rounded-xl border-2 p-4 ${getUrgencyBgColor()}`}>
            <div className="flex items-center gap-2 mb-3">
              <Target className={`w-5 h-5 ${getUrgencyColor()}`} />
              <h4 className="text-base font-bold text-gray-900 dark:text-white">Projected Net Gain</h4>
              <span className={`text-xs font-semibold px-2 py-1 rounded-full bg-white dark:bg-dark ${getUrgencyColor()}`}>
                {insight.priority >= 90 ? 'CRITICAL' : insight.priority >= 75 ? 'HIGH' : 'MEDIUM'} PRIORITY
              </span>
            </div>
            <div className="grid grid-cols-4 gap-3">
              <div className="text-center">
                <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Additional Revenue</div>
                <div className="text-lg font-bold text-green-700 dark:text-green-400">
                  +{formatCurrency(netGainRevenue)}
                </div>
              </div>
              <div className="text-center">
                <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Additional Profit</div>
                <div className="text-lg font-bold text-green-700 dark:text-green-400">
                  +{formatCurrency(netGainProfit)}
                </div>
              </div>
              <div className="text-center">
                <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">ROAS Improvement</div>
                <div className="text-lg font-bold text-blue-700 dark:text-blue-400">
                  +{netGainROAS.toFixed(1)}x
                </div>
              </div>
              <div className="text-center">
                <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">New Customers</div>
                <div className="text-lg font-bold text-purple-700 dark:text-purple-400">
                  +{formatNumber(netGainConversions)}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION B: Primary Insight Analysis - Enhanced */}
        <div className="px-6 py-5 border-b border-gray-200 dark:border-[#3a3a3a] bg-blue-50/30 dark:bg-blue-900/10">
          <div className="flex items-center gap-2 mb-4">
            <Award className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h4 className="text-base font-bold text-gray-900 dark:text-white">What Rex Found</h4>
          </div>
          <div className="space-y-3 text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
            {insight.analysisParagraphs.map((paragraph, idx) => (
              <p key={idx} className="pl-4 border-l-2 border-blue-300 dark:border-blue-700">{paragraph}</p>
            ))}
          </div>
        </div>

        {/* SECTION C: Supporting Data Grid - Enhanced with better spacing */}
        <div className="px-6 py-5 border-b border-gray-200 dark:border-[#3a3a3a]">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5 text-gray-700 dark:text-gray-300" />
            <h4 className="text-base font-bold text-gray-900 dark:text-white">Supporting Evidence</h4>
          </div>
          <div className="grid grid-cols-3 gap-4">

            {/* Row 1 */}
            <div className="bg-gradient-to-br from-blue-50 to-white dark:from-blue-900/20 dark:to-[#1f1f1f]/50 rounded-lg p-4 border border-blue-200 dark:border-blue-800 hover:shadow-lg transition-all duration-200">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 bg-blue-100 dark:bg-blue-900/50 rounded">
                  <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                </div>
                <h5 className="text-sm font-bold text-gray-900 dark:text-white">Demographics</h5>
              </div>
              <div className="space-y-2">
                {demographics.slice(0, 3).map((demo: any, idx) => (
                  <div key={idx} className="text-xs bg-white dark:bg-dark rounded p-2 border border-gray-200 dark:border-[#3a3a3a]">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-semibold text-gray-900 dark:text-white truncate">{demo.segment}</span>
                      <span className="text-green-600 dark:text-green-400 font-bold text-sm">{demo.roas?.toFixed(1)}x</span>
                    </div>
                    <div className="text-gray-600 dark:text-gray-400 text-[11px]">
                      ${demo.cpa?.toFixed(2)} CPA • {demo.conversions} conv • {((demo.contribution / 100) * 100).toFixed(0)}% revenue
                    </div>
                  </div>
                ))}
                {demographics.length === 0 && (
                  <p className="text-xs text-gray-500">No demographic data available</p>
                )}
              </div>
            </div>

            <div className="bg-gradient-to-br from-cyan-50 to-white dark:from-cyan-900/20 dark:to-[#1f1f1f]/50 rounded-lg p-4 border border-cyan-200 dark:border-cyan-800 hover:shadow-lg transition-all duration-200">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 bg-cyan-100 dark:bg-cyan-900/50 rounded">
                  <Smartphone className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                </div>
                <h5 className="text-sm font-bold text-gray-900 dark:text-white">Placements & Devices</h5>
              </div>
              <div className="space-y-2">
                {placements.slice(0, 3).map((placement: any, idx) => (
                  <div key={idx} className="text-xs bg-white dark:bg-dark rounded p-2 border border-gray-200 dark:border-[#3a3a3a]">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-semibold text-gray-900 dark:text-white truncate">{placement.placement}</span>
                      <span className="text-green-600 dark:text-green-400 font-bold text-sm">{placement.roas?.toFixed(1)}x</span>
                    </div>
                    <div className="text-gray-600 dark:text-gray-400 text-[11px]">
                      {placement.conversions} conv • {((placement.contribution / 100) * 100).toFixed(0)}% revenue
                    </div>
                  </div>
                ))}
                {placements.length === 0 && (
                  <p className="text-xs text-gray-500">No placement data available</p>
                )}
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-white dark:from-green-900/20 dark:to-[#1f1f1f]/50 rounded-lg p-4 border border-green-200 dark:border-green-800 hover:shadow-lg transition-all duration-200">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 bg-green-100 dark:bg-green-900/50 rounded">
                  <MapPin className="w-4 h-4 text-green-600 dark:text-green-400" />
                </div>
                <h5 className="text-sm font-bold text-gray-900 dark:text-white">Geographic Performance</h5>
              </div>
              <div className="space-y-2">
                {geographic.slice(0, 3).map((geo: any, idx) => (
                  <div key={idx} className="text-xs bg-white dark:bg-dark rounded p-2 border border-gray-200 dark:border-[#3a3a3a]">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-semibold text-gray-900 dark:text-white truncate">{geo.region}</span>
                      <span className="text-green-600 dark:text-green-400 font-bold text-sm">{geo.roas?.toFixed(1)}x</span>
                    </div>
                    <div className="text-gray-600 dark:text-gray-400 text-[11px]">
                      ${geo.averageOrderValue?.toFixed(0)} AOV • {geo.conversions} conv
                    </div>
                  </div>
                ))}
                {geographic.length === 0 && (
                  <p className="text-xs text-gray-500">No geographic data available</p>
                )}
              </div>
            </div>

            {/* Row 2 */}
            <div className="bg-gradient-to-br from-orange-50 to-white dark:from-orange-900/20 dark:to-[#1f1f1f]/50 rounded-lg p-4 border border-orange-200 dark:border-orange-800 hover:shadow-lg transition-all duration-200">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 bg-orange-100 dark:bg-orange-900/50 rounded">
                  <Clock className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                </div>
                <h5 className="text-sm font-bold text-gray-900 dark:text-white">Best Times to Advertise</h5>
              </div>
              <div className="space-y-2">
                {temporal.slice(0, 3).map((time: any, idx) => (
                  <div key={idx} className="text-xs bg-white dark:bg-dark rounded p-2 border border-gray-200 dark:border-[#3a3a3a]">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-semibold text-gray-900 dark:text-white truncate">{time.period}</span>
                      <span className="text-green-600 dark:text-green-400 font-bold text-sm">{time.roas?.toFixed(1)}x</span>
                    </div>
                    <div className="text-gray-600 dark:text-gray-400 text-[11px]">
                      {time.conversions} conv • {((time.contribution / 100) * 100).toFixed(0)}% revenue
                    </div>
                  </div>
                ))}
                {temporal.length === 0 && (
                  <p className="text-xs text-gray-500">No temporal data available</p>
                )}
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-white dark:from-purple-900/20 dark:to-[#1f1f1f]/50 rounded-lg p-4 border border-purple-200 dark:border-purple-800 hover:shadow-lg transition-all duration-200">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 bg-purple-100 dark:bg-purple-900/50 rounded">
                  <ShoppingBag className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                </div>
                <h5 className="text-sm font-bold text-gray-900 dark:text-white">Customer Insights</h5>
              </div>
              {customerBehavior ? (
                <div className="space-y-2">
                  <div className="text-xs bg-white dark:bg-dark rounded p-2 border border-gray-200 dark:border-[#3a3a3a]">
                    <div className="flex justify-between mb-1">
                      <span className="font-semibold text-gray-900 dark:text-white">First-time buyers</span>
                      <span className="font-bold text-purple-700 dark:text-purple-400 text-sm">
                        {((customerBehavior.newVsReturning.new.conversions / (customerBehavior.newVsReturning.new.conversions + customerBehavior.newVsReturning.returning.conversions)) * 100).toFixed(0)}%
                      </span>
                    </div>
                    <div className="text-gray-600 dark:text-gray-400 text-[11px]">
                      ${customerBehavior.newVsReturning.new.averageOrderValue?.toFixed(2)} AOV • ${customerBehavior.newVsReturning.new.cpa?.toFixed(2)} CPA
                    </div>
                  </div>
                  <div className="text-xs bg-white dark:bg-dark rounded p-2 border border-gray-200 dark:border-[#3a3a3a]">
                    <div className="flex justify-between mb-1">
                      <span className="font-semibold text-gray-900 dark:text-white">Repeat customers</span>
                      <span className="font-bold text-purple-700 dark:text-purple-400 text-sm">
                        {((customerBehavior.newVsReturning.returning.conversions / (customerBehavior.newVsReturning.new.conversions + customerBehavior.newVsReturning.returning.conversions)) * 100).toFixed(0)}%
                      </span>
                    </div>
                    <div className="text-gray-600 dark:text-gray-400 text-[11px]">
                      ${customerBehavior.newVsReturning.returning.averageOrderValue?.toFixed(2)} AOV • ${customerBehavior.newVsReturning.returning.cpa?.toFixed(2)} CPA
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-gray-500">No customer data available</p>
              )}
            </div>

            <div className="bg-gradient-to-br from-gray-50 to-white dark:from-[#1f1f1f]/50 dark:to-[#1f1f1f]/50 rounded-lg p-4 border border-gray-300 dark:border-[#3a3a3a] hover:shadow-lg transition-all duration-200">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 bg-gray-200 dark:bg-dark rounded">
                  <BarChart3 className="w-4 h-4 text-gray-700 dark:text-gray-300" />
                </div>
                <h5 className="text-sm font-bold text-gray-900 dark:text-white">AI Analysis Quality</h5>
              </div>
              <div className="space-y-3">
                <div className="bg-white dark:bg-dark rounded p-3 border border-gray-200 dark:border-[#3a3a3a]">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs text-gray-600 dark:text-gray-400">Confidence</span>
                    <span className="text-2xl font-bold text-gray-900 dark:text-white">{insight.confidence}%</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-[#3a3a3a] rounded-full h-2">
                    <div
                      className="bg-green-600 h-2 rounded-full transition-all"
                      style={{ width: `${insight.confidence}%` }}
                    />
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {insight.confidence >= 90 ? 'Very High' : insight.confidence >= 80 ? 'High' : 'Moderate'}
                  </div>
                </div>
                <div className="bg-white dark:bg-dark rounded p-3 border border-gray-200 dark:border-[#3a3a3a]">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs text-gray-600 dark:text-gray-400">Priority</span>
                    <span className="text-2xl font-bold text-gray-900 dark:text-white">{insight.priority}</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-[#3a3a3a] rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        insight.priority >= 90 ? 'bg-red-600' :
                        insight.priority >= 75 ? 'bg-orange-600' : 'bg-yellow-600'
                      }`}
                      style={{ width: `${insight.priority}%` }}
                    />
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {insight.priority >= 90 ? 'Critical' : insight.priority >= 75 ? 'High' : 'Medium'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION D: Enhanced Financial Impact Model */}
        <div className="px-6 py-5 border-b border-gray-200 dark:border-[#3a3a3a] bg-gradient-to-br from-gray-50 to-white dark:from-[#1f1f1f] dark:to-[#2a2a2a]">
          <div className="flex items-center gap-2 mb-4">
            <DollarSign className="w-5 h-5 text-gray-700 dark:text-gray-300" />
            <h4 className="text-base font-bold text-gray-900 dark:text-white">Financial Impact Projection</h4>
            <span className="text-xs text-gray-500 dark:text-gray-400 ml-auto">
              {insight.reasoning.projections?.ifImplemented?.timeframe || '30 days'}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-5">
            <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-900/20 rounded-xl p-5 border-2 border-green-300 dark:border-green-700 shadow-md">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 bg-green-600 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-white" />
                </div>
                <span className="text-base font-bold text-green-900 dark:text-green-100">If Implemented</span>
              </div>
              {insight.reasoning.projections?.ifImplemented ? (
                <div className="space-y-3">
                  <div className="bg-white dark:bg-dark rounded-lg p-3 border border-green-200 dark:border-green-800">
                    <div className="flex justify-between items-baseline">
                      <span className="text-xs text-green-700 dark:text-green-400">Revenue</span>
                      <span className="text-lg font-bold text-green-700 dark:text-green-300">
                        +{formatCurrency(insight.reasoning.projections.ifImplemented.revenue || 0)}
                      </span>
                    </div>
                  </div>
                  <div className="bg-white dark:bg-dark rounded-lg p-3 border border-green-200 dark:border-green-800">
                    <div className="flex justify-between items-baseline">
                      <span className="text-xs text-green-700 dark:text-green-400">Profit</span>
                      <span className="text-lg font-bold text-green-700 dark:text-green-300">
                        +{formatCurrency(insight.reasoning.projections.ifImplemented.profit || 0)}
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-white dark:bg-dark rounded-lg p-3 border border-green-200 dark:border-green-800">
                      <div className="text-xs text-green-700 dark:text-green-400 mb-1">ROAS</div>
                      <div className="text-base font-bold text-green-700 dark:text-green-300">
                        {insight.reasoning.projections.ifImplemented.roas?.toFixed(1)}x
                      </div>
                    </div>
                    <div className="bg-white dark:bg-dark rounded-lg p-3 border border-green-200 dark:border-green-800">
                      <div className="text-xs text-green-700 dark:text-green-400 mb-1">Customers</div>
                      <div className="text-base font-bold text-green-700 dark:text-green-300">
                        +{insight.reasoning.projections.ifImplemented.conversions || 0}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-green-600">Impact data unavailable</p>
              )}
            </div>

            <div className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/30 dark:to-red-900/20 rounded-xl p-5 border-2 border-red-300 dark:border-red-700 shadow-md">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 bg-red-600 rounded-lg">
                  <TrendingDown className="w-5 h-5 text-white" />
                </div>
                <span className="text-base font-bold text-red-900 dark:text-red-100">If Ignored</span>
              </div>
              {insight.reasoning.projections?.ifIgnored ? (
                <div className="space-y-3">
                  <div className="bg-white dark:bg-dark rounded-lg p-3 border border-red-200 dark:border-red-800">
                    <div className="flex justify-between items-baseline">
                      <span className="text-xs text-red-700 dark:text-red-400">Wasted Spend</span>
                      <span className="text-lg font-bold text-red-700 dark:text-red-300">
                        -{formatCurrency(Math.abs(insight.reasoning.projections.ifIgnored.spend || 0))}
                      </span>
                    </div>
                  </div>
                  <div className="bg-white dark:bg-dark rounded-lg p-3 border border-red-200 dark:border-red-800">
                    <div className="flex justify-between items-baseline">
                      <span className="text-xs text-red-700 dark:text-red-400">Missed Revenue</span>
                      <span className="text-lg font-bold text-red-700 dark:text-red-300">
                        -{formatCurrency(Math.abs(insight.reasoning.projections.ifIgnored.revenue || 0))}
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-white dark:bg-dark rounded-lg p-3 border border-red-200 dark:border-red-800">
                      <div className="text-xs text-red-700 dark:text-red-400 mb-1">Lost Profit</div>
                      <div className="text-base font-bold text-red-700 dark:text-red-300">
                        -{formatCurrency(Math.abs(insight.reasoning.projections.ifIgnored.profit || 0))}
                      </div>
                    </div>
                    <div className="bg-white dark:bg-dark rounded-lg p-3 border border-red-200 dark:border-red-800">
                      <div className="text-xs text-red-700 dark:text-red-400 mb-1">Lost Customers</div>
                      <div className="text-base font-bold text-red-700 dark:text-red-300">
                        -{Math.abs(insight.reasoning.projections.ifImplemented?.conversions || 0)}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-red-600">Risk data unavailable</p>
              )}
            </div>
          </div>
          {insight.reasoning.methodology && (
            <div className="mt-3">
              <button
                onClick={() => setShowMethodology(!showMethodology)}
                className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              >
                <ChevronDown className={`w-3 h-3 transition-transform ${showMethodology ? 'rotate-180' : ''}`} />
                <span>Methodology</span>
              </button>
              {showMethodology && (
                <p className="mt-2 text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                  {insight.reasoning.methodology}
                </p>
              )}
            </div>
          )}
        </div>

        {/* SECTION E: Enhanced Action Buttons with Contextual Colors */}
        <div className="px-6 py-5 bg-gray-50 dark:bg-dark/30">
          <div className="space-y-4">
            {/* Direct Actions */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Zap className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                <h4 className="text-base font-bold text-gray-900 dark:text-white">Take Action Now</h4>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {insight.directActions.slice(0, 3).map((action, idx) => {
                  const Icon = action.type === 'increase_budget' ? TrendingUp :
                              action.type === 'decrease_budget' ? TrendingDown :
                              action.type === 'pause' ? Pause :
                              action.type === 'duplicate' ? Copy :
                              Zap;

                  // Contextual colors based on action type
                  const buttonColors = action.type === 'increase_budget'
                    ? 'bg-gradient-to-br from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 border-green-500'
                    : action.type === 'decrease_budget'
                    ? 'bg-gradient-to-br from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 border-orange-500'
                    : action.type === 'pause'
                    ? 'bg-gradient-to-br from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 border-red-500'
                    : action.type === 'duplicate'
                    ? 'bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 border-blue-500'
                    : 'bg-gradient-to-br from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 border-purple-500';

                  return (
                    <button
                      key={idx}
                      onClick={() => handleAction(action.type, action.parameters)}
                      disabled={isProcessing}
                      className={`group flex flex-col items-start gap-2 px-4 py-4 text-left text-sm ${buttonColors} text-white rounded-xl font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl hover:scale-105 border-2`}
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
            </div>

            {/* Enhanced Automated Rule Card */}
            {insight.recommendedRule && (
              <div className="bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-900/30 dark:to-amber-900/20 rounded-xl p-5 border-2 border-orange-300 dark:border-orange-700 shadow-md">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-orange-600 rounded-xl flex-shrink-0">
                    <Shield className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h5 className="text-base font-bold text-orange-900 dark:text-orange-100 mb-2">
                      Recommended Safeguard Rule
                    </h5>
                    <p className="text-sm text-orange-800 dark:text-orange-300 mb-4 leading-relaxed">
                      {insight.recommendedRule.description}
                    </p>
                    <div className="bg-white dark:bg-dark rounded-lg p-4 mb-4 border border-orange-200 dark:border-orange-800">
                      <div className="font-bold text-gray-900 dark:text-white mb-3 text-sm">
                        {insight.recommendedRule.name}
                      </div>
                      <div className="grid grid-cols-3 gap-3 text-xs">
                        <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-2 border border-orange-200 dark:border-orange-800">
                          <div className="text-orange-700 dark:text-orange-400 mb-1">Conditions</div>
                          <div className="text-lg font-bold text-gray-900 dark:text-white">{insight.recommendedRule.conditions.length}</div>
                          <div className="text-[10px] text-gray-600 dark:text-gray-400">checks</div>
                        </div>
                        <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-2 border border-orange-200 dark:border-orange-800">
                          <div className="text-orange-700 dark:text-orange-400 mb-1">Actions</div>
                          <div className="text-lg font-bold text-gray-900 dark:text-white">{insight.recommendedRule.actions.length}</div>
                          <div className="text-[10px] text-gray-600 dark:text-gray-400">automated</div>
                        </div>
                        <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-2 border border-orange-200 dark:border-orange-800">
                          <div className="text-orange-700 dark:text-orange-400 mb-1">Check Every</div>
                          <div className="text-lg font-bold text-gray-900 dark:text-white">{insight.recommendedRule.check_frequency_minutes / 60}</div>
                          <div className="text-[10px] text-gray-600 dark:text-gray-400">hours</div>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={onCreateRule}
                      disabled={isProcessing}
                      className="group w-full flex items-center justify-center gap-2 px-6 py-3 text-sm bg-gradient-to-br from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white rounded-xl font-bold transition-all disabled:opacity-50 shadow-lg hover:shadow-xl hover:scale-105 border-2 border-orange-500"
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
              className="w-full px-6 py-3 text-sm text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white bg-white dark:bg-dark hover:bg-gray-100 dark:hover:bg-[#3a3a3a] border-2 border-gray-300 dark:border-[#4a4a4a] hover:border-gray-400 dark:hover:border-gray-500 rounded-xl font-semibold transition-all disabled:opacity-50 shadow-sm hover:shadow-md"
            >
              Not Now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
