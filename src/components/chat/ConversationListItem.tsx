import React from 'react';
import { User, TrendingUp } from 'lucide-react';
import { Chat } from '@/lib/chatService';
import { formatDistanceToNow } from 'date-fns';

interface ConversationListItemProps {
  chat: Chat;
  isSelected: boolean;
  onClick: () => void;
}

export const ConversationListItem: React.FC<ConversationListItemProps> = ({
  chat,
  isSelected,
  onClick,
}) => {
  const userName = chat.user_profile?.name || 'User';
  const userEmail = chat.user_profile?.email || '';
  const unreadCount = chat.unread_count_admin || 0;
  const lastMessagePreview = chat.last_message_preview || 'No messages yet';
  const totalTransactions = chat.user_assignment?.total_transactions || 0;
  const totalInvoices = chat.user_assignment?.total_invoices || 0;

  // Determine user status
  const getUserStatus = () => {
    const createdAt = chat.user_profile?.created_at ? new Date(chat.user_profile.created_at) : null;
    const lastInteraction = chat.user_assignment?.last_interaction_at ? new Date(chat.user_assignment.last_interaction_at) : null;
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    if (createdAt && createdAt > sevenDaysAgo) {
      return { label: 'New', color: 'bg-green-500' };
    } else if (lastInteraction && lastInteraction > sevenDaysAgo) {
      return { label: 'Active', color: 'bg-blue-500' };
    } else if (!lastInteraction || lastInteraction < thirtyDaysAgo) {
      return { label: 'Inactive', color: 'bg-gray-400' };
    }
    return null;
  };

  const userStatus = getUserStatus();

  // Format last message time
  const lastMessageTime = chat.last_message_at
    ? formatDistanceToNow(new Date(chat.last_message_at), { addSuffix: true })
    : '';

  // Get initials for avatar
  const getInitials = (name: string) => {
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <button
      onClick={onClick}
      className={`w-full p-3 border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors text-left ${
        isSelected ? 'bg-gray-50 dark:bg-gray-700' : ''
      }`}
    >
      <div className="flex items-start space-x-3">
        <div className="relative flex-shrink-0">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 flex items-center justify-center">
            {userName !== 'User' ? (
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {getInitials(userName)}
              </span>
            ) : (
              <User className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            )}
          </div>
          {userStatus && (
            <div
              className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 ${userStatus.color} rounded-full border-2 border-white dark:border-gray-800`}
              title={userStatus.label}
            />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-0.5">
            <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
              {userName}
            </h3>
            {unreadCount > 0 && (
              <span className="ml-2 px-1.5 py-0.5 text-xs font-medium bg-red-500 text-white rounded-full flex-shrink-0">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </div>

          <p className="text-xs text-gray-500 dark:text-gray-400 truncate mb-1">
            {userEmail}
          </p>

          <p className="text-xs text-gray-600 dark:text-gray-400 truncate mb-2">
            {lastMessagePreview}
          </p>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 text-xs text-gray-500 dark:text-gray-400">
              {totalTransactions > 0 && (
                <div className="flex items-center space-x-1" title="Total transaction volume">
                  <TrendingUp className="w-3 h-3" />
                  <span>${totalTransactions.toLocaleString()}</span>
                </div>
              )}
              {totalInvoices > 0 && (
                <span title="Total invoices">{totalInvoices} invoices</span>
              )}
            </div>
            {lastMessageTime && (
              <span className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0">
                {lastMessageTime}
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
};
