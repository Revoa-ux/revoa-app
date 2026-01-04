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
    admin_id?: string;
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
  tagIds?: string[];
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
      .eq('id', userId)
      .maybeSingle();

    // Fetch admin profile
    const { data: adminProfile } = await supabase
      .from('user_profiles')
      .select('name, email')
      .eq('id', adminId)
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

      // Get the first available admin (excluding super admins)
      const { data: adminProfile, error: adminError } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('is_admin', true)
        .eq('is_super_admin', false)
        .limit(1)
        .maybeSingle();

      if (adminError) {
        console.error('Error fetching admin profile:', adminError);
        return null;
      }

      if (adminProfile?.id) {
        console.log('Found admin:', adminProfile.id, 'Creating assignment...');

        // Create the assignment
        const { error: assignError } = await supabase
          .from('user_assignments')
          .insert({
            user_id: userId,
            admin_id: adminProfile.id
          });

        if (assignError) {
          console.error('Error creating assignment:', assignError);
          return null;
        }

        console.log('Assignment created successfully');
        assignment = { admin_id: adminProfile.id } as any;
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
      .eq('id', adminId)
      .maybeSingle();

    const isSuperAdmin = adminProfile?.is_super_admin || false;

    // Get assigned user IDs for this admin
    const { data: assignments, error: assignmentError } = await supabase
      .from('user_assignments')
      .select('user_id, admin_id, total_transactions, total_invoices, last_interaction_at')
      .eq('admin_id', adminId);

    if (assignmentError) {
      console.error('Error fetching user assignments:', assignmentError);
    }

    const assignmentMap = new Map(
      (assignments || []).map(a => [a.user_id, {
        total_transactions: a.total_transactions || 0,
        total_invoices: a.total_invoices || 0,
        last_interaction_at: a.last_interaction_at,
        admin_id: a.admin_id
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
      .select('id, name, email, company, created_at')
      .in('id', userIds);

    // Fetch shopify installations for these users
    const { data: shopifyData } = await supabase
      .from('shopify_installations')
      .select('user_id, store_url')
      .in('user_id', userIds)
      .is('uninstalled_at', null);

    // Fetch admin profile details for all assigned admins
    const assignedAdminIds = Array.from(new Set((assignments || []).map(a => a.admin_id)));
    const { data: adminProfiles } = await supabase
      .from('user_profiles')
      .select('id, first_name, last_name, display_name, email')
      .in('id', assignedAdminIds);

    // Create a map of admin profiles
    const adminProfileMap = new Map(
      (adminProfiles || []).map(p => {
        const name = p.display_name ||
          (p.first_name && p.last_name ? `${p.first_name} ${p.last_name}` :
          p.first_name || p.last_name || p.email?.split('@')[0] || 'Admin');
        return [p.id, { name, email: p.email }];
      })
    );

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
      (userProfiles || []).map(p => [p.id, { name: p.name, email: p.email, company: p.company, created_at: p.created_at }])
    );

    // Map shopify installations by user_id
    const shopifyMap = new Map<string, any[]>();
    (shopifyData || []).forEach(shop => {
      const existing = shopifyMap.get(shop.user_id) || [];
      existing.push({ store_url: shop.store_url });
      shopifyMap.set(shop.user_id, existing);
    });

    let enrichedChats = chats.map(chat => {
      const assignment = assignmentMap.get(chat.user_id);
      const adminProfile = assignment?.admin_id ? adminProfileMap.get(assignment.admin_id) : null;
      return {
        ...chat,
        user_profile: userProfileMap.get(chat.user_id) || null,
        admin_profile: adminProfile || null,
        user_assignment: assignment || null,
        shopify_installations: shopifyMap.get(chat.user_id) || null,
        last_message_preview: lastMessageMap.get(chat.id) || 'No messages yet'
      };
    });

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

    // Apply tag filter
    if (filters?.tagIds && filters.tagIds.length > 0) {
      const { data: tagAssignments } = await supabase
        .from('conversation_tag_assignments')
        .select('chat_id, tag_id')
        .in('chat_id', chatIds);

      const taggedChatIds = new Set<string>();
      tagAssignments?.forEach(assignment => {
        if (filters.tagIds!.includes(assignment.tag_id)) {
          taggedChatIds.add(assignment.chat_id);
        }
      });

      enrichedChats = enrichedChats.filter(chat => taggedChatIds.has(chat.id));
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
      .is('thread_id', null)
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
          filter: `chat_id=eq.${chatId}&thread_id=is.null`
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
  },

  // Thread / Ticket Management
  async getChatThreads(chatId: string) {
    const { data, error } = await supabase
      .from('chat_threads')
      .select(`
        *,
        shopify_orders!chat_threads_order_id_fkey (
          order_number,
          customer_first_name,
          customer_last_name
        )
      `)
      .eq('chat_id', chatId)
      .order('created_at', { ascending: false});

    if (error) {
      console.error('Error fetching threads:', error);
      return [];
    }

    const threads = (data || []).map(thread => {
      const order = Array.isArray(thread.shopify_orders) ? thread.shopify_orders[0] : thread.shopify_orders;
      return {
        ...thread,
        order_number: order?.order_number || null,
        customer_name: [
          order?.customer_first_name,
          order?.customer_last_name
        ].filter(Boolean).join(' ') || null
      };
    });

    // Sort by order number (numerically)
    threads.sort((a, b) => {
      if (!a.order_number || !b.order_number) return 0;

      // Extract numeric part from order numbers (e.g., "#1010" -> 1010)
      const numA = parseInt(a.order_number.replace(/\D/g, ''), 10) || 0;
      const numB = parseInt(b.order_number.replace(/\D/g, ''), 10) || 0;

      // Sort in descending order (highest order number first)
      return numB - numA;
    });

    return threads;
  },

  async getThreadMessages(threadId: string): Promise<Message[]> {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('thread_id', threadId)
      .is('deleted_at', null)
      .order('timestamp', { ascending: true });

    if (error) {
      console.error('Error fetching thread messages:', error);
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

  async sendThreadMessage(
    threadId: string,
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
        thread_id: threadId,
        content,
        type,
        sender,
        status: 'sent',
        metadata: metadata || {}
      })
      .select()
      .single();

    if (error) {
      console.error('Error sending thread message:', error);
      return null;
    }

    // Update thread updated_at
    await supabase
      .from('chat_threads')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', threadId);

    // Update main chat
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

  async updateThreadStatus(
    threadId: string,
    status: 'open' | 'resolved' | 'closed'
  ): Promise<boolean> {
    const { error } = await supabase
      .from('chat_threads')
      .update({ status })
      .eq('id', threadId);

    if (error) {
      console.error('Error updating thread status:', error);
      return false;
    }

    return true;
  },

  async createThread(
    chatId: string,
    orderId: string,
    tag?: string
  ): Promise<string | null> {
    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        console.error('Error getting current user:', userError);
        throw new Error('Authentication required to create thread');
      }

      // Get order details for title
      const { data: order, error: orderError } = await supabase
        .from('shopify_orders')
        .select('order_number, customer_first_name, customer_last_name')
        .eq('id', orderId)
        .single();

      if (orderError) {
        console.error('Error fetching order:', orderError);
        throw new Error('Order not found');
      }

      // Check if user is admin
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('is_admin, is_super_admin')
        .eq('user_id', user.id)
        .single();

      const isAdmin = profile?.is_admin || profile?.is_super_admin || false;

      // Generate title
      const customerName = [order.customer_first_name, order.customer_last_name]
        .filter(Boolean)
        .join(' ') || 'Customer';
      const tagLabel = tag ? ` - ${tag.charAt(0).toUpperCase() + tag.slice(1)}` : '';
      const title = `${order.order_number}${tagLabel} (${customerName})`;

      const { data, error } = await supabase
        .from('chat_threads')
        .insert({
          chat_id: chatId,
          order_id: orderId,
          title: title,
          tag: tag || null,
          status: 'open',
          created_by_user_id: user.id,
          created_by_admin: isAdmin
        })
        .select('id')
        .single();

      if (error) {
        console.error('Error creating thread:', error);
        throw new Error(error.message || 'Failed to create thread');
      }

      const threadId = data?.id;

      // Initialize conversational flow if tag is specified
      if (threadId && tag) {
        try {
          // Map tags to flow categories
          const tagToCategory: Record<string, string> = {
            'damaged': 'damage',
            'return': 'return',
            'defective': 'defective',
            'cancel_modify': 'cancel_modify',
            'wrong_item': 'wrong_item',
            'missing_items': 'missing_items',
            'shipping': 'shipping',
            'refund': 'refund',
            'replacement': 'replacement',
          };

          const flowCategory = tagToCategory[tag] || tag;

          // Fetch the flow for this category
          const { data: flow } = await supabase
            .from('bot_flows')
            .select('*')
            .eq('category', flowCategory)
            .eq('is_active', true)
            .maybeSingle();

          if (flow?.flow_definition) {
            const flowDef = flow.flow_definition as any;
            const startNode = flowDef.nodes.find((n: any) => n.id === flowDef.startNodeId);

            if (startNode) {
              // Create flow session
              const { data: session } = await supabase
                .from('thread_flow_sessions')
                .insert({
                  thread_id: threadId,
                  flow_id: flow.id,
                  current_node_id: startNode.id,
                  flow_state: {},
                  is_active: true
                })
                .select()
                .single();

              if (session) {
                // Send the initial message from the flow
                await supabase.from('messages').insert({
                  chat_id: chatId,
                  thread_id: threadId,
                  content: startNode.content,
                  type: 'text',
                  sender: 'team',
                  metadata: {
                    automated: true,
                    flow_message: true,
                    flow_session_id: session.id,
                    node_id: startNode.id,
                    node_type: startNode.type
                  }
                });
              }
            }
          }
        } catch (messageError) {
          console.error('Error initializing flow:', messageError);
          // Don't fail thread creation if flow fails
        }
      }

      return threadId;
    } catch (error) {
      console.error('Error in createThread:', error);
      throw error;
    }
  },

  async getUserOrders(userId: string) {
    const { data, error } = await supabase
      .from('shopify_orders')
      .select('id, order_number, total, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Error fetching user orders:', error);
      return [];
    }

    return data || [];
  },

  async closeThread(threadId: string): Promise<boolean> {
    // When closing, we actually delete the thread
    // Messages stay in the database but are orphaned (thread_id becomes null via CASCADE)
    const { error } = await supabase
      .from('chat_threads')
      .delete()
      .eq('id', threadId);

    if (error) {
      console.error('Error closing thread:', error);
      return false;
    }

    return true;
  },

  async moveMessageToThread(messageId: string, threadId: string): Promise<boolean> {
    const { error } = await supabase
      .from('messages')
      .update({ thread_id: threadId })
      .eq('id', messageId);

    if (error) {
      console.error('Error moving message to thread:', error);
      return false;
    }

    // Update thread updated_at timestamp
    await supabase
      .from('chat_threads')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', threadId);

    return true;
  },

  subscribeToThreads(chatId: string, callback: (threads: any[]) => void) {
    return supabase
      .channel(`threads:${chatId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_threads',
          filter: `chat_id=eq.${chatId}`
        },
        async () => {
          // Reload threads when any change occurs
          const threads = await this.getChatThreads(chatId);
          callback(threads);
        }
      )
      .subscribe();
  },

  subscribeToThreadMessages(threadId: string, callback: (message: Message) => void) {
    return supabase
      .channel(`thread-messages:${threadId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `thread_id=eq.${threadId}`
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
