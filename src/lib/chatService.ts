import { supabase } from './supabase';
import { Message } from '@/types/chat';

async function uploadChatFile(file: File, userId: string): Promise<string | null> {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('chat-files')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('Error uploading file:', uploadError);
      return null;
    }

    const { data } = supabase.storage
      .from('chat-files')
      .getPublicUrl(fileName);

    return data.publicUrl;
  } catch (error) {
    console.error('Error in uploadChatFile:', error);
    return null;
  }
}

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
    company: string | null;
    created_at?: string;
  };
  shopify_installations?: {
    store_url: string;
  }[];
  admin_profile?: {
    name: string | null;
    email: string;
  };
  user_assignment?: {
    total_transactions?: number;
    total_invoices?: number;
    last_interaction_at?: string;
  };
  last_message_preview?: string;
}

export interface ChatFilters {
  search?: string;
  status?: 'all' | 'unread' | 'archived' | 'flagged';
  userType?: 'all' | 'new' | 'active' | 'inactive';
  sortBy?: 'recent' | 'oldest' | 'volume' | 'messages' | 'alphabetical';
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
    let { data: assignment } = await supabase
      .from('user_assignments')
      .select('admin_id')
      .eq('user_id', userId)
      .maybeSingle();

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

  async getAdminChats(adminId: string, filters?: ChatFilters): Promise<Chat[]> {
    // Check if admin is super admin
    const { data: adminProfile } = await supabase
      .from('user_profiles')
      .select('is_super_admin')
      .eq('user_id', adminId)
      .maybeSingle();

    const isSuperAdmin = adminProfile?.is_super_admin || false;

    // Get assigned user IDs for this admin
    const { data: assignments, error: assignmentError } = await supabase
      .from('user_assignments')
      .select('user_id, total_transactions, total_invoices, last_interaction_at')
      .eq('admin_id', adminId);

    if (assignmentError) {
      console.error('Error fetching user assignments:', assignmentError);
    }

    const assignmentMap = new Map(
      (assignments || []).map(a => [a.user_id, {
        total_transactions: a.total_transactions || 0,
        total_invoices: a.total_invoices || 0,
        last_interaction_at: a.last_interaction_at
      }])
    );

    // Build chat query
    let query = supabase
      .from('chats')
      .select('*');

    // Super admins see all chats, regular admins only see assigned users
    if (!isSuperAdmin) {
      const assignedUserIds = (assignments || []).map(a => a.user_id);

      // If admin has no assigned users, return empty
      if (assignedUserIds.length === 0) {
        return [];
      }

      query = query.in('user_id', assignedUserIds);
    }

    // Apply filters
    if (filters?.status === 'unread') {
      query = query.gt('unread_count_admin', 0);
    }

    // Default sort by most recent
    let sortField = 'last_message_at';
    let sortAscending = false;

    if (filters?.sortBy === 'oldest') {
      sortAscending = true;
    } else if (filters?.sortBy === 'alphabetical') {
      sortField = 'user_id';
      sortAscending = true;
    }

    query = query.order(sortField, { ascending: sortAscending });

    const { data: chats, error } = await query;

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
      .select('user_id, name, email, company, created_at')
      .in('user_id', userIds);

    // Fetch shopify installations for these users
    const { data: shopifyData } = await supabase
      .from('shopify_installations')
      .select('user_id, store_url')
      .in('user_id', userIds)
      .is('uninstalled_at', null);

    // Fetch admin profile details (already fetched is_super_admin above)
    const { data: adminProfileDetails } = await supabase
      .from('user_profiles')
      .select('user_id, name, email')
      .eq('user_id', adminId)
      .maybeSingle();

    // Fetch last message for each chat
    const chatIds = chats.map(c => c.id);
    const { data: lastMessages } = await supabase
      .from('messages')
      .select('chat_id, content, type')
      .in('chat_id', chatIds)
      .is('deleted_at', null)
      .order('timestamp', { ascending: false });

    // Create a map of last messages
    const lastMessageMap = new Map<string, string>();
    lastMessages?.forEach(msg => {
      if (!lastMessageMap.has(msg.chat_id)) {
        const preview = msg.type === 'text'
          ? msg.content
          : msg.type === 'image'
          ? '📷 Image'
          : msg.type === 'file'
          ? '📎 File'
          : msg.content;
        lastMessageMap.set(msg.chat_id, preview.length > 50 ? preview.substring(0, 50) + '...' : preview);
      }
    });

    // Map profiles to chats
    const userProfileMap = new Map(
      (userProfiles || []).map(p => [p.user_id, { name: p.name, email: p.email, company: p.company, created_at: p.created_at }])
    );

    // Map shopify installations by user_id
    const shopifyMap = new Map<string, any[]>();
    (shopifyData || []).forEach(shop => {
      const existing = shopifyMap.get(shop.user_id) || [];
      existing.push({ store_url: shop.store_url });
      shopifyMap.set(shop.user_id, existing);
    });

    let enrichedChats = chats.map(chat => ({
      ...chat,
      user_profile: userProfileMap.get(chat.user_id) || null,
      admin_profile: adminProfileDetails ? { name: adminProfileDetails.name, email: adminProfileDetails.email } : null,
      user_assignment: assignmentMap.get(chat.user_id) || null,
      shopify_installations: shopifyMap.get(chat.user_id) || null,
      last_message_preview: lastMessageMap.get(chat.id) || 'No messages yet'
    }));

    // Apply search filter
    if (filters?.search) {
      const searchLower = filters.search.toLowerCase();
      enrichedChats = enrichedChats.filter(chat =>
        chat.user_profile?.name?.toLowerCase().includes(searchLower) ||
        chat.user_profile?.email?.toLowerCase().includes(searchLower) ||
        chat.last_message_preview?.toLowerCase().includes(searchLower)
      );
    }

    // Apply user type filter
    if (filters?.userType && filters.userType !== 'all') {
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      enrichedChats = enrichedChats.filter(chat => {
        const createdAt = chat.user_profile?.created_at ? new Date(chat.user_profile.created_at) : null;
        const lastInteraction = chat.user_assignment?.last_interaction_at ? new Date(chat.user_assignment.last_interaction_at) : null;

        if (filters.userType === 'new') {
          return createdAt && createdAt > sevenDaysAgo;
        } else if (filters.userType === 'active') {
          return lastInteraction && lastInteraction > sevenDaysAgo;
        } else if (filters.userType === 'inactive') {
          return !lastInteraction || lastInteraction < thirtyDaysAgo;
        }
        return true;
      });
    }

    // Apply custom sorting after filters
    if (filters?.sortBy === 'volume') {
      enrichedChats.sort((a, b) =>
        (b.user_assignment?.total_transactions || 0) - (a.user_assignment?.total_transactions || 0)
      );
    } else if (filters?.sortBy === 'messages') {
      enrichedChats.sort((a, b) =>
        (b.unread_count_admin || 0) - (a.unread_count_admin || 0)
      );
    } else if (filters?.sortBy === 'alphabetical') {
      enrichedChats.sort((a, b) => {
        const nameA = a.user_profile?.name || a.user_profile?.email || '';
        const nameB = b.user_profile?.name || b.user_profile?.email || '';
        return nameA.localeCompare(nameB);
      });
    }

    return enrichedChats;
  },

