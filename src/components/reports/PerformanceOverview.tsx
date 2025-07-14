import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'; // eslint-disable-line @typescript-eslint/no-unused-vars
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

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
  };
}

export const PerformanceOverview: React.FC<PerformanceOverviewProps> = ({ metrics }) => {
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

  const renderMetricCard = (metric: Metric) => (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">{metric.name}</h3>
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
      </div>
      <div className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
        {metric.value.toFixed(2)}
      </div>
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
              formatter={(value: number) => [value.toFixed(2), metric.name]}
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
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium text-gray-900 dark:text-white">Performance Overview</h2>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {renderMetricCard(metrics.roas)}
        {renderMetricCard(metrics.cpa)}
        {renderMetricCard(metrics.ctr)}
      </div>
    </div>
  );
};