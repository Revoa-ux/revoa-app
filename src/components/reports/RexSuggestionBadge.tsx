import React from 'react';
import { Sparkles, TrendingUp, TrendingDown } from 'lucide-react';
import type { RexSuggestionStatus } from '@/types/rex';

interface RexSuggestionBadgeProps {
  status: RexSuggestionStatus;
  priorityScore?: number;
  isImproving?: boolean;
  onClick?: () => void;
}

export const RexSuggestionBadge: React.FC<RexSuggestionBadgeProps> = ({
  status,
  priorityScore,
  isImproving,
  onClick
}) => {
  const getBadgeStyle = () => {
    switch (status) {
      case 'pending':
      case 'viewed':
        return {
          container: 'bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600',
          text: 'text-white',
          icon: Sparkles,
          label: 'Rex Suggestion',
          pulse: true
        };
      case 'accepted':
        return {
          container: 'bg-gradient-to-r from-blue-500 to-cyan-500',
          text: 'text-white',
          icon: Sparkles,
          label: 'Rex Accepted',
          pulse: false
        };
      case 'applied':
      case 'monitoring':
        return {
          container: 'bg-gradient-to-r from-green-500 to-emerald-500',
          text: 'text-white',
          icon: isImproving ? TrendingUp : TrendingDown,
          label: 'Rex Rule Active',
          pulse: false
        };
      case 'completed':
        return {
          container: 'bg-gradient-to-r from-gray-500 to-gray-600',
          text: 'text-white',
          icon: Sparkles,
          label: 'Rex Completed',
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
        group relative inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-md text-xs font-medium
        ${badgeStyle.container} ${badgeStyle.text}
        ${isClickable ? 'cursor-pointer transition-all duration-200 hover:shadow-lg' : 'cursor-default'}
        ${badgeStyle.pulse ? 'animate-pulse' : ''}
      `}
      title={isClickable ? 'Click to view Rex\'s suggestion' : undefined}
    >
      <Icon className="w-3.5 h-3.5" />
      <span>{badgeStyle.label}</span>

      {priorityScore && priorityScore >= 90 && status === 'pending' && (
        <span className="absolute -top-1 -right-1 w-2 h-2 bg-yellow-400 rounded-full border border-white"
              title="High priority" />
      )}

      {isImproving !== undefined && (status === 'applied' || status === 'monitoring') && (
        <span className={`ml-1 text-xs ${isImproving ? 'text-green-100' : 'text-red-100'}`}>
          {isImproving ? '↑' : '↓'}
        </span>
      )}
    </button>
  );
};
