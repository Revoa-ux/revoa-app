import React from 'react';
import { ChevronRight, TrendingUp, TrendingDown, X } from 'lucide-react';
import type { RexSuggestionStatus } from '@/types/rex';

interface RexSuggestionBadgeProps {
  status: RexSuggestionStatus;
  priorityScore?: number;
  isImproving?: boolean;
  onClick?: () => void;
  onDismiss?: (e: React.MouseEvent) => void;
}

export const RexSuggestionBadge: React.FC<RexSuggestionBadgeProps> = ({
  status,
  priorityScore,
  isImproving,
  onClick,
  onDismiss
}) => {
  const getBadgeStyle = () => {
    switch (status) {
      case 'pending':
      case 'viewed':
        return {
          icon: ChevronRight,
          iconColor: 'text-red-500',
          bgColor: 'bg-red-50 dark:bg-red-900/10',
          hoverBg: 'hover:bg-red-100 dark:hover:bg-red-900/20',
          pulse: true
        };
      case 'accepted':
        return {
          icon: ChevronRight,
          iconColor: 'text-blue-500',
          bgColor: 'bg-blue-50 dark:bg-blue-900/10',
          hoverBg: 'hover:bg-blue-100 dark:hover:bg-blue-900/20',
          pulse: false
        };
      case 'applied':
      case 'monitoring':
        return {
          icon: isImproving ? TrendingUp : TrendingDown,
          iconColor: isImproving ? 'text-green-500' : 'text-orange-500',
          bgColor: isImproving ? 'bg-green-50 dark:bg-green-900/10' : 'bg-orange-50 dark:bg-orange-900/10',
          hoverBg: isImproving ? 'hover:bg-green-100 dark:hover:bg-green-900/20' : 'hover:bg-orange-100 dark:hover:bg-orange-900/20',
          pulse: false
        };
      case 'completed':
        return {
          icon: ChevronRight,
          iconColor: 'text-gray-500',
          bgColor: 'bg-gray-50 dark:bg-gray-900/10',
          hoverBg: 'hover:bg-gray-100 dark:hover:bg-gray-900/20',
          pulse: false
        };
      default:
        return null;
    }
  };

  const badgeStyle = getBadgeStyle();

  if (!badgeStyle) return null;

  const Icon = badgeStyle.icon;
  const isClickable = status === 'pending' || status === 'viewed' || status === 'applied' || status === 'monitoring';
  const showDismiss = (status === 'pending' || status === 'viewed') && onDismiss;

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={isClickable ? onClick : undefined}
        disabled={!isClickable}
        className={`
          group relative inline-flex items-center justify-center w-8 h-8 rounded-lg
          ${badgeStyle.bgColor} ${badgeStyle.iconColor}
          ${isClickable ? `cursor-pointer transition-all duration-200 ${badgeStyle.hoverBg}` : 'cursor-default'}
          ${badgeStyle.pulse ? 'animate-pulse' : ''}
        `}
        title={isClickable ? 'View suggestion' : undefined}
      >
        <Icon className="w-4 h-4" />

        {priorityScore && priorityScore >= 90 && status === 'pending' && (
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-yellow-400 rounded-full border border-white dark:border-gray-800"
                title="High priority" />
        )}
      </button>

      {showDismiss && (
        <button
          onClick={onDismiss}
          className="inline-flex items-center justify-center w-6 h-6 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          title="Dismiss suggestion"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};
