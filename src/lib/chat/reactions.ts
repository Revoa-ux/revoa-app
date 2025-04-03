import { create } from 'zustand';
import { supabase } from '../supabase';
import { Message } from '@/types/chat';

interface Reaction {
  id: string;
  messageId: string;
  userId: string;
  emoji: string;
  createdAt: Date;
}

interface ReactionsStore {
  reactions: Map<string, Reaction[]>;
  addReaction: (messageId: string, emoji: string) => Promise<void>;
  removeReaction: (messageId: string, reactionId: string) => Promise<void>;
  getReactions: (messageId: string) => Reaction[];
  loadReactions: (messageIds: string[]) => Promise<void>;
}

export const useReactionsStore = create<ReactionsStore>((set, get) => ({
  reactions: new Map(),

  addReaction: async (messageId, emoji) => {
    try {
      const { data: reaction, error } = await supabase
        .from('message_reactions')
        .insert({
          message_id: messageId,
          emoji,
          user_id: (await supabase.auth.getUser()).data.user?.id
        })
        .select()
        .single();

      if (error) throw error;

      set((state) => {
        const reactions = new Map(state.reactions);
        const messageReactions = reactions.get(messageId) || [];
        reactions.set(messageId, [...messageReactions, reaction]);
        return { reactions };
      });
    } catch (error) {
      console.error('Error adding reaction:', error);
      throw error;
    }
  },

  removeReaction: async (messageId, reactionId) => {
    try {
      const { error } = await supabase
        .from('message_reactions')
        .delete()
        .match({ id: reactionId });

      if (error) throw error;

      set((state) => {
        const reactions = new Map(state.reactions);
        const messageReactions = reactions.get(messageId) || [];
        reactions.set(
          messageId,
          messageReactions.filter((r) => r.id !== reactionId)
        );
        return { reactions };
      });
    } catch (error) {
      console.error('Error removing reaction:', error);
      throw error;
    }
  },

  getReactions: (messageId) => {
    return get().reactions.get(messageId) || [];
  },

  loadReactions: async (messageIds) => {
    try {
      const { data: reactions, error } = await supabase
        .from('message_reactions')
        .select('*')
        .in('message_id', messageIds);

      if (error) throw error;

      set((state) => {
        const reactionMap = new Map(state.reactions);
        reactions.forEach((reaction) => {
          const messageReactions = reactionMap.get(reaction.message_id) || [];
          reactionMap.set(reaction.message_id, [...messageReactions, reaction]);
        });
        return { reactions: reactionMap };
      });
    } catch (error) {
      console.error('Error loading reactions:', error);
      throw error;
    }
  }
}));

// Common emoji reactions
export const COMMON_REACTIONS = ['👍', '👎', '❤️', '😄', '😢', '🎉', '❓', '⭐'];

// Group reactions by emoji
export const groupReactions = (reactions: Reaction[]): Record<string, Reaction[]> => {
  return reactions.reduce((groups, reaction) => {
    if (!groups[reaction.emoji]) {
      groups[reaction.emoji] = [];
    }
    groups[reaction.emoji].push(reaction);
    return groups;
  }, {} as Record<string, Reaction[]>);
};

// Subscribe to reaction changes
export const subscribeToReactions = (messageId: string, callback: () => void) => {
  const subscription = supabase
    .channel(`message-reactions-${messageId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'message_reactions',
        filter: `message_id=eq.${messageId}`
      },
      callback
    )
    .subscribe();

  return () => {
    subscription.unsubscribe();
  };
};