import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
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
      <div className="p-6">
        <div className="flex items-start gap-4 mb-6">
          <div className="flex-shrink-0 w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Delete Thread
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              Are you sure you want to delete <span className="font-medium text-gray-900 dark:text-white">"{threadTitle}"</span>?
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              This will permanently delete the thread and all its messages. This action cannot be undone.
            </p>
          </div>
        </div>

        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isDeleting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Deleting...</span>
              </>
            ) : (
              <span>Delete Thread</span>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}
