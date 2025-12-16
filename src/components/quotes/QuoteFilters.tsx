import React, { useState } from 'react';
import { Search, Filter, ChevronDown, Check } from 'lucide-react';
import { Quote } from '@/types/quotes';
import { getStatusText } from './QuoteStatus';
import { useClickOutside } from '@/lib/useClickOutside';

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

  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:space-x-4 w-full sm:w-auto">
      <div className="relative flex-1 sm:w-[280px] sm:flex-initial">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
        <input
          type="text"
          placeholder="Search quotes..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="search-input w-full"
        />
      </div>

      <div className="relative flex-1 sm:flex-initial" ref={statusDropdownRef}>
        <button
          onClick={() => setShowStatusDropdown(!showStatusDropdown)}
          className="filter-button w-full sm:min-w-[180px] rounded-lg"
        >
          <div className="flex items-center">
            <Filter className="w-4 h-4 text-gray-400 mr-2" />
            <span className="truncate">Status: {statusFilter === 'all' ? 'All' : getStatusText(statusFilter)}</span>
          </div>
          <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
        </button>

        {showStatusDropdown && (
          <div className="absolute right-0 z-50 w-full sm:w-auto sm:min-w-[200px] mt-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <button
              onClick={() => {
                onStatusFilterChange('all');
                setShowStatusDropdown(false);
              }}
              className="flex items-center justify-between w-full px-4 py-2.5 text-sm text-left text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <span>All Products</span>
              {statusFilter === 'all' && <Check className="w-4 h-4 text-primary-500" />}
            </button>
            {(['quote_pending', 'quoted', 'rejected', 'expired', 'accepted', 'pending_reacceptance', 'synced_with_shopify', 'cancelled'] as const).map((status, index, array) => (
              <button
                key={status}
                onClick={() => {
                  onStatusFilterChange(status);
                  setShowStatusDropdown(false);
                }}
                className={`flex items-center justify-between w-full px-4 py-2.5 text-sm text-left text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                  index === array.length - 1 ? 'rounded-b-lg' : ''
                }`}
              >
                <span>{getStatusText(status)}</span>
                {statusFilter === status && <Check className="w-4 h-4 text-primary-500" />}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};