import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { useClickOutside } from '@/lib/useClickOutside';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  maxWidth?: string;
  noPadding?: boolean;
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = 'max-w-md',
  noPadding = false
}) => {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
    }
    return () => {
      document.body.classList.remove('modal-open');
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4">
          <div
            ref={modalRef}
            onClick={(e) => e.stopPropagation()}
            className={`relative bg-white dark:bg-[#1f1f1f] rounded-xl shadow-xl ${maxWidth} w-full overflow-hidden flex flex-col max-h-[calc(100vh-4rem)]`}
            role="dialog"
            aria-modal="true"
          >
            {title && (
              <div className="px-6 py-4 border-b border-gray-200 dark:border-[#3a3a3a] flex-shrink-0">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">{title}</h3>
                  <button
                    onClick={onClose}
                    className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#3a3a3a] rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}

            <div className={`overflow-y-auto flex-1 min-h-0 ${noPadding ? '' : 'p-6'}`}>
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Modal;