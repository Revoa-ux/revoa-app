import React from 'react';
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
          <div className="relative rounded-xl shadow-xl max-w-md w-full overflow-hidden">
            <UserProfileSidebar userId={userId} onClose={onClose} />
          </div>
        </div>
      </div>
    </div>
  );
};
