import React from 'react';
import { MessageSquare } from 'lucide-react';

const AdminChat: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Chat Management</h1>
        <p className="text-gray-600 dark:text-gray-400">Monitor and manage user conversations</p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex flex-col items-center justify-center py-12">
          <MessageSquare className="w-12 h-12 text-gray-400 mb-4" />
          <p className="text-gray-600 dark:text-gray-400">No active chats</p>
        </div>
      </div>
    </div>
  );
};

export default AdminChat;
