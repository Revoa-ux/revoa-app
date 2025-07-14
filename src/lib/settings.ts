import { supabase } from './supabase';
import { toast } from 'sonner';

export interface Setting {
  category: string;
  key: string;
  value: any;
}

export interface SettingsService {
  getAll(): Promise<Record<string, Record<string, any>>>;
  getByCategory(category: string): Promise<Record<string, any>>;
  update(category: string, key: string, value: any): Promise<void>; // eslint-disable-line @typescript-eslint/no-explicit-any
  bulkUpdate(settings: Setting[]): Promise<void>;
  reset(categories?: string[]): Promise<void>;
  getAuditLog(): Promise<any[]>;
}

class SettingsServiceImpl implements SettingsService {
  private async handleError(error: any, message: string) {
    console.error(`Settings error (${message}):`, error); // eslint-disable-line @typescript-eslint/no-explicit-any
    toast.error(`Failed to ${message.toLowerCase()}`);
    throw error;
  }

  async getAll(): Promise<Record<string, Record<string, any>>> {
    try {
      const { data, error } = await supabase
        .from('user_settings')
        .select('*');

      if (error) throw error;

      return data.reduce((acc, setting) => {
        if (!acc[setting.category]) {
          acc[setting.category] = {};
        }
        acc[setting.category][setting.key] = setting.value; // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return acc;
      }, {});
    } catch (error) {
      this.handleError(error, 'Fetch settings');
      return {};
    }
  }

  async getByCategory(category: string): Promise<Record<string, any>> {
    try {
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('category', category);

      if (error) throw error;

      return data.reduce((acc, setting) => { // eslint-disable-next-line @typescript-eslint/no-explicit-any
        acc[setting.key] = setting.value;
        return acc;
      }, {});
    } catch (error) {
      this.handleError(error, `Fetch ${category} settings`);
      return {};
    }
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async update(category: string, key: string, value: any): Promise<void> {
    try {
      const { error } = await supabase
        .from('user_settings')
        .upsert({
          category,
          key,
          value,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      toast.success('Setting updated successfully');
    } catch (error) {
      this.handleError(error, 'Update setting');
    }
  }

  async bulkUpdate(settings: Setting[]): Promise<void> {
    try {
      const updates = settings.map(setting => ({
        category: setting.category,
        key: setting.key,
        value: setting.value,
        updated_at: new Date().toISOString() // eslint-disable-next-line @typescript-eslint/no-explicit-any
      }));

      const { error } = await supabase
        .from('user_settings')
        .upsert(updates);

      if (error) throw error;

      toast.success('Settings updated successfully');
    } catch (error) {
      this.handleError(error, 'Update settings');
    }
  }

  async reset(categories?: string[]): Promise<void> {
    try {
      let query = supabase
        .from('user_settings')
        .delete();

      if (categories?.length) {
        query = query.in('category', categories);
      }

      const { error } = await query;
      if (error) throw error;

      toast.success('Settings reset successfully');
    } catch (error) {
      this.handleError(error, 'Reset settings');
    }
  }

  async getAuditLog(): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('settings_audit_log')
        .select(`
          id,
          setting_id,
          action,
          old_value,
          new_value,
          created_at,
          user_settings (
            category,
            key
          )
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error; // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return data;
    } catch (error) {
      this.handleError(error, 'Fetch audit log');
      return [];
    }
  }
}

export const settingsService = new SettingsServiceImpl();