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
  showChevron?: boolean;
  isOpen?: boolean;
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
  showChevron = true,
  isOpen = false,
}) => {
  const showBadge = activeCount !== undefined && activeCount > 0;

  return (
    <button
      onClick={onClick}
      className={`
        relative px-3 h-[38px] text-sm
        bg-white dark:bg-dark
        border ${isActive ? 'border-rose-500 dark:border-rose-400 shadow-sm' : 'border-gray-200 dark:border-[#3a3a3a]'}
        rounded-lg
        hover:bg-gray-50 dark:hover:bg-[#3a3a3a]/50
        transition-all duration-200
        flex items-center gap-2
        ${fullWidth ? 'w-full justify-between' : 'justify-center lg:justify-between'}
        ${hideLabel === 'md' ? 'min-w-[40px] lg:min-w-[120px]' : ''}
        ${hideLabel === 'sm' ? 'min-w-[40px] md:min-w-[120px]' : ''}
        ${className}
      `}
    >
      <div className="flex items-center gap-2 min-w-0">
        <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-rose-500 dark:text-rose-400' : 'text-gray-400 dark:text-gray-500'}`} />

        {hideLabel === 'md' && (
          <span className={`hidden lg:inline text-sm whitespace-nowrap ${isActive ? 'text-gray-900 dark:text-white font-medium' : 'text-gray-600 dark:text-gray-400'}`}>
            {selectedLabel || label}
          </span>
        )}
        {hideLabel === 'sm' && (
          <span className={`hidden md:inline text-sm whitespace-nowrap ${isActive ? 'text-gray-900 dark:text-white font-medium' : 'text-gray-600 dark:text-gray-400'}`}>
            {selectedLabel || label}
          </span>
        )}
        {hideLabel === 'never' && (
          <span className={`text-sm whitespace-nowrap ${isActive ? 'text-gray-900 dark:text-white font-medium' : 'text-gray-600 dark:text-gray-400'}`}>
            {selectedLabel || label}
          </span>
        )}

        {showBadge && (
          <span className="lg:hidden absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 bg-gradient-to-r from-rose-500 to-rose-600 text-white text-[10px] font-medium rounded-full flex items-center justify-center shadow-sm">
            {activeCount}
          </span>
        )}
      </div>

      {showChevron && (
        <ChevronDown className={`w-4 h-4 flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''} ${isActive ? 'text-rose-500 dark:text-rose-400' : 'text-gray-400 dark:text-gray-500'} ${hideLabel === 'never' ? 'inline' : 'hidden lg:inline'}`} />
      )}
    </button>
  );
};
