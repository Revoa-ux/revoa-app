import React, { useState, useEffect, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ArrowUpRight, ArrowDownRight, DollarSign, TrendingUp, MousePointerClick, ShoppingCart, Target, Percent, Banknote, TrendingDown, Settings, Plus, Sparkles } from 'lucide-react';
import { CustomizeMetricsModal } from '@/components/attribution/CustomizeMetricsModal';
import { MetricDefinition } from '@/components/attribution/MetricCard';
import { supabase } from '@/lib/supabase';

interface Metric {
  name: string;
  value: number;
  change: number;
  data: Array<{
    date: string;
    value: number;
  }>;
}

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
}

const ALL_METRICS: MetricDefinition[] = [
  {
    id: 'roas',
    label: 'ROAS',
    icon: TrendingUp,
    iconColor: 'text-gray-600 dark:text-gray-400',
    iconBgColor: 'bg-gray-100 dark:bg-gray-700',
    getValue: (m) => m?.roas?.value || 0,
  },
  {
    id: 'cpa',
    label: 'CPA',
    icon: Target,
    iconColor: 'text-gray-600 dark:text-gray-400',
    iconBgColor: 'bg-gray-100 dark:bg-gray-700',
    format: 'currency',
    getValue: (m) => m?.cpa?.value || 0,
  },
  {
    id: 'ctr',
    label: 'CTR',
    icon: MousePointerClick,
    iconColor: 'text-gray-600 dark:text-gray-400',
    iconBgColor: 'bg-gray-100 dark:bg-gray-700',
    format: 'percentage',
    getValue: (m) => m?.ctr?.value || 0,
  },
  {
    id: 'spend',
    label: 'Spend',
    icon: DollarSign,
    iconColor: 'text-gray-600 dark:text-gray-400',
    iconBgColor: 'bg-gray-100 dark:bg-gray-700',
    format: 'currency',
    getValue: (m) => m?.spend?.value || 0,
  },
  {
    id: 'conversions',
    label: 'Conversions',
    icon: ShoppingCart,
    iconColor: 'text-gray-600 dark:text-gray-400',
    iconBgColor: 'bg-gray-100 dark:bg-gray-700',
    format: 'number',
    getValue: (m) => m?.conversions?.value || 0,
  },
  {
    id: 'cvr',
    label: 'CVR',
    icon: Percent,
    iconColor: 'text-gray-600 dark:text-gray-400',
    iconBgColor: 'bg-gray-100 dark:bg-gray-700',
    format: 'percentage',
    getValue: (m) => m?.cvr?.value || 0,
  },
  {
    id: 'profit',
    label: 'Profit',
    icon: Banknote,
    iconColor: 'text-gray-600 dark:text-gray-400',
    iconBgColor: 'bg-gray-100 dark:bg-gray-700',
    format: 'currency',
    getValue: (m) => m?.profit?.value || 0,
  },
  {
    id: 'net_roas',
    label: 'Net ROAS',
    icon: TrendingDown,
    iconColor: 'text-gray-600 dark:text-gray-400',
    iconBgColor: 'bg-gray-100 dark:bg-gray-700',
    getValue: (m) => m?.netROAS?.value || 0,
  },
];

