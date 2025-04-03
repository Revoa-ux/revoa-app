import { Request, Response } from 'express';
import { createSupabaseClient } from '../db/client';
import { validateSettingValue } from '../utils/validation';

const supabase = createSupabaseClient();

export const getSettings = async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', req.user.id);

    if (error) throw error;

    const settings = data.reduce((acc, setting) => {
      if (!acc[setting.category]) {
        acc[setting.category] = {};
      }
      acc[setting.category][setting.key] = setting.value;
      return acc;
    }, {});

    res.json({ settings });
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
};

export const getSettingsByCategory = async (req: Request, res: Response) => {
  try {
    const { category } = req.params;

    const { data, error } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', req.user.id)
      .eq('category', category);

    if (error) throw error;

    const settings = data.reduce((acc, setting) => {
      acc[setting.key] = setting.value;
      return acc;
    }, {});

    res.json({ settings });
  } catch (error) {
    console.error('Error fetching settings by category:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
};

export const updateSetting = async (req: Request, res: Response) => {
  try {
    const { category, key } = req.params;
    const { value } = req.body;

    // Validate setting value
    const validationError = validateSettingValue(category, key, value);
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    const { data, error } = await supabase
      .from('user_settings')
      .upsert({
        user_id: req.user.id,
        category,
        key,
        value,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    res.json({ setting: data });
  } catch (error) {
    console.error('Error updating setting:', error);
    res.status(500).json({ error: 'Failed to update setting' });
  }
};

export const bulkUpdateSettings = async (req: Request, res: Response) => {
  try {
    const { settings } = req.body;

    // Validate all settings
    for (const setting of settings) {
      const validationError = validateSettingValue(
        setting.category,
        setting.key,
        setting.value
      );
      if (validationError) {
        return res.status(400).json({
          error: `Invalid setting: ${setting.category}.${setting.key} - ${validationError}`
        });
      }
    }

    const updates = settings.map(setting => ({
      user_id: req.user.id,
      category: setting.category,
      key: setting.key,
      value: setting.value,
      updated_at: new Date().toISOString()
    }));

    const { data, error } = await supabase
      .from('user_settings')
      .upsert(updates)
      .select();

    if (error) throw error;

    res.json({ settings: data });
  } catch (error) {
    console.error('Error bulk updating settings:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
};

export const resetSettings = async (req: Request, res: Response) => {
  try {
    const { categories } = req.body;

    let query = supabase
      .from('user_settings')
      .delete()
      .eq('user_id', req.user.id);

    if (categories?.length > 0) {
      query = query.in('category', categories);
    }

    const { error: deleteError } = await query;
    if (deleteError) throw deleteError;

    // Re-initialize settings
    const { error: initError } = await supabase.rpc('initialize_user_settings', {
      user_id: req.user.id,
      categories: categories || null
    });

    if (initError) throw initError;

    res.json({ success: true });
  } catch (error) {
    console.error('Error resetting settings:', error);
    res.status(500).json({ error: 'Failed to reset settings' });
  }
};

export const getSettingsAuditLog = async (req: Request, res: Response) => {
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
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) throw error;

    res.json({ logs: data });
  } catch (error) {
    console.error('Error fetching settings audit log:', error);
    res.status(500).json({ error: 'Failed to fetch audit log' });
  }
};