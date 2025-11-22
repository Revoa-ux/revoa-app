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
  PlayCircle
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

  return (
    <div
      className={`transition-all duration-300 ease-in-out ${
        isExpanded ? 'max-h-[2000px] opacity-100 overflow-visible' : 'max-h-0 opacity-0 overflow-hidden'
      }`}
    >
      <div className="bg-white dark:bg-gray-800 border-x border-b border-gray-200 dark:border-gray-700">

        {/* SECTION A: Intelligence Header (No gradient, clean professional) */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                Rex discovered a high-priority optimization opportunity
              </h3>
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                {entityName} • {platform} • Last {insight.reasoning.dateRange?.start && insight.reasoning.dateRange?.end ?
                  `${Math.ceil((new Date(insight.reasoning.dateRange.end).getTime() - new Date(insight.reasoning.dateRange.start).getTime()) / (1000 * 60 * 60 * 24))} days` :
                  '30 days'}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-500">
                Analyzed {formatNumber(insight.reasoning.dataPointsAnalyzed || 0)} data points across demographics, placements, geographic, temporal, and customer behavior dimensions
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors flex-shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* SECTION B: Primary Insight Analysis (200px height) */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700" style={{ minHeight: '200px' }}>
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">The Pattern</h4>
          <div className="space-y-3 text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
            {insight.analysisParagraphs.map((paragraph, idx) => (
              <p key={idx}>{paragraph}</p>
            ))}
          </div>
        </div>

        {/* SECTION C: Supporting Data Grid (2x3 Compact Cards - 250px height) */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Supporting Evidence</h4>
          <div className="grid grid-cols-3 gap-3" style={{ height: '220px' }}>

            {/* Row 1 */}
            <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4 text-blue-600" />
                <h5 className="text-xs font-semibold text-gray-900 dark:text-white">Demographics</h5>
              </div>
              <div className="space-y-1.5">
                {demographics.slice(0, 3).map((demo: any, idx) => (
                  <div key={idx} className="text-xs">
                    <div className="flex justify-between items-center mb-0.5">
                      <span className="font-medium text-gray-900 dark:text-white truncate">{demo.segment}</span>
                      <span className="text-green-600 dark:text-green-400 font-semibold">{demo.roas?.toFixed(1)}x</span>
                    </div>
                    <div className="text-gray-600 dark:text-gray-400">
                      ${demo.cpa?.toFixed(2)} CPA • {demo.conversions} conv • {((demo.contribution / 100) * 100).toFixed(0)}% revenue
                    </div>
                  </div>
                ))}
                {demographics.length === 0 && (
                  <p className="text-xs text-gray-500">No demographic data available</p>
                )}
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2 mb-2">
                <Smartphone className="w-4 h-4 text-cyan-600" />
                <h5 className="text-xs font-semibold text-gray-900 dark:text-white">Placements & Devices</h5>
              </div>
              <div className="space-y-1.5">
                {placements.slice(0, 3).map((placement: any, idx) => (
                  <div key={idx} className="text-xs">
                    <div className="flex justify-between items-center mb-0.5">
                      <span className="font-medium text-gray-900 dark:text-white truncate">{placement.placement}</span>
                      <span className="text-green-600 dark:text-green-400 font-semibold">{placement.roas?.toFixed(1)}x</span>
                    </div>
                    <div className="text-gray-600 dark:text-gray-400">
                      {placement.conversions} conv • {((placement.contribution / 100) * 100).toFixed(0)}% revenue
                    </div>
                  </div>
                ))}
                {placements.length === 0 && (
                  <p className="text-xs text-gray-500">No placement data available</p>
                )}
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="w-4 h-4 text-green-600" />
                <h5 className="text-xs font-semibold text-gray-900 dark:text-white">Geographic Performance</h5>
              </div>
              <div className="space-y-1.5">
                {geographic.slice(0, 3).map((geo: any, idx) => (
                  <div key={idx} className="text-xs">
                    <div className="flex justify-between items-center mb-0.5">
                      <span className="font-medium text-gray-900 dark:text-white truncate">{geo.region}</span>
                      <span className="text-green-600 dark:text-green-400 font-semibold">{geo.roas?.toFixed(1)}x</span>
                    </div>
                    <div className="text-gray-600 dark:text-gray-400">
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
            <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-orange-600" />
                <h5 className="text-xs font-semibold text-gray-900 dark:text-white">Best Times to Advertise</h5>
              </div>
              <div className="space-y-1.5">
                {temporal.slice(0, 3).map((time: any, idx) => (
                  <div key={idx} className="text-xs">
                    <div className="flex justify-between items-center mb-0.5">
                      <span className="font-medium text-gray-900 dark:text-white truncate">{time.period}</span>
                      <span className="text-green-600 dark:text-green-400 font-semibold">{time.roas?.toFixed(1)}x</span>
                    </div>
                    <div className="text-gray-600 dark:text-gray-400">
                      {time.conversions} conv • {((time.contribution / 100) * 100).toFixed(0)}% revenue
                    </div>
                  </div>
                ))}
                {temporal.length === 0 && (
                  <p className="text-xs text-gray-500">No temporal data available</p>
                )}
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2 mb-2">
                <ShoppingBag className="w-4 h-4 text-purple-600" />
                <h5 className="text-xs font-semibold text-gray-900 dark:text-white">Customer Insights</h5>
              </div>
              {customerBehavior ? (
                <div className="space-y-1.5 text-xs">
                  <div>
                    <div className="flex justify-between mb-0.5">
                      <span className="text-gray-700 dark:text-gray-300">First-time buyers</span>
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {((customerBehavior.newVsReturning.new.conversions / (customerBehavior.newVsReturning.new.conversions + customerBehavior.newVsReturning.returning.conversions)) * 100).toFixed(0)}%
                      </span>
                    </div>
                    <div className="text-gray-600 dark:text-gray-400">
                      ${customerBehavior.newVsReturning.new.averageOrderValue?.toFixed(2)} AOV • ${customerBehavior.newVsReturning.new.cpa?.toFixed(2)} CPA
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between mb-0.5">
                      <span className="text-gray-700 dark:text-gray-300">Repeat customers</span>
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {((customerBehavior.newVsReturning.returning.conversions / (customerBehavior.newVsReturning.new.conversions + customerBehavior.newVsReturning.returning.conversions)) * 100).toFixed(0)}%
                      </span>
                    </div>
                    <div className="text-gray-600 dark:text-gray-400">
                      ${customerBehavior.newVsReturning.returning.averageOrderValue?.toFixed(2)} AOV • ${customerBehavior.newVsReturning.returning.cpa?.toFixed(2)} CPA
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-gray-500">No customer data available</p>
              )}
            </div>

            <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 className="w-4 h-4 text-gray-600" />
                <h5 className="text-xs font-semibold text-gray-900 dark:text-white">AI Analysis Quality</h5>
              </div>
              <div className="space-y-2">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs text-gray-600 dark:text-gray-400">Confidence</span>
                    <span className="text-lg font-bold text-gray-900 dark:text-white">{insight.confidence}%</span>
                  </div>
                  <div className="text-xs text-gray-500">
                    {insight.confidence >= 90 ? 'Very High' : insight.confidence >= 80 ? 'High' : 'Moderate'}
                  </div>
                </div>
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs text-gray-600 dark:text-gray-400">Priority</span>
                    <span className="text-lg font-bold text-gray-900 dark:text-white">{insight.priority}/100</span>
                  </div>
                  <div className="text-xs text-gray-500">
                    {insight.priority >= 90 ? 'Critical' : insight.priority >= 75 ? 'High' : 'Medium'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION D: Financial Impact Model (150px height) */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Financial Impact Projection</h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
                <span className="text-sm font-semibold text-green-700 dark:text-green-300">If Implemented</span>
              </div>
              {insight.reasoning.projections?.ifImplemented ? (
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-green-600 dark:text-green-400">Revenue</span>
                    <span className="font-semibold text-green-700 dark:text-green-300">
                      +{formatCurrency(insight.reasoning.projections.ifImplemented.revenue || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-green-600 dark:text-green-400">Profit</span>
                    <span className="font-semibold text-green-700 dark:text-green-300">
                      +{formatCurrency(insight.reasoning.projections.ifImplemented.profit || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-green-600 dark:text-green-400">ROAS</span>
                    <span className="font-semibold text-green-700 dark:text-green-300">
                      {insight.reasoning.projections.ifImplemented.roas?.toFixed(1)}x
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-green-600 dark:text-green-400">New customers</span>
                    <span className="font-semibold text-green-700 dark:text-green-300">
                      +{insight.reasoning.projections.ifImplemented.conversions || 0}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-green-600">Impact data unavailable</p>
              )}
            </div>

            <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 border border-red-200 dark:border-red-800">
              <div className="flex items-center gap-2 mb-2">
                <TrendingDown className="w-5 h-5 text-red-600 dark:text-red-400" />
                <span className="text-sm font-semibold text-red-700 dark:text-red-300">If Ignored</span>
              </div>
              {insight.reasoning.projections?.ifIgnored ? (
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-red-600 dark:text-red-400">Wasted spend</span>
                    <span className="font-semibold text-red-700 dark:text-red-300">
                      -{formatCurrency(Math.abs(insight.reasoning.projections.ifIgnored.spend || 0))}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-red-600 dark:text-red-400">Missed revenue</span>
                    <span className="font-semibold text-red-700 dark:text-red-300">
                      -{formatCurrency(Math.abs(insight.reasoning.projections.ifIgnored.revenue || 0))}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-red-600 dark:text-red-400">Lost profit</span>
                    <span className="font-semibold text-red-700 dark:text-red-300">
                      -{formatCurrency(Math.abs(insight.reasoning.projections.ifIgnored.profit || 0))}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-red-600 dark:text-red-400">Lost customers</span>
                    <span className="font-semibold text-red-700 dark:text-red-300">
                      -{Math.abs(insight.reasoning.projections.ifImplemented?.conversions || 0)}
                    </span>
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
                {showMethodology ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
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

        {/* SECTION E: Action Buttons with Context (100px height) */}
        <div className="px-6 py-4">
          <div className="space-y-3">
            {/* Direct Actions */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Take Action</h4>
              <div className="grid grid-cols-3 gap-2">
                {insight.directActions.slice(0, 3).map((action, idx) => {
                  const Icon = action.type === 'increase_budget' ? TrendingUp :
                              action.type === 'decrease_budget' ? TrendingDown :
                              action.type === 'pause' ? Pause :
                              action.type === 'duplicate' ? Copy :
                              Zap;

                  return (
                    <button
                      key={idx}
                      onClick={() => handleAction(action.type, action.parameters)}
                      disabled={isProcessing}
                      className="flex flex-col items-start gap-1 px-3 py-2 text-left text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4" />
                        <span className="font-semibold">{action.label}</span>
                      </div>
                      <span className="text-xs text-blue-100">{action.description}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Automated Rule Card */}
            {insight.recommendedRule && (
              <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-4 border border-amber-200 dark:border-amber-800">
                <div className="flex items-start gap-3">
                  <Shield className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <h5 className="text-sm font-semibold text-amber-900 dark:text-amber-100 mb-1">
                      Recommended Safeguard Rule
                    </h5>
                    <p className="text-sm text-amber-700 dark:text-amber-300 mb-2">
                      {insight.recommendedRule.description}
                    </p>
                    <div className="bg-white dark:bg-gray-800 rounded p-2 mb-3 text-xs font-mono">
                      <div className="font-semibold text-gray-900 dark:text-white mb-1">
                        {insight.recommendedRule.name}
                      </div>
                      <div className="text-gray-600 dark:text-gray-400 space-y-1">
                        <div>Conditions: {insight.recommendedRule.conditions.length} checks</div>
                        <div>Actions: {insight.recommendedRule.actions.length} automated responses</div>
                        <div>Check frequency: Every {insight.recommendedRule.check_frequency_minutes / 60} hours</div>
                      </div>
                    </div>
                    <button
                      onClick={onCreateRule}
                      disabled={isProcessing}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium transition-all disabled:opacity-50"
                    >
                      <PlayCircle className="w-4 h-4" />
                      <span>Create This Rule</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Dismiss Button */}
            <button
              onClick={() => onDismiss()}
              disabled={isProcessing}
              className="w-full px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white border border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 rounded-lg font-medium transition-all disabled:opacity-50"
            >
              Not Now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
