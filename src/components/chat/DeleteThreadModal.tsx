import React from 'react';
import { AlertTriangle, Loader2, X } from 'lucide-react';
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
      <div className="relative">
        {/* Custom Close Button */}
        <button
          onClick={onClose}
          disabled={isDeleting}
          className="absolute -top-2 -right-2 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#2a2a2a] rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="space-y-4 text-center pt-2">
          {/* Header */}
          <div className="flex flex-col items-center gap-3">
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
          <div className="bg-gray-50/50 dark:bg-dark/50 backdrop-blur-sm rounded-xl p-4 border border-gray-200/30 dark:border-[#333333]/30">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              This will permanently delete the thread and all its messages. This action cannot be undone.
            </p>
          </div>

          {/* Divider */}
          <div className="border-t border-gray-200/60 dark:border-[#333333]/60"></div>

          {/* Action Button */}
          <div className="flex justify-center pt-1">
            <button
              onClick={onConfirm}
              disabled={isDeleting}
              className="btn btn-danger flex items-center gap-2 shadow-sm px-8"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 btn-icon animate-spin" />
                  <span>Closing...</span>
                </>
              ) : (
                <span>Close Thread</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
