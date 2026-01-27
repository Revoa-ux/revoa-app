import React, { useEffect, useRef } from 'react';
import { Chat } from '@/lib/chatService';

interface HorizontalConversationListProps {
  chats: Chat[];
  selectedChatId: string | null;
  onSelectChat: (chat: Chat) => void;
}

export const HorizontalConversationList: React.FC<HorizontalConversationListProps> = ({
  chats,
  selectedChatId,
  onSelectChat,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const selectedItemRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (selectedItemRef.current && scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const selectedItem = selectedItemRef.current;
      const containerRect = container.getBoundingClientRect();
      const itemRect = selectedItem.getBoundingClientRect();

      if (itemRect.left < containerRect.left || itemRect.right > containerRect.right) {
        selectedItem.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
    }
  }, [selectedChatId]);

  const getInitials = (chat: Chat) => {
    const profile = chat.user_profile;
    const userName = profile?.name ||
      profile?.company ||
      (chat.shopify_installations && chat.shopify_installations.length > 0
        ? chat.shopify_installations[0].store_url.replace('https://', '').replace('.myshopify.com', '')
        : profile?.email?.split('@')[0] || 'User');

    if (!userName || userName === 'User') {
      return 'U';
    }
    const parts = userName.split(' ').filter(p => p.length > 0);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return userName.substring(0, 2).toUpperCase();
  };

  const getUserName = (chat: Chat) => {
    const profile = chat.user_profile;
    return profile?.name ||
      profile?.company ||
      (chat.shopify_installations && chat.shopify_installations.length > 0
        ? chat.shopify_installations[0].store_url.replace('https://', '').replace('.myshopify.com', '')
        : profile?.email?.split('@')[0] || 'User');
  };

  return (
    <div className="lg:hidden overflow-hidden">
      <div
        ref={scrollContainerRef}
        className="flex overflow-x-auto scrollbar-hide gap-2 py-3 pl-2"
        style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {chats.map((chat) => {
          const isSelected = selectedChatId === chat.id;
          const initials = getInitials(chat);
          const userName = getUserName(chat);

          return (
            <button
              key={chat.id}
              ref={isSelected ? selectedItemRef : null}
              onClick={() => onSelectChat(chat)}
              className={`flex-shrink-0 flex flex-col items-center gap-1.5 transition-all ${
                isSelected ? 'opacity-100' : 'opacity-60 hover:opacity-80'
              }`}
            >
              <div className="relative">
                <div
                  className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
                    isSelected
                      ? 'bg-gradient-to-br from-[#E85B81] to-[#E87D55] ring-2 ring-[#E85B81] ring-offset-2 ring-offset-white dark:ring-offset-gray-800'
                      : 'bg-gradient-to-br from-gray-200/80 via-gray-300/70 to-gray-200/60 dark:bg-gradient-to-br dark:from-[#3a3a3a]/50 dark:via-[#4a4a4a]/40 dark:to-[#3a3a3a]/50'
                  }`}
                >
                  <span
                    className={`text-sm font-semibold ${
                      isSelected ? 'text-white' : 'text-gray-700 dark:text-gray-200'
                    }`}
                  >
                    {initials}
                  </span>
                </div>
                {chat.unread_count_admin > 0 && (
                  <div className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
                    <span className="text-xs font-bold text-white">
                      {chat.unread_count_admin > 9 ? '9+' : chat.unread_count_admin}
                    </span>
                  </div>
                )}
              </div>
              <span
                className={`text-xs text-center max-w-[64px] truncate ${
                  isSelected
                    ? 'text-gray-900 dark:text-white font-medium'
                    : 'text-gray-600 dark:text-gray-400'
                }`}
              >
                {userName.split(' ')[0]}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
