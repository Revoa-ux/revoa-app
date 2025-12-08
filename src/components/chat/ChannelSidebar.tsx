import React from 'react';
import { Hash, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ChannelThread } from './ChannelTabs';

interface ChannelSidebarProps {
  threads: ChannelThread[];
  selectedThreadId: string | null;
  onThreadSelect: (threadId: string | null) => void;
  onCreateThread: () => void;
  isOpen: boolean;
  onClose: () => void;
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

export const ChannelSidebar: React.FC<ChannelSidebarProps> = ({
  threads,
  selectedThreadId,
  onThreadSelect,
  onCreateThread,
  isOpen,
  onClose,
}) => {
  const openThreads = threads.filter(t => t.status === 'open');

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div
        className={cn(
          'fixed top-0 left-0 h-full bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 z-50 transition-transform duration-300 flex flex-col',
          'w-[280px]',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Threads</h2>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Scrollable thread list */}
        <div className="flex-1 overflow-y-auto">
          {/* Main Chat */}
          <button
            onClick={() => {
              onThreadSelect(null);
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

          {openThreads.length === 0 && (
            <div className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">
              No order threads yet
            </div>
          )}
        </div>

        {/* Create New Thread - Sticky at bottom */}
        <button
          onClick={() => {
            onCreateThread();
          }}
          className="w-full px-3 py-3 text-left flex items-center gap-2.5 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex-shrink-0"
        >
          <Hash className="w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
          <span className="text-sm font-medium text-gray-600 dark:text-gray-300">New Order Thread</span>
        </button>
      </div>
    </>
  );
};
