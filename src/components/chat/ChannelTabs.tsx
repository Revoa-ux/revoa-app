import React from 'react';
import { MessageSquare, X, Package } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ChannelThread {
  id: string;
  order_id: string;
  order_number?: string;
  customer_name?: string | null;
  tag?: 'return' | 'replacement' | 'damaged' | 'defective';
  unread_count?: number;
  status: 'open' | 'closed';
}

interface ChannelTabsProps {
  threads: ChannelThread[];
  selectedThreadId: string | null;
  onThreadSelect: (threadId: string | null) => void;
  onCloseThread: (threadId: string) => void;
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

export const ChannelTabs: React.FC<ChannelTabsProps> = ({
  threads,
  selectedThreadId,
  onThreadSelect,
  onCloseThread,
}) => {
  const openThreads = threads.filter(t => t.status === 'open');

  return (
    <div className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
      <div className="flex items-center gap-1 px-4 py-2 overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600">
        {/* Main Chat Tab */}
        <button
          onClick={() => onThreadSelect(null)}
          className={cn(
            'flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all whitespace-nowrap',
            selectedThreadId === null
              ? 'bg-gradient-to-r from-red-500 to-pink-600 text-white shadow-lg'
              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
          )}
        >
          <MessageSquare className="w-4 h-4" />
          Main Chat
        </button>

        {/* Thread Tabs */}
        {openThreads.map(thread => (
          <div
            key={thread.id}
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all group relative',
              selectedThreadId === thread.id
                ? 'bg-gradient-to-r from-red-500 to-pink-600 text-white shadow-lg'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            )}
          >
            <button
              onClick={() => onThreadSelect(thread.id)}
              className="flex items-center gap-2 whitespace-nowrap"
            >
              <Package className="w-4 h-4" />
              #{thread.order_number || thread.order_id.slice(0, 8)}
              {thread.tag && (
                <span
                  className={cn(
                    'text-[10px] px-1.5 py-0.5 rounded-full',
                    selectedThreadId === thread.id
                      ? 'bg-white/20 text-white'
                      : TAG_COLORS[thread.tag]
                  )}
                >
                  {TAG_LABELS[thread.tag]}
                </span>
              )}
              {thread.unread_count && thread.unread_count > 0 && (
                <span className="ml-1 bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                  {thread.unread_count}
                </span>
              )}
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                onCloseThread(thread.id);
              }}
              className={cn(
                'p-0.5 rounded hover:bg-white/20 transition-opacity',
                selectedThreadId === thread.id
                  ? 'opacity-0 group-hover:opacity-100'
                  : 'opacity-0 group-hover:opacity-100 hover:bg-gray-200 dark:hover:bg-gray-600'
              )}
              title="Close thread"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
