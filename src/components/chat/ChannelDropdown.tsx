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
  inquiry: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  other: 'bg-gray-500/10 text-gray-600 dark:text-gray-400',
};

const TAG_LABELS = {
  return: 'Return',
  replacement: 'Replacement',
  damaged: 'Damaged',
  defective: 'Defective',
  inquiry: 'Inquiry',
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
    return selectedThread?.order_number || selectedThread?.order_id.slice(0, 8);
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
        <div className="absolute right-0 top-full mt-1 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-[9999] min-w-[220px] max-h-[400px] overflow-hidden">
          {/* Main Chat */}
          <button
            onClick={() => {
              onThreadSelect(null);
              setIsOpen(false);
            }}
            className={cn(
              'w-full px-4 py-3 text-left text-sm flex items-center gap-2 transition-all',
              selectedThreadId === null
                ? 'bg-gradient-to-r from-red-500 to-pink-600 text-white shadow-lg'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            )}
          >
            <Hash className="w-4 h-4" />
            main-chat
          </button>

          {/* Divider */}
          {openThreads.length > 0 && (
            <div className="border-t border-gray-200 dark:border-gray-700" />
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
                'w-full px-4 py-3 text-left text-sm flex items-center justify-between gap-2 transition-all',
                selectedThreadId === thread.id
                  ? 'bg-gradient-to-r from-red-500 to-pink-600 text-white shadow-lg'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              )}
            >
              <div className="flex items-center gap-1 flex-1 min-w-0">
                <Hash className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">{thread.order_number || thread.order_id.slice(0, 8)}</span>
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
          <div className="border-t border-gray-200 dark:border-gray-700" />
          <button
            onClick={() => {
              onCreateThread();
              setIsOpen(false);
            }}
            className="w-full px-4 py-3 text-left text-sm flex items-center gap-2 bg-gradient-to-r from-red-500 to-pink-600 text-transparent bg-clip-text hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors font-medium"
          >
            <Plus className="w-4 h-4 text-red-500" />
            <span className="bg-gradient-to-r from-red-500 to-pink-600 text-transparent bg-clip-text">New Order Thread</span>
          </button>
        </div>
      )}
    </div>
  );
};
