import React from 'react';
import Modal from '@/components/Modal';
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
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Client Profile"
      size="large"
    >
      <div className="max-h-[80vh] overflow-y-auto">
        <UserProfileSidebar userId={userId} onClose={onClose} />
      </div>
    </Modal>
  );
};
