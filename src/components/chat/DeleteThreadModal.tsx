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
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start gap-4">
          <div className="p-3 bg-[#EF4444]/10 dark:bg-[#EF4444]/20 rounded-full">
            <AlertTriangle className="w-6 h-6 text-[#EF4444]" />
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
        <div className="flex gap-3 justify-end">
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
            className="px-6 py-2.5 text-sm font-medium text-white bg-[#EF4444] hover:bg-[#DC2626] rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
