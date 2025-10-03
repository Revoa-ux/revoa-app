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
    console.log('getOrCreateChat called with userId:', userId, 'adminId:', adminId);

    // First try to find existing chat
    const { data: existingChat, error: fetchError } = await supabase
      .from('chats')
      .select('*')
      .eq('user_id', userId)
      .eq('admin_id', adminId)
      .maybeSingle();

    if (fetchError) {
      console.error('Error fetching chat:', fetchError);
      return null;
    }

    let chat = existingChat;

    if (!chat) {
      console.log('No existing chat found, creating new one...');

      const { data: newChat, error: createError } = await supabase
        .from('chats')
        .insert({
          user_id: userId,
          admin_id: adminId,
        })
        .select('*')
        .single();

      if (createError) {
        console.error('Error creating chat:', createError);
        return null;
      }

      console.log('Chat created successfully:', newChat.id);
      chat = newChat;
    } else {
      console.log('Found existing chat:', chat.id);
    }

    // Fetch user profile
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('name, email')
      .eq('user_id', userId)
      .maybeSingle();

    // Fetch admin profile
    const { data: adminProfile } = await supabase
      .from('user_profiles')
      .select('name, email')
      .eq('user_id', adminId)
      .maybeSingle();

    return {
      ...chat,
      user_profile: userProfile || null,
      admin_profile: adminProfile || null,
    } as Chat;
  },

  async getUserChat(userId: string): Promise<Chat | null> {
    // First check if user has an assigned admin
    const { data: assignment, error: assignmentError } = await supabase
      .from('user_assignments')
      .select('admin_id')
      .eq('user_id', userId)
      .maybeSingle();

    if (assignmentError) {
      console.error('Error fetching assignment:', assignmentError);
    }

    // If no assignment, try to auto-assign a default admin
    if (!assignment?.admin_id) {
      console.log('No admin assigned, attempting auto-assignment...');

      // Get the first available admin (preferably super_admin)
      const { data: adminProfile, error: adminError } = await supabase
        .from('user_profiles')
        .select('user_id')
        .eq('is_admin', true)
        .order('admin_role', { ascending: false }) // super_admin before admin
        .limit(1)
        .maybeSingle();

      if (adminError) {
        console.error('Error fetching admin profile:', adminError);
        return null;
      }

      if (adminProfile?.user_id) {
        console.log('Found admin:', adminProfile.user_id, 'Creating assignment...');

        // Create the assignment
        const { error: assignError } = await supabase
          .from('user_assignments')
          .insert({
            user_id: userId,
            admin_id: adminProfile.user_id
          });

        if (assignError) {
          console.error('Error creating assignment:', assignError);
          return null;
        }

        console.log('Assignment created successfully');
        assignment = { admin_id: adminProfile.user_id } as any;
      } else {
        console.error('No admin profile found');
        return null;
      }
    }

    if (!assignment?.admin_id) {
      console.error('No admin available for assignment');
      return null;
    }

    console.log('Getting or creating chat with admin:', assignment.admin_id);
    return this.getOrCreateChat(userId, assignment.admin_id);
  },

  async getAdminChats(adminId: string): Promise<Chat[]> {
    const { data: chats, error } = await supabase
      .from('chats')
      .select('*')
      .eq('admin_id', adminId)
      .order('last_message_at', { ascending: false });

    if (error) {
      console.error('Error fetching admin chats:', error);
      return [];
    }

    if (!chats || chats.length === 0) {
      return [];
    }

    // Fetch all user profiles for these chats
    const userIds = chats.map(c => c.user_id);
    const { data: userProfiles } = await supabase
      .from('user_profiles')
      .select('user_id, name, email')
      .in('user_id', userIds);

    // Fetch admin profile
    const { data: adminProfile } = await supabase
      .from('user_profiles')
      .select('user_id, name, email')
      .eq('user_id', adminId)
      .maybeSingle();

    // Map profiles to chats
    const userProfileMap = new Map(
      (userProfiles || []).map(p => [p.user_id, { name: p.name, email: p.email }])
    );

    return chats.map(chat => ({
      ...chat,
      user_profile: userProfileMap.get(chat.user_id) || null,
      admin_profile: adminProfile ? { name: adminProfile.name, email: adminProfile.email } : null,
    }));
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
