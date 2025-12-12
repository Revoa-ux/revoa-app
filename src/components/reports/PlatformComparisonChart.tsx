import React, { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Area, AreaChart } from 'recharts';
import { TrendingUp, DollarSign, Target, MousePointerClick, ShoppingCart } from 'lucide-react';
import { PLATFORM_COLORS, type PlatformTimeSeriesData } from '@/lib/platformMetricsService';
import type { AdPlatform } from '@/types/ads';

interface PlatformComparisonChartProps {
  data: PlatformTimeSeriesData[];
  metric: 'spend' | 'roas' | 'conversions' | 'ctr' | 'cpa';
  title: string;
  platforms: AdPlatform[];
  height?: number;
}

const METRIC_CONFIG = {
  spend: {
    icon: DollarSign,
    label: 'Ad Spend',
    format: 'currency',
    suffix: ''
  },
  roas: {
    icon: TrendingUp,
    label: 'ROAS',
    format: 'multiplier',
    suffix: 'x'
  },
  conversions: {
    icon: ShoppingCart,
    label: 'Conversions',
    format: 'number',
    suffix: ''
  },
  ctr: {
    icon: MousePointerClick,
    label: 'CTR',
    format: 'percentage',
    suffix: '%'
  },
  cpa: {
    icon: Target,
    label: 'CPA',
    format: 'currency',
    suffix: ''
  }
};

const formatValue = (value: number, format: string): string => {
  if (value === undefined || value === null) return '-';
  switch (format) {
    case 'currency':
      return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    case 'percentage':
      return `${value.toFixed(2)}%`;
    case 'multiplier':
      return `${value.toFixed(2)}x`;
    case 'number':
      return Math.round(value).toLocaleString();
    default:
      return value.toFixed(2);
  }
};

const CustomTooltip = ({ active, payload, label, metric }: any) => {
  if (!active || !payload || !payload.length) return null;

  const config = METRIC_CONFIG[metric as keyof typeof METRIC_CONFIG];

  return (
    <div className="bg-gray-900/95 dark:bg-gray-800/95 backdrop-blur-sm rounded-xl p-4 shadow-xl border border-gray-700">
      <p className="text-xs text-gray-400 mb-3">
        {new Date(label).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
      </p>
      <div className="space-y-2">
        {payload.map((entry: any, index: number) => {
          const platform = entry.dataKey as AdPlatform;
          const colors = PLATFORM_COLORS[platform];
          return (
            <div key={index} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: colors.primary }}
                />
                <span className="text-sm text-gray-300">{colors.name}</span>
              </div>
              <span className="text-sm font-semibold text-white">
                {formatValue(entry.value, config.format)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const CustomLegend = ({ platforms }: { platforms: AdPlatform[] }) => {
  return (
    <div className="flex items-center justify-center gap-6 mt-4">
      {platforms.map((platform) => {
        const colors = PLATFORM_COLORS[platform];
        return (
          <div key={platform} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: colors.primary }}
            />
            <span className="text-sm text-gray-600 dark:text-gray-400">{colors.name}</span>
          </div>
        );
      })}
    </div>
  );
};

export const PlatformComparisonChart: React.FC<PlatformComparisonChartProps> = ({
  data,
  metric,
  title,
  platforms,
  height = 300
}) => {
  const [chartType, setChartType] = useState<'line' | 'area'>('area');
  const config = METRIC_CONFIG[metric];
  const Icon = config.icon;

  if (!data || data.length === 0) {
    return (
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-xl">
            <Icon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h3>
        </div>
        <div className="h-64 flex items-center justify-center text-gray-400 dark:text-gray-500">
          No comparison data available
        </div>
      </div>
    );
  }

  const ChartComponent = chartType === 'area' ? AreaChart : LineChart;

  return (
    <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-xl">
            <Icon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">Platform performance over time</p>
          </div>
        </div>
        <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
          <button
            onClick={() => setChartType('area')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
              chartType === 'area'
                ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Area
          </button>
          <button
            onClick={() => setChartType('line')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
              chartType === 'line'
                ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Line
          </button>
        </div>
      </div>

      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <ChartComponent data={data} margin={{ left: 10, right: 10, top: 10, bottom: 10 }}>
            <defs>
              {platforms.map((platform) => {
                const colors = PLATFORM_COLORS[platform];
                return (
                  <linearGradient key={`gradient-${platform}`} id={`gradient-${platform}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={colors.primary} stopOpacity={0.4} />
                    <stop offset="100%" stopColor={colors.primary} stopOpacity={0.05} />
                  </linearGradient>
                );
              })}
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" opacity={0.3} />
            <XAxis
              dataKey="date"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: '#6B7280' }}
              tickFormatter={(date) => {
                const d = new Date(date);
                return `${d.getMonth() + 1}/${d.getDate()}`;
              }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: '#6B7280' }}
              width={60}
              tickFormatter={(value) => {
                if (config.format === 'currency') {
                  if (value >= 1000) return `$${(value / 1000).toFixed(1)}k`;
                  return `$${value}`;
                }
                if (config.format === 'percentage') return `${value}%`;
                if (config.format === 'multiplier') return `${value}x`;
                if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
                return value;
              }}
            />
            <Tooltip content={<CustomTooltip metric={metric} />} />
            {platforms.map((platform) => {
              const colors = PLATFORM_COLORS[platform];
              if (chartType === 'area') {
                return (
                  <Area
                    key={platform}
                    type="monotone"
                    dataKey={platform}
                    stroke={colors.primary}
                    strokeWidth={2}
                    fill={`url(#gradient-${platform})`}
                    dot={false}
                    activeDot={{
                      r: 5,
                      strokeWidth: 2,
                      stroke: colors.primary,
                      fill: '#fff'
                    }}
                  />
                );
              }
              return (
                <Line
                  key={platform}
                  type="monotone"
                  dataKey={platform}
                  stroke={colors.primary}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{
                    r: 5,
                    strokeWidth: 2,
                    stroke: colors.primary,
                    fill: '#fff'
                  }}
                />
              );
            })}
          </ChartComponent>
        </ResponsiveContainer>
      </div>

      <CustomLegend platforms={platforms} />
    </div>
  );
};

export default PlatformComparisonChart;
