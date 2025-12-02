import React, { useState, useEffect } from 'react';
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
  const userCompany = chat.user_profile?.company ||
    (chat.shopify_installations && chat.shopify_installations.length > 0
      ? chat.shopify_installations[0].store_url.replace('https://', '').replace('.myshopify.com', '')
      : chat.user_profile?.email || '');
  const unreadCount = chat.unread_count_admin || 0;
  const lastMessagePreview = chat.last_message_preview || 'No messages yet';
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
      className={`relative w-full p-4 border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors text-left ${
        isSelected ? 'bg-gray-100 dark:bg-gray-700/50' : ''
      }`}
    >
      {isSelected && (
        <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-gradient-to-b from-[#E85B81] to-[#E87D55]" />
      )}
      <div className="flex items-start gap-3">
        <div className="relative flex-shrink-0 mt-0.5">
          <div className="w-11 h-11 rounded-full bg-gradient-to-br from-gray-200/80 via-gray-300/70 to-gray-200/60 dark:bg-gradient-to-br dark:from-gray-700/50 dark:via-gray-600/40 dark:to-gray-700/50 backdrop-blur-sm flex items-center justify-center">
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
              {getInitials(userName)}
            </span>
          </div>
        </div>

        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 truncate">
              {userName}
            </h3>
            {lastMessageTime && (
              <span className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0">
                {lastMessageTime}
              </span>
            )}
          </div>

          <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
            {userCompany}
          </p>

          <p className="text-sm text-gray-600 dark:text-gray-400 truncate line-clamp-1">
            {lastMessagePreview}
          </p>

          <div className="flex items-center gap-2 flex-wrap">
            {tags.length > 0 && (
              <>
                {tags.slice(0, 2).map((assignment) => (
                  <span
                    key={assignment.id}
                    className="inline-flex items-center px-2 py-0.5 rounded-md text-xs"
                    style={{
                      backgroundColor: `${assignment.tag?.color}15`,
                      color: assignment.tag?.color,
                    }}
                  >
                    {assignment.tag?.name}
                  </span>
                ))}
                {tags.length > 2 && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs text-gray-500 dark:text-gray-400">
                    +{tags.length - 2}
                  </span>
                )}
              </>
            )}
            {unreadCount > 0 && (
              <span className="inline-flex items-center px-2 py-0.5 text-xs bg-red-500 text-white rounded-full">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </div>

        </div>
      </div>
    </button>
  );
};
