import React from 'react';
import { Hash, X, ChevronLeft, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ChannelThread } from './ChannelTabs';

interface ChannelSidebarProps {
  threads: ChannelThread[];
  selectedThreadId: string | null;
  onThreadSelect: (threadId: string | null) => void;
  onCreateThread: () => void;
  isOpen: boolean;
  onClose?: () => void;
  isCustomerSidebarOpen?: boolean;
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
  isCustomerSidebarOpen = false,
}) => {
  const openThreads = threads.filter(t => t.status === 'open');

  return (
    <>
      {/* Mobile Overlay Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <div
        className={cn(
          'border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex flex-col overflow-hidden transition-all duration-300',
          // Mobile: Overlay absolutely positioned
          'lg:relative lg:flex-shrink-0',
          'fixed inset-y-0 left-0 z-50 lg:z-auto',
          // Responsive widths
          'w-[240px] sm:w-[260px]',
          isCustomerSidebarOpen ? 'lg:w-[180px]' : 'lg:w-[220px]',
          // Slide in/out on mobile
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
          // Hide completely when closed on mobile
          !isOpen && 'lg:flex hidden'
        )}
      >
        {/* Scrollable thread list */}
        <div className="flex-1 overflow-y-auto">
          {/* Main Chat */}
          <button
            onClick={() => {
              onThreadSelect(null);
              // Close on mobile after selection
              if (window.innerWidth < 1024 && onClose) {
                onClose();
              }
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
                // Close on mobile after selection
                if (window.innerWidth < 1024 && onClose) {
                  onClose();
                }
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
      </div>
    </>
  );
};
