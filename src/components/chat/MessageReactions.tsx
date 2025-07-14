import React, { useState } from 'react';
import { Smile, Plus } from 'lucide-react';
import { useReactionsStore, COMMON_REACTIONS } from '@/lib/chat/reactions';
import { Message } from '@/types/chat'; // eslint-disable-line @typescript-eslint/no-unused-vars
interface MessageReactionsProps {
  messageId: string;
}

export const MessageReactions: React.FC<MessageReactionsProps> = ({ messageId }) => {
  const [showPicker, setShowPicker] = useState(false);
  const { reactions, addReaction, removeReaction, getReactions } = useReactionsStore();
  const messageReactions = getReactions(messageId); // eslint-disable-line @typescript-eslint/no-unused-vars

  const handleAddReaction = async (emoji: string) => {
    try {
      await addReaction(messageId, emoji);
      setShowPicker(false);
    } catch (error) {
      console.error('Error adding reaction:', error);
    }
  };

  const handleRemoveReaction = async (reactionId: string) => {
    try {
      await removeReaction(messageId, reactionId);
    } catch (error) {
      console.error('Error removing reaction:', error);
    }
  };

  const groupedReactions = messageReactions.reduce((acc, reaction) => {
    if (!acc[reaction.emoji]) {
      acc[reaction.emoji] = [];
    }
    acc[reaction.emoji].push(reaction);
    return acc;
  }, {} as Record<string, typeof messageReactions>);

  return (
    <div className="relative flex items-center space-x-1 mt-1">
      {Object.entries(groupedReactions).map(([emoji, reactions]) => (
        <button
          key={emoji}
          onClick={() => handleRemoveReaction(reactions[0].id)}
          className="inline-flex items-center px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
        >
          <span className="mr-1">{emoji}</span>
          <span className="text-gray-600">{reactions.length}</span>
        </button>
      ))}

      <button
        onClick={() => setShowPicker(!showPicker)}
        className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
      >
        {showPicker ? <Plus className="w-4 h-4" /> : <Smile className="w-4 h-4" />}
      </button>

      {showPicker && (
        <div className="absolute bottom-full left-0 mb-2 p-2 bg-white rounded-lg shadow-lg border border-gray-200 flex flex-wrap gap-1 z-50">
          {COMMON_REACTIONS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => handleAddReaction(emoji)}
              className="p-1.5 hover:bg-gray-100 rounded transition-colors"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};