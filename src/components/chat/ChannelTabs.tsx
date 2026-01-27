import React from 'react';
import { MessageSquare, X, Package } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ChannelThread {
  id: string;
  order_id: string;
  order_number?: string;
  customer_name?: string | null;
  tag?: string;
  title?: string;
  unread_count?: number;
  status: 'open' | 'closed';
}

interface ChannelTabsProps {
  threads: ChannelThread[];
  selectedThreadId: string | null;
  onThreadSelect: (threadId: string | null) => void;
  onCloseThread: (threadId: string) => void;
}

const BRAND_GRADIENT = 'linear-gradient(135deg, #E11D48 0%, #EC4899 40%, #F87171 70%, #E8795A 100%)';

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

export const ChannelTabs: React.FC<ChannelTabsProps> = ({
  threads,
  selectedThreadId,
  onThreadSelect,
  onCloseThread,
}) => {
  const openThreads = threads.filter(t => t.status === 'open');

  return (
    <div className="border-b border-gray-200 dark:border-[#3a3a3a] bg-white dark:bg-dark">
      <div className="flex items-center gap-1 px-4 py-2 overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600">
        {/* Main Chat Tab */}
        <button
          onClick={() => onThreadSelect(null)}
          className={cn(
            'flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all whitespace-nowrap',
            selectedThreadId === null
              ? 'text-white shadow-lg'
              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#3a3a3a]'
          )}
          style={selectedThreadId === null ? { background: BRAND_GRADIENT } : undefined}
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
                ? 'text-white shadow-lg'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#3a3a3a]'
            )}
            style={selectedThreadId === thread.id ? { background: BRAND_GRADIENT } : undefined}
          >
            <button
              onClick={() => onThreadSelect(thread.id)}
              className="flex items-center gap-2 whitespace-nowrap"
            >
              <Package className="w-4 h-4" />
              #{thread.order_number || thread.order_id?.slice(0, 8) || 'Thread'}
              {thread.tag && (
                <span
                  className={cn(
                    'text-[10px] px-1.5 py-0.5 rounded-full',
                    selectedThreadId === thread.id
                      ? 'bg-white/20 text-white'
                      : (TAG_COLORS[thread.tag] || 'bg-gray-500/10 text-gray-600 dark:text-gray-400')
                  )}
                >
                  {TAG_LABELS[thread.tag] || thread.tag.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                </span>
              )}
              {thread.unread_count && thread.unread_count > 0 && (
                <span
                  className="ml-1 text-white text-[10px] px-1.5 py-0.5 rounded-full min-w-[18px] text-center"
                  style={{ background: BRAND_GRADIENT }}
                >
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
                  : 'opacity-0 group-hover:opacity-100 hover:bg-gray-200 dark:hover:bg-[#4a4a4a]'
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
