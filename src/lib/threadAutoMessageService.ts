import { supabase } from './supabase';

interface AutoMessage {
  id: string;
  category_tag: string;
  message_title: string;
  message_body: string;
  is_active: boolean;
}

export async function sendAutoMessageForThread(
  threadId: string,
  chatId: string,
  tags: string[],
  orderData?: {
    order_number?: string;
    product_name?: string;
    fulfillment_status?: string;
    tracking_number?: string;
  }
): Promise<void> {
  if (tags.length === 0) return;

  try {
    // Fetch auto-messages for any matching tags
    const { data: autoMessages, error } = await supabase
      .from('thread_category_auto_messages')
      .select('*')
      .in('category_tag', tags)
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (error) {
      console.error('Error fetching auto-messages:', error);
      return;
    }

    if (!autoMessages || autoMessages.length === 0) return;

    // Get the highest priority message (first matching tag)
    const message = autoMessages[0];

    // Populate variables if order data is provided
    let messageBody = message.message_body;
    if (orderData) {
      Object.entries(orderData).forEach(([key, value]) => {
        const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
        messageBody = messageBody.replace(regex, value || '');
      });
    }

    // Insert auto-message into chat
    const { error: insertError } = await supabase
      .from('messages')
      .insert({
        chat_id: chatId,
        thread_id: threadId,
        sender: 'team',
        content: `**${message.message_title}**\n\n${messageBody}`,
        type: 'text',
        created_at: new Date().toISOString(),
      });

    if (insertError) {
      console.error('Error sending auto-message:', insertError);
    }
  } catch (error) {
    console.error('Error in sendAutoMessageForThread:', error);
  }
}

export async function getAutoMessagePreview(tag: string): Promise<AutoMessage | null> {
  try {
    const { data, error } = await supabase
      .from('thread_category_auto_messages')
      .select('*')
      .eq('category_tag', tag)
      .eq('is_active', true)
      .single();

    if (error || !data) return null;

    return data;
  } catch (error) {
    console.error('Error fetching auto-message preview:', error);
    return null;
  }
}
