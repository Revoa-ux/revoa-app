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
  Activity,
  Crosshair,
  LayoutGrid,
  Link2,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import Modal from '@/components/Modal';
import { RexCharacter } from './RexCharacter';
import { RexFlowDiagram } from './RexFlowDiagram';
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
  const [viewMode, setViewMode] = useState<'conversation' | 'simple' | 'detailed'>('conversation');

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

  // Determine bot's emotion based on insight type
  const isPrimaryActionProtective = insight.directActions[0]?.type === 'pause' || insight.directActions[0]?.type === 'decrease_budget';
  const isScaling = insight.directActions[0]?.type === 'increase_budget' || insight.directActions[0]?.type === 'duplicate';

  const rexEmotion = isPrimaryActionProtective ? 'concerned' : isScaling ? 'excited' : 'thoughtful';

  // Determine dynamic title
  const getInsightTitle = () => {
    if (isPrimaryActionProtective) return 'Revoa AI detected a performance issue';
    if (isScaling) return 'Revoa AI found a winning opportunity';
    return 'Revoa AI spotted an optimization';
  };

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
    <div className={`bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 hover:shadow-lg transition-all duration-200 ${highlight ? 'ring-2 ring-rose-500/30' : ''}`}>
      <div className="flex items-center gap-2.5 mb-3">
        <Icon className="w-4 h-4 text-gray-500 dark:text-gray-400" />
        <h5 className="text-sm font-semibold text-gray-900 dark:text-white truncate">{title}</h5>
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
      {/* Revoa Bot Character - positioned outside modal */}
      {isOpen && (
        <div className="fixed left-8 top-1/2 -translate-y-1/2 z-50 hidden lg:block pointer-events-none">
          <RexCharacter emotion={rexEmotion} />

          {/* Connection line from bot to modal */}
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
                  {/* Small bot avatar in header for mobile */}
                  <div className="lg:hidden">
                    <img
                      src="/Revoa-Bot.gif"
                      alt="Revoa AI Bot"
                      className="w-10 h-10 object-contain"
                    />
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
                    onClick={() => setViewMode('conversation')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                      viewMode === 'conversation'
                        ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    Conversation
                  </button>
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
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors bg-gray-100 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          <div className="px-6 py-5 space-y-6">

            {/* Conversation View */}
            {viewMode === 'conversation' && (
              <div className="space-y-4">
                {/* AI Message - Primary Insight */}
                <div className="flex gap-4">
                  <div className="flex-shrink-0 pt-1">
                    <img
                      src="/Revoa-AI-Bot.png"
                      alt="Revoa AI"
                      className="w-10 h-10 object-contain"
                    />
                  </div>
                  <div className="flex-1">
                    <div className="bg-gradient-to-br from-rose-50 to-orange-50 dark:from-rose-950/20 dark:to-orange-950/20 border border-rose-200 dark:border-rose-800 rounded-2xl rounded-tl-sm p-5">
                      <p className="text-base text-gray-900 dark:text-white leading-relaxed">
                        {insight.primaryInsight}
                      </p>
                    </div>
                  </div>
                </div>

                {/* AI Message - Analysis */}
                {insight.analysisParagraphs && insight.analysisParagraphs.length > 0 && (
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 pt-1">
                      <img
                        src="/Revoa-AI-Bot.png"
                        alt="Revoa AI"
                        className="w-10 h-10 object-contain"
                      />
                    </div>
                    <div className="flex-1">
                      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl rounded-tl-sm p-5 space-y-3">
                        {insight.analysisParagraphs.map((paragraph, idx) => (
                          <p key={idx} className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                            {paragraph}
                          </p>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* AI Message - Data Highlights */}
                {(demographics.length > 0 || geographic.length > 0 || placements.length > 0) && (
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 pt-1">
                      <img
                        src="/Revoa-AI-Bot.png"
                        alt="Revoa AI"
                        className="w-10 h-10 object-contain"
                      />
                    </div>
                    <div className="flex-1">
                      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl rounded-tl-sm p-5">
                        <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                          Here's what stood out in the data:
                        </p>
                        <div className="space-y-3">
                          {demographics.slice(0, 1).map((demo: any, idx) => (
                            <div key={idx} className="bg-gradient-to-r from-rose-50/50 to-transparent dark:from-rose-950/20 border-l-2 border-rose-500 pl-4 py-2">
                              <div className="flex items-center gap-2 mb-1">
                                <Users className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                                <span className="font-semibold text-gray-900 dark:text-white text-sm">{demo.segment}</span>
                              </div>
                              <div className="flex gap-4 text-xs text-gray-600 dark:text-gray-400">
                                <span>{demo.roas?.toFixed(1)}x ROAS</span>
                                <span>•</span>
                                <span>{formatCurrency(demo.revenue || 0)} revenue</span>
                                <span>•</span>
                                <span>{demo.conversions} conversions</span>
                              </div>
                            </div>
                          ))}
                          {geographic.slice(0, 1).map((geo: any, idx) => (
                            <div key={idx} className="bg-gradient-to-r from-blue-50/50 to-transparent dark:from-blue-950/20 border-l-2 border-blue-500 pl-4 py-2">
                              <div className="flex items-center gap-2 mb-1">
                                <MapPin className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                <span className="font-semibold text-gray-900 dark:text-white text-sm">{geo.region}</span>
                              </div>
                              <div className="flex gap-4 text-xs text-gray-600 dark:text-gray-400">
                                <span>{geo.roas?.toFixed(1)}x ROAS</span>
                                <span>•</span>
                                <span>{formatCurrency(geo.averageOrderValue || 0)} AOV</span>
                                <span>•</span>
                                <span>{geo.conversions} conversions</span>
                              </div>
                            </div>
                          ))}
                          {placements.slice(0, 1).map((placement: any, idx) => (
                            <div key={idx} className="bg-gradient-to-r from-purple-50/50 to-transparent dark:from-purple-950/20 border-l-2 border-purple-500 pl-4 py-2">
                              <div className="flex items-center gap-2 mb-1">
                                <Smartphone className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                                <span className="font-semibold text-gray-900 dark:text-white text-sm">{placement.placement}</span>
                              </div>
                              <div className="flex gap-4 text-xs text-gray-600 dark:text-gray-400">
                                <span>{placement.roas?.toFixed(1)}x ROAS</span>
                                <span>•</span>
                                <span>{placement.conversions} conversions</span>
                                <span>•</span>
                                <span>{formatCurrency(placement.cpa || 0)} CPA</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* AI Message - Projections */}
                {insight.reasoning.projections && (
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 pt-1">
                      <img
                        src="/Revoa-AI-Bot.png"
                        alt="Revoa AI"
                        className="w-10 h-10 object-contain"
                      />
                    </div>
                    <div className="flex-1">
                      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl rounded-tl-sm p-5">
                        <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                          Based on this data, here's what I project over the next 30 days:
                        </p>
                        <div className="grid grid-cols-3 gap-4">
                          <div className="text-center p-3 bg-green-50 dark:bg-green-900/10 rounded-lg border border-green-200 dark:border-green-800">
                            <div className="text-xs text-green-600 dark:text-green-400 font-medium mb-1">Revenue Gain</div>
                            <div className="text-lg font-bold text-green-700 dark:text-green-300">
                              {formatCurrency(netGainRevenue)}
                            </div>
                          </div>
                          <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/10 rounded-lg border border-blue-200 dark:border-blue-800">
                            <div className="text-xs text-blue-600 dark:text-blue-400 font-medium mb-1">Profit Gain</div>
                            <div className="text-lg font-bold text-blue-700 dark:text-blue-300">
                              {formatCurrency(netGainProfit)}
                            </div>
                          </div>
                          <div className="text-center p-3 bg-purple-50 dark:bg-purple-900/10 rounded-lg border border-purple-200 dark:border-purple-800">
                            <div className="text-xs text-purple-600 dark:text-purple-400 font-medium mb-1">New Conversions</div>
                            <div className="text-lg font-bold text-purple-700 dark:text-purple-300">
                              +{formatNumber(netGainConversions)}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* AI Message - Recommended Action */}
                {insight.directActions && insight.directActions.length > 0 && (
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 pt-1">
                      <img
                        src="/Revoa-AI-Bot.png"
                        alt="Revoa AI"
                        className="w-10 h-10 object-contain"
                      />
                    </div>
                    <div className="flex-1">
                      <div className="bg-gradient-to-br from-rose-50 to-orange-50 dark:from-rose-950/20 dark:to-orange-950/20 border border-rose-200 dark:border-rose-800 rounded-2xl rounded-tl-sm p-5">
                        <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                          Here's what I recommend you do:
                        </p>
                        <div className="space-y-3">
                          {insight.directActions.map((action, idx) => {
                            const Icon = action.type === 'increase_budget' ? TrendingUp :
                                        action.type === 'decrease_budget' ? TrendingDown :
                                        action.type === 'pause' ? Pause :
                                        action.type === 'duplicate' ? Copy :
                                        Zap;

                            const isPrimary = idx === 0;

                            return (
                              <button
                                key={idx}
                                onClick={() => handleAction(action.type, action.parameters)}
                                disabled={isProcessing}
                                className={`
                                  w-full flex items-center gap-3 p-4 text-left
                                  bg-white dark:bg-gray-800
                                  border-2 ${isPrimary ? 'border-rose-400 dark:border-rose-600' : 'border-gray-200 dark:border-gray-700'}
                                  rounded-xl
                                  hover:shadow-lg transition-all
                                  disabled:opacity-50 disabled:cursor-not-allowed
                                `}
                              >
                                <div className={`p-2 rounded-lg ${isPrimary ? 'bg-gradient-to-br from-rose-500 to-pink-500' : 'bg-gray-100 dark:bg-gray-700'}`}>
                                  <Icon className={`w-5 h-5 ${isPrimary ? 'text-white' : 'text-gray-600 dark:text-gray-300'}`} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className={`font-semibold ${isPrimary ? 'text-rose-600 dark:text-rose-400' : 'text-gray-900 dark:text-white'}`}>
                                    {action.label}
                                  </div>
                                  <div className="text-xs text-gray-600 dark:text-gray-400">
                                    {action.description}
                                  </div>
                                </div>
                                <ChevronRight className={`w-5 h-5 ${isPrimary ? 'text-rose-600 dark:text-rose-400' : 'text-gray-400'}`} />
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* AI Message - Automation Offer */}
                {insight.recommendedRule && (
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 pt-1">
                      <img
                        src="/Revoa-AI-Bot.png"
                        alt="Revoa AI"
                        className="w-10 h-10 object-contain"
                      />
                    </div>
                    <div className="flex-1">
                      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl rounded-tl-sm p-5">
                        <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                          Want me to watch for this automatically? I can create an automation rule to {isPrimaryActionProtective ? 'protect your budget if performance deteriorates' : isScaling ? 'scale similar opportunities automatically' : 'maintain optimal performance'}.
                        </p>
                        <button
                          onClick={onCreateRule}
                          disabled={isProcessing}
                          className="inline-flex items-center gap-2 px-4 py-2.5 text-sm bg-gray-900 dark:bg-white hover:bg-gray-800 dark:hover:bg-gray-100 text-white dark:text-gray-900 rounded-lg font-semibold transition-all disabled:opacity-50 shadow-sm hover:shadow-md"
                        >
                          <Zap className="w-4 h-4" />
                          <span>Create Automation Rule</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Data Visualization Views */}
            {viewMode !== 'conversation' && (
              <>
                {/* SIMPLE VIEW - Version 812 Style */}
                {viewMode === 'simple' && (
                  <div className="space-y-6">
                    {/* Primary Insight */}
                    <div className="bg-gradient-to-br from-rose-50 to-orange-50 dark:from-rose-950/20 dark:to-orange-950/20 border-2 border-rose-200 dark:border-rose-800 rounded-xl p-5">
                      <div className="flex items-start gap-3">
                        <Sparkles className="w-5 h-5 text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5" />
                        <p className="text-lg font-semibold text-gray-900 dark:text-white leading-relaxed">
                          {insight.primaryInsight}
                        </p>
                      </div>
                    </div>

                    {/* Quick Actions */}
                    <div>
                      <SectionHeader title="What you should do" icon={Zap} />
                      <div className="space-y-3">
                        {insight.directActions.slice(0, 2).map((action, idx) => {
                          const Icon = action.type === 'increase_budget' ? TrendingUp :
                                      action.type === 'decrease_budget' ? TrendingDown :
                                      action.type === 'pause' ? Pause :
                                      action.type === 'duplicate' ? Copy :
                                      Zap;

                          const isPrimary = idx === 0;

                          return (
                            <button
                              key={idx}
                              onClick={() => handleAction(action.type, action.parameters)}
                              disabled={isProcessing}
                              className={`
                                w-full flex items-center gap-4 p-4 text-left
                                bg-white dark:bg-gray-800
                                border-2 ${isPrimary ? 'border-rose-400 dark:border-rose-600' : 'border-gray-200 dark:border-gray-700'}
                                rounded-xl
                                hover:shadow-lg transition-all
                                disabled:opacity-50 disabled:cursor-not-allowed
                              `}
                            >
                              <div className={`p-2.5 rounded-lg ${isPrimary ? 'bg-gradient-to-br from-rose-500 to-pink-500' : 'bg-gray-100 dark:bg-gray-700'}`}>
                                <Icon className={`w-5 h-5 ${isPrimary ? 'text-white' : 'text-gray-600 dark:text-gray-300'}`} />
                              </div>
                              <div className="flex-1">
                                <div className={`font-bold mb-1 ${isPrimary ? 'text-rose-600 dark:text-rose-400' : 'text-gray-900 dark:text-white'}`}>
                                  {action.label}
                                </div>
                                <div className="text-sm text-gray-600 dark:text-gray-400">
                                  {action.description}
                                </div>
                              </div>
                              <ChevronRight className={`w-5 h-5 ${isPrimary ? 'text-rose-600 dark:text-rose-400' : 'text-gray-400'}`} />
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Key Metrics */}
                    {insight.reasoning.projections && (
                      <div>
                        <SectionHeader title="Expected Impact" icon={TrendingUp} />
                        <div className="grid grid-cols-3 gap-4">
                          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 text-center">
                            <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">Revenue Gain</div>
                            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                              {formatCurrency(netGainRevenue)}
                            </div>
                          </div>
                          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 text-center">
                            <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">Profit Gain</div>
                            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                              {formatCurrency(netGainProfit)}
                            </div>
                          </div>
                          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 text-center">
                            <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">Conversions</div>
                            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                              +{formatNumber(netGainConversions)}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* DETAILED VIEW */}
                {viewMode === 'detailed' && (
                  <div className="space-y-6">
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

                    {/* All Actions for Detailed View */}
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
            </div>

                    {/* Automation Offer for Detailed View */}
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
                  </div>
                )}
              </>
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
      </Modal>
    </>
  );
};
