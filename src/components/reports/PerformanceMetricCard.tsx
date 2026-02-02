import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface SparklineData {
  date: string;
  value: number;
}

interface PerformanceMetricCardProps {
  title: string;
  value: string | number;
  change: number;
  icon: React.ReactNode;
  sparklineData?: SparklineData[];
  format?: 'number' | 'currency' | 'percentage';
  invertColors?: boolean;
}

export function PerformanceMetricCard({
  title,
  value,
  change,
  icon,
  sparklineData = [],
  format = 'number',
  invertColors = false
}: PerformanceMetricCardProps) {
  const isPositive = invertColors ? change < 0 : change > 0;
  const changeColor = isPositive ? 'text-green-600' : change === 0 ? 'text-gray-400' : 'text-red-600';
  const changeBgColor = isPositive ? 'bg-green-50 dark:bg-green-900/20' : change === 0 ? 'bg-gray-50 dark:bg-dark' : 'bg-red-50 dark:bg-red-900/20';

  const formatValue = (val: string | number) => {
    if (format === 'currency') {
      return `$${Number(val).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    if (format === 'percentage') {
      return `${Number(val).toFixed(2)}%`;
    }
    return Number(val).toLocaleString('en-US', { maximumFractionDigits: 2 });
  };

  const renderSparkline = () => {
    if (!sparklineData.length) return null;

    const values = sparklineData.map(d => d.value);
    const max = Math.max(...values);
    const min = Math.min(...values);
    const range = max - min || 1;

    const points = sparklineData.map((d, i) => {
      const x = (i / (sparklineData.length - 1)) * 100;
      const y = 100 - ((d.value - min) / range) * 100;
      return `${x},${y}`;
    }).join(' ');

    return (
      <svg className="w-full h-12 mt-3" viewBox="0 0 100 100" preserveAspectRatio="none">
        <polyline
          points={points}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
          className={isPositive ? 'text-green-500' : 'text-red-500'}
        />
      </svg>
    );
  };

  return (
    <div className="bg-white dark:bg-dark rounded-xl border border-gray-200 dark:border-[#333333] p-5 hover:shadow-lg transition-all duration-200">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center space-x-2 text-gray-500 dark:text-gray-400">
          {icon}
          <span className="text-sm font-medium">{title}</span>
        </div>
        <div className={`flex items-center space-x-1 px-2 py-1 rounded-lg ${changeBgColor}`}>
          {change !== 0 && (
            isPositive ? (
              <TrendingUp className={`w-3 h-3 ${changeColor}`} />
            ) : (
              <TrendingDown className={`w-3 h-3 ${changeColor}`} />
            )
          )}
          <span className={`text-xs font-semibold ${changeColor}`}>
            {change > 0 ? '+' : ''}{change.toFixed(1)}%
          </span>
        </div>
      </div>

      <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
        {formatValue(value)}
      </div>

      {renderSparkline()}
    </div>
  );
}
