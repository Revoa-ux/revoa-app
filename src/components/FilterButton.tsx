import React from 'react';
import { ChevronDown, LucideIcon } from 'lucide-react';

interface FilterButtonProps {
  icon: LucideIcon;
  label: string;
  selectedLabel?: string;
  onClick: () => void;
  isActive?: boolean;
  activeCount?: number;
  className?: string;
  hideLabel?: 'never' | 'md' | 'sm';
  fullWidth?: boolean;
}

export const FilterButton: React.FC<FilterButtonProps> = ({
  icon: Icon,
  label,
  selectedLabel,
  onClick,
  isActive = false,
  activeCount,
  className = '',
  hideLabel = 'md',
  fullWidth = false,
}) => {
  const showBadge = activeCount !== undefined && activeCount > 0;

  return (
    <button
      onClick={onClick}
      className={`
        relative px-3 py-1.5 text-sm
        bg-white dark:bg-gray-800
        border ${isActive ? 'border-blue-500 dark:border-blue-400' : 'border-gray-200 dark:border-gray-700'}
        rounded-lg
        hover:bg-gray-50 dark:hover:bg-gray-700/50
        transition-colors
        flex items-center gap-1.5
        ${fullWidth ? 'w-full justify-between' : 'justify-center sm:justify-between'}
        ${hideLabel === 'md' ? 'min-w-[40px] sm:min-w-[100px]' : ''}
        ${hideLabel === 'sm' ? 'min-w-[40px] md:min-w-[100px]' : ''}
        ${className}
      `}
    >
      <div className="flex items-center gap-1.5 min-w-0">
        <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${isActive ? 'text-blue-500 dark:text-blue-400' : 'text-gray-400'}`} />

        {/* Label - hidden on mobile for 'md', hidden on mobile/tablet for 'sm' */}
        {hideLabel === 'md' && (
          <span className="hidden sm:inline text-gray-500 dark:text-gray-400 text-xs whitespace-nowrap">
            {label}:
          </span>
        )}
        {hideLabel === 'sm' && (
          <span className="hidden md:inline text-gray-500 dark:text-gray-400 text-xs whitespace-nowrap">
            {label}:
          </span>
        )}
        {hideLabel === 'never' && (
          <span className="text-gray-500 dark:text-gray-400 text-xs whitespace-nowrap">
            {label}:
          </span>
        )}

        {/* Selected value - always visible when hideLabel is not 'never' */}
        {selectedLabel && hideLabel !== 'never' && (
          <span className={`text-gray-700 dark:text-gray-300 text-sm truncate ${hideLabel === 'md' ? 'inline' : hideLabel === 'sm' ? 'inline' : ''}`}>
            {selectedLabel}
          </span>
        )}

        {/* Badge on mobile when active */}
        {showBadge && (
          <span className="sm:hidden absolute -top-1 -right-1 w-5 h-5 bg-blue-500 text-white text-xs rounded-full flex items-center justify-center">
            {activeCount}
          </span>
        )}
      </div>

      <ChevronDown className={`w-3.5 h-3.5 flex-shrink-0 ${isActive ? 'text-blue-500 dark:text-blue-400' : 'text-gray-400'} ${hideLabel === 'never' ? 'inline' : 'hidden sm:inline'}`} />
    </button>
  );
};
