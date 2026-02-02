import { supabase } from './supabase';

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  action_type?: 'quote_review' | 'cogs_update' | 'invoice_payment' | 'general' | 'system';
  title: string;
  message: string;
  read: boolean;
  action_required: boolean;
  link_to?: string;
  reference_id?: string;
  metadata?: Record<string, any>;
  created_at: string;
}

export async function getUnreadCount(): Promise<number> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return 0;

  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('read', false);

  if (error) {
    console.error('Error fetching unread count:', error);
    return 0;
  }

  return count || 0;
}

export async function getRecentNotifications(limit = 5): Promise<Notification[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching notifications:', error);
    return [];
  }

  return data || [];
}

export async function getAllNotifications(): Promise<Notification[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching notifications:', error);
    return [];
  }

  return data || [];
}

export async function markAsRead(notificationId: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('id', notificationId);

  if (error) {
    console.error('Error marking notification as read:', error);
    throw error;
  }
}

export async function markAllAsRead(): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('user_id', user.id)
    .eq('read', false);

  if (error) {
    console.error('Error marking all as read:', error);
    throw error;
  }
}

export async function createNotification(params: {
  userId: string;
  type: string;
  actionType?: 'quote_review' | 'cogs_update' | 'invoice_payment' | 'general' | 'system';
  title: string;
  message: string;
  actionRequired?: boolean;
  linkTo?: string;
  referenceId?: string;
  metadata?: Record<string, any>;
}): Promise<Notification> {
  const { data, error } = await supabase
    .from('notifications')
    .insert({
      user_id: params.userId,
      type: params.type,
      action_type: params.actionType,
      title: params.title,
      message: params.message,
      read: false,
      action_required: params.actionRequired || false,
      link_to: params.linkTo,
      reference_id: params.referenceId,
      metadata: params.metadata,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating notification:', error);
    throw error;
  }

  return data;
}

export async function deleteNotification(notificationId: string): Promise<void> {
  const { error } = await supabase.from('notifications').delete().eq('id', notificationId);

  if (error) {
    console.error('Error deleting notification:', error);
    throw error;
  }
}

export function subscribeToNotifications(
  callback: (notification: Notification) => void
): () => void {
  const {
    data: { user },
  } = supabase.auth.getUser().then((result) => result);

  if (!user) {
    return () => {};
  }

  const subscription = supabase
    .channel('notifications')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user}`,
      },
      (payload) => {
        callback(payload.new as Notification);
      }
    )
    .subscribe();

  return () => {
    subscription.unsubscribe();
  };
}
