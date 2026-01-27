import React, { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ArrowUpRight, ArrowDownRight, Sparkles, Info, LucideIcon } from 'lucide-react';
import { PLATFORM_COLORS, PLATFORM_LABELS, type AdPlatform } from '@/types/crossPlatform';

interface ChartDataPoint {
  date: string;
  value?: number;
  facebook?: number;
  google?: number;
  tiktok?: number;
}

interface FlippablePerformanceCardProps {
  id: string;
  label: string;
  value: number;
  change: number;
  icon: LucideIcon;
  iconColor: string;
  iconBgColor: string;
  format?: 'currency' | 'percentage' | 'number';
  chartData: ChartDataPoint[];
  multiPlatformChartData?: ChartDataPoint[];
  enabledPlatforms?: AdPlatform[];
  hasRexInsight?: boolean;
  rexMessage?: string;
  isDragging?: boolean;
  showInfoIcon?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnd?: (e: React.DragEvent) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
}

export default function FlippablePerformanceCard({
  id,
  label,
  value,
  change,
  icon: Icon,
  iconColor,
  iconBgColor,
  format,
  chartData,
  multiPlatformChartData,
  enabledPlatforms = ['facebook', 'google', 'tiktok'],
  hasRexInsight,
  rexMessage,
  isDragging = false,
  showInfoIcon = false,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop
}: FlippablePerformanceCardProps) {
  const [isFlipped, setIsFlipped] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('[data-no-flip]')) return;
    setIsFlipped(!isFlipped);
  };

  const formatValue = (val: number) => {
    if (format === 'currency') {
      return `$${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    if (format === 'percentage') {
      return `${val.toFixed(2)}%`;
    }
    if (format === 'number') {
      return Math.round(val).toLocaleString();
    }
    return val.toFixed(2);
  };

  const hasMultiplePlatforms = enabledPlatforms && enabledPlatforms.length > 0;

  return (
    <div
      className="relative min-h-[280px]"
      style={{ perspective: '1000px' }}
      onClick={handleClick}
    >
      <div
        draggable={!!onDragStart}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onDragOver={onDragOver}
        onDrop={onDrop}
        className={`
          relative w-full h-full transition-transform duration-500 ease-in-out
          ${isDragging ? 'opacity-50 scale-95' : 'opacity-100'}
        `}
        style={{
          transformStyle: 'preserve-3d',
          transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)'
        }}
      >
        {/* Front Face */}
        <div
          className={`
            absolute inset-0 bg-gradient-to-b from-gray-50 to-white dark:from-[#2a2a2a]/50 dark:to-dark/50 shadow-sm rounded-2xl p-8 border
            ${onDragStart ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'}
            ${hasRexInsight
              ? 'border-red-300 dark:border-red-500/50 shadow-[0_0_15px_-3px_rgba(225,29,72,0.15)] dark:shadow-[0_0_15px_-3px_rgba(225,29,72,0.25)]'
              : 'border-gray-200/60 dark:border-[#3a3a3a]/60'
            }
          `}
          style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
        >
          {hasRexInsight && (
            <div className="absolute top-3 right-3 group/rex" data-no-flip>
              <div className="p-1.5 bg-gradient-to-r from-red-500 to-rose-500 rounded-lg shadow-sm cursor-help">
                <Sparkles className="w-3.5 h-3.5 text-white" />
              </div>
              <div className="absolute right-0 top-full mt-2 w-64 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-xl opacity-0 invisible group-hover/rex:opacity-100 group-hover/rex:visible transition-all duration-200 z-50">
                <div className="flex items-start gap-2">
                  <Sparkles className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-rose-400 mb-1">Revoa AI Insight</p>
                    <p className="text-gray-300 leading-relaxed">{rexMessage}</p>
                  </div>
                </div>
                <div className="absolute -top-1.5 right-4 w-3 h-3 bg-gray-900 rotate-45" />
              </div>
            </div>
          )}

          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <div className={`p-2 ${hasRexInsight ? 'bg-red-50 dark:bg-red-900/30' : iconBgColor} rounded-lg ${hasRexInsight ? 'text-red-500 dark:text-red-400' : iconColor}`}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">{label}</h3>
                {showInfoIcon && (
                  <div className="relative group/info" data-no-flip>
                    <Info className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 cursor-help" />
                    <div className="absolute left-0 top-full mt-2 w-56 p-2.5 bg-gray-900 dark:bg-[#1f1f1f] text-white text-xs rounded-lg shadow-xl opacity-0 invisible group-hover/info:opacity-100 group-hover/info:visible transition-all duration-200 z-50">
                      <p className="leading-relaxed">Sync your products in the Quotes page to see accurate profit metrics based on real COGS data from Revoa</p>
                      <div className="absolute -top-1.5 left-4 w-3 h-3 bg-gray-900 dark:bg-[#1f1f1f] rotate-45" />
                    </div>
                  </div>
                )}
              </div>
            </div>
            {change !== 0 && (
              <div className={`flex items-center text-sm ${change > 0 ? 'text-green-500' : 'text-red-500'}`}>
                {change > 0 ? <ArrowUpRight className="w-4 h-4 mr-1" /> : <ArrowDownRight className="w-4 h-4 mr-1" />}
                {Math.abs(change)}%
              </div>
            )}
          </div>

          <div className="text-2xl font-normal text-gray-900 dark:text-white mb-4">
            {formatValue(value)}
          </div>

          {chartData.length > 0 ? (
            <div className="h-32">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ left: 0, right: 5 }}>
                  <defs>
                    <linearGradient id={`gradient-front-${id}`} x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#E11D48" />
                      <stop offset="50%" stopColor="#EC4899" />
                      <stop offset="100%" stopColor="#E8795A" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#3a3a3a" opacity={0.3} />
                  <XAxis
                    dataKey="date"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: '#6B7280' }}
                    tickFormatter={(date) => {
                      const d = new Date(date);
                      return `${d.getMonth() + 1}/${d.getDate()}`;
                    }}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: '#6B7280' }}
                    width={35}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '0.5rem',
                      border: 'none',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                      backgroundColor: 'rgba(31, 31, 31, 0.95)',
                      fontSize: '11px'
                    }}
                    formatter={(val: number) => [formatValue(val), label]}
                    labelStyle={{ color: '#F9FAFB' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#6B7280"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 3, strokeWidth: 1.5, stroke: '#E11D48', fill: '#fff' }}
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

        {/* Back Face (Multi-Platform Chart) */}
        <div
          className="absolute inset-0 bg-gradient-to-b from-gray-50 to-white dark:from-[#2a2a2a]/50 dark:to-dark/50 shadow-sm rounded-2xl p-6 border border-gray-200/60 dark:border-[#3a3a3a]/60 cursor-pointer"
          style={{
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)'
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">{label} by Platform</h3>
            <div className="flex items-center gap-2">
              {hasMultiplePlatforms && enabledPlatforms.map(platform => (
                <div key={platform} className="flex items-center gap-1">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: PLATFORM_COLORS[platform] }}
                  />
                  <span className="text-[10px] text-gray-400">{PLATFORM_LABELS[platform]}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="h-[200px]">
            {multiPlatformChartData && multiPlatformChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={multiPlatformChartData} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#3a3a3a" opacity={0.3} />
                  <XAxis
                    dataKey="date"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 9, fill: '#6B7280' }}
                    tickFormatter={(date) => {
                      const d = new Date(date);
                      return `${d.getMonth() + 1}/${d.getDate()}`;
                    }}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 9, fill: '#6B7280' }}
                    width={40}
                    tickFormatter={(v) => {
                      if (format === 'currency') {
                        if (v >= 1000) return `$${(v/1000).toFixed(0)}K`;
                        return `$${v.toFixed(0)}`;
                      }
                      if (format === 'percentage') return `${v.toFixed(1)}%`;
                      if (v >= 1000) return `${(v/1000).toFixed(0)}K`;
                      return v.toFixed(0);
                    }}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '0.5rem',
                      border: 'none',
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                      backgroundColor: 'rgba(23, 23, 23, 0.95)',
                      padding: '8px 12px',
                      fontSize: '11px'
                    }}
                    labelStyle={{ color: '#F9FAFB', fontWeight: 600, marginBottom: '4px' }}
                    formatter={(val: number, name: string) => {
                      const platformLabel = PLATFORM_LABELS[name as AdPlatform] || name;
                      return [formatValue(val), platformLabel];
                    }}
                    labelFormatter={(date) => {
                      const d = new Date(date);
                      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                    }}
                  />
                  {enabledPlatforms.includes('facebook') && (
                    <Line
                      type="monotone"
                      dataKey="facebook"
                      stroke={PLATFORM_COLORS.facebook}
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 3, strokeWidth: 1.5, stroke: PLATFORM_COLORS.facebook, fill: '#fff' }}
                    />
                  )}
                  {enabledPlatforms.includes('google') && (
                    <Line
                      type="monotone"
                      dataKey="google"
                      stroke={PLATFORM_COLORS.google}
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 3, strokeWidth: 1.5, stroke: PLATFORM_COLORS.google, fill: '#fff' }}
                    />
                  )}
                  {enabledPlatforms.includes('tiktok') && (
                    <Line
                      type="monotone"
                      dataKey="tiktok"
                      stroke={PLATFORM_COLORS.tiktok}
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 3, strokeWidth: 1.5, stroke: PLATFORM_COLORS.tiktok, fill: '#fff' }}
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="text-2xl font-normal text-gray-900 dark:text-white mb-2">
                  {formatValue(value)}
                </div>
                <p className="text-xs text-gray-400 dark:text-gray-500 max-w-[200px]">
                  Multi-platform breakdown will appear when data is available
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
