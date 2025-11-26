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
      size="large"
    >
      <UserProfileSidebar userId={userId} onClose={onClose} />
    </Modal>
  );
};
