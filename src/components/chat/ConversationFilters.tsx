import React, { useRef, useState, useEffect } from 'react';
import { Search, Filter, ChevronDown, X, Check, Tag as TagIcon } from 'lucide-react';
import { useClickOutside } from '@/lib/useClickOutside';
import { ChatFilters } from '@/lib/chatService';
import { ConversationTag, conversationTagService } from '@/lib/conversationTagService';

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
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [showTagDropdown, setShowTagDropdown] = useState(false);
  const [tags, setTags] = useState<ConversationTag[]>([]);

  const filterDropdownRef = useRef<HTMLDivElement>(null);
  const sortDropdownRef = useRef<HTMLDivElement>(null);
  const tagDropdownRef = useRef<HTMLDivElement>(null);

  useClickOutside(filterDropdownRef, () => setShowFilterDropdown(false));
  useClickOutside(sortDropdownRef, () => setShowSortDropdown(false));
  useClickOutside(tagDropdownRef, () => setShowTagDropdown(false));

  useEffect(() => {
    loadTags();
  }, []);

  const loadTags = async () => {
    try {
      const allTags = await conversationTagService.getTags();
      setTags(allTags);
    } catch (error) {
      console.error('Error loading tags:', error);
    }
  };

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
      tagIds: [],
    });
    onSearchChange('');
  };

  const toggleTag = (tagId: string) => {
    const currentTags = filters.tagIds || [];
    const newTags = currentTags.includes(tagId)
      ? currentTags.filter(id => id !== tagId)
      : [...currentTags, tagId];
    onFiltersChange({ ...filters, tagIds: newTags });
  };

  const activeFilterCount = [
    filters.status !== 'all' ? 1 : 0,
    filters.userType !== 'all' ? 1 : 0,
    searchTerm ? 1 : 0,
    (filters.tagIds && filters.tagIds.length > 0) ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  const getFilterLabel = () => {
    const activeFilters = [];
    if (filters.status !== 'all') {
      activeFilters.push(statusOptions.find(opt => opt.value === filters.status)?.label.split(' ')[0]);
    }
    if (filters.userType !== 'all') {
      activeFilters.push(userTypeOptions.find(opt => opt.value === filters.userType)?.label.split(' ')[0]);
    }

    if (activeFilters.length === 0) return 'All';
    if (activeFilters.length === 1) return activeFilters[0];
    return `${activeFilters.length} Filters`;
  };

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
          <div className="relative" ref={filterDropdownRef}>
            <button
              onClick={() => setShowFilterDropdown(!showFilterDropdown)}
              className="px-2.5 py-1.5 text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors flex items-center space-x-1"
            >
              <Filter className="w-3 h-3 text-gray-400" />
              <span className="text-gray-700 dark:text-gray-300">
                {getFilterLabel()}
              </span>
              <ChevronDown className="w-3 h-3 text-gray-400" />
            </button>

            {showFilterDropdown && (
              <div className="absolute z-50 w-52 mt-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="py-1">
                  <div className="px-3 py-1.5 text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Conversations
                  </div>
                  {statusOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => {
                        onFiltersChange({ ...filters, status: option.value as any });
                      }}
                      className="flex items-center justify-between w-full px-3 py-2 text-xs text-left text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                    >
                      <span>{option.label}</span>
                      {filters.status === option.value && <Check className="w-3 h-3 text-gray-900 dark:text-gray-100" />}
                    </button>
                  ))}
                </div>

                <div className="border-t border-gray-200 dark:border-gray-700" />

                <div className="py-1">
                  <div className="px-3 py-1.5 text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Users
                  </div>
                  {userTypeOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => {
                        onFiltersChange({ ...filters, userType: option.value as any });
                      }}
                      className="flex items-center justify-between w-full px-3 py-2 text-xs text-left text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                    >
                      <span>{option.label}</span>
                      {filters.userType === option.value && <Check className="w-3 h-3 text-gray-900 dark:text-gray-100" />}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="relative" ref={tagDropdownRef}>
            <button
              onClick={() => setShowTagDropdown(!showTagDropdown)}
              className="px-2.5 py-1.5 text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors flex items-center space-x-1"
            >
              <TagIcon className="w-3 h-3 text-gray-400" />
              <span className="text-gray-700 dark:text-gray-300">
                {filters.tagIds && filters.tagIds.length > 0 ? `${filters.tagIds.length} Tag${filters.tagIds.length > 1 ? 's' : ''}` : 'Tags'}
              </span>
              <ChevronDown className="w-3 h-3 text-gray-400" />
            </button>

            {showTagDropdown && (
              <div className="absolute z-50 left-0 w-56 mt-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden max-h-96 overflow-y-auto">
                {tags.length === 0 ? (
                  <div className="px-3 py-6 text-xs text-center text-gray-500 dark:text-gray-400">
                    No tags available
                  </div>
                ) : (
                  tags.map((tag, index) => {
                    const isSelected = filters.tagIds?.includes(tag.id) || false;
                    return (
                      <button
                        key={tag.id}
                        onClick={() => toggleTag(tag.id)}
                        className={`flex items-center justify-between w-full px-3 py-2 text-xs text-left text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 ${index === 0 ? 'rounded-t-lg' : ''} ${index === tags.length - 1 ? 'rounded-b-lg' : ''}`}
                      >
                        <div className="flex items-center space-x-2">
                          <div
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: tag.color }}
                          />
                          <span>{tag.name}</span>
                        </div>
                        {isSelected && <Check className="w-3 h-3 text-gray-900 dark:text-gray-100" />}
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </div>

        <div className="relative" ref={sortDropdownRef}>
          <button
            onClick={() => setShowSortDropdown(!showSortDropdown)}
            className="px-2.5 py-1.5 text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors flex items-center space-x-1 whitespace-nowrap min-w-[110px]"
          >
            <span className="text-gray-700 dark:text-gray-300">
              {sortOptions.find(opt => opt.value === filters.sortBy)?.label || 'Sort'}
            </span>
            <ChevronDown className="w-3 h-3 text-gray-400 flex-shrink-0" />
          </button>

          {showSortDropdown && (
            <div className="absolute z-50 right-0 w-40 mt-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              {sortOptions.map((option, index) => (
                <button
                  key={option.value}
                  onClick={() => {
                    onFiltersChange({ ...filters, sortBy: option.value as any });
                    setShowSortDropdown(false);
                  }}
                  className={`flex items-center justify-between w-full px-3 py-2 text-xs text-left text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 ${index === 0 ? 'rounded-t-lg' : ''} ${index === sortOptions.length - 1 ? 'rounded-b-lg' : ''}`}
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
