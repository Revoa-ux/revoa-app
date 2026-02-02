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
    return selectedThread?.title || 'Thread';
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
        className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-2 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-[#2a2a2a] hover:bg-gray-200 dark:hover:bg-[#4a4a4a] transition-colors max-w-[200px] sm:max-w-none"
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
        <div className="absolute top-full left-0 mt-1 w-full min-w-[280px] bg-white dark:bg-dark border border-gray-200 dark:border-[#333333] rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
          <div className="p-2">
            {/* Header */}
            <div className="mb-2 pb-2 border-b border-gray-200 dark:border-[#333333]">
              <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 px-3">Threads</span>
            </div>

            <button
              onClick={() => handleThreadSelect(null)}
              className={cn(
                "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-md text-sm transition-colors text-left",
                !selectedThreadId
                  ? "bg-gray-100 dark:bg-[#2a2a2a] text-gray-900 dark:text-white font-medium"
                  : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#2a2a2a]/50"
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
                <div className="my-2 border-t border-gray-200 dark:border-[#333333]"></div>
                {threads.map((thread) => {
                  const orderNumber = thread.order_number;

                  return (
                    <button
                      key={thread.id}
                      onClick={() => handleThreadSelect(thread.id)}
                      className={cn(
                        "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-md text-sm transition-colors text-left mb-1",
                        selectedThreadId === thread.id
                          ? "bg-gray-100 dark:bg-[#2a2a2a] text-gray-900 dark:text-white font-medium"
                          : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#2a2a2a]/50"
                      )}
                    >
                      <Hash className="w-4 h-4 flex-shrink-0" />
                      <div className="flex flex-col min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {(orderNumber || thread.title || 'Thread').replace(/^#/, '')}
                          </span>
                          {thread.tag && (
                            <span className={cn(
                              'text-[10px] px-1.5 py-0.5 rounded-full whitespace-nowrap flex-shrink-0',
                              TAG_COLORS[thread.tag as keyof typeof TAG_COLORS] || 'bg-gray-500/10 text-gray-600 dark:text-gray-400'
                            )}>
                              {TAG_LABELS[thread.tag as keyof typeof TAG_LABELS] || thread.tag.split('_').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {thread.customer_name || 'Guest Customer'}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </>
            )}

            <div className="mt-2 pt-2 border-t border-gray-200 dark:border-[#333333]">
              <button
                onClick={() => {
                  onCreateThread();
                  setIsOpen(false);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-md text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#2a2a2a]/50 transition-colors"
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
