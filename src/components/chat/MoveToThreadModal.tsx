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
      <div className="px-6 pt-6 pb-4 space-y-4">
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
            openThreads.map(thread => {
              const displayNumber = (thread.order_number || thread.order_id?.slice(0, 8) || 'Thread').replace(/^#/, '');
              return (
                <button
                  key={thread.id}
                  onClick={() => setSelectedThreadId(thread.id)}
                  className={cn(
                    'w-full p-3 rounded-lg text-left transition-all border',
                    selectedThreadId === thread.id
                      ? 'bg-gradient-to-r from-red-500/10 to-pink-600/10 border-red-500/20'
                      : 'bg-gray-50 dark:bg-[#2a2a2a] border-gray-200 dark:border-[#4a4a4a] hover:bg-gray-100 dark:hover:bg-[#4a4a4a]'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Hash className="w-4 h-4" />
                      <span className="font-medium text-gray-900 dark:text-white">
                        {displayNumber}
                      </span>
                    </div>
                    {thread.tag && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400">
                        {thread.tag.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                      </span>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 justify-end pt-4 border-t border-gray-200 dark:border-[#333333]">
          <button
            onClick={handleClose}
            className="btn btn-secondary"
          >
            Cancel
          </button>
          <button
            onClick={handleMove}
            disabled={!selectedThreadId}
            className="group btn btn-danger flex items-center gap-2"
          >
            <span>Move Message</span>
            <MoveRight className="w-4 h-4 btn-icon btn-icon-arrow" />
          </button>
        </div>
      </div>
    </Modal>
  );
};
