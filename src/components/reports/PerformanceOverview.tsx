import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ArrowUpRight, ArrowDownRight, DollarSign, TrendingUp, MousePointerClick, ShoppingCart, Target, Percent, Banknote, TrendingDown, Settings, ChevronDown, ChevronUp } from 'lucide-react';
import { GlassCard } from '@/components/GlassCard';
import { CustomizeMetricsModal } from '@/components/attribution/CustomizeMetricsModal';
import { MetricDefinition } from '@/components/attribution/MetricCard';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

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

export const PerformanceOverview: React.FC<PerformanceOverviewProps> = ({ metrics, userId }) => {
  const [showCustomizeModal, setShowCustomizeModal] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [visibleMetrics, setVisibleMetrics] = useState<string[]>(
    ALL_METRICS.map(m => m.id)
  );
  const [metricOrder, setMetricOrder] = useState<string[]>(
    ALL_METRICS.map(m => m.id)
  );

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

  if (!metrics) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="text-gray-400 dark:text-gray-600 text-center">
          <p className="text-lg font-medium mb-2">No performance data available</p>
          <p className="text-sm">Connect your ad account and sync data to view metrics</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div
        className="flex items-center justify-between cursor-pointer hover:opacity-80 transition-opacity"
        onClick={toggleCollapse}
      >
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white">Performance Overview</h2>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {displayedMetrics.length} metrics
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowCustomizeModal(true);
            }}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            title="Customize metrics"
          >
            <Settings className="w-5 h-5" />
          </button>
          {isCollapsed ? (
            <ChevronDown className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          ) : (
            <ChevronUp className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          )}
        </div>
      </div>

      {!isCollapsed && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {displayedMetrics.map((metricDef) => {
            const metricData = getMetricData(metricDef.id);
            if (!metricData) return null;

            const Icon = metricDef.icon;

            return (
              <GlassCard key={metricDef.id}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <div className={`p-2 ${metricDef.iconBgColor} rounded-lg ${metricDef.iconColor}`}>
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
                <div className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                  {formatMetricValue(metricDef.id, metricData.value)}
                </div>
                {metricData.data.length > 0 ? (
                  <div className="h-32">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={metricData.data} margin={{ left: 0, right: 5 }}>
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
                            border: '1px solid #E5E7EB',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                            backgroundColor: '#1F2937'
                          }}
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
                          activeDot={{ r: 4, strokeWidth: 1 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-32 flex items-center justify-center text-sm text-gray-400 dark:text-gray-600">
                    No data
                  </div>
                )}
              </GlassCard>
            );
          })}
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
  );
};
