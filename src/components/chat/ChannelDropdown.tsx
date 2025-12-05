import React, { useState, useRef } from 'react';
import { ChevronDown, MessageSquare, Package, Plus } from 'lucide-react';
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
  issue: 'bg-red-500/10 text-red-600 dark:text-red-400',
  question: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  shipping: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
  payment: 'bg-green-500/10 text-green-600 dark:text-green-400',
  quality: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
  other: 'bg-gray-500/10 text-gray-600 dark:text-gray-400',
};

const TAG_LABELS = {
  issue: 'Issue',
  question: 'Question',
  shipping: 'Shipping',
  payment: 'Payment',
  quality: 'Quality',
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
      return 'Main Chat';
    }
    return `#${selectedThread?.order_number || selectedThread?.order_id.slice(0, 8)}`;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
      >
        {selectedThreadId ? (
          <Package className="w-4 h-4" />
        ) : (
          <MessageSquare className="w-4 h-4" />
        )}
        <span>{getCurrentLabel()}</span>
        <ChevronDown className={cn('w-4 h-4 transition-transform', isOpen && 'rotate-180')} />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 py-1 z-[9999] min-w-[220px] max-h-[400px] overflow-y-auto">
          {/* Main Chat */}
          <button
            onClick={() => {
              onThreadSelect(null);
              setIsOpen(false);
            }}
            className={cn(
              'w-full px-4 py-2 text-left text-sm flex items-center gap-2 transition-colors',
              selectedThreadId === null
                ? 'bg-[#e83653] text-white'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            )}
          >
            <MessageSquare className="w-4 h-4" />
            Main Chat
          </button>

          {/* Divider */}
          {openThreads.length > 0 && (
            <div className="my-1 border-t border-gray-200 dark:border-gray-700" />
          )}

          {/* Order Threads */}
          {openThreads.map(thread => (
            <button
              key={thread.id}
              onClick={() => {
                onThreadSelect(thread.id);
                setIsOpen(false);
              }}
              className={cn(
                'w-full px-4 py-2 text-left text-sm flex items-center justify-between gap-2 transition-colors',
                selectedThreadId === thread.id
                  ? 'bg-[#e83653] text-white'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              )}
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <Package className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">#{thread.order_number || thread.order_id.slice(0, 8)}</span>
              </div>
              <div className="flex items-center gap-1">
                {thread.tag && (
                  <span
                    className={cn(
                      'text-[10px] px-1.5 py-0.5 rounded-full whitespace-nowrap',
                      selectedThreadId === thread.id
                        ? 'bg-white/20 text-white'
                        : TAG_COLORS[thread.tag]
                    )}
                  >
                    {TAG_LABELS[thread.tag]}
                  </span>
                )}
                {thread.unread_count && thread.unread_count > 0 && (
                  <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                    {thread.unread_count}
                  </span>
                )}
              </div>
            </button>
          ))}

          {/* Create New Thread */}
          <div className="mt-1 border-t border-gray-200 dark:border-gray-700" />
          <button
            onClick={() => {
              onCreateThread();
              setIsOpen(false);
            }}
            className="w-full px-4 py-2 text-left text-sm flex items-center gap-2 text-[#e83653] hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Order Thread
          </button>
        </div>
      )}
    </div>
  );
};