  async getChatMessages(chatId: string): Promise<Message[]> {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('chat_id', chatId)
      .is('deleted_at', null)
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

  async sendFileMessage(
    chatId: string,
    file: File,
    sender: 'user' | 'team',
    userId: string,
    messageContent?: string
  ): Promise<Message | null> {
    const fileUrl = await uploadChatFile(file, userId);

    if (!fileUrl) {
      return null;
    }

    const fileType = file.type.startsWith('image/') ? 'image' : 'file';

    // Use custom message content if provided, otherwise use filename
    const content = messageContent || file.name;

    return this.sendMessage(
      chatId,
      content,
      fileType as 'image' | 'file',
      sender,
      {
        fileUrl,
        fileName: file.name,
        fileSize: file.size
      }
    );
  },

  async markMessagesAsRead(chatId: string, isAdmin: boolean): Promise<void> {
    const field = isAdmin ? 'unread_count_admin' : 'unread_count_user';

    await supabase
      .from('chats')
      .update({ [field]: 0 })
      .eq('id', chatId);
  },

  async deleteMessage(messageId: string): Promise<boolean> {
    const { error } = await supabase
      .from('messages')
      .update({
        deleted_at: new Date().toISOString(),
        deleted_by: (await supabase.auth.getUser()).data.user?.id
      })
      .eq('id', messageId);

    if (error) {
      console.error('Error deleting message:', error);
      return false;
    }

    return true;
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
  },

  async updateChatMetadata(chatId: string, metadata: any): Promise<{ error: any }> {
    const { error } = await supabase
      .from('chats')
      .update({ metadata })
      .eq('id', chatId);

    return { error };
  }
};
