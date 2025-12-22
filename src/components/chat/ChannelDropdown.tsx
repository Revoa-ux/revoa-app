import React, { useState, useRef } from 'react';
import { Hash, Plus, ChevronDown } from 'lucide-react';
import { useClickOutside } from '@/lib/useClickOutside';
import { cn } from '@/lib/utils';
import { ChannelThread } from './ChannelTabs';

interface ChannelDropdownProps {
  threads: ChannelThread[];
  selectedThreadId: string | null;
  onThreadSelect: (threadId: string | null) => void;
  onCreateThread: () => void;
  onDeleteThread?: (threadId: string) => void;
  onRestartThread?: (threadId: string) => void;
}

const TAG_COLORS = {
  return: 'bg-red-500/10 text-red-600 dark:text-red-400',
  replacement: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
  damaged: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400',
  defective: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
};

const TAG_LABELS = {
  return: 'Return',
  replacement: 'Replacement',
  damaged: 'Damaged',
  defective: 'Defective',
};

export const ChannelDropdown: React.FC<ChannelDropdownProps> = ({
  threads,
  selectedThreadId,
  onThreadSelect,
  onCreateThread,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useClickOutside(dropdownRef, () => {
    setIsOpen(false);
  });

  const selectedThread = threads.find(t => t.id === selectedThreadId);

  const getCurrentLabel = () => {
    if (!selectedThreadId) {
      return 'main-chat';
    }
    const orderNumber = selectedThread?.order_number;
    if (orderNumber) {
      return orderNumber.replace(/^#/, '');
    }
    // Fallback to thread tag + customer name if no order number
    const tag = selectedThread?.tag;
    const tagLabel = tag ? TAG_LABELS[tag as keyof typeof TAG_LABELS] || tag : 'Thread';
    return tagLabel;
  };

  const getCurrentSubtitle = () => {
    if (!selectedThreadId) {
      return 'General conversation';
    }
    return selectedThread?.customer_name || 'Guest Customer';
  };

  const handleThreadSelect = (threadId: string | null) => {
    onThreadSelect(threadId);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-2 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors max-w-[200px] sm:max-w-none"
      >
        <Hash className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
        <div className="flex flex-col min-w-0 text-left flex-1">
          <span className="truncate text-xs sm:text-sm">{getCurrentLabel()}</span>
          <span className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 truncate hidden sm:block">{getCurrentSubtitle()}</span>
        </div>
        <ChevronDown className={cn(
          "w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0 transition-transform",
          isOpen && "rotate-180"
        )} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-56 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
          <div className="p-2">
            {/* Header */}
            <div className="mb-2 pb-2 border-b border-gray-200 dark:border-gray-700">
              <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 px-3">Threads</span>
            </div>

            <button
              onClick={() => handleThreadSelect(null)}
              className={cn(
                "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-md text-sm transition-colors text-left",
                !selectedThreadId
                  ? "bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white font-medium"
                  : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50"
              )}
            >
              <Hash className="w-4 h-4 flex-shrink-0" />
              <div className="flex flex-col min-w-0 flex-1">
                <span className="truncate">main-chat</span>
                <span className="text-xs text-gray-500 dark:text-gray-400 truncate">General conversation</span>
              </div>
            </button>

            {threads.length > 0 && (
              <>
                <div className="my-2 border-t border-gray-200 dark:border-gray-700"></div>
                {threads.map((thread) => {
                  const orderNumber = thread.order_number;
                  const tag = thread.tag as keyof typeof TAG_COLORS;
                  const tagColor = TAG_COLORS[tag] || 'bg-gray-500/10 text-gray-600 dark:text-gray-400';
                  const tagLabel = TAG_LABELS[tag] || tag;
                  // Display order number or fallback to tag label
                  const displayLabel = orderNumber ? orderNumber : (tagLabel || 'Thread');

                  return (
                    <button
                      key={thread.id}
                      onClick={() => handleThreadSelect(thread.id)}
                      className={cn(
                        "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-md text-sm transition-colors text-left mb-1",
                        selectedThreadId === thread.id
                          ? "bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white font-medium"
                          : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                      )}
                    >
                      <Hash className="w-4 h-4 flex-shrink-0" />
                      <div className="flex flex-col min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate">{displayLabel}</span>
                          {tag && (
                            <span className={cn("px-1.5 py-0.5 text-xs rounded-md flex-shrink-0", tagColor)}>
                              {tagLabel}
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {thread.customer_name || 'Guest Customer'}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </>
            )}

            <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => {
                  onCreateThread();
                  setIsOpen(false);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-md text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <Plus className="w-4 h-4 flex-shrink-0" />
                <span>Create New Thread</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
