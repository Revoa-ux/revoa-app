import React, { useState } from 'react';
import { Search, Filter, Check } from 'lucide-react';
import { Quote } from '@/types/quotes';
import { getStatusText } from './QuoteStatus';
import { useClickOutside } from '@/lib/useClickOutside';
import { FilterButton } from '@/components/FilterButton';

interface QuoteFiltersProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
  statusFilter: Quote['status'] | 'all';
  onStatusFilterChange: (status: Quote['status'] | 'all') => void;
}

export const QuoteFilters: React.FC<QuoteFiltersProps> = ({
  searchTerm,
  onSearchChange,
  statusFilter,
  onStatusFilterChange
}) => {
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const statusDropdownRef = React.useRef<HTMLDivElement>(null);

  useClickOutside(statusDropdownRef, () => setShowStatusDropdown(false));

  const selectedStatusLabel = statusFilter === 'all' ? 'All' : getStatusText(statusFilter);
  const isFiltered = statusFilter !== 'all';

  return (
    <div className="flex items-stretch gap-3 w-full sm:w-auto">
      <div className="relative flex-[2] sm:w-[280px] sm:flex-initial">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
        <input
          type="text"
          placeholder="Search quotes..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="search-input w-full"
        />
      </div>

      <div className="relative" ref={statusDropdownRef}>
        <FilterButton
          icon={Filter}
          label="Status"
          selectedLabel={selectedStatusLabel}
          onClick={() => setShowStatusDropdown(!showStatusDropdown)}
          isActive={isFiltered}
          activeCount={isFiltered ? 1 : 0}
          hideLabel="md"
          isOpen={showStatusDropdown}
        />

        {showStatusDropdown && (
          <div className="absolute right-0 z-50 w-[200px] sm:w-auto sm:min-w-[200px] mt-2 bg-white dark:bg-dark rounded-lg shadow-lg border border-gray-200 dark:border-[#3a3a3a] overflow-hidden">
            <button
              onClick={() => {
                onStatusFilterChange('all');
                setShowStatusDropdown(false);
              }}
              className="flex items-center justify-between w-full px-4 py-2.5 text-sm text-left text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#3a3a3a] transition-colors"
            >
              <span>All Products</span>
              {statusFilter === 'all' && <Check className="w-4 h-4 text-rose-500 dark:text-rose-400" />}
            </button>
            {(['quote_pending', 'quoted', 'rejected', 'expired', 'accepted', 'pending_reacceptance', 'synced_with_shopify', 'cancelled'] as const).map((status, index, array) => (
              <button
                key={status}
                onClick={() => {
                  onStatusFilterChange(status);
                  setShowStatusDropdown(false);
                }}
                className={`flex items-center justify-between w-full px-4 py-2.5 text-sm text-left text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#3a3a3a] transition-colors ${
                  index === array.length - 1 ? 'rounded-b-lg' : ''
                }`}
              >
                <span>{getStatusText(status)}</span>
                {statusFilter === status && <Check className="w-4 h-4 text-rose-500 dark:text-rose-400" />}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};