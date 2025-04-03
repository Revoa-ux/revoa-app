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
    <div className="flex items-center space-x-4">
      <div className="relative w-[280px]">
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
        <button
          onClick={() => setShowStatusDropdown(!showStatusDropdown)}
          className="filter-button min-w-[180px] rounded-lg"
        >
          <div className="flex items-center">
            <Filter className="w-4 h-4 text-gray-400 mr-2" />
            <span>Status: {statusFilter === 'all' ? 'All' : getStatusText(statusFilter)}</span>
          </div>
          <ChevronDown className="w-4 h-4 text-gray-400" />
        </button>

        {showStatusDropdown && (
          <div className="absolute z-50 w-full mt-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1">
            <button
              onClick={() => {
                onStatusFilterChange('all');
                setShowStatusDropdown(false);
              }}
              className="flex items-center justify-between w-full px-4 py-2 text-sm text-left text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <span>All Products</span>
              {statusFilter === 'all' && <Check className="w-4 h-4 text-primary-500" />}
            </button>
            {(['quote_pending', 'quoted', 'rejected', 'expired', 'accepted', 'synced_with_shopify'] as const).map((status) => (
              <button
                key={status}
                onClick={() => {
                  onStatusFilterChange(status);
                  setShowStatusDropdown(false);
                }}
                className="flex items-center justify-between w-full px-4 py-2 text-sm text-left text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
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