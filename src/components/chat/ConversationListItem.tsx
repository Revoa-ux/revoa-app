import React, { useState, useEffect } from 'react';
import { TrendingUp } from 'lucide-react';
import { Chat } from '@/lib/chatService';
import { formatDistanceToNow } from 'date-fns';
import { conversationTagService, ConversationTagAssignment } from '@/lib/conversationTagService';

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
  const [tags, setTags] = useState<ConversationTagAssignment[]>([]);

  useEffect(() => {
    loadTags();

    // Subscribe to tag changes for this chat
    const subscription = conversationTagService.subscribeToTagAssignments(chat.id, () => {
      loadTags();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [chat.id]);

  const loadTags = async () => {
    try {
      const chatTags = await conversationTagService.getTagsByChat(chat.id);
      setTags(chatTags);
    } catch (error) {
      console.error('Error loading tags:', error);
    }
  };

  // Get initials for avatar
  const getInitials = (name: string) => {
    if (!name || name === 'User') {
      return 'U';
    }
    const parts = name.split(' ').filter(p => p.length > 0);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  // Format last message time
  const lastMessageTime = chat.last_message_at
    ? formatDistanceToNow(new Date(chat.last_message_at), { addSuffix: true })
    : '';

  return (
    <button
      onClick={onClick}
      className={`w-full p-3 border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors text-left ${
        isSelected ? 'bg-gradient-to-r from-[#E85B81]/10 to-[#E87D55]/10 dark:from-[#E85B81]/20 dark:to-[#E87D55]/20 border-l-2 border-l-[#E85B81]' : ''
      }`}
    >
      <div className="flex items-start space-x-3">
        <div className="relative flex-shrink-0">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#E85B81] to-[#E87D55] flex items-center justify-center">
            <span className="text-sm font-semibold text-white">
              {getInitials(userName)}
            </span>
          </div>
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

          {tags.length > 0 && (
            <div className="flex items-center gap-1 mb-2 flex-wrap">
              {tags.slice(0, 2).map((assignment) => (
                <span
                  key={assignment.id}
                  className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium"
                  style={{
                    backgroundColor: `${assignment.tag?.color}15`,
                    color: assignment.tag?.color,
                  }}
                >
                  {assignment.tag?.name}
                </span>
              ))}
              {tags.length > 2 && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium text-gray-500 dark:text-gray-400">
                  +{tags.length - 2}
                </span>
              )}
            </div>
          )}

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
