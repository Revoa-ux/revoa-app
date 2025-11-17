import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ArrowUpRight, ArrowDownRight, DollarSign, TrendingUp, MousePointerClick, ShoppingCart, Target, Percent, Banknote, TrendingDown } from 'lucide-react';

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
}

export const PerformanceOverview: React.FC<PerformanceOverviewProps> = ({ metrics }) => {
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

  // Get icon for each metric
  const getMetricIcon = (metricName: string) => {
    switch (metricName.toLowerCase()) {
      case 'roas':
        return <TrendingUp className="w-4 h-4" />;
      case 'cpa':
        return <Target className="w-4 h-4" />;
      case 'ctr':
        return <MousePointerClick className="w-4 h-4" />;
      case 'spend':
        return <DollarSign className="w-4 h-4" />;
      case 'conversions':
        return <ShoppingCart className="w-4 h-4" />;
      case 'cvr':
        return <Percent className="w-4 h-4" />;
      case 'profit':
        return <Banknote className="w-4 h-4" />;
      case 'net roas':
        return <TrendingDown className="w-4 h-4" />;
      default:
        return <TrendingUp className="w-4 h-4" />;
    }
  };

  // Format number to be more readable
  const formatYAxisTick = (value: number) => {
    // For ROAS, show with 1 decimal place
    if (value < 10) {
      return value.toFixed(1);
    }

    // For larger numbers, simplify
    if (value >= 1000) {
      return `${(value / 1000).toFixed(0)}k`;
    }

    // For medium numbers, round to nearest whole number
    return Math.round(value);
  };

  // Format date for chart tooltip and axis
  const formatXAxisTick = (dateStr: string) => {
    // Parse the date string
    const date = new Date(dateStr);

    // Format to just show month/day
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  // Format metric value for display
  const formatMetricValue = (metric: Metric) => {
    const value = metric.value;
    const name = metric.name.toLowerCase();

    if (name === 'spend' || name === 'profit') {
      return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    } else if (name === 'conversions') {
      return Math.round(value).toLocaleString();
    } else if (name === 'ctr' || name === 'cvr') {
      return `${value.toFixed(2)}%`;
    } else if (name === 'cpa') {
      return `$${value.toFixed(2)}`;
    } else if (name === 'net roas') {
      return `${value.toFixed(2)}x`;
    } else {
      return value.toFixed(2);
    }
  };

  const renderMetricCard = (metric: Metric) => (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-gray-600 dark:text-gray-400">
            {getMetricIcon(metric.name)}
          </div>
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">{metric.name}</h3>
        </div>
        {metric.change !== 0 && (
          <div className={`flex items-center text-sm ${
            metric.change > 0 ? 'text-green-500' : 'text-red-500'
          }`}>
            {metric.change > 0 ? (
              <ArrowUpRight className="w-4 h-4 mr-1" />
            ) : (
              <ArrowDownRight className="w-4 h-4 mr-1" />
            )}
            {Math.abs(metric.change)}%
          </div>
        )}
      </div>
      <div className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
        {formatMetricValue(metric)}
      </div>
      {metric.data.length > 0 ? (
        <div className="h-32">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={metric.data} margin={{ left: 0, right: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" />
              <XAxis
                dataKey="date"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: '#6B7280' }}
                padding={{ left: 0, right: 0 }}
                tickFormatter={formatXAxisTick}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: '#6B7280' }}
                width={40}
                domain={['dataMin - 10%', 'dataMax + 10%']}
                tickFormatter={formatYAxisTick}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: '0.5rem',
                  border: '1px solid #E5E7EB',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                  backgroundColor: '#1F2937'
                }}
                formatter={(value: number) => [formatMetricValue({ ...metric, value }), metric.name]}
                labelFormatter={(label) => `Date: ${label}`}
                itemStyle={{ color: '#F9FAFB' }}
                labelStyle={{ color: '#F9FAFB' }}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#F43F5E"
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
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium text-gray-900 dark:text-white">Performance Overview</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {renderMetricCard(metrics.roas)}
        {renderMetricCard(metrics.cpa)}
        {renderMetricCard(metrics.ctr)}
        {renderMetricCard(metrics.spend)}
        {renderMetricCard(metrics.conversions)}
        {renderMetricCard(metrics.cvr)}
        {renderMetricCard(metrics.profit)}
        {renderMetricCard(metrics.netROAS)}
      </div>
    </div>
  );
};
