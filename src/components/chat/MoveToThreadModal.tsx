import React, { useState } from 'react';
import { MoveRight, Hash } from 'lucide-react';
import Modal from '@/components/Modal';
import { ChannelThread } from './ChannelTabs';
import { cn } from '@/lib/utils';

interface MoveToThreadModalProps {
  isOpen: boolean;
  onClose: () => void;
  threads: ChannelThread[];
  onMoveToThread: (threadId: string) => void;
  currentThreadId: string | null;
}

export const MoveToThreadModal: React.FC<MoveToThreadModalProps> = ({
  isOpen,
  onClose,
  threads,
  onMoveToThread,
  currentThreadId,
}) => {
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);

  const openThreads = threads.filter(t => t.status === 'open' && t.id !== currentThreadId);

  const handleMove = () => {
    if (selectedThreadId) {
      onMoveToThread(selectedThreadId);
      onClose();
    }
  };

  const handleClose = () => {
    setSelectedThreadId(null);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Move Message to Thread">
      <div className="p-6 space-y-4">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Select a thread to move this message to. This will remove it from the current chat for both you and the supplier.
        </p>

        {/* Thread List */}
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {openThreads.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              No order threads available. Create one first.
            </div>
          ) : (
            openThreads.map(thread => (
              <button
                key={thread.id}
                onClick={() => setSelectedThreadId(thread.id)}
                className={cn(
                  'w-full p-3 rounded-lg text-left transition-all border',
                  selectedThreadId === thread.id
                    ? 'bg-gradient-to-r from-red-500/10 to-pink-600/10 border-red-500/20'
                    : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600'
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Hash className="w-4 h-4" />
                    <span className="font-medium text-gray-900 dark:text-white">
                      #{thread.order_number || thread.order_id.slice(0, 8)}
                    </span>
                  </div>
                  {thread.tag && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400">
                      {thread.tag}
                    </span>
                  )}
                </div>
              </button>
            ))
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 justify-end py-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={handleClose}
            className="px-5 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleMove}
            disabled={!selectedThreadId}
            className="group px-5 py-1.5 text-sm font-medium text-white bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 flex items-center gap-2"
          >
            <span>Move Message</span>
            <MoveRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
      </div>
    </Modal>
  );
};
