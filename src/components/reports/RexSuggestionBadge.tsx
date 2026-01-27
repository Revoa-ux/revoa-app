import React from 'react';
import { ChevronDown, TrendingUp, TrendingDown } from 'lucide-react';
import type { RexSuggestionStatus } from '@/types/rex';

interface RexSuggestionBadgeProps {
  status: RexSuggestionStatus;
  priorityScore?: number;
  isImproving?: boolean;
  isExpanded?: boolean;
  onClick?: (e: React.MouseEvent) => void;
  onDismiss?: (e: React.MouseEvent) => void;
}

export const RexSuggestionBadge: React.FC<RexSuggestionBadgeProps> = ({
  status,
  priorityScore,
  isImproving,
  isExpanded = false,
  onClick,
  onDismiss
}) => {
  const getBadgeStyle = () => {
    switch (status) {
      case 'pending':
      case 'viewed':
        return {
          icon: ChevronDown,
          iconColor: 'text-red-500',
          bgColor: 'bg-red-50 dark:bg-red-900/10',
          hoverBg: 'hover:bg-red-100 dark:hover:bg-red-900/20',
          pulse: true
        };
      case 'accepted':
        return {
          icon: ChevronDown,
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
          icon: ChevronDown,
          iconColor: 'text-gray-500',
          bgColor: 'bg-gray-50 dark:bg-dark/10',
          hoverBg: 'hover:bg-gray-100 dark:hover:bg-[#1f1f1f]/20',
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

  return (
    <button
      onClick={isClickable ? onClick : undefined}
      disabled={!isClickable}
      className={`
        group relative inline-flex items-center justify-center w-9 h-9 rounded-lg
        ${badgeStyle.bgColor} ${badgeStyle.iconColor}
        ${isClickable ? `cursor-pointer transition-all duration-200 ${badgeStyle.hoverBg}` : 'cursor-default'}
      `}
      title={isExpanded ? 'Collapse details' : 'Expand details'}
    >
      <Icon className={`w-5 h-5 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
    </button>
  );
};
