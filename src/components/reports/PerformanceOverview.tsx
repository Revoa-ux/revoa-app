import React, { useState, useEffect, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { DollarSign, TrendingUp, MousePointerClick, ShoppingCart, Target, Percent, Banknote, TrendingDown, Settings, Plus, Sparkles, Layers, ChevronDown, Info, ArrowRight, X } from 'lucide-react';
import { CustomizeMetricsModal } from '@/components/attribution/CustomizeMetricsModal';
import { MetricDefinition } from '@/components/attribution/MetricCard';
import FlippablePerformanceCard from './FlippablePerformanceCard';
import { supabase } from '@/lib/supabase';
import { PLATFORM_COLORS, PLATFORM_LABELS, type AdPlatform } from '@/types/crossPlatform';
import { toast } from '../../lib/toast';

interface Metric {
  name: string;
  value: number;
  change: number;
  data: Array<{
    date: string;
    value: number;
  }>;
}

type CrossPlatformMetricType = 'netProfit' | 'adSpend' | 'netRoas' | 'profitMargin';

interface PerformanceOverviewProps {
  metrics: {
    roas: Metric;
    cpa: Metric;
    ctr: Metric;
    spend: Metric;
    conversions: Metric;
    cvr: Metric;
    profit: Metric;
    netROAS: Metric;
  } | null;
  userId?: string;
  isLoading?: boolean;
  onOpenRexModal?: (filter?: 'cross_platform') => void;
}

const ALL_METRICS: MetricDefinition[] = [
  {
    id: 'roas',
    label: 'ROAS',
    icon: TrendingUp,
    iconColor: 'text-gray-600 dark:text-gray-400',
    iconBgColor: 'bg-gray-100 dark:bg-[#2a2a2a]',
    getValue: (m) => m?.roas?.value || 0,
  },
  {
    id: 'cpa',
    label: 'CPA',
    icon: Target,
    iconColor: 'text-gray-600 dark:text-gray-400',
    iconBgColor: 'bg-gray-100 dark:bg-[#2a2a2a]',
    format: 'currency',
    getValue: (m) => m?.cpa?.value || 0,
  },
  {
    id: 'ctr',
    label: 'CTR',
    icon: MousePointerClick,
    iconColor: 'text-gray-600 dark:text-gray-400',
    iconBgColor: 'bg-gray-100 dark:bg-[#2a2a2a]',
    format: 'percentage',
    getValue: (m) => m?.ctr?.value || 0,
  },
  {
    id: 'spend',
    label: 'Spend',
    icon: DollarSign,
    iconColor: 'text-gray-600 dark:text-gray-400',
    iconBgColor: 'bg-gray-100 dark:bg-[#2a2a2a]',
    format: 'currency',
    getValue: (m) => m?.spend?.value || 0,
  },
  {
    id: 'conversions',
    label: 'Conversions',
    icon: ShoppingCart,
    iconColor: 'text-gray-600 dark:text-gray-400',
    iconBgColor: 'bg-gray-100 dark:bg-[#2a2a2a]',
    format: 'number',
    getValue: (m) => m?.conversions?.value || 0,
  },
  {
    id: 'cvr',
    label: 'CVR',
    icon: Percent,
    iconColor: 'text-gray-600 dark:text-gray-400',
    iconBgColor: 'bg-gray-100 dark:bg-[#2a2a2a]',
    format: 'percentage',
    getValue: (m) => m?.cvr?.value || 0,
  },
  {
    id: 'profit',
    label: 'Profit',
    icon: Banknote,
    iconColor: 'text-gray-600 dark:text-gray-400',
    iconBgColor: 'bg-gray-100 dark:bg-[#2a2a2a]',
    format: 'currency',
    getValue: (m) => m?.profit?.value || 0,
    showInfoIcon: true,
  },
  {
    id: 'net_roas',
    label: 'Net ROAS',
    icon: TrendingDown,
    iconColor: 'text-gray-600 dark:text-gray-400',
    iconBgColor: 'bg-gray-100 dark:bg-[#2a2a2a]',
    getValue: (m) => m?.netROAS?.value || 0,
    showInfoIcon: true,
  },
];

const CROSS_PLATFORM_METRIC_OPTIONS: Array<{ id: CrossPlatformMetricType; label: string; format: 'currency' | 'number' | 'percentage' }> = [
  { id: 'netProfit', label: 'Net Profit', format: 'currency' },
  { id: 'adSpend', label: 'Ad Spend', format: 'currency' },
  { id: 'netRoas', label: 'Net ROAS', format: 'number' },
  { id: 'profitMargin', label: 'Profit Margin', format: 'percentage' },
];

export const PerformanceOverview: React.FC<PerformanceOverviewProps> = ({ metrics, userId, isLoading = false, onOpenRexModal }) => {
  const [showCustomizeModal, setShowCustomizeModal] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [visibleMetrics, setVisibleMetrics] = useState<string[]>(
    ALL_METRICS.map(m => m.id)
  );
  const [metricOrder, setMetricOrder] = useState<string[]>(
    ALL_METRICS.map(m => m.id)
  );
  const [draggedMetricId, setDraggedMetricId] = useState<string | null>(null);
  const [crossPlatformMetric, setCrossPlatformMetric] = useState<CrossPlatformMetricType>('netProfit');
  const [showMetricDropdown, setShowMetricDropdown] = useState(false);
  const [enabledPlatforms, setEnabledPlatforms] = useState<Set<AdPlatform>>(new Set(['facebook', 'google', 'tiktok']));
  const [isEditMode, setIsEditMode] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [originalMetricOrder, setOriginalMetricOrder] = useState<string[]>([]);

  useEffect(() => {
    if (userId) {
      loadPreferences();
    }
  }, [userId]);

  const loadPreferences = async () => {
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from('dashboard_preferences')
        .select('*')
        .eq('user_id', userId)
        .eq('dashboard_type', 'ad_reports')
        .maybeSingle();

      if (error) throw error;

      if (data) {
        if (data.visible_metrics && Array.isArray(data.visible_metrics)) {
          setVisibleMetrics(data.visible_metrics);
        }
        if (data.metric_order && Array.isArray(data.metric_order)) {
          setMetricOrder(data.metric_order);
        }
        if (data.view_settings?.isCollapsed !== undefined) {
          setIsCollapsed(data.view_settings.isCollapsed);
        }
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
    }
  };

  const savePreferences = async (
    newVisibleMetrics: string[],
    newMetricOrder: string[],
    newCollapsed?: boolean
  ) => {
    if (!userId) return;

    try {
      const { error } = await supabase
        .from('dashboard_preferences')
        .upsert({
          user_id: userId,
          dashboard_type: 'ad_reports',
          visible_metrics: newVisibleMetrics,
          metric_order: newMetricOrder,
          view_settings: {
            isCollapsed: newCollapsed ?? isCollapsed,
          },
        });

      if (error) throw error;
      toast.success('Preferences saved');
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast.error('Failed to save preferences');
    }
  };

  const handleSaveCustomization = (newVisible: string[], newOrder: string[]) => {
    setVisibleMetrics(newVisible);
    setMetricOrder(newOrder);
    savePreferences(newVisible, newOrder);
  };

  const handleDragStart = (metricId: string) => (e: React.DragEvent) => {
    setDraggedMetricId(metricId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (targetMetricId: string) => (e: React.DragEvent) => {
    e.preventDefault();
    if (!draggedMetricId || draggedMetricId === targetMetricId) {
      setDraggedMetricId(null);
      return;
    }

    const newOrder = [...metricOrder];
    const draggedIndex = newOrder.indexOf(draggedMetricId);
    const targetIndex = newOrder.indexOf(targetMetricId);

    if (draggedIndex === -1 || targetIndex === -1) {
      setDraggedMetricId(null);
      return;
    }

    newOrder.splice(draggedIndex, 1);
    newOrder.splice(targetIndex, 0, draggedMetricId);

    setMetricOrder(newOrder);
    setHasUnsavedChanges(true);
    setDraggedMetricId(null);
  };

  const handleDragEnd = () => {
    setDraggedMetricId(null);
  };

  const handleToggleEditMode = async () => {
    if (isEditMode) {
      if (hasUnsavedChanges) {
        await savePreferences(visibleMetrics, metricOrder);
        toast.success('Layout saved successfully');
        setHasUnsavedChanges(false);
      }
    } else {
      setOriginalMetricOrder([...metricOrder]);
      setHasUnsavedChanges(false);
    }
    setIsEditMode(!isEditMode);
  };

  const toggleCollapse = () => {
    const newCollapsed = !isCollapsed;
    setIsCollapsed(newCollapsed);
    savePreferences(visibleMetrics, metricOrder, newCollapsed);
  };

  const generateMetricMultiPlatformData = (metricId: string): Array<{ date: string; facebook?: number; google?: number; tiktok?: number }> => {
    return [];
  };

  const formatMetricValue = (metricId: string, value: number) => {
    const metric = ALL_METRICS.find(m => m.id === metricId);
    if (!metric) return value;

    if (metric.format === 'currency') {
      return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    if (metric.format === 'percentage') {
      return `${value.toFixed(2)}%`;
    }
    if (metric.format === 'number') {
      return Math.round(value).toLocaleString();
    }
    return value.toFixed(2);
  };

  const getMetricData = (metricId: string): Metric | null => {
    if (!metrics) return null;
    const key = metricId === 'net_roas' ? 'netROAS' : metricId;
    return (metrics as any)[key] || null;
  };

  const displayedMetrics = metricOrder
    .filter(id => visibleMetrics.includes(id))
    .map(id => ALL_METRICS.find(m => m.id === id))
    .filter(Boolean) as MetricDefinition[];

  if (!metrics && !isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="text-gray-400 dark:text-gray-600 text-center">
          <p className="text-lg font-medium mb-2">No performance data available</p>
          <p className="text-sm">Connect your ad account and sync data to view metrics</p>
        </div>
      </div>
    );
  }

  const renderSkeletonCard = () => (
    <div className="bg-white/70 dark:bg-dark/70 backdrop-blur-sm shadow-sm rounded-2xl p-8 border border-gray-200 dark:border-[#333333]">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-gray-200 dark:bg-[#2a2a2a] rounded-lg animate-pulse" />
          <div className="h-4 w-16 bg-gray-200 dark:bg-[#2a2a2a] rounded animate-pulse" />
        </div>
      </div>
      <div className="h-8 w-24 bg-gray-200 dark:bg-[#2a2a2a] rounded animate-pulse mb-4" />
      <div className="h-32 bg-gray-100 dark:bg-[#2a2a2a]/50 rounded animate-pulse" />
    </div>
  );

  const rexInsights = useMemo(() => {
    if (!metrics) return {};

    const insights: Record<string, { hasInsight: boolean; message: string; type: 'warning' | 'opportunity' }> = {};

    if (metrics.roas?.value !== undefined && metrics.roas.value < 1) {
      insights['roas'] = {
        hasInsight: true,
        message: 'ROAS below 1x suggests budget reallocation may improve returns',
        type: 'warning'
      };
    } else if (metrics.roas?.value !== undefined && metrics.roas.value > 3) {
      insights['roas'] = {
        hasInsight: true,
        message: 'Strong ROAS - consider increasing budget allocation',
        type: 'opportunity'
      };
    }

    if (metrics.cpa?.value !== undefined && metrics.cpa.value > 50) {
      insights['cpa'] = {
        hasInsight: true,
        message: 'High CPA detected - review audience targeting and creative performance',
        type: 'warning'
      };
    }

    if (metrics.ctr?.value !== undefined && metrics.ctr.value < 0.5) {
      insights['ctr'] = {
        hasInsight: true,
        message: 'Low CTR indicates ad creative may need refreshing',
        type: 'warning'
      };
    } else if (metrics.ctr?.value !== undefined && metrics.ctr.value > 3) {
      insights['ctr'] = {
        hasInsight: true,
        message: 'Excellent CTR - scale winning creative variations',
        type: 'opportunity'
      };
    }

    if (metrics.cvr?.value !== undefined && metrics.cvr.value < 1) {
      insights['cvr'] = {
        hasInsight: true,
        message: 'Low conversion rate - review landing page experience',
        type: 'warning'
      };
    }

    if (metrics.profit?.value !== undefined && metrics.profit.value < 0) {
      insights['profit'] = {
        hasInsight: true,
        message: 'Negative profit - pause underperforming campaigns',
        type: 'warning'
      };
    }

    if (metrics.netROAS?.value !== undefined && metrics.netROAS.value < 0) {
      insights['net_roas'] = {
        hasInsight: true,
        message: 'Negative Net ROAS requires immediate budget optimization',
        type: 'warning'
      };
    }

    if (metrics.spend?.change !== undefined && metrics.spend.change > 30) {
      insights['spend'] = {
        hasInsight: true,
        message: 'Significant spend increase - monitor performance closely',
        type: 'warning'
      };
    }

    return insights;
  }, [metrics]);

  const crossPlatformData = useMemo(() => {
    return { chartData: [], aggregated: null, hasData: false };
  }, [userId, crossPlatformMetric]);

  const togglePlatform = (platform: AdPlatform) => {
    const newEnabled = new Set(enabledPlatforms);
    if (newEnabled.has(platform)) {
      if (newEnabled.size > 1) {
        newEnabled.delete(platform);
      }
    } else {
      newEnabled.add(platform);
    }
    setEnabledPlatforms(newEnabled);
  };

  const formatCrossPlatformValue = (value: number, format: 'currency' | 'number' | 'percentage') => {
    if (format === 'currency') {
      return `$${value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    }
    if (format === 'percentage') {
      return `${value.toFixed(1)}%`;
    }
    return value.toFixed(2);
  };

  const selectedMetricOption = CROSS_PLATFORM_METRIC_OPTIONS.find(m => m.id === crossPlatformMetric) || CROSS_PLATFORM_METRIC_OPTIONS[0];

  return (
    <>
      <style>{`
        .metric-chart-wrapper:hover .recharts-line-curve {
          stroke: url(#line-gradient) !important;
          transition: stroke 0.3s ease;
        }
      `}</style>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white">Performance Overview</h2>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {displayedMetrics.length} metrics
            </span>
          </div>
          <div className="flex items-center gap-2">
            {isEditMode ? (
              <button
                onClick={() => setIsEditMode(false)}
                className="btn btn-ghost p-2"
              >
                <X className="btn-icon w-5 h-5" />
              </button>
            ) : (
              <button
                onClick={() => {
                  setOriginalMetricOrder([...metricOrder]);
                  setIsEditMode(true);
                }}
                className="btn btn-ghost p-2"
                title="Customize layout"
              >
                <Settings className="btn-icon w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Edit Mode Notification Bar */}
        {isEditMode && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Info className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0" />
                <p className="text-sm text-red-700 dark:text-red-300">
                  Drag and drop cards to rearrange. Click any card to flip and see multi-platform breakdown. Click "Add Metric" to show/hide metrics.
                </p>
              </div>
              {hasUnsavedChanges && (
                <button
                  onClick={handleToggleEditMode}
                  className="btn btn-primary ml-4 flex-shrink-0 group"
                >
                  <span>Save Layout</span>
                  <ArrowRight className="btn-icon btn-icon-arrow w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </button>
              )}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {isLoading ? (
            <>
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <React.Fragment key={i}>{renderSkeletonCard()}</React.Fragment>
              ))}
            </>
          ) : (
            <>
              {displayedMetrics.map((metricDef) => {
                const metricData = getMetricData(metricDef.id);
                if (!metricData) return null;

                const insight = rexInsights[metricDef.id];
                const multiPlatformData = generateMetricMultiPlatformData(metricDef.id);

                return (
                  <FlippablePerformanceCard
                    key={metricDef.id}
                    id={metricDef.id}
                    label={metricDef.label}
                    value={metricData.value}
                    change={metricData.change}
                    icon={metricDef.icon}
                    iconColor={metricDef.iconColor}
                    iconBgColor={metricDef.iconBgColor}
                    format={metricDef.format}
                    chartData={metricData.data}
                    multiPlatformChartData={multiPlatformData}
                    enabledPlatforms={Array.from(enabledPlatforms)}
                    hasRexInsight={insight?.hasInsight}
                    rexMessage={insight?.message}
                    isDragging={draggedMetricId === metricDef.id}
                    showInfoIcon={(metricDef as any).showInfoIcon}
                    onDragStart={isEditMode ? handleDragStart(metricDef.id) : undefined}
                    onDragEnd={isEditMode ? handleDragEnd : undefined}
                    onDragOver={isEditMode ? handleDragOver : undefined}
                    onDrop={isEditMode ? handleDrop(metricDef.id) : undefined}
                  />
                );
              })}

              {/* Add Metric Card */}
              <button
                onClick={() => setShowCustomizeModal(true)}
                className="bg-white/70 dark:bg-dark/70 backdrop-blur-sm shadow-sm rounded-2xl p-8 border-2 border-dashed border-gray-300 dark:border-[#4a4a4a] hover:border-red-400 dark:hover:border-red-500 hover:bg-gray-50/70 dark:hover:bg-[#2a2a2a]/70 transition-all duration-200 flex flex-col items-center justify-center min-h-[280px] group"
              >
                <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-[#2a2a2a] group-hover:bg-red-50 dark:group-hover:bg-red-900/30 flex items-center justify-center mb-3 transition-colors">
                  <Plus className="w-6 h-6 text-gray-400 dark:text-gray-500 group-hover:text-red-500 dark:group-hover:text-red-400 transition-colors" />
                </div>
                <span className="text-sm font-medium text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors">
                  Add Metric
                </span>
              </button>
            </>
          )}
        </div>

        {/* Cross-Platform Performance Chart */}
        {crossPlatformData.hasData && (
          <div className="bg-white/70 dark:bg-dark/70 backdrop-blur-sm shadow-sm rounded-2xl p-6 border border-gray-200 dark:border-[#333333]">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-blue-500/10 to-emerald-500/10 rounded-lg">
                  <Layers className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">Cross-Platform Performance</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Compare performance across all ad platforms</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                {/* Metric Selector Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setShowMetricDropdown(!showMetricDropdown)}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-[#2a2a2a] hover:bg-gray-200 dark:hover:bg-[#4a4a4a] rounded-lg transition-colors"
                  >
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{selectedMetricOption.label}</span>
                    <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${showMetricDropdown ? 'rotate-180' : ''}`} />
                  </button>
                  {showMetricDropdown && (
                    <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-dark rounded-lg shadow-lg border border-gray-200 dark:border-[#333333] py-1 z-50">
                      {CROSS_PLATFORM_METRIC_OPTIONS.map((option) => (
                        <button
                          key={option.id}
                          onClick={() => {
                            setCrossPlatformMetric(option.id);
                            setShowMetricDropdown(false);
                          }}
                          className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-[#2a2a2a] transition-colors ${
                            crossPlatformMetric === option.id
                              ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
                              : 'text-gray-700 dark:text-gray-300'
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Rex AI Button */}
                {onOpenRexModal && (
                  <button
                    onClick={() => onOpenRexModal('cross_platform')}
                    className="btn btn-danger flex items-center gap-2"
                  >
                    <Sparkles className="btn-icon w-4 h-4" />
                    <span className="text-sm font-medium">Rex Insights</span>
                  </button>
                )}
              </div>
            </div>

            {/* Platform Toggle Pills */}
            <div className="flex items-center gap-2 mb-6">
              {(['facebook', 'google', 'tiktok'] as AdPlatform[]).map((platform) => (
                <button
                  key={platform}
                  onClick={() => togglePlatform(platform)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                    enabledPlatforms.has(platform)
                      ? 'text-white shadow-sm'
                      : 'bg-gray-100 dark:bg-[#2a2a2a] text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-[#4a4a4a]'
                  }`}
                  style={enabledPlatforms.has(platform) ? { backgroundColor: PLATFORM_COLORS[platform] } : {}}
                >
                  <span className={`w-2 h-2 rounded-full ${enabledPlatforms.has(platform) ? 'bg-white' : 'bg-gray-400 dark:bg-gray-500'}`} />
                  {PLATFORM_LABELS[platform]}
                </button>
              ))}
            </div>

            {/* Platform Summary Cards */}
            {crossPlatformData.aggregated && (
              <div className="grid grid-cols-3 gap-4 mb-6">
                {(['facebook', 'google', 'tiktok'] as AdPlatform[]).map((platform) => {
                  const data = crossPlatformData.aggregated![platform];
                  if (!data || !enabledPlatforms.has(platform)) return null;

                  const metricValue = crossPlatformMetric === 'netProfit' ? data.totalNetProfit :
                                      crossPlatformMetric === 'adSpend' ? data.totalSpend :
                                      crossPlatformMetric === 'netRoas' ? data.avgNetRoas :
                                      data.avgProfitMargin;

                  return (
                    <div
                      key={platform}
                      className="p-4 rounded-xl border border-gray-200 dark:border-[#333333] bg-gray-50/50 dark:bg-dark/30"
                      style={{ borderLeftWidth: '4px', borderLeftColor: PLATFORM_COLORS[platform] }}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: PLATFORM_COLORS[platform] }}
                        />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{PLATFORM_LABELS[platform]}</span>
                      </div>
                      <div className="text-xl font-semibold text-gray-900 dark:text-white">
                        {formatCrossPlatformValue(metricValue, selectedMetricOption.format)}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {data.daysOfData} days of data
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Multi-Platform Line Chart */}
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={crossPlatformData.chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    {(['facebook', 'google', 'tiktok'] as AdPlatform[]).map((platform) => (
                      <linearGradient key={platform} id={`gradient-${platform}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={PLATFORM_COLORS[platform]} stopOpacity={0.3}/>
                        <stop offset="95%" stopColor={PLATFORM_COLORS[platform]} stopOpacity={0}/>
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#3a3a3a" opacity={0.3} />
                  <XAxis
                    dataKey="date"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: '#6B7280' }}
                    tickFormatter={(date) => {
                      const d = new Date(date);
                      return `${d.getMonth() + 1}/${d.getDate()}`;
                    }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: '#6B7280' }}
                    width={60}
                    tickFormatter={(value) => formatCrossPlatformValue(value, selectedMetricOption.format)}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '0.75rem',
                      border: 'none',
                      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.2)',
                      backgroundColor: 'rgba(23, 23, 23, 0.95)',
                      backdropFilter: 'blur(8px)',
                      padding: '12px 16px',
                    }}
                    labelStyle={{ color: '#F9FAFB', fontWeight: 600, marginBottom: '8px' }}
                    formatter={(value: number, name: string) => {
                      const platformKey = name as AdPlatform;
                      return [
                        formatCrossPlatformValue(value, selectedMetricOption.format),
                        PLATFORM_LABELS[platformKey] || name
                      ];
                    }}
                    labelFormatter={(date) => {
                      const d = new Date(date);
                      return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
                    }}
                  />
                  {enabledPlatforms.has('facebook') && (
                    <Line
                      type="monotone"
                      dataKey="facebook"
                      stroke={PLATFORM_COLORS.facebook}
                      strokeWidth={2.5}
                      dot={false}
                      activeDot={{ r: 5, strokeWidth: 2, stroke: PLATFORM_COLORS.facebook, fill: '#fff' }}
                    />
                  )}
                  {enabledPlatforms.has('google') && (
                    <Line
                      type="monotone"
                      dataKey="google"
                      stroke={PLATFORM_COLORS.google}
                      strokeWidth={2.5}
                      dot={false}
                      activeDot={{ r: 5, strokeWidth: 2, stroke: PLATFORM_COLORS.google, fill: '#fff' }}
                    />
                  )}
                  {enabledPlatforms.has('tiktok') && (
                    <Line
                      type="monotone"
                      dataKey="tiktok"
                      stroke={PLATFORM_COLORS.tiktok}
                      strokeWidth={2.5}
                      dot={false}
                      activeDot={{ r: 5, strokeWidth: 2, stroke: PLATFORM_COLORS.tiktok, fill: '#fff' }}
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

      <CustomizeMetricsModal
        isOpen={showCustomizeModal}
        onClose={() => setShowCustomizeModal(false)}
        allMetrics={ALL_METRICS}
        visibleMetrics={visibleMetrics}
        metricOrder={metricOrder}
        onSave={handleSaveCustomization}
      />
    </div>
    </>
  );
};
