import React, { ReactNode } from 'react';

interface ModalFooterProps {
  onCancel: () => void;
  onSubmit?: () => void;
  cancelText?: string;
  submitText?: string | ReactNode;
  isSubmitting?: boolean;
  submitDisabled?: boolean;
  cancelDisabled?: boolean;
  leftContent?: ReactNode;
  centerContent?: ReactNode;
}

export function ModalFooter({
  onCancel,
  onSubmit,
  cancelText = 'Cancel',
  submitText = 'Submit',
  isSubmitting = false,
  submitDisabled = false,
  cancelDisabled = false,
  leftContent,
  centerContent,
}: ModalFooterProps) {
  return (
    <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
      <div className="px-6 py-4 flex items-center justify-between">
        {/* Left side - Cancel button or custom content */}
        {leftContent || (
          <button
            onClick={onCancel}
            disabled={cancelDisabled || isSubmitting}
            className="px-5 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {cancelText}
          </button>
        )}

        {/* Center content (optional, for warnings or status) */}
        {centerContent && <div className="flex-1 flex items-center justify-center px-4">{centerContent}</div>}

        {/* Right side - Submit button */}
        {onSubmit && (
          <button
            onClick={onSubmit}
            disabled={submitDisabled || isSubmitting}
            className="px-5 py-1.5 text-sm font-medium text-white bg-gray-800 dark:bg-gray-600 border border-gray-700 dark:border-gray-500 hover:bg-gray-900 hover:border-gray-800 dark:hover:bg-gray-700 dark:hover:border-gray-600 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              submitText
            )}
          </button>
        )}
      </div>
    </div>
  );
}
