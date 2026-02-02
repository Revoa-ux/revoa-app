import { supabase } from './supabase';
import { conversationTagService } from './conversationTagService';

interface AutoTagConfig {
  // Time thresholds in hours
  noUserResponseThreshold: number;
  noAdminResponseThreshold: number;
  pendingQuoteThreshold: number;
  pendingInvoiceThreshold: number;
  overdueInvoiceThreshold: number;
}

const DEFAULT_CONFIG: AutoTagConfig = {
  noUserResponseThreshold: 48, // 2 days
  noAdminResponseThreshold: 24, // 1 day
  pendingQuoteThreshold: 72, // 3 days
  pendingInvoiceThreshold: 168, // 7 days
  overdueInvoiceThreshold: 336, // 14 days
};

// System admin ID for automatic tagging (use first super admin)
const SYSTEM_ADMIN_ID = '00000000-0000-0000-0000-000000000000'; // Placeholder, will be fetched

export const autoTaggingService = {
  async getSystemAdminId(): Promise<string> {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('user_id')
      .eq('is_super_admin', true)
      .limit(1)
      .single();

    if (error || !data) {
      console.error('Error fetching system admin:', error);
      // Return a fallback ID
      return SYSTEM_ADMIN_ID;
    }

    return data.user_id;
  },

  async getOrCreateTag(tagName: string): Promise<string | null> {
    // Try to find existing tag
    const { data: existingTag } = await supabase
      .from('conversation_tags')
      .select('id')
      .eq('name', tagName)
      .eq('is_active', true)
      .maybeSingle();

    if (existingTag) {
      return existingTag.id;
    }

    // Tag doesn't exist, return null (we'll only use existing tags)
    return null;
  },

  async autoAssignTag(chatId: string, tagName: string): Promise<void> {
    try {
      const tagId = await this.getOrCreateTag(tagName);
      if (!tagId) {
        console.warn(`Tag "${tagName}" not found for auto-assignment`);
        return;
      }

      // Check if tag is already assigned
      const existingAssignments = await conversationTagService.getTagsByChat(chatId);
      const hasTag = existingAssignments.some(a => a.tag_id === tagId);

      if (hasTag) {
        return; // Already has this tag
      }

      const adminId = await this.getSystemAdminId();
      await conversationTagService.assignTag(chatId, tagId, adminId);
    } catch (error) {
      console.error(`Error auto-assigning tag "${tagName}":`, error);
    }
  },

  async autoRemoveTag(chatId: string, tagName: string): Promise<void> {
    try {
      const tagId = await this.getOrCreateTag(tagName);
      if (!tagId) {
        return;
      }

      await conversationTagService.removeTag(chatId, tagId);
    } catch (error) {
      console.error(`Error auto-removing tag "${tagName}":`, error);
    }
  },

  async processChat(chatId: string, config: AutoTagConfig = DEFAULT_CONFIG): Promise<void> {
    try {
      // Fetch chat with related data
      const { data: chat, error: chatError } = await supabase
        .from('chats')
        .select(`
          id,
          user_id,
          last_message_at,
          last_sender,
          messages(
            id,
            sender,
            created_at
          )
        `)
        .eq('id', chatId)
        .single();

      if (chatError || !chat) {
        console.error('Error fetching chat:', chatError);
        return;
      }

      const now = new Date();

      // Check for no user response
      if (chat.last_sender === 'admin' && chat.last_message_at) {
        const lastMessageTime = new Date(chat.last_message_at);
        const hoursSinceLastMessage = (now.getTime() - lastMessageTime.getTime()) / (1000 * 60 * 60);

        if (hoursSinceLastMessage > config.noUserResponseThreshold) {
          await this.autoAssignTag(chatId, 'Waiting on Customer');
        } else {
          await this.autoRemoveTag(chatId, 'Waiting on Customer');
        }
      }

      // Check for no admin response
      if (chat.last_sender === 'user' && chat.last_message_at) {
        const lastMessageTime = new Date(chat.last_message_at);
        const hoursSinceLastMessage = (now.getTime() - lastMessageTime.getTime()) / (1000 * 60 * 60);

        if (hoursSinceLastMessage > config.noAdminResponseThreshold) {
          await this.autoAssignTag(chatId, 'Urgent Response Needed');
        } else {
          await this.autoRemoveTag(chatId, 'Urgent Response Needed');
        }
      }

      // Check for pending quotes
      const { data: pendingQuotes } = await supabase
        .from('product_quotes')
        .select('created_at')
        .eq('user_id', chat.user_id)
        .eq('status', 'pending')
        .order('created_at', { ascending: true });

      if (pendingQuotes && pendingQuotes.length > 0) {
        const oldestQuote = new Date(pendingQuotes[0].created_at);
        const hoursSinceQuote = (now.getTime() - oldestQuote.getTime()) / (1000 * 60 * 60);

        if (hoursSinceQuote > config.pendingQuoteThreshold) {
          await this.autoAssignTag(chatId, 'Follow Up Required');
        }
      }

      // Check for pending invoices
      const { data: pendingInvoices } = await supabase
        .from('invoices')
        .select('created_at, status, due_date')
        .eq('user_id', chat.user_id)
        .in('status', ['pending', 'overdue'])
        .order('created_at', { ascending: true });

      if (pendingInvoices && pendingInvoices.length > 0) {
        const oldestInvoice = pendingInvoices[0];
        const invoiceTime = new Date(oldestInvoice.created_at);
        const hoursSinceInvoice = (now.getTime() - invoiceTime.getTime()) / (1000 * 60 * 60);

        // Check if overdue
        if (oldestInvoice.due_date) {
          const dueDate = new Date(oldestInvoice.due_date);
          if (now > dueDate) {
            await this.autoAssignTag(chatId, 'High Priority');
            await this.autoAssignTag(chatId, 'Billing Question');
            return;
          }
        }

        // Check if pending too long
        if (hoursSinceInvoice > config.pendingInvoiceThreshold) {
          await this.autoAssignTag(chatId, 'Follow Up Required');
          await this.autoAssignTag(chatId, 'Billing Question');
        }
      } else {
        // No pending invoices, remove billing-related tags if they were auto-assigned
        await this.autoRemoveTag(chatId, 'Billing Question');
      }
    } catch (error) {
      console.error(`Error processing auto-tags for chat ${chatId}:`, error);
    }
  },

  async processAllChats(config: AutoTagConfig = DEFAULT_CONFIG): Promise<void> {
    try {
      // Fetch all active chats
      const { data: chats, error } = await supabase
        .from('chats')
        .select('id')
        .not('last_message_at', 'is', null);

      if (error || !chats) {
        console.error('Error fetching chats:', error);
        return;
      }

      console.log(`Processing auto-tags for ${chats.length} chats...`);

      // Process each chat
      for (const chat of chats) {
        await this.processChat(chat.id, config);
      }

      console.log('Auto-tagging complete');
    } catch (error) {
      console.error('Error processing all chats:', error);
    }
  },

  async startAutoTagging(intervalMinutes: number = 60): Promise<NodeJS.Timeout> {
    // Run immediately
    await this.processAllChats();

    // Then run on interval
    return setInterval(async () => {
      await this.processAllChats();
    }, intervalMinutes * 60 * 1000);
  }
};
