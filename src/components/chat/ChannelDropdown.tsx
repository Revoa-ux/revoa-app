import React, { useState, useRef } from 'react';
import { Hash, Plus } from 'lucide-react';
import { useClickOutside } from '@/lib/useClickOutside';
import { cn } from '@/lib/utils';
import { ChannelThread } from './ChannelTabs';

interface ChannelDropdownProps {
  threads: ChannelThread[];
  selectedThreadId: string | null;
  onThreadSelect: (threadId: string | null) => void;
  onCreateThread: () => void;
}

const TAG_COLORS = {
  return: 'bg-red-500/10 text-red-600 dark:text-red-400',
  replacement: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
  damaged: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400',
  defective: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
  delivery_exception: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  other: 'bg-gray-500/10 text-gray-600 dark:text-gray-400',
};

const TAG_LABELS = {
  return: 'Return',
  replacement: 'Replacement',
  damaged: 'Damaged',
  defective: 'Defective',
  delivery_exception: 'Delivery Issue',
  other: 'Other',
};

export const ChannelDropdown: React.FC<ChannelDropdownProps> = ({
  threads,
  selectedThreadId,
  onThreadSelect,
  onCreateThread,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useClickOutside(dropdownRef, () => setIsOpen(false));

  const selectedThread = threads.find(t => t.id === selectedThreadId);
  const openThreads = threads.filter(t => t.status === 'open');

  const getCurrentLabel = () => {
    if (!selectedThreadId) {
      return 'main-chat';
    }
    const orderNumber = selectedThread?.order_number || selectedThread?.order_id.slice(0, 8);
    // Remove leading # if present since we show Hash icon
    return orderNumber.replace(/^#/, '');
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
      >
        <Hash className="w-4 h-4" />
        <span>{getCurrentLabel()}</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-[9999] min-w-[280px] max-h-[400px] overflow-y-auto">
          {/* Main Chat */}
          <button
            onClick={() => {
              onThreadSelect(null);
              setIsOpen(false);
            }}
            className={cn(
              'w-full px-3 py-2.5 text-left flex items-center gap-2.5 transition-colors border-b border-gray-100 dark:border-gray-700',
              selectedThreadId === null
                ? 'bg-gray-100 dark:bg-gray-700/50'
                : 'hover:bg-gray-50 dark:hover:bg-gray-700/30'
            )}
          >
            <Hash className="w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-900 dark:text-white">main-chat</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">General conversation</div>
            </div>
          </button>

          {/* Order Threads */}
          {openThreads.map(thread => (
            <button
              key={thread.id}
              onClick={() => {
                onThreadSelect(thread.id);
                setIsOpen(false);
              }}
              className={cn(
                'w-full px-3 py-2.5 text-left flex items-start gap-2.5 transition-colors border-b border-gray-100 dark:border-gray-700',
                selectedThreadId === thread.id
                  ? 'bg-gray-100 dark:bg-gray-700/50'
                  : 'hover:bg-gray-50 dark:hover:bg-gray-700/30'
              )}
            >
              <Hash className="w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {(thread.order_number || thread.order_id.slice(0, 8)).replace(/^#/, '')}
                  </span>
                  {thread.tag && (
                    <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full whitespace-nowrap flex-shrink-0', TAG_COLORS[thread.tag])}>
                      {TAG_LABELS[thread.tag]}
                    </span>
                  )}
                  {thread.unread_count && thread.unread_count > 0 && (
                    <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full min-w-[18px] text-center flex-shrink-0">
                      {thread.unread_count}
                    </span>
                  )}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {thread.customer_name || 'Guest Customer'}
                </div>
              </div>
            </button>
          ))}

          {/* Create New Thread */}
          <button
            onClick={() => {
              onCreateThread();
              setIsOpen(false);
            }}
            className="w-full px-3 py-2.5 text-left flex items-center gap-2.5 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
          >
            <Plus className="w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
            <span className="text-sm font-medium text-gray-600 dark:text-gray-300">New Order Thread</span>
          </button>
        </div>
      )}
    </div>
  );
};