export const PerformanceOverview: React.FC<PerformanceOverviewProps> = ({ metrics, userId, isLoading = false }) => {
  const [showCustomizeModal, setShowCustomizeModal] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [visibleMetrics, setVisibleMetrics] = useState<string[]>(
    ALL_METRICS.map(m => m.id)
  );
  const [metricOrder, setMetricOrder] = useState<string[]>(
    ALL_METRICS.map(m => m.id)
  );
  const [draggedMetricId, setDraggedMetricId] = useState<string | null>(null);

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
    savePreferences(visibleMetrics, newOrder);
    setDraggedMetricId(null);
  };

  const handleDragEnd = () => {
    setDraggedMetricId(null);
  };

  const toggleCollapse = () => {
    const newCollapsed = !isCollapsed;
    setIsCollapsed(newCollapsed);
    savePreferences(visibleMetrics, metricOrder, newCollapsed);
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
    <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm shadow-sm rounded-2xl p-8 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
          <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        </div>
      </div>
      <div className="h-8 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-4" />
      <div className="h-32 bg-gray-100 dark:bg-gray-700/50 rounded animate-pulse" />
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
          <button
            onClick={() => setShowCustomizeModal(true)}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            title="Customize metrics"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>

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

            const Icon = metricDef.icon;
            const isDragging = draggedMetricId === metricDef.id;
            const insight = rexInsights[metricDef.id];
            const hasRexInsight = insight?.hasInsight;

            return (
              <div
                key={metricDef.id}
                draggable
                onDragStart={handleDragStart(metricDef.id)}
                onDragOver={handleDragOver}
                onDrop={handleDrop(metricDef.id)}
                onDragEnd={handleDragEnd}
                className={`relative bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm shadow-sm rounded-2xl p-8 border cursor-move transition-all duration-200 ${
                  isDragging ? 'opacity-50 scale-95' : ''
                } ${
                  hasRexInsight
                    ? 'border-red-300 dark:border-red-500/50 shadow-[0_0_15px_-3px_rgba(225,29,72,0.15)] dark:shadow-[0_0_15px_-3px_rgba(225,29,72,0.25)]'
                    : 'border-gray-200 dark:border-gray-700'
                }`}
              >
                {hasRexInsight && (
                  <div className="absolute top-3 right-3 group/rex">
                    <div className="p-1.5 bg-gradient-to-r from-red-500 to-rose-500 rounded-lg shadow-sm cursor-help">
                      <Sparkles className="w-3.5 h-3.5 text-white" />
                    </div>
                    <div className="absolute right-0 top-full mt-2 w-64 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-xl opacity-0 invisible group-hover/rex:opacity-100 group-hover/rex:visible transition-all duration-200 z-50">
                      <div className="flex items-start gap-2">
                        <Sparkles className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-medium text-rose-400 mb-1">Rex AI Insight</p>
                          <p className="text-gray-300 leading-relaxed">{insight.message}</p>
                        </div>
                      </div>
                      <div className="absolute -top-1.5 right-4 w-3 h-3 bg-gray-900 rotate-45" />
                    </div>
                  </div>
                )}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <div className={`p-2 ${hasRexInsight ? 'bg-red-50 dark:bg-red-900/30' : metricDef.iconBgColor} rounded-lg ${hasRexInsight ? 'text-red-500 dark:text-red-400' : metricDef.iconColor}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">{metricDef.label}</h3>
                  </div>
                  {metricData.change !== 0 && (
                    <div className={`flex items-center text-sm ${
                      metricData.change > 0 ? 'text-green-500' : 'text-red-500'
                    }`}>
                      {metricData.change > 0 ? (
                        <ArrowUpRight className="w-4 h-4 mr-1" />
                      ) : (
                        <ArrowDownRight className="w-4 h-4 mr-1" />
                      )}
                      {Math.abs(metricData.change)}%
                    </div>
                  )}
                </div>
                <div className="text-2xl font-normal text-gray-900 dark:text-white mb-4">
                  {formatMetricValue(metricDef.id, metricData.value)}
                </div>
                {metricData.data.length > 0 ? (
                  <div className="h-32 metric-chart-wrapper">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={metricData.data} margin={{ left: 0, right: 5 }}>
                        <defs>
                          <linearGradient id="line-gradient" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stopColor="#E11D48" />
                            <stop offset="50%" stopColor="#EC4899" />
                            <stop offset="100%" stopColor="#E8795A" />
                          </linearGradient>
                          <linearGradient id={`gradient-${metricDef.id}`} x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stopColor="#E11D48" />
                            <stop offset="50%" stopColor="#EC4899" />
                            <stop offset="100%" stopColor="#E8795A" />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" />
                        <XAxis
                          dataKey="date"
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 12, fill: '#6B7280' }}
                          padding={{ left: 0, right: 0 }}
                          tickFormatter={(date) => {
                            const d = new Date(date);
                            return `${d.getMonth() + 1}/${d.getDate()}`;
                          }}
                        />
                        <YAxis
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 12, fill: '#6B7280' }}
                          width={40}
                          domain={['dataMin - 10%', 'dataMax + 10%']}
                        />
                        <Tooltip
                          contentStyle={{
                            borderRadius: '0.5rem',
                            border: 'none',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                            backgroundColor: 'rgba(31, 41, 55, 0.95)',
                            backdropFilter: 'blur(8px)',
                          }}
                          wrapperStyle={{
                            outline: 'none',
                          }}
                          cursor={false}
                          position={{ y: -40 }}
                          formatter={(value: number) => [formatMetricValue(metricDef.id, value), metricDef.label]}
                          itemStyle={{ color: '#F9FAFB' }}
                          labelStyle={{ color: '#F9FAFB' }}
                        />
                        <Line
                          type="monotone"
                          dataKey="value"
                          stroke="#6B7280"
                          strokeWidth={2}
                          dot={false}
                          activeDot={{
                            r: 4,
                            strokeWidth: 2,
                            stroke: `url(#gradient-${metricDef.id})`,
                            fill: '#fff'
                          }}
                          className="hover-gradient-line"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-32 flex items-center justify-center text-sm text-gray-400 dark:text-gray-600">
                    No data
                  </div>
                )}
              </div>
            );
          })}

              {/* Add Metric Card */}
              <button
                onClick={() => setShowCustomizeModal(true)}
                className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm shadow-sm rounded-2xl p-8 border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-red-400 dark:hover:border-red-500 hover:bg-gray-50/70 dark:hover:bg-gray-700/70 transition-all duration-200 flex flex-col items-center justify-center min-h-[280px] group"
              >
                <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-700 group-hover:bg-red-50 dark:group-hover:bg-red-900/30 flex items-center justify-center mb-3 transition-colors">
                  <Plus className="w-6 h-6 text-gray-400 dark:text-gray-500 group-hover:text-red-500 dark:group-hover:text-red-400 transition-colors" />
                </div>
                <span className="text-sm font-medium text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors">
                  Add Metric
                </span>
              </button>
            </>
          )}
        </div>

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
