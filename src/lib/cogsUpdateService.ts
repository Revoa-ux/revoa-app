import { supabase } from './supabase';

export interface CogsUpdate {
  id: string;
  product_id: string;
  variant_id?: string;
  old_cogs: number;
  new_cogs: number;
  updated_by_admin_id: string;
  affected_user_id: string;
  status: 'pending_acceptance' | 'accepted' | 'rejected' | 'expired';
  reason_for_change?: string;
  admin_notes?: string;
  user_response_notes?: string;
  accepted_at?: string;
  rejected_at?: string;
  expires_at?: string;
  chat_message_id?: string;
  notification_id?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateCogsUpdateParams {
  productId: string;
  variantId?: string;
  oldCogs: number;
  newCogs: number;
  affectedUserId: string;
  reasonForChange?: string;
  adminNotes?: string;
  expiresInDays?: number;
}

export async function createCogsUpdate(params: CreateCogsUpdateParams): Promise<CogsUpdate> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Not authenticated');
  }

  const expiresAt = params.expiresInDays
    ? new Date(Date.now() + params.expiresInDays * 24 * 60 * 60 * 1000).toISOString()
    : null;

  const { data, error } = await supabase
    .from('product_cogs_updates')
    .insert({
      product_id: params.productId,
      variant_id: params.variantId,
      old_cogs: params.oldCogs,
      new_cogs: params.newCogs,
      updated_by_admin_id: user.id,
      affected_user_id: params.affectedUserId,
      reason_for_change: params.reasonForChange,
      admin_notes: params.adminNotes,
      expires_at: expiresAt,
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  // Create notification for the user
  await createCogsUpdateNotification(data.id, params.affectedUserId, params.newCogs, params.oldCogs);

  // Send message to supplier chat
  await sendCogsUpdateToChat(data.id, params.affectedUserId, {
    productId: params.productId,
    oldCogs: params.oldCogs,
    newCogs: params.newCogs,
    reason: params.reasonForChange,
  });

  return data;
}

async function createCogsUpdateNotification(
  updateId: string,
  userId: string,
  newCogs: number,
  oldCogs: number
): Promise<void> {
  const { error } = await supabase.from('notifications').insert({
    user_id: userId,
    type: 'cogs_update',
    action_type: 'quote_review',
    title: 'Product Cost Update Requires Your Review',
    message: `A supplier has updated product costs from $${oldCogs.toFixed(2)} to $${newCogs.toFixed(2)}. Please review and accept or reject this change.`,
    action_required: true,
    link_to: `/quotes/review/${updateId}`,
    reference_id: updateId,
    read: false,
  });

  if (error) {
    console.error('Error creating notification:', error);
  }
}

async function sendCogsUpdateToChat(
  updateId: string,
  userId: string,
  details: {
    productId: string;
    oldCogs: number;
    newCogs: number;
    reason?: string;
  }
): Promise<void> {
  // Find the user's supplier chat
  const { data: chats } = await supabase
    .from('chats')
    .select('id')
    .eq('user_id', userId)
    .limit(1)
    .single();

  if (!chats) {
    console.error('No chat found for user');
    return;
  }

  const {
    data: { user: admin },
  } = await supabase.auth.getUser();

  if (!admin) return;

  const messageContent = `🔔 **Product Cost Update**

I've updated the cost for one of your products:

• **Previous Cost:** $${details.oldCogs.toFixed(2)}
• **New Cost:** $${details.newCogs.toFixed(2)}
• **Change:** ${details.newCogs > details.oldCogs ? '+' : ''}$${(details.newCogs - details.oldCogs).toFixed(2)}

${details.reason ? `**Reason:** ${details.reason}\n\n` : ''}
Please review and accept this update at your earliest convenience. This will affect all pending and future invoices.

[Review Update](/quotes/review/${updateId})`;

  const { error } = await supabase.from('messages').insert({
    chat_id: chats.id,
    sender_id: admin.id,
    content: messageContent,
    message_type: 'quote_update',
  });

  if (error) {
    console.error('Error sending message:', error);
  }
}

export async function acceptCogsUpdate(updateId: string, userNotes?: string): Promise<void> {
  const { error } = await supabase
    .from('product_cogs_updates')
    .update({
      status: 'accepted',
      user_response_notes: userNotes,
    })
    .eq('id', updateId);

  if (error) {
    throw error;
  }

  // Mark notification as read
  await supabase
    .from('notifications')
    .update({ read: true })
    .eq('reference_id', updateId);
}

export async function rejectCogsUpdate(updateId: string, userNotes?: string): Promise<void> {
  const { error } = await supabase
    .from('product_cogs_updates')
    .update({
      status: 'rejected',
      user_response_notes: userNotes,
    })
    .eq('id', updateId);

  if (error) {
    throw error;
  }

  // Mark notification as read
  await supabase
    .from('notifications')
    .update({ read: true })
    .eq('reference_id', updateId);
}

export async function getCogsUpdateById(updateId: string): Promise<CogsUpdate | null> {
  const { data, error } = await supabase
    .from('product_cogs_updates')
    .select('*')
    .eq('id', updateId)
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function getUserCogsUpdates(
  userId: string,
  status?: string
): Promise<CogsUpdate[]> {
  let query = supabase
    .from('product_cogs_updates')
    .select('*')
    .eq('affected_user_id', userId)
    .order('created_at', { ascending: false });

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return data || [];
}
