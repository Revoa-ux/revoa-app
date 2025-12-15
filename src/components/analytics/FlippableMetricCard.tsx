import React, { useState } from 'react';
import {
  TrendingUp, BarChart3, DollarSign, Package, ShoppingCart, CreditCard,
  Receipt, RotateCcw, Clock, Wallet, Calendar, Target, RefreshCw,
  Percent, UserPlus, AlertTriangle, ArrowUpRight, ArrowDownRight, HelpCircle,
  Maximize2, Minimize2
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { MetricCardData } from '../../lib/analyticsService';
import { AdPlatform, PLATFORM_COLORS, PLATFORM_LABELS } from '../../types/crossPlatform';

interface ChartDataPoint {
  date: string;
  value?: number;
  facebook?: number;
  google?: number;
  tiktok?: number;
}

interface FlippableMetricCardProps {
  data: MetricCardData;
  chartData?: ChartDataPoint[];
  platforms?: AdPlatform[];
  isDragging?: boolean;
  isLoading?: boolean;
  isExpanded?: boolean;
  onExpand?: () => void;
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnd?: (e: React.DragEvent) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
  className?: string;
}

const iconMap: Record<string, React.ComponentType<any>> = {
  TrendingUp,
  BarChart3,
  DollarSign,
  Package,
  ShoppingCart,
  CreditCard,
  Receipt,
  RotateCcw,
  Clock,
  Wallet,
  Calendar,
  Target,
  RefreshCw,
  Percent,
  UserPlus,
  AlertTriangle,
  HelpCircle
};

export default function FlippableMetricCard({
  data,
  chartData = [],
  platforms,
  isDragging = false,
  isLoading = false,
  isExpanded = false,
  onExpand,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  className = ''
}: FlippableMetricCardProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const Icon = iconMap[data.icon] || HelpCircle;

  const handleExpandClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onExpand) {
      onExpand();
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('[data-no-flip]')) return;
    setIsFlipped(!isFlipped);
  };

  const renderChangeIndicator = (change: string, changeType: 'positive' | 'negative' | 'critical') => {
    if (changeType === 'critical') {
      return (
        <div className="flex items-center text-sm text-red-500 dark:text-red-400">
          <AlertTriangle className="w-4 h-4 mr-1" />
          {change}
        </div>
      );
    }

    const ChangeIcon = changeType === 'positive' ? ArrowUpRight : ArrowDownRight;
    return (
      <div className={`flex items-center text-sm ${
        changeType === 'positive' ? 'text-green-500 dark:text-green-400' : 'text-red-500 dark:text-red-400'
      }`}>
        <ChangeIcon className="w-4 h-4 mr-1" />
        {change}
      </div>
    );
  };

  const formatTooltipValue = (value: number) => {
    if (data.title.toLowerCase().includes('rate') || data.title.toLowerCase().includes('margin')) {
      return `${value.toFixed(1)}%`;
    }
    if (data.title.toLowerCase().includes('$') || data.title.toLowerCase().includes('revenue') ||
        data.title.toLowerCase().includes('profit') || data.title.toLowerCase().includes('spend') ||
        data.title.toLowerCase().includes('cogs') || data.title.toLowerCase().includes('balance')) {
      return `$${value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    }
    return value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  };

  const hasMultiplePlatforms = platforms && platforms.length > 0;

  return (
    <div
      className={`relative transition-all duration-300 ease-in-out ${
        isExpanded ? 'h-[350px] col-span-full' : 'h-[180px]'
      } ${className}`}
      style={{ perspective: '1000px' }}
      onClick={handleClick}
    >
      <div
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
          draggable={!!onDragStart}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          onDragOver={onDragOver}
          onDrop={onDrop}
          className={`
            absolute inset-0 p-4 rounded-xl
            bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700
            hover:bg-gray-50 dark:hover:bg-gray-700/50
            ${onDragStart ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'}
            ${isLoading ? 'animate-pulse' : ''}
          `}
          style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
        >
          {isLoading && (
            <div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 dark:via-gray-700/50 to-transparent"
              style={{
                backgroundSize: '200% 100%',
                animation: 'shimmer 2s infinite'
              }}
            />
          )}
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700">
                <Icon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              </div>
              {renderChangeIndicator(data.change, data.changeType)}
            </div>

            <div className="flex-1 flex flex-col">
              <div>
                <h3 className="text-xs text-gray-500 dark:text-gray-400">{data.title}</h3>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-0.5">
                  {data.mainValue}
                </p>
              </div>

              <div className="mt-auto space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {data.dataPoint1.label}
                  </span>
                  <span className="text-xs font-medium text-gray-900 dark:text-white">
                    {data.dataPoint1.value}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {data.dataPoint2.label}
                  </span>
                  <span className="text-xs font-medium text-gray-900 dark:text-white">
                    {data.dataPoint2.value}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Back Face (Chart View) */}
        <div
          className={`
            absolute inset-0 p-4 rounded-xl cursor-pointer
            bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700
            hover:bg-gray-50 dark:hover:bg-gray-700/50
          `}
          style={{
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)'
          }}
        >
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400">{data.title}</h3>
              <div className="flex items-center gap-2">
                {hasMultiplePlatforms && (
                  <div className="flex items-center gap-1.5">
                    {platforms.map(platform => (
                      <div key={platform} className="flex items-center gap-1">
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: PLATFORM_COLORS[platform] }}
                        />
                        <span className="text-[10px] text-gray-400">{PLATFORM_LABELS[platform]}</span>
                      </div>
                    ))}
                  </div>
                )}
                {onExpand && (
                  <button
                    onClick={handleExpandClick}
                    data-no-flip
                    className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    title={isExpanded ? 'Collapse chart' : 'Expand chart'}
                  >
                    {isExpanded ? (
                      <Minimize2 className="w-4 h-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" />
                    ) : (
                      <Maximize2 className="w-4 h-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" />
                    )}
                  </button>
                )}
              </div>
            </div>

            <div className="flex-1 min-h-0">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id={`gradient-${data.id}`} x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#E11D48" />
                        <stop offset="50%" stopColor="#EC4899" />
                        <stop offset="100%" stopColor="#E8795A" />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" opacity={0.3} />
                    <XAxis
                      dataKey="date"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: isExpanded ? 10 : 9, fill: '#6B7280' }}
                      tickFormatter={(date) => {
                        const d = new Date(date);
                        return `${d.getMonth() + 1}/${d.getDate()}`;
                      }}
                      interval={isExpanded ? 'preserveStartEnd' : 'preserveStartEnd'}
                      minTickGap={isExpanded ? 30 : 50}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 9, fill: '#6B7280' }}
                      width={35}
                      tickFormatter={(v) => {
                        if (v >= 1000000) return `${(v/1000000).toFixed(1)}M`;
                        if (v >= 1000) return `${(v/1000).toFixed(0)}K`;
                        return v.toFixed(0);
                      }}
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: '0.5rem',
                        border: 'none',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                        backgroundColor: 'rgba(17, 24, 39, 0.95)',
                        backdropFilter: 'blur(8px)',
                        padding: '8px 12px',
                        fontSize: '11px'
                      }}
                      labelStyle={{ color: '#F9FAFB', fontWeight: 600, marginBottom: '4px' }}
                      formatter={(value: number, name: string) => {
                        const label = hasMultiplePlatforms ? PLATFORM_LABELS[name as AdPlatform] || name : data.title;
                        return [formatTooltipValue(value), label];
                      }}
                      labelFormatter={(date) => {
                        const d = new Date(date);
                        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                      }}
                    />
                    {hasMultiplePlatforms ? (
                      platforms.map(platform => (
                        <Line
                          key={platform}
                          type="monotone"
                          dataKey={platform}
                          stroke={PLATFORM_COLORS[platform]}
                          strokeWidth={2}
                          dot={false}
                          activeDot={{ r: 3, strokeWidth: 1.5, stroke: PLATFORM_COLORS[platform], fill: '#fff' }}
                        />
                      ))
                    ) : (
                      <Line
                        type="monotone"
                        dataKey="value"
                        stroke={`url(#gradient-${data.id})`}
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 3, strokeWidth: 1.5, stroke: '#E11D48', fill: '#fff' }}
                      />
                    )}
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center px-4">
                  <div className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    {data.mainValue}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    No trend data for this period
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
