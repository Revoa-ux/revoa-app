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
    <div className="border-t border-gray-200 dark:border-[#3a3a3a] bg-gray-50 dark:bg-[#2a2a2a]">
      <div className="px-6 py-4 flex items-center justify-between">
        {/* Left side - Cancel button or custom content */}
        {leftContent || (
          <button
            onClick={onCancel}
            disabled={cancelDisabled || isSubmitting}
            className="px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#2a2a2a] rounded-lg transition-colors disabled:opacity-50"
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
            className="px-4 py-2 text-sm bg-rose-600 text-white rounded-lg hover:bg-rose-700 disabled:opacity-50 transition-colors flex items-center gap-2"
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
