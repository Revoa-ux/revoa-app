import React from 'react';
import { LucideIcon, ArrowUpRight, ArrowDownRight, RefreshCw } from 'lucide-react';

export interface MetricCardProps {
  id: string;
  title: string;
  icon: LucideIcon;
  value: string | number;
  change?: number;
  changeType?: 'positive' | 'negative' | 'neutral';
  subtitle?: string;
  loading?: boolean;
  onRefresh?: () => void;
  className?: string;
  isDragging?: boolean;
}

export default function MetricCard({
  title,
  icon: Icon,
  value,
  change,
  changeType = 'neutral',
  subtitle,
  loading,
  onRefresh,
  className = '',
  isDragging = false
}: MetricCardProps) {
  const renderChangeIndicator = () => {
    if (change === undefined || change === null) return null;

    const isPositive = change > 0;
    const isNegative = change < 0;

    let colorClass = 'text-gray-500';
    if (changeType === 'positive' && isPositive) colorClass = 'text-green-500 dark:text-green-400';
    if (changeType === 'positive' && isNegative) colorClass = 'text-red-500 dark:text-red-400';
    if (changeType === 'negative' && isPositive) colorClass = 'text-red-500 dark:text-red-400';
    if (changeType === 'negative' && isNegative) colorClass = 'text-green-500 dark:text-green-400';

    const ChangeIcon = isPositive ? ArrowUpRight : ArrowDownRight;

    return (
      <div className={`flex items-center text-sm ${colorClass}`}>
        <ChangeIcon className="w-4 h-4 mr-1" />
        <span>{Math.abs(change).toFixed(1)}%</span>
      </div>
    );
  };

  return (
    <div
      className={`
        h-[180px] p-4 rounded-xl
        bg-white dark:bg-gray-800
        border border-gray-200 dark:border-gray-700
        transition-all duration-200
        ${isDragging ? 'opacity-50 scale-95' : 'opacity-100 scale-100'}
        ${loading ? 'animate-pulse' : ''}
        ${className}
      `}
    >
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
            <Icon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          </div>
          <div className="flex items-center space-x-2">
            {renderChangeIndicator()}
            {onRefresh && !loading && (
              <button
                onClick={onRefresh}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                title="Refresh metric"
              >
                <RefreshCw className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" />
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col justify-center">
          <h3 className="text-xs text-gray-500 dark:text-gray-400 mb-1">{title}</h3>
          <p className="text-2xl font-bold text-gray-900 dark:text-white truncate">
            {loading ? '...' : value}
          </p>
          {subtitle && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">
              {subtitle}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
