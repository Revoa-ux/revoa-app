import React, { useState } from 'react';
import { Hash, X, ChevronLeft, Plus } from 'lucide-react';
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

const TAG_COLORS: Record<string, string> = {
  return: 'bg-red-500/10 text-red-600 dark:text-red-400',
  replacement: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
  damaged: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400',
  defective: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
  shipping: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  refund: 'bg-green-500/10 text-green-600 dark:text-green-400',
  missing_items: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  wrong_item: 'bg-pink-500/10 text-pink-600 dark:text-pink-400',
  cancel_modify: 'bg-slate-500/10 text-slate-600 dark:text-slate-400',
  pre_ship_inventory: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400',
  pre_ship_quality: 'bg-teal-500/10 text-teal-600 dark:text-teal-400',
  pre_ship_supplier_delay: 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
  pre_ship_variant_mismatch: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
};

const TAG_LABELS: Record<string, string> = {
  return: 'Return',
  replacement: 'Replacement',
  damaged: 'Damaged',
  defective: 'Defective',
  shipping: 'Shipping',
  refund: 'Refund',
  missing_items: 'Missing Items',
  wrong_item: 'Wrong Item',
  cancel_modify: 'Cancel/Modify',
  pre_ship_inventory: 'Inventory',
  pre_ship_quality: 'Quality',
  pre_ship_supplier_delay: 'Delay',
  pre_ship_variant_mismatch: 'Variant',
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
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [threadToDelete, setThreadToDelete] = useState<ChannelThread | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const openThreads = threads.filter(t => t.status === 'open');

  return (
    <>
      <div
        className={cn(
          'border-r border-gray-200 dark:border-[#3a3a3a] bg-gray-50 dark:bg-dark flex flex-col overflow-hidden transition-all duration-300',
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
              'w-full px-3 py-2.5 text-left flex items-center gap-2.5 transition-colors border-b border-gray-100 dark:border-[#3a3a3a]',
              selectedThreadId === null
                ? 'bg-gray-100 dark:bg-[#3a3a3a]/50'
                : 'hover:bg-gray-50 dark:hover:bg-[#3a3a3a]/30'
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
                  'w-full px-3 py-2.5 text-left flex items-start gap-2.5 transition-colors border-b border-gray-100 dark:border-[#3a3a3a]',
                  selectedThreadId === thread.id
                    ? 'bg-gray-100 dark:bg-[#3a3a3a]/50'
                    : 'hover:bg-gray-50 dark:hover:bg-[#3a3a3a]/30'
                )}
              >
                <Hash className="w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {(thread.order_number || thread.order_id?.slice(0, 8) || 'Thread').replace(/^#/, '')}
                    </span>
                    {thread.tag && (
                      <span className={cn(
                        'text-[10px] px-1.5 py-0.5 rounded-full whitespace-nowrap flex-shrink-0',
                        TAG_COLORS[thread.tag] || 'bg-gray-500/10 text-gray-600 dark:text-gray-400'
                      )}>
                        {TAG_LABELS[thread.tag] || thread.tag.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
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
                {onDeleteThread && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setThreadToDelete(thread);
                      setDeleteModalOpen(true);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-rose-500/10 dark:hover:bg-rose-500/20 rounded transition-all ml-auto"
                    title="Close thread"
                  >
                    <X className="w-3.5 h-3.5 text-rose-500" />
                  </button>
                )}
              </button>
            </div>
          ))}

          {openThreads.length === 0 && (
            <div className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">
              No order threads yet
            </div>
          )}
        </div>

        {/* Floating Add Thread Button */}
        <div className="absolute bottom-3 left-3 z-10">
          <button
            onClick={onCreateThread}
            className="group relative px-3 py-2 flex items-center gap-2 bg-white/80 dark:bg-dark/80 backdrop-blur-md border border-gray-200/50 dark:border-[#3a3a3a]/50 hover:bg-white dark:hover:bg-[#2a2a2a] rounded-xl transition-all"
            title="Create New Thread"
          >
            <div className="relative flex items-center justify-center w-5 h-5 rounded-lg bg-gradient-to-br from-rose-400 via-rose-500 to-pink-500 shadow-sm">
              <Plus className="w-3.5 h-3.5 text-white stroke-[2.5]" />
            </div>
            <span className="text-xs font-medium text-gray-700 dark:text-gray-300 pr-0.5">New</span>
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
