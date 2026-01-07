import React from 'react';
import { LucideIcon } from 'lucide-react';
import { GlassCard } from '@/components/GlassCard';

export interface MetricDefinition {
  id: string;
  label: string;
  icon: LucideIcon;
  iconColor: string;
  iconBgColor: string;
  getValue: (metrics: any) => string | number;
  getSubtext?: (metrics: any) => string;
  format?: 'number' | 'currency' | 'percentage';
  showInfoIcon?: boolean;
}

interface MetricCardProps {
  metric: MetricDefinition;
  data: any;
  isLoading: boolean;
  isDragging?: boolean;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  metric,
  data,
  isLoading,
  isDragging = false
}) => {
  const formatValue = (value: string | number) => {
    if (isLoading) return '...';

    if (metric.format === 'currency') {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(Number(value));
    }

    if (metric.format === 'percentage') {
      return `${Number(value).toFixed(1)}%`;
    }

    if (metric.format === 'number') {
      return Number(value).toLocaleString();
    }

    return value;
  };

  const Icon = metric.icon;
  const value = metric.getValue(data);
  const subtext = metric.getSubtext ? metric.getSubtext(data) : null;

  return (
    <GlassCard className={`transition-all ${isDragging ? 'opacity-50 scale-95' : ''}`}>
      <div className="flex items-center justify-between mb-4">
        <div className={`w-10 h-10 ${metric.iconBgColor} rounded-lg flex items-center justify-center`}>
          <Icon className={`w-5 h-5 ${metric.iconColor}`} />
        </div>
      </div>
      <div className="space-y-1">
        <p className="text-sm text-gray-500 dark:text-gray-400">{metric.label}</p>
        <p className="text-3xl font-semibold text-gray-900 dark:text-white">
          {formatValue(value)}
        </p>
        {subtext && (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {isLoading ? '...' : subtext}
          </p>
        )}
      </div>
    </GlassCard>
  );
};
