import { supabase } from './supabase';

export interface QueueItem {
  id?: string;
  user_id?: string;
  insight_id?: string;
  queue_type: 'action' | 'rule';
  queue_data: any;
  source_description: string;
  entity_name?: string;
  platform?: string;
  status?: 'queued' | 'processing' | 'completed' | 'failed';
  created_at?: string;
  expires_at?: string;
  completed_at?: string;
  error_message?: string;
}

class RexAutomationQueueService {
  async addToQueue(userId: string, item: Omit<QueueItem, 'id' | 'user_id' | 'status' | 'created_at' | 'expires_at'>): Promise<QueueItem | null> {
    try {
      const { data, error } = await supabase
        .from('rex_automation_queue')
        .insert({
          user_id: userId,
          ...item
        })
        .select()
        .single();

      if (error) {
        console.error('Error adding to queue:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in addToQueue:', error);
      return null;
    }
  }

  async getQueueItems(userId: string, status?: 'queued' | 'processing' | 'completed' | 'failed'): Promise<QueueItem[]> {
    try {
      let query = supabase
        .from('rex_automation_queue')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error getting queue items:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getQueueItems:', error);
      return [];
    }
  }

  async removeFromQueue(userId: string, itemId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('rex_automation_queue')
        .delete()
        .eq('id', itemId)
        .eq('user_id', userId);

      if (error) {
        console.error('Error removing from queue:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in removeFromQueue:', error);
      return false;
    }
  }

  async clearQueue(userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('rex_automation_queue')
        .delete()
        .eq('user_id', userId)
        .eq('status', 'queued');

      if (error) {
        console.error('Error clearing queue:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in clearQueue:', error);
      return false;
    }
  }

  async updateQueueItemStatus(
    userId: string,
    itemId: string,
    status: 'queued' | 'processing' | 'completed' | 'failed',
    errorMessage?: string
  ): Promise<boolean> {
    try {
      const updates: any = {
        status,
      };

      if (status === 'completed') {
        updates.completed_at = new Date().toISOString();
      }

      if (errorMessage) {
        updates.error_message = errorMessage;
      }

      const { error } = await supabase
        .from('rex_automation_queue')
        .update(updates)
        .eq('id', itemId)
        .eq('user_id', userId);

      if (error) {
        console.error('Error updating queue item status:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in updateQueueItemStatus:', error);
      return false;
    }
  }

  async batchAddToQueue(userId: string, items: Omit<QueueItem, 'id' | 'user_id' | 'status' | 'created_at' | 'expires_at'>[]): Promise<QueueItem[]> {
    try {
      const itemsWithUserId = items.map(item => ({
        user_id: userId,
        ...item
      }));

      const { data, error } = await supabase
        .from('rex_automation_queue')
        .insert(itemsWithUserId)
        .select();

      if (error) {
        console.error('Error batch adding to queue:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in batchAddToQueue:', error);
      return [];
    }
  }
}

export const rexAutomationQueueService = new RexAutomationQueueService();
