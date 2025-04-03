import React from 'react';
import { usePresenceStore, formatLastSeen } from '@/lib/chat/presence';

interface UserPresenceProps {
  userId: string;
  showLastSeen?: boolean;
}

export const UserPresence: React.FC<UserPresenceProps> = ({ userId, showLastSeen = true }) => {
  const users = usePresenceStore((state) => state.users);
  const user = users.get(userId);

  if (!user) return null;

  return (
    <div className="flex items-center space-x-2">
      <div className={`w-2 h-2 rounded-full ${
        user.status === 'online'
          ? 'bg-green-500'
          : user.status === 'away'
          ? 'bg-yellow-500'
          : 'bg-gray-400'
      }`} />
      
      {showLastSeen && user.status === 'offline' && user.lastSeen && (
        <span className="text-xs text-gray-500">
          Last seen {formatLastSeen(user.lastSeen)}
        </span>
      )}
    </div>
  );
};