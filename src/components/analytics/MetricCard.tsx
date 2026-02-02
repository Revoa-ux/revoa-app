import React from 'react';
import {
  TrendingUp, BarChart3, DollarSign, Package, ShoppingCart, CreditCard,
  Receipt, RotateCcw, Clock, Wallet, Calendar, Target, RefreshCw,
  Percent, UserPlus, AlertTriangle, ArrowUpRight, ArrowDownRight, HelpCircle
} from 'lucide-react';
import { MetricCardData } from '../../lib/analyticsService';

interface MetricCardProps {
  data: MetricCardData;
  isDragging?: boolean;
  isLoading?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnd?: (e: React.DragEvent) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
  className?: string;
}

// Icon mapping
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

export default function MetricCard({
  data,
  isDragging = false,
  isLoading = false,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  className = ''
}: MetricCardProps) {
  const Icon = iconMap[data.icon] || HelpCircle;

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

  return (
    <div
      draggable={!!onDragStart}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDrop={onDrop}
      className={`
        h-[180px] p-4 rounded-xl cursor-grab active:cursor-grabbing
        transition-all duration-200 relative overflow-hidden
        bg-gradient-to-b from-gray-50 to-white dark:from-[#2a2a2a]/50 dark:to-[#1f1f1f]/50
        border border-gray-200/60 dark:border-[#333333]/60
        hover:shadow-md
        ${isDragging ? 'opacity-50 scale-95' : 'opacity-100 scale-100'}
        ${isLoading ? 'animate-pulse' : ''}
        ${className}
      `}
    >
      {isLoading && (
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 dark:via-gray-700/50 to-transparent animate-shimmer"
             style={{
               backgroundSize: '200% 100%',
               animation: 'shimmer 2s infinite'
             }}
        />
      )}
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between mb-2">
          <div className="p-2 rounded-lg bg-gray-100 dark:bg-[#2a2a2a]">
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
  );
}
