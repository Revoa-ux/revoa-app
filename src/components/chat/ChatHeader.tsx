import React from 'react';
import { User, ChevronRight, ChevronLeft } from 'lucide-react';
import { ChatParticipant } from '@/types/chat';
import { UserPresence } from './UserPresence';

interface ChatHeaderProps {
  participant: ChatParticipant;
  showSidebar: boolean;
  onToggleSidebar: () => void;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  participant,
  showSidebar,
  onToggleSidebar
}) => {
  return (
    <div className="px-6 py-3 border-b border-gray-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
            <User className="w-5 h-5 text-gray-500" />
          </div>
          <div>
            <h2 className="text-base font-medium text-gray-900">{participant.name}</h2>
            <div className="flex items-center space-x-2">
              <UserPresence userId={participant.id} />
              {participant.isTyping && (
                <span className="text-xs text-gray-500">typing...</span>
              )}
            </div>
          </div>
        </div>
        <button
          onClick={onToggleSidebar}
          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
        >
          {showSidebar ? (
            <ChevronRight className="w-5 h-5" />
          ) : (
            <ChevronLeft className="w-5 h-5" />
          )}
        </button>
      </div>
    </div>
  );
};