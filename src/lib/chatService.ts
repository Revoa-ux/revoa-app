import { supabase } from './supabase';
import { Message } from '@/types/chat';

export interface Chat {
  id: string;
  user_id: string;
  admin_id: string;
  last_message_at: string;
  unread_count_user: number;
  unread_count_admin: number;
  metadata: any;
  created_at: string;
  updated_at: string;
  user_profile?: {
    name: string | null;
    email: string;
  };
  admin_profile?: {
    name: string | null;
    email: string;
  };
}

export const chatService = {
  async getOrCreateChat(userId: string, adminId: string): Promise<Chat | null> {
    const { data: existingChat, error: fetchError } = await supabase
      .from('chats')
      .select(`
        *,
        user_profile:user_profiles!chats_user_id_fkey(name, email),
        admin_profile:user_profiles!chats_admin_id_fkey(name, email)
      `)
      .eq('user_id', userId)
      .eq('admin_id', adminId)
      .maybeSingle();

    if (fetchError) {
      console.error('Error fetching chat:', fetchError);
      return null;
    }

    if (existingChat) {
      return existingChat;
    }

    const { data: newChat, error: createError } = await supabase
      .from('chats')
      .insert({
        user_id: userId,
        admin_id: adminId,
      })
      .select(`
        *,
        user_profile:user_profiles!chats_user_id_fkey(name, email),
        admin_profile:user_profiles!chats_admin_id_fkey(name, email)
      `)
      .single();

    if (createError) {
      console.error('Error creating chat:', createError);
      return null;
    }

    return newChat;
  },

  async getUserChat(userId: string): Promise<Chat | null> {
    // First check if user has an assigned admin
    let { data: assignment } = await supabase
      .from('user_assignments')
      .select('admin_id')
      .eq('user_id', userId)
      .maybeSingle();

    // If no assignment, try to auto-assign a default admin
    if (!assignment?.admin_id) {
      // Get the first available admin (preferably super_admin)
      const { data: adminProfile } = await supabase
        .from('user_profiles')
        .select('user_id')
        .eq('is_admin', true)
        .order('admin_role', { ascending: false }) // super_admin before admin
        .limit(1)
        .maybeSingle();

      if (adminProfile?.user_id) {
        // Create the assignment
        const { error: assignError } = await supabase
          .from('user_assignments')
          .insert({
            user_id: userId,
            admin_id: adminProfile.user_id
          });

        if (!assignError) {
          assignment = { admin_id: adminProfile.user_id };
        }
      }
    }

    if (!assignment?.admin_id) {
      console.error('No admin available for assignment');
      return null;
    }

    return this.getOrCreateChat(userId, assignment.admin_id);
  },

  async getAdminChats(adminId: string): Promise<Chat[]> {
    const { data, error } = await supabase
      .from('chats')
      .select(`
        *,
        user_profile:user_profiles!chats_user_id_fkey(name, email),
        admin_profile:user_profiles!chats_admin_id_fkey(name, email)
      `)
      .eq('admin_id', adminId)
      .order('last_message_at', { ascending: false });

    if (error) {
      console.error('Error fetching admin chats:', error);
      return [];
    }

    return data || [];
  },

  async getChatMessages(chatId: string): Promise<Message[]> {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('chat_id', chatId)
      .order('timestamp', { ascending: true });

    if (error) {
      console.error('Error fetching messages:', error);
      return [];
    }

    return (data || []).map(msg => ({
      id: msg.id,
      content: msg.content,
      type: msg.type as 'text' | 'image' | 'file' | 'link' | 'invoice',
      sender: msg.sender as 'user' | 'team',
      timestamp: new Date(msg.timestamp),
      status: msg.status,
      statusTimeline: {},
      fileUrl: msg.metadata?.fileUrl,
      fileName: msg.metadata?.fileName,
      fileSize: msg.metadata?.fileSize,
      metadata: msg.metadata
    }));
  },

  async sendMessage(
    chatId: string,
    content: string,
    type: 'text' | 'image' | 'file' | 'link' | 'invoice',
    sender: 'user' | 'team',
    metadata?: any
  ): Promise<Message | null> {
    const { data, error } = await supabase
      .from('messages')
      .insert({
        chat_id: chatId,
        content,
        type,
        sender,
        status: 'sent',
        metadata: metadata || {}
      })
      .select()
      .single();

    if (error) {
      console.error('Error sending message:', error);
      return null;
    }

    await supabase
      .from('chats')
      .update({
        last_message_at: new Date().toISOString(),
        unread_count_user: sender === 'team' ? supabase.rpc('increment', { row_id: chatId }) : undefined,
        unread_count_admin: sender === 'user' ? supabase.rpc('increment', { row_id: chatId }) : undefined,
      })
      .eq('id', chatId);

    return {
      id: data.id,
      content: data.content,
      type: data.type as any,
      sender: data.sender as any,
      timestamp: new Date(data.timestamp),
      status: data.status,
      statusTimeline: {},
      fileUrl: data.metadata?.fileUrl,
      fileName: data.metadata?.fileName,
      fileSize: data.metadata?.fileSize,
      metadata: data.metadata
    };
  },

  async markMessagesAsRead(chatId: string, isAdmin: boolean): Promise<void> {
    const field = isAdmin ? 'unread_count_admin' : 'unread_count_user';

    await supabase
      .from('chats')
      .update({ [field]: 0 })
      .eq('id', chatId);
  },

  subscribeToMessages(chatId: string, callback: (message: Message) => void) {
    return supabase
      .channel(`messages:${chatId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `chat_id=eq.${chatId}`
        },
        (payload) => {
          const msg = payload.new;
          callback({
            id: msg.id,
            content: msg.content,
            type: msg.type,
            sender: msg.sender,
            timestamp: new Date(msg.timestamp),
            status: msg.status,
            statusTimeline: {},
            fileUrl: msg.metadata?.fileUrl,
            fileName: msg.metadata?.fileName,
            fileSize: msg.metadata?.fileSize,
            metadata: msg.metadata
          });
        }
      )
      .subscribe();
  }
};
