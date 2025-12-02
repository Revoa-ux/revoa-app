import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'npm:@supabase/supabase-js@2.39.7';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface AutoTagConfig {
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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get system admin ID
    const { data: adminData } = await supabase
      .from('user_profiles')
      .select('user_id')
      .eq('is_super_admin', true)
      .limit(1)
      .single();

    const systemAdminId = adminData?.user_id || '00000000-0000-0000-0000-000000000000';

    // Helper to get or find tag
    async function getTagId(tagName: string): Promise<string | null> {
      const { data } = await supabase
        .from('conversation_tags')
        .select('id')
        .eq('name', tagName)
        .eq('is_active', true)
        .maybeSingle();

      return data?.id || null;
    }

    // Helper to assign tag
    async function assignTag(chatId: string, tagId: string): Promise<void> {
      // Check if already assigned
      const { data: existing } = await supabase
        .from('conversation_tag_assignments')
        .select('id')
        .eq('chat_id', chatId)
        .eq('tag_id', tagId)
        .maybeSingle();

      if (existing) return;

      await supabase
        .from('conversation_tag_assignments')
        .insert({
          chat_id: chatId,
          tag_id: tagId,
          assigned_by_admin_id: systemAdminId,
        });
    }

    // Helper to remove tag
    async function removeTag(chatId: string, tagId: string): Promise<void> {
      await supabase
        .from('conversation_tag_assignments')
        .delete()
        .eq('chat_id', chatId)
        .eq('tag_id', tagId);
    }

    // Fetch all chats
    const { data: chats } = await supabase
      .from('chats')
      .select('id, user_id, last_message_at, last_sender')
      .not('last_message_at', 'is', null);

    if (!chats) {
      throw new Error('No chats found');
    }

    const now = new Date();
    let processedCount = 0;
    let taggedCount = 0;

    // Get tag IDs
    const waitingOnCustomerTagId = await getTagId('Waiting on Customer');
    const urgentResponseTagId = await getTagId('Urgent Response Needed');
    const followUpTagId = await getTagId('Follow Up Required');
    const highPriorityTagId = await getTagId('High Priority');
    const billingQuestionTagId = await getTagId('Billing Question');

    for (const chat of chats) {
      processedCount++;

      // Check for no user response
      if (chat.last_sender === 'admin' && chat.last_message_at && waitingOnCustomerTagId) {
        const lastMessageTime = new Date(chat.last_message_at);
        const hoursSinceLastMessage = (now.getTime() - lastMessageTime.getTime()) / (1000 * 60 * 60);

        if (hoursSinceLastMessage > DEFAULT_CONFIG.noUserResponseThreshold) {
          await assignTag(chat.id, waitingOnCustomerTagId);
          taggedCount++;
        } else {
          await removeTag(chat.id, waitingOnCustomerTagId);
        }
      }

      // Check for no admin response
      if (chat.last_sender === 'user' && chat.last_message_at && urgentResponseTagId) {
        const lastMessageTime = new Date(chat.last_message_at);
        const hoursSinceLastMessage = (now.getTime() - lastMessageTime.getTime()) / (1000 * 60 * 60);

        if (hoursSinceLastMessage > DEFAULT_CONFIG.noAdminResponseThreshold) {
          await assignTag(chat.id, urgentResponseTagId);
          taggedCount++;
        } else {
          await removeTag(chat.id, urgentResponseTagId);
        }
      }

      // Check for pending quotes
      const { data: pendingQuotes } = await supabase
        .from('product_quotes')
        .select('created_at')
        .eq('user_id', chat.user_id)
        .eq('status', 'pending')
        .order('created_at', { ascending: true });

      if (pendingQuotes && pendingQuotes.length > 0 && followUpTagId) {
        const oldestQuote = new Date(pendingQuotes[0].created_at);
        const hoursSinceQuote = (now.getTime() - oldestQuote.getTime()) / (1000 * 60 * 60);

        if (hoursSinceQuote > DEFAULT_CONFIG.pendingQuoteThreshold) {
          await assignTag(chat.id, followUpTagId);
          taggedCount++;
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
          if (now > dueDate && highPriorityTagId && billingQuestionTagId) {
            await assignTag(chat.id, highPriorityTagId);
            await assignTag(chat.id, billingQuestionTagId);
            taggedCount += 2;
            continue;
          }
        }

        // Check if pending too long
        if (hoursSinceInvoice > DEFAULT_CONFIG.pendingInvoiceThreshold && followUpTagId && billingQuestionTagId) {
          await assignTag(chat.id, followUpTagId);
          await assignTag(chat.id, billingQuestionTagId);
          taggedCount += 2;
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${processedCount} chats, applied ${taggedCount} tags`,
        processedCount,
        taggedCount,
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Error in auto-tag-conversations:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});
