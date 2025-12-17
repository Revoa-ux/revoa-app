import React from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import Modal from '@/components/Modal';

interface DeleteThreadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  threadTitle: string;
  isDeleting?: boolean;
}

export function DeleteThreadModal({
  isOpen,
  onClose,
  onConfirm,
  threadTitle,
  isDeleting = false,
}: DeleteThreadModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="">
      <div className="space-y-6 text-center">
        {/* Header */}
        <div className="flex flex-col items-center gap-4">
          <div className="p-3 bg-rose-500/10 dark:bg-rose-500/20 rounded-full">
            <AlertTriangle className="w-6 h-6 text-rose-500" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              Close Thread?
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Are you sure you want to close <span className="font-medium text-gray-900 dark:text-white">"{threadTitle}"</span>?
            </p>
          </div>
        </div>

        {/* Warning Message */}
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            This will permanently delete the thread and all its messages. This action cannot be undone.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 justify-center">
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="px-6 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="px-6 py-2.5 text-sm font-medium text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Closing...</span>
              </>
            ) : (
              <span>Close Thread</span>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}
