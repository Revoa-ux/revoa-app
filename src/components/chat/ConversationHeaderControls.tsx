import React from 'react';
import { Archive, Flag, Volume2, VolumeX, Trash2, ArchiveRestore } from 'lucide-react';
import { Chat } from '@/lib/chatService';

interface ConversationHeaderControlsProps {
  chat: Chat | null;
  onArchive: () => void;
  onFlag: () => void;
  onMute: () => void;
  onDelete: () => void;
}

export const ConversationHeaderControls: React.FC<ConversationHeaderControlsProps> = ({
  chat,
  onArchive,
  onFlag,
  onMute,
  onDelete
}) => {
  if (!chat) return null;

  const isArchived = chat.is_archived || false;
  const isFlagged = chat.is_flagged || false;
  const isMuted = chat.is_muted || false;

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={onArchive}
        className={`p-2 rounded-lg transition-colors ${
          isArchived
            ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
        }`}
        title={isArchived ? 'Unarchive conversation' : 'Archive conversation'}
      >
        {isArchived ? (
          <ArchiveRestore className="w-5 h-5" />
        ) : (
          <Archive className="w-5 h-5" />
        )}
      </button>

      <button
        onClick={onFlag}
        className={`p-2 rounded-lg transition-colors ${
          isFlagged
            ? 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20'
            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
        }`}
        title={isFlagged ? 'Unflag conversation' : 'Flag for follow-up'}
      >
        <Flag className={`w-5 h-5 ${isFlagged ? 'fill-current' : ''}`} />
      </button>

      <button
        onClick={onMute}
        className={`p-2 rounded-lg transition-colors ${
          isMuted
            ? 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20'
            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
        }`}
        title={isMuted ? 'Unmute notifications' : 'Mute notifications'}
      >
        {isMuted ? (
          <VolumeX className="w-5 h-5" />
        ) : (
          <Volume2 className="w-5 h-5" />
        )}
      </button>

      <button
        onClick={onDelete}
        className="p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 transition-colors"
        title="Delete conversation"
      >
        <Trash2 className="w-5 h-5" />
      </button>
    </div>
  );
};
