import { supabase } from '../supabase';
import { ANALYTICS_TEMPLATES } from './templates';

export interface AnalyticsPreferences {
  id: string;
  user_id: string;
  active_template: string;
  custom_layout: string[];
  created_at: string;
  updated_at: string;
}

export async function getUserPreferences(userId: string): Promise<AnalyticsPreferences | null> {
  const { data, error } = await supabase
    .from('user_analytics_preferences')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching user preferences:', error);
    throw error;
  }

  if (!data) {
    const defaultPrefs = await createDefaultPreferences(userId);
    return defaultPrefs;
  }

  return data;
}

export async function createDefaultPreferences(userId: string): Promise<AnalyticsPreferences> {
  const defaultPrefs = {
    user_id: userId,
    active_template: 'executive',
    custom_layout: ANALYTICS_TEMPLATES.executive.metricIds
  };

  const { data, error } = await supabase
    .from('user_analytics_preferences')
    .insert(defaultPrefs)
    .select()
    .single();

  if (error) {
    console.error('Error creating default preferences:', error);
    throw error;
  }

  return data;
}

export async function updateActiveTemplate(
  userId: string,
  templateId: string
): Promise<AnalyticsPreferences> {
  const template = ANALYTICS_TEMPLATES[templateId];
  if (!template) {
    throw new Error(`Template ${templateId} not found`);
  }

  const { data, error } = await supabase
    .from('user_analytics_preferences')
    .update({
      active_template: templateId,
      custom_layout: template.metricIds
    })
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    console.error('Error updating template:', error);
    throw error;
  }

  return data;
}

export async function updateCustomLayout(
  userId: string,
  metricIds: string[]
): Promise<AnalyticsPreferences> {
  const { data, error } = await supabase
    .from('user_analytics_preferences')
    .update({
      active_template: 'custom',
      custom_layout: metricIds
    })
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    console.error('Error updating custom layout:', error);
    throw error;
  }

  return data;
}

export async function resetToDefault(userId: string): Promise<AnalyticsPreferences> {
  return updateActiveTemplate(userId, 'executive');
}
