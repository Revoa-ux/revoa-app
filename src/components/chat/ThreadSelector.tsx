import React from 'react';
import { MessageSquare, Package, CheckCircle, X, Plus } from 'lucide-react';

export interface ChatThread {
  id: string;
  title: string;
  description: string | null;
  status: 'open' | 'resolved' | 'closed';
  order_id: string | null;
  shopify_order_id: string | null;
  order_number?: string;
  customer_name?: string | null;
  tag?: string | null;
  unread_count?: number;
  created_at: string;
  updated_at: string;
}

interface ThreadSelectorProps {
  threads: ChatThread[];
  selectedThreadId: string | null;
  onThreadSelect: (threadId: string | null) => void;
  onCreateThread: () => void;
  onCloseThread: (threadId: string) => void;
  isLoading?: boolean;
}

export function ThreadSelector({
  threads,
  selectedThreadId,
  onThreadSelect,
  onCreateThread,
  onCloseThread,
  isLoading = false,
}: ThreadSelectorProps) {
  const openThreads = threads.filter(t => t.status === 'open');
  const resolvedThreads = threads.filter(t => t.status === 'resolved');

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) {
      return `${diffMins}m ago`;
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else if (diffDays < 7) {
      return `${diffDays}d ago`;
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  return (
    <div className="border-t border-gray-200 dark:border-[#3a3a3a] bg-gray-50 dark:bg-[#3a3a3a]/50">
      {/* Header with Main Chat button */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-[#3a3a3a]">
        <button
          onClick={() => onThreadSelect(null)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors ${
            selectedThreadId === null
              ? 'bg-pink-100 dark:bg-pink-900/30 text-pink-900 dark:text-pink-100'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#2a2a2a]'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span className="text-sm font-medium">Main Chat</span>
        </button>
        <button
          onClick={onCreateThread}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors text-sm font-medium"
          title="Create new thread"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">New Thread</span>
        </button>
      </div>

      {/* Threads List */}
      <div className="overflow-y-auto max-h-48">
        {isLoading ? (
          <div className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">
            Loading threads...
          </div>
        ) : threads.length === 0 ? (
          <div className="p-4 text-center">
            <Package className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">No threads yet</p>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Create a thread to track order-specific issues
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {/* Open Threads */}
            {openThreads.length > 0 && (
              <>
                <div className="px-3 py-2 bg-gray-100 dark:bg-dark">
                  <span className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                    Open Issues ({openThreads.length})
                  </span>
                </div>
                {openThreads.map((thread) => (
                  <div
                    key={thread.id}
                    className={`group relative px-3 py-2 hover:bg-gray-100 dark:hover:bg-[#2a2a2a] transition-colors cursor-pointer ${
                      selectedThreadId === thread.id
                        ? 'bg-pink-50 dark:bg-pink-900/20 border-l-4 border-l-pink-500'
                        : ''
                    }`}
                    onClick={() => onThreadSelect(thread.id)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Package className={`w-4 h-4 flex-shrink-0 ${
                            selectedThreadId === thread.id
                              ? 'text-pink-600 dark:text-pink-400'
                              : 'text-gray-400'
                          }`} />
                          <p className={`text-sm font-medium ${
                            selectedThreadId === thread.id
                              ? 'text-pink-900 dark:text-pink-100'
                              : 'text-gray-900 dark:text-white'
                          }`}>
                            {thread.order_number ? `Order #${thread.order_number}` : thread.title}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-xs text-gray-500 dark:text-gray-400">
                          {thread.tag && (
                            <>
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                thread.tag === 'return' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' :
                                thread.tag === 'replacement' ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300' :
                                thread.tag === 'damaged' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300' :
                                thread.tag === 'defective' ? 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300' :
                                thread.tag === 'shipping' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' :
                                thread.tag === 'refund' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' :
                                thread.tag === 'missing_items' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300' :
                                thread.tag === 'wrong_item' ? 'bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300' :
                                thread.tag === 'cancel_modify' ? 'bg-slate-100 dark:bg-slate-900/30 text-slate-700 dark:text-slate-300' :
                                'bg-gray-100 dark:bg-dark text-gray-700 dark:text-gray-300'
                              }`}>
                                {thread.tag.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                              </span>
                              <span>•</span>
                            </>
                          )}
                          {thread.customer_name && (
                            <>
                              <span className="truncate">{thread.customer_name}</span>
                              <span>•</span>
                            </>
                          )}
                          <span>{formatDate(thread.updated_at)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {thread.unread_count && thread.unread_count > 0 && (
                          <span className="px-1.5 py-0.5 bg-pink-600 text-white text-xs rounded-full min-w-[20px] text-center">
                            {thread.unread_count > 9 ? '9+' : thread.unread_count}
                          </span>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onCloseThread(thread.id);
                          }}
                          className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-all"
                          title="Close thread"
                        >
                          <X className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </>
            )}

            {/* Resolved Threads */}
            {resolvedThreads.length > 0 && (
              <>
                <div className="px-3 py-2 bg-gray-100 dark:bg-dark">
                  <span className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                    Resolved ({resolvedThreads.length})
                  </span>
                </div>
                {resolvedThreads.map((thread) => (
                  <div
                    key={thread.id}
                    className={`group relative px-3 py-2 hover:bg-gray-100 dark:hover:bg-[#2a2a2a] transition-colors cursor-pointer opacity-60 ${
                      selectedThreadId === thread.id
                        ? 'bg-green-50 dark:bg-green-900/20 border-l-4 border-l-green-500 opacity-100'
                        : ''
                    }`}
                    onClick={() => onThreadSelect(thread.id)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <CheckCircle className={`w-4 h-4 flex-shrink-0 ${
                            selectedThreadId === thread.id
                              ? 'text-green-600 dark:text-green-400'
                              : 'text-gray-400'
                          }`} />
                          <p className={`text-sm font-medium ${
                            selectedThreadId === thread.id
                              ? 'text-green-900 dark:text-green-100'
                              : 'text-gray-900 dark:text-white'
                          }`}>
                            {thread.order_number ? `Order #${thread.order_number}` : thread.title}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-xs text-gray-500 dark:text-gray-400">
                          {thread.tag && (
                            <>
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                thread.tag === 'return' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' :
                                thread.tag === 'replacement' ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300' :
                                thread.tag === 'damaged' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300' :
                                thread.tag === 'defective' ? 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300' :
                                thread.tag === 'shipping' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' :
                                thread.tag === 'refund' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' :
                                thread.tag === 'missing_items' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300' :
                                thread.tag === 'wrong_item' ? 'bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300' :
                                thread.tag === 'cancel_modify' ? 'bg-slate-100 dark:bg-slate-900/30 text-slate-700 dark:text-slate-300' :
                                'bg-gray-100 dark:bg-dark text-gray-700 dark:text-gray-300'
                              }`}>
                                {thread.tag.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                              </span>
                              <span>•</span>
                            </>
                          )}
                          {thread.customer_name && (
                            <>
                              <span className="truncate">{thread.customer_name}</span>
                              <span>•</span>
                            </>
                          )}
                          <span>{formatDate(thread.updated_at)}</span>
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onCloseThread(thread.id);
                        }}
                        className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-all"
                        title="Delete thread"
                      >
                        <X className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
                      </button>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
