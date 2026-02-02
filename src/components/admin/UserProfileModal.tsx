import React from 'react';
import { X } from 'lucide-react';
import { UserProfileSidebar } from './UserProfileSidebar';

interface UserProfileModalProps {
  userId: string;
  onClose: () => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  userId,
  onClose
}) => {
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
          <div className="relative rounded-xl shadow-xl w-full max-w-md bg-white dark:bg-dark max-h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 border-b border-gray-200 dark:border-[#3a3a3a] flex items-center justify-between flex-shrink-0">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white">Client Profile</h2>
              <button
                onClick={onClose}
                className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#3a3a3a] rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-hidden">
              <UserProfileSidebar userId={userId} onClose={onClose} showHeader={false} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
