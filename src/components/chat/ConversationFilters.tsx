import React, { useRef, useState } from 'react';
import { Search, Filter, ChevronDown, X, Check, SlidersHorizontal } from 'lucide-react';
import { useClickOutside } from '@/lib/useClickOutside';
import { ChatFilters } from '@/lib/chatService';

interface ConversationFiltersProps {
  filters: ChatFilters;
  onFiltersChange: (filters: ChatFilters) => void;
  searchTerm: string;
  onSearchChange: (search: string) => void;
}

export const ConversationFilters: React.FC<ConversationFiltersProps> = ({
  filters,
  onFiltersChange,
  searchTerm,
  onSearchChange,
}) => {
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showUserTypeDropdown, setShowUserTypeDropdown] = useState(false);
  const [showSortDropdown, setShowSortDropdown] = useState(false);

  const statusDropdownRef = useRef<HTMLDivElement>(null);
  const userTypeDropdownRef = useRef<HTMLDivElement>(null);
  const sortDropdownRef = useRef<HTMLDivElement>(null);

  useClickOutside(statusDropdownRef, () => setShowStatusDropdown(false));
  useClickOutside(userTypeDropdownRef, () => setShowUserTypeDropdown(false));
  useClickOutside(sortDropdownRef, () => setShowSortDropdown(false));

  const statusOptions = [
    { value: 'all', label: 'All Conversations' },
    { value: 'unread', label: 'Unread Only' },
    { value: 'archived', label: 'Archived' },
    { value: 'flagged', label: 'Flagged' },
  ];

  const userTypeOptions = [
    { value: 'all', label: 'All Users' },
    { value: 'new', label: 'New Users (7 days)' },
    { value: 'active', label: 'Active Users' },
    { value: 'inactive', label: 'Inactive (30+ days)' },
  ];

  const sortOptions = [
    { value: 'recent', label: 'Most Recent' },
    { value: 'oldest', label: 'Oldest First' },
    { value: 'volume', label: 'Highest Volume' },
    { value: 'messages', label: 'Most Messages' },
    { value: 'alphabetical', label: 'Alphabetical' },
  ];

  const handleClearFilters = () => {
    onFiltersChange({
      status: 'all',
      userType: 'all',
      sortBy: 'recent',
    });
    onSearchChange('');
  };

  const activeFilterCount = [
    filters.status !== 'all' ? 1 : 0,
    filters.userType !== 'all' ? 1 : 0,
    searchTerm ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  return (
    <div className="p-3 border-b border-gray-200 dark:border-gray-700 space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
        <input
          type="text"
          placeholder="Search conversations..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-9 pr-9 py-2 text-sm bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-300 dark:focus:ring-gray-600 focus:border-gray-200 dark:focus:border-gray-600"
        />
        {searchTerm && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors"
          >
            <X className="w-3 h-3 text-gray-400" />
          </button>
        )}
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="relative" ref={statusDropdownRef}>
            <button
              onClick={() => setShowStatusDropdown(!showStatusDropdown)}
              className="px-2.5 py-1.5 text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors flex items-center space-x-1"
            >
              <Filter className="w-3 h-3 text-gray-400" />
              <span className="text-gray-700 dark:text-gray-300">
                {statusOptions.find(opt => opt.value === filters.status)?.label.split(' ')[0] || 'All'}
              </span>
              <ChevronDown className="w-3 h-3 text-gray-400" />
            </button>

            {showStatusDropdown && (
              <div className="absolute z-50 w-44 mt-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1">
                {statusOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => {
                      onFiltersChange({ ...filters, status: option.value as any });
                      setShowStatusDropdown(false);
                    }}
                    className="flex items-center justify-between w-full px-3 py-2 text-xs text-left text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                  >
                    <span>{option.label}</span>
                    {filters.status === option.value && <Check className="w-3 h-3 text-gray-900 dark:text-gray-100" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="relative" ref={userTypeDropdownRef}>
            <button
              onClick={() => setShowUserTypeDropdown(!showUserTypeDropdown)}
              className="px-2.5 py-1.5 text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors flex items-center space-x-1"
            >
              <SlidersHorizontal className="w-3 h-3 text-gray-400" />
              <span className="text-gray-700 dark:text-gray-300">
                {userTypeOptions.find(opt => opt.value === filters.userType)?.label.split(' ')[0] || 'All'}
              </span>
              <ChevronDown className="w-3 h-3 text-gray-400" />
            </button>

            {showUserTypeDropdown && (
              <div className="absolute z-50 w-48 mt-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1">
                {userTypeOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => {
                      onFiltersChange({ ...filters, userType: option.value as any });
                      setShowUserTypeDropdown(false);
                    }}
                    className="flex items-center justify-between w-full px-3 py-2 text-xs text-left text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                  >
                    <span>{option.label}</span>
                    {filters.userType === option.value && <Check className="w-3 h-3 text-gray-900 dark:text-gray-100" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="relative" ref={sortDropdownRef}>
          <button
            onClick={() => setShowSortDropdown(!showSortDropdown)}
            className="px-2.5 py-1.5 text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors flex items-center space-x-1"
          >
            <span className="text-gray-700 dark:text-gray-300">
              {sortOptions.find(opt => opt.value === filters.sortBy)?.label || 'Sort'}
            </span>
            <ChevronDown className="w-3 h-3 text-gray-400" />
          </button>

          {showSortDropdown && (
            <div className="absolute z-50 right-0 w-40 mt-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1">
              {sortOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => {
                    onFiltersChange({ ...filters, sortBy: option.value as any });
                    setShowSortDropdown(false);
                  }}
                  className="flex items-center justify-between w-full px-3 py-2 text-xs text-left text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                >
                  <span>{option.label}</span>
                  {filters.sortBy === option.value && <Check className="w-3 h-3 text-gray-900 dark:text-gray-100" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {activeFilterCount > 0 && (
        <div className="flex items-center justify-between pt-1">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {activeFilterCount} filter{activeFilterCount !== 1 ? 's' : ''} applied
          </span>
          <button
            onClick={handleClearFilters}
            className="text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 underline"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  );
};
