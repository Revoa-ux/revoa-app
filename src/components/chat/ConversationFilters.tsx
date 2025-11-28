import React, { useRef, useState, useEffect } from 'react';
import { Search, Filter, ChevronDown, X, Check, Tag as TagIcon, Users, ArrowUpDown } from 'lucide-react';
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
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showUserTypeDropdown, setShowUserTypeDropdown] = useState(false);
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [showTagDropdown, setShowTagDropdown] = useState(false);
  const [tags, setTags] = useState<ConversationTag[]>([]);

  const statusDropdownRef = useRef<HTMLDivElement>(null);
  const userTypeDropdownRef = useRef<HTMLDivElement>(null);
  const sortDropdownRef = useRef<HTMLDivElement>(null);
  const tagDropdownRef = useRef<HTMLDivElement>(null);

  useClickOutside(statusDropdownRef, () => setShowStatusDropdown(false));
  useClickOutside(userTypeDropdownRef, () => setShowUserTypeDropdown(false));
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
    { value: 'recent', label: 'Newest' },
    { value: 'oldest', label: 'Oldest' },
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


  return (
    <div className="px-3 py-3 border-b border-gray-200 dark:border-gray-700 min-h-[90px] flex flex-col justify-center">
      {/* Top Row: Search + Sort */}
      <div className="flex items-center gap-2 mb-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-9 py-1.5 text-sm bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-300 dark:focus:ring-gray-600 focus:border-gray-200 dark:focus:border-gray-600"
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

        <div className="relative" ref={sortDropdownRef}>
          <button
            onClick={() => setShowSortDropdown(!showSortDropdown)}
            className="px-3 py-1.5 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors flex items-center gap-1.5 whitespace-nowrap justify-between min-w-[100px]"
          >
            <div className="flex items-center gap-1.5">
              <ArrowUpDown className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
              <span className="text-gray-700 dark:text-gray-300 text-sm">
                {sortOptions.find(opt => opt.value === filters.sortBy)?.label || 'Sort'}
              </span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
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
                  className={`flex items-center justify-between w-full px-3 py-1.5 text-sm text-left text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 ${index === 0 ? 'rounded-t-lg' : ''} ${index === sortOptions.length - 1 ? 'rounded-b-lg' : ''}`}
                >
                  <span>{option.label}</span>
                  {filters.sortBy === option.value && <Check className="w-3.5 h-3.5 text-gray-900 dark:text-gray-100" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Row: Filters */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1" ref={statusDropdownRef}>
          <button
            onClick={() => setShowStatusDropdown(!showStatusDropdown)}
            className="px-3 py-1.5 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors flex items-center gap-1.5 whitespace-nowrap w-full justify-between"
          >
            <div className="flex items-center gap-1.5 min-w-0">
              <Filter className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
              <span className="text-gray-700 dark:text-gray-300 truncate text-sm">
                {statusOptions.find(opt => opt.value === filters.status)?.label.split(' ')[0] || 'All'}
              </span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
          </button>

          {showStatusDropdown && (
            <div className="absolute z-50 w-48 mt-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              {statusOptions.map((option, index) => (
                <button
                  key={option.value}
                  onClick={() => {
                    onFiltersChange({ ...filters, status: option.value as any });
                    setShowStatusDropdown(false);
                  }}
                  className={`flex items-center justify-between w-full px-3 py-1.5 text-sm text-left text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 ${index === 0 ? 'rounded-t-lg' : ''} ${index === statusOptions.length - 1 ? 'rounded-b-lg' : ''}`}
                >
                  <span>{option.label}</span>
                  {filters.status === option.value && <Check className="w-3.5 h-3.5 text-gray-900 dark:text-gray-100" />}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="relative flex-1" ref={userTypeDropdownRef}>
          <button
            onClick={() => setShowUserTypeDropdown(!showUserTypeDropdown)}
            className="px-3 py-1.5 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors flex items-center gap-1.5 whitespace-nowrap w-full justify-between"
          >
            <div className="flex items-center gap-1.5 min-w-0">
              <Users className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
              <span className="text-gray-700 dark:text-gray-300 truncate text-sm">
                {userTypeOptions.find(opt => opt.value === filters.userType)?.label.split(' ')[0] || 'All'}
              </span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
          </button>

          {showUserTypeDropdown && (
            <div className="absolute z-50 w-52 mt-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              {userTypeOptions.map((option, index) => (
                <button
                  key={option.value}
                  onClick={() => {
                    onFiltersChange({ ...filters, userType: option.value as any });
                    setShowUserTypeDropdown(false);
                  }}
                  className={`flex items-center justify-between w-full px-3 py-1.5 text-sm text-left text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 ${index === 0 ? 'rounded-t-lg' : ''} ${index === userTypeOptions.length - 1 ? 'rounded-b-lg' : ''}`}
                >
                  <span>{option.label}</span>
                  {filters.userType === option.value && <Check className="w-3.5 h-3.5 text-gray-900 dark:text-gray-100" />}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="relative flex-1" ref={tagDropdownRef}>
          <button
            onClick={() => setShowTagDropdown(!showTagDropdown)}
            className="px-3 py-1.5 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors flex items-center gap-1.5 whitespace-nowrap w-full justify-between"
          >
            <div className="flex items-center gap-1.5 min-w-0">
              <TagIcon className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
              <span className="text-gray-700 dark:text-gray-300 truncate text-sm">
                {filters.tagIds && filters.tagIds.length > 0 ? `${filters.tagIds.length} Tag${filters.tagIds.length > 1 ? 's' : ''}` : 'Tags'}
              </span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
          </button>

          {showTagDropdown && (
            <div className="absolute z-[100] right-0 w-64 mt-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden max-h-96 overflow-y-auto">
              {tags.length === 0 ? (
                <div className="px-3 py-6 text-sm text-center text-gray-500 dark:text-gray-400">
                  No tags available
                </div>
              ) : (
                tags.map((tag, index) => {
                  const isSelected = filters.tagIds?.includes(tag.id) || false;
                  return (
                    <button
                      key={tag.id}
                      onClick={() => toggleTag(tag.id)}
                      className={`flex items-center justify-between w-full px-3 py-1.5 text-sm text-left text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 ${index === 0 ? 'rounded-t-lg' : ''} ${index === tags.length - 1 ? 'rounded-b-lg' : ''}`}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: tag.color }}
                        />
                        <span className="truncate">{tag.name}</span>
                      </div>
                      {isSelected && <Check className="w-3.5 h-3.5 text-gray-900 dark:text-gray-100 flex-shrink-0" />}
                    </button>
                  );
                })
              )}
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
