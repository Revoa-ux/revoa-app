import { supabase } from './supabase';

export interface ConversationTag {
  id: string;
  name: string;
  color: string;
  icon: string;
  description: string | null;
  category: 'priority' | 'type' | 'status' | 'segment';
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface ConversationTagAssignment {
  id: string;
  chat_id: string;
  tag_id: string;
  assigned_by_admin_id: string;
  assigned_at: string;
  tag?: ConversationTag;
}

export const conversationTagService = {
  async getTags(): Promise<ConversationTag[]> {
    const { data, error } = await supabase
      .from('conversation_tags')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('Error fetching conversation tags:', error);
      throw error;
    }

    return data || [];
  },

  async getTagsByChat(chatId: string): Promise<ConversationTagAssignment[]> {
    const { data, error } = await supabase
      .from('conversation_tag_assignments')
      .select(`
        *,
        tag:conversation_tags(*)
      `)
      .eq('chat_id', chatId);

    if (error) {
      console.error('Error fetching tags for chat:', error);
      throw error;
    }

    return data || [];
  },

  async assignTag(
    chatId: string,
    tagId: string,
    adminId: string
  ): Promise<ConversationTagAssignment | null> {
    const { data, error } = await supabase
      .from('conversation_tag_assignments')
      .insert({
        chat_id: chatId,
        tag_id: tagId,
        assigned_by_admin_id: adminId,
      })
      .select(`
        *,
        tag:conversation_tags(*)
      `)
      .single();

    if (error) {
      console.error('Error assigning tag:', error);
      throw error;
    }

    return data;
  },

  async removeTag(chatId: string, tagId: string): Promise<void> {
    const { error } = await supabase
      .from('conversation_tag_assignments')
      .delete()
      .eq('chat_id', chatId)
      .eq('tag_id', tagId);

    if (error) {
      console.error('Error removing tag:', error);
      throw error;
    }
  },

  async bulkAssignTags(
    chatId: string,
    tagIds: string[],
    adminId: string
  ): Promise<void> {
    const { data: existingAssignments } = await supabase
      .from('conversation_tag_assignments')
      .select('tag_id')
      .eq('chat_id', chatId);

    const existingTagIds = new Set(
      existingAssignments?.map((a) => a.tag_id) || []
    );

    const tagsToAdd = tagIds.filter((id) => !existingTagIds.has(id));
    const tagsToRemove = Array.from(existingTagIds).filter(
      (id) => !tagIds.includes(id)
    );

    if (tagsToAdd.length > 0) {
      const { error: insertError } = await supabase
        .from('conversation_tag_assignments')
        .insert(
          tagsToAdd.map((tagId) => ({
            chat_id: chatId,
            tag_id: tagId,
            assigned_by_admin_id: adminId,
          }))
        );

      if (insertError) {
        console.error('Error adding tags:', insertError);
        throw insertError;
      }
    }

    if (tagsToRemove.length > 0) {
      const { error: deleteError } = await supabase
        .from('conversation_tag_assignments')
        .delete()
        .eq('chat_id', chatId)
        .in('tag_id', tagsToRemove);

      if (deleteError) {
        console.error('Error removing tags:', deleteError);
        throw deleteError;
      }
    }
  },

  async createTag(tagData: {
    name: string;
    color: string;
    icon: string;
    description?: string;
    category: 'priority' | 'type' | 'status' | 'segment';
    sort_order?: number;
  }): Promise<ConversationTag | null> {
    const { data, error } = await supabase
      .from('conversation_tags')
      .insert({
        name: tagData.name,
        color: tagData.color,
        icon: tagData.icon,
        description: tagData.description || null,
        category: tagData.category,
        sort_order: tagData.sort_order || 999,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating tag:', error);
      throw error;
    }

    return data;
  },

  async updateTag(
    tagId: string,
    updates: Partial<Omit<ConversationTag, 'id' | 'created_at' | 'updated_at'>>
  ): Promise<ConversationTag | null> {
    const { data, error } = await supabase
      .from('conversation_tags')
      .update(updates)
      .eq('id', tagId)
      .select()
      .single();

    if (error) {
      console.error('Error updating tag:', error);
      throw error;
    }

    return data;
  },

  async deleteTag(tagId: string): Promise<void> {
    const { error } = await supabase
      .from('conversation_tags')
      .delete()
      .eq('id', tagId);

    if (error) {
      console.error('Error deleting tag:', error);
      throw error;
    }
  },

  async getTagUsageStats(): Promise<{
    tagId: string;
    tagName: string;
    usageCount: number;
  }[]> {
    const { data, error } = await supabase
      .from('conversation_tag_assignments')
      .select(`
        tag_id,
        tag:conversation_tags(name)
      `);

    if (error) {
      console.error('Error fetching tag usage stats:', error);
      throw error;
    }

    const stats = new Map<string, { name: string; count: number }>();

    data?.forEach((assignment: any) => {
      const tagId = assignment.tag_id;
      const tagName = assignment.tag?.name || 'Unknown';

      if (stats.has(tagId)) {
        stats.get(tagId)!.count++;
      } else {
        stats.set(tagId, { name: tagName, count: 1 });
      }
    });

    return Array.from(stats.entries()).map(([tagId, { name, count }]) => ({
      tagId,
      tagName: name,
      usageCount: count,
    }));
  },

  subscribeToTagAssignments(
    chatId: string,
    callback: (payload: any) => void
  ) {
    return supabase
      .channel(`tag-assignments-${chatId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversation_tag_assignments',
          filter: `chat_id=eq.${chatId}`,
        },
        callback
      )
      .subscribe();
  },
};
