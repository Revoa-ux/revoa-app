import { supabase } from './supabase';
import { ProfileSetupData, ProfileUpdateData, sanitizeInput } from './adminProfileValidation';

export interface AdminProfile {
  id: string;
  user_id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  display_name: string | null;
  profile_picture_url: string | null;
  phone: string | null;
  bio: string | null;
  timezone: string | null;
  notification_preferences: {
    email: boolean;
    push: boolean;
    chat: boolean;
  };
  profile_completed: boolean;
  profile_completed_at: string | null;
  is_admin: boolean;
  admin_role: 'admin' | 'super_admin' | null;
  created_at: string;
  updated_at: string;
}

export const adminProfileService = {
  async getProfile(userId: string): Promise<AdminProfile | null> {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching admin profile:', error);
      throw new Error('Failed to fetch profile');
    }

    return data;
  },

  async setupProfile(userId: string, profileData: ProfileSetupData): Promise<AdminProfile> {
    const sanitized = {
      first_name: sanitizeInput(profileData.first_name),
      last_name: sanitizeInput(profileData.last_name),
      display_name: sanitizeInput(profileData.display_name),
      phone: profileData.phone ? sanitizeInput(profileData.phone) : null,
      bio: profileData.bio ? sanitizeInput(profileData.bio) : null,
      timezone: profileData.timezone || 'America/New_York',
      profile_completed: true,
      profile_completed_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('user_profiles')
      .update(sanitized)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error setting up profile:', error);
      throw new Error('Failed to setup profile');
    }

    return data;
  },

  async updateProfile(userId: string, updates: ProfileUpdateData): Promise<AdminProfile> {
    const sanitized: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (updates.first_name) sanitized.first_name = sanitizeInput(updates.first_name);
    if (updates.last_name) sanitized.last_name = sanitizeInput(updates.last_name);
    if (updates.display_name) sanitized.display_name = sanitizeInput(updates.display_name);
    if (updates.phone !== undefined) sanitized.phone = updates.phone ? sanitizeInput(updates.phone) : null;
    if (updates.bio !== undefined) sanitized.bio = updates.bio ? sanitizeInput(updates.bio) : null;
    if (updates.timezone) sanitized.timezone = updates.timezone;
    if (updates.notification_preferences) sanitized.notification_preferences = updates.notification_preferences;

    const { data, error } = await supabase
      .from('user_profiles')
      .update(sanitized)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error updating profile:', error);
      throw new Error('Failed to update profile');
    }

    return data;
  },

  async uploadProfilePicture(userId: string, file: File): Promise<string> {
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/avatar-${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('admin-avatars')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: true,
      });

    if (uploadError) {
      console.error('Error uploading profile picture:', uploadError);
      throw new Error('Failed to upload profile picture');
    }

    const { data: { publicUrl } } = supabase.storage
      .from('admin-avatars')
      .getPublicUrl(fileName);

    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({
        profile_picture_url: publicUrl,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    if (updateError) {
      console.error('Error updating profile picture URL:', updateError);
      throw new Error('Failed to update profile picture');
    }

    return publicUrl;
  },

  async deleteProfilePicture(userId: string): Promise<void> {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('profile_picture_url')
      .eq('user_id', userId)
      .single();

    if (profile?.profile_picture_url) {
      const fileName = profile.profile_picture_url.split('/').pop();
      if (fileName) {
        const filePath = `${userId}/${fileName}`;
        await supabase.storage
          .from('admin-avatars')
          .remove([filePath]);
      }
    }

    const { error } = await supabase
      .from('user_profiles')
      .update({
        profile_picture_url: null,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    if (error) {
      console.error('Error deleting profile picture:', error);
      throw new Error('Failed to delete profile picture');
    }
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email!,
      password: currentPassword,
    });

    if (signInError) {
      throw new Error('Current password is incorrect');
    }

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      console.error('Error changing password:', error);
      throw new Error('Failed to change password');
    }
  },

  async changeEmail(newEmail: string, password: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email!,
      password,
    });

    if (signInError) {
      throw new Error('Password is incorrect');
    }

    const { error } = await supabase.auth.updateUser({
      email: newEmail,
    });

    if (error) {
      console.error('Error changing email:', error);
      throw new Error('Failed to change email');
    }
  },

  async checkProfileCompletion(userId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('profile_completed')
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error('Error checking profile completion:', error);
      return false;
    }

    return data?.profile_completed || false;
  },
};
