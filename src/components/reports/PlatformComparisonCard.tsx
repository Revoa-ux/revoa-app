import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TrendingUp, TrendingDown } from 'lucide-react';
import type { AdPlatform } from '@/types/ads';
import { PLATFORM_COLORS } from '@/types/ads';
import { getPlatformDisplayName } from '@/lib/platformComparisonService';

interface PlatformDataPoint {
  date: string;
  facebook?: number;
  google?: number;
  tiktok?: number;
}

interface PlatformValue {
  platform: AdPlatform;
  value: number;
  change: number;
}

interface PlatformComparisonCardProps {
  title: string;
  metricKey: string;
  platforms: PlatformValue[];
  chartData: PlatformDataPoint[];
  format?: 'currency' | 'percentage' | 'number' | 'multiplier';
  isLoading?: boolean;
}

export const PlatformComparisonCard: React.FC<PlatformComparisonCardProps> = ({
  title,
  metricKey,
  platforms,
  chartData,
  format = 'number',
  isLoading = false,
}) => {
  const formatValue = (value: number): string => {
    if (format === 'currency') {
      return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    if (format === 'percentage') {
      return `${value.toFixed(2)}%`;
    }
    if (format === 'multiplier') {
      return `${value.toFixed(2)}x`;
    }
    return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
  };

  const formatTooltipValue = (value: number): string => {
    return formatValue(value);
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;

    return (
      <div className="bg-gray-900/95 backdrop-blur-sm border border-gray-700 rounded-lg p-3 shadow-xl">
        <p className="text-xs text-gray-400 mb-2">
          {new Date(label).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </p>
        <div className="space-y-1.5">
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-xs text-gray-300">
                  {getPlatformDisplayName(entry.dataKey as AdPlatform)}
                </span>
              </div>
              <span className="text-xs font-medium text-white">
                {formatTooltipValue(entry.value)}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const activePlatforms = platforms.filter(p => p.value > 0 || chartData.some(d => (d as any)[p.platform] > 0));

  if (isLoading) {
    return (
      <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm shadow-sm rounded-2xl p-6 border border-gray-200 dark:border-gray-700">
        <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-4" />
        <div className="h-8 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-4" />
        <div className="h-40 bg-gray-100 dark:bg-gray-700/50 rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm shadow-sm rounded-2xl p-6 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</h3>
      </div>

      <div className="flex flex-wrap gap-4 mb-4">
        {activePlatforms.map((p) => {
          const colors = PLATFORM_COLORS[p.platform];
          const isPositive = p.change >= 0;

          return (
            <div key={p.platform} className="flex items-center gap-3">
              <div
                className="w-3 h-3 rounded-full"
                style={{
                  background: `linear-gradient(135deg, ${colors.gradient[0]}, ${colors.gradient[1]})`,
                }}
              />
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {getPlatformDisplayName(p.platform)}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-semibold text-gray-900 dark:text-white">
                    {formatValue(p.value)}
                  </span>
                  {p.change !== 0 && (
                    <span className={`flex items-center text-xs ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
                      {isPositive ? <TrendingUp className="w-3 h-3 mr-0.5" /> : <TrendingDown className="w-3 h-3 mr-0.5" />}
                      {Math.abs(p.change).toFixed(1)}%
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {chartData.length > 0 ? (
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ left: 0, right: 5, top: 5, bottom: 5 }}>
              <defs>
                {activePlatforms.map((p) => {
                  const colors = PLATFORM_COLORS[p.platform];
                  return (
                    <linearGradient
                      key={`gradient-${p.platform}`}
                      id={`gradient-${p.platform}-${metricKey}`}
                      x1="0"
                      y1="0"
                      x2="1"
                      y2="0"
                    >
                      <stop offset="0%" stopColor={colors.gradient[0]} />
                      <stop offset="100%" stopColor={colors.gradient[1]} />
                    </linearGradient>
                  );
                })}
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" opacity={0.3} />
              <XAxis
                dataKey="date"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: '#6B7280' }}
                tickFormatter={(date) => {
                  const d = new Date(date);
                  return `${d.getMonth() + 1}/${d.getDate()}`;
                }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: '#6B7280' }}
                width={45}
                tickFormatter={(value) => {
                  if (format === 'currency') {
                    if (value >= 1000) return `$${(value / 1000).toFixed(1)}k`;
                    return `$${value.toFixed(0)}`;
                  }
                  if (format === 'percentage') return `${value.toFixed(1)}%`;
                  if (format === 'multiplier') return `${value.toFixed(1)}x`;
                  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
                  return value.toFixed(0);
                }}
              />
              <Tooltip content={<CustomTooltip />} />
              {activePlatforms.map((p) => {
                const colors = PLATFORM_COLORS[p.platform];
                return (
                  <Line
                    key={p.platform}
                    type="monotone"
                    dataKey={p.platform}
                    stroke={`url(#gradient-${p.platform}-${metricKey})`}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{
                      r: 4,
                      strokeWidth: 2,
                      stroke: colors.primary,
                      fill: '#fff',
                    }}
                  />
                );
              })}
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="h-40 flex items-center justify-center text-sm text-gray-400 dark:text-gray-600">
          No data available
        </div>
      )}

      <div className="flex items-center justify-center gap-4 mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
        {activePlatforms.map((p) => {
          const colors = PLATFORM_COLORS[p.platform];
          return (
            <div key={p.platform} className="flex items-center gap-1.5">
              <div
                className="w-2 h-2 rounded-full"
                style={{
                  background: `linear-gradient(135deg, ${colors.gradient[0]}, ${colors.gradient[1]})`,
                }}
              />
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {getPlatformDisplayName(p.platform)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
