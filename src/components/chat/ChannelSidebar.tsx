import React, { useState } from 'react';
import { Hash, X, ChevronLeft, Plus, MoreVertical, Trash2, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ChannelThread } from './ChannelTabs';
import { DeleteThreadModal } from './DeleteThreadModal';

interface ChannelSidebarProps {
  threads: ChannelThread[];
  selectedThreadId: string | null;
  onThreadSelect: (threadId: string | null) => void;
  onCreateThread: () => void;
  onDeleteThread?: (threadId: string) => void;
  onRestartThread?: (threadId: string) => void;
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
  onDeleteThread,
  onRestartThread,
  isOpen,
  onClose,
  isCustomerSidebarOpen = false,
}) => {
  const [menuOpenFor, setMenuOpenFor] = useState<string | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [threadToDelete, setThreadToDelete] = useState<ChannelThread | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const openThreads = threads.filter(t => t.status === 'open');

  return (
    <>
      <div
        className={cn(
          'border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex flex-col overflow-hidden transition-all duration-300',
          // Desktop only - hidden on mobile/tablet
          'hidden lg:flex',
          // Normal flow on desktop
          'relative flex-shrink-0',
          // Responsive widths
          isCustomerSidebarOpen ? 'lg:w-[180px]' : 'lg:w-[220px]',
          // Hide completely when closed on desktop
          !isOpen && 'lg:hidden'
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
            <div
              key={thread.id}
              className="relative group"
            >
              <button
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
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenuOpenFor(menuOpenFor === thread.id ? null : thread.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-all ml-auto"
                  title="Thread actions"
                >
                  <MoreVertical className="w-3.5 h-3.5 text-gray-600 dark:text-gray-400" />
                </button>
              </button>

              {/* Action Menu */}
              {menuOpenFor === thread.id && (
                <div className="absolute right-2 top-10 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 min-w-[140px]">
                  {onRestartThread && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onRestartThread(thread.id);
                        setMenuOpenFor(null);
                      }}
                      className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 flex items-center gap-2"
                    >
                      <RotateCcw className="w-4 h-4" />
                      Restart Flow
                    </button>
                  )}
                  {onDeleteThread && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setThreadToDelete(thread);
                        setDeleteModalOpen(true);
                        setMenuOpenFor(null);
                      }}
                      className="w-full px-3 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete Thread
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}

          {openThreads.length === 0 && (
            <div className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">
              No order threads yet
            </div>
          )}
        </div>

        {/* Floating Add Thread Button */}
        <div className="absolute bottom-4 right-4 z-10">
          <button
            onClick={onCreateThread}
            className="w-12 h-12 flex items-center justify-center bg-red-600 hover:bg-red-700 text-white rounded-full transition-all shadow-lg hover:shadow-xl"
            title="Create New Thread"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && threadToDelete && onDeleteThread && (
        <DeleteThreadModal
          isOpen={deleteModalOpen}
          onClose={() => {
            setDeleteModalOpen(false);
            setThreadToDelete(null);
            setIsDeleting(false);
          }}
          onConfirm={async () => {
            setIsDeleting(true);
            await onDeleteThread(threadToDelete.id);
            setDeleteModalOpen(false);
            setThreadToDelete(null);
            setIsDeleting(false);
          }}
          threadTitle={threadToDelete.order_number || threadToDelete.title}
          isDeleting={isDeleting}
        />
      )}
    </>
  );
};
