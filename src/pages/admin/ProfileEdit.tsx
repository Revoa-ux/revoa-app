import React, { useState, useEffect } from 'react';
import { Save, Lock, Mail, Bell, User, Phone, Clock, FileText, Eye, EyeOff, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { adminProfileService, AdminProfile } from '@/lib/adminProfileService';
import { validatePasswordChange, validateProfileSetup, commonTimezones } from '@/lib/adminProfileValidation';
import { ProfilePictureUpload } from '@/components/admin/ProfilePictureUpload';

export default function AdminProfileEdit() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'notifications'>('profile');

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    display_name: '',
    phone: '',
    bio: '',
    timezone: 'America/New_York',
  });

  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });

  const [showPassword, setShowPassword] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  const [notificationPrefs, setNotificationPrefs] = useState({
    email: true,
    push: true,
    chat: true,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadProfile();
  }, [user]);

  const loadProfile = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const data = await adminProfileService.getProfile(user.id);
      if (!data) {
        toast.error('Profile not found');
        return;
      }

      setProfile(data);
      setFormData({
        first_name: data.first_name || '',
        last_name: data.last_name || '',
        display_name: data.display_name || '',
        phone: data.phone || '',
        bio: data.bio || '',
        timezone: data.timezone || 'America/New_York',
      });
      setNotificationPrefs(data.notification_preferences);
    } catch (error) {
      console.error('Error loading profile:', error);
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handlePasswordChange = (field: string, value: string) => {
    setPasswordData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();

    const validation = validateProfileSetup(formData);
    if (!validation.success) {
      setErrors(validation.errors);
      toast.error('Please fix the errors in the form');
      return;
    }

    setSaving(true);
    try {
      await adminProfileService.updateProfile(user!.id, formData);
      toast.success('Profile updated successfully');
      await loadProfile();
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    const validation = validatePasswordChange(passwordData);
    if (!validation.success) {
      setErrors(validation.errors);
      toast.error('Please fix the errors in the form');
      return;
    }

    setSaving(true);
    try {
      await adminProfileService.changePassword(
        passwordData.current_password,
        passwordData.new_password
      );
      toast.success('Password changed successfully');
      setPasswordData({
        current_password: '',
        new_password: '',
        confirm_password: '',
      });
      setErrors({});
    } catch (error: any) {
      console.error('Error changing password:', error);
      toast.error(error.message || 'Failed to change password');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveNotifications = async () => {
    setSaving(true);
    try {
      await adminProfileService.updateProfile(user!.id, {
        notification_preferences: notificationPrefs,
      });
      toast.success('Notification preferences updated');
    } catch (error) {
      console.error('Error updating notifications:', error);
      toast.error('Failed to update notifications');
    } finally {
      setSaving(false);
    }
  };

  if (!profile) {
    return null;
  }

  return (
    <div className="max-w-[1050px] mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-normal text-gray-900 dark:text-white mb-2">Profile Settings</h1>
        <div className="flex items-center space-x-2">
          <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Manage your admin profile and account settings
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <div className="flex space-x-8 px-6">
            {[
              { id: 'profile', label: 'Profile', icon: User },
              { id: 'security', label: 'Security', icon: Lock },
              { id: 'notifications', label: 'Notifications', icon: Bell },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id as any)}
                className={`flex items-center space-x-2 px-4 py-4 border-b-2 transition-colors ${
                  activeTab === id
                    ? 'border-gray-900 dark:border-white text-gray-900 dark:text-white'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="font-medium text-sm">{label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="p-6">
          {activeTab === 'profile' && (
            <form onSubmit={handleSaveProfile} className="space-y-6">
              <div className="flex justify-center">
                <ProfilePictureUpload
                  currentPictureUrl={profile.profile_picture_url}
                  userId={user!.id}
                  onUploadSuccess={(url) => setProfile({ ...profile, profile_picture_url: url })}
                  onDeleteSuccess={() => setProfile({ ...profile, profile_picture_url: null })}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    First Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={formData.first_name}
                      onChange={(e) => handleChange('first_name', e.target.value)}
                      className={`w-full pl-9 pr-3 py-2 text-sm border rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white ${
                        errors.first_name ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                      } focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 focus:bg-white dark:focus:bg-gray-700`}
                    />
                  </div>
                  {errors.first_name && (
                    <p className="mt-1 text-sm text-red-600">{errors.first_name}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Last Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={formData.last_name}
                      onChange={(e) => handleChange('last_name', e.target.value)}
                      className={`w-full pl-9 pr-3 py-2 text-sm border rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white ${
                        errors.last_name ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                      } focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 focus:bg-white dark:focus:bg-gray-700`}
                    />
                  </div>
                  {errors.last_name && (
                    <p className="mt-1 text-sm text-red-600">{errors.last_name}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Display Name
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={formData.display_name}
                    onChange={(e) => handleChange('display_name', e.target.value)}
                    className={`w-full pl-9 pr-3 py-2 text-sm border rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white ${
                      errors.display_name ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                    } focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 focus:bg-white dark:focus:bg-gray-700`}
                  />
                </div>
                {errors.display_name && (
                  <p className="mt-1 text-sm text-red-600">{errors.display_name}</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Phone
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => handleChange('phone', e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 focus:bg-white dark:focus:bg-gray-700"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Timezone
                  </label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <select
                      value={formData.timezone}
                      onChange={(e) => handleChange('timezone', e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 focus:bg-white dark:focus:bg-gray-700"
                    >
                      {commonTimezones.map((tz) => (
                        <option key={tz.value} value={tz.value}>
                          {tz.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Bio
                </label>
                <div className="relative">
                  <FileText className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                  <textarea
                    value={formData.bio}
                    onChange={(e) => handleChange('bio', e.target.value)}
                    rows={3}
                    maxLength={500}
                    className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white resize-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 focus:bg-white dark:focus:bg-gray-700"
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 text-right">
                  {formData.bio?.length || 0}/500
                </p>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 text-sm text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 inline-block mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </button>
              </div>
            </form>
          )}

          {activeTab === 'security' && (
            <form onSubmit={handleChangePassword} className="space-y-4 max-w-xl">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Change Password
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Ensure your account is using a strong password with at least 8 characters, including uppercase, lowercase, numbers, and special characters.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Current Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type={showPassword.current ? 'text' : 'password'}
                    value={passwordData.current_password}
                    onChange={(e) => handlePasswordChange('current_password', e.target.value)}
                    className={`w-full pl-9 pr-10 py-2 text-sm border rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white ${
                      errors.current_password ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                    } focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 focus:bg-white dark:focus:bg-gray-700`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(prev => ({ ...prev, current: !prev.current }))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    {showPassword.current ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.current_password && (
                  <p className="mt-1 text-sm text-red-600">{errors.current_password}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  New Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type={showPassword.new ? 'text' : 'password'}
                    value={passwordData.new_password}
                    onChange={(e) => handlePasswordChange('new_password', e.target.value)}
                    className={`w-full pl-9 pr-10 py-2 text-sm border rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white ${
                      errors.new_password ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                    } focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 focus:bg-white dark:focus:bg-gray-700`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(prev => ({ ...prev, new: !prev.new }))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    {showPassword.new ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.new_password && (
                  <p className="mt-1 text-sm text-red-600">{errors.new_password}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Confirm New Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type={showPassword.confirm ? 'text' : 'password'}
                    value={passwordData.confirm_password}
                    onChange={(e) => handlePasswordChange('confirm_password', e.target.value)}
                    className={`w-full pl-9 pr-10 py-2 text-sm border rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white ${
                      errors.confirm_password ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                    } focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 focus:bg-white dark:focus:bg-gray-700`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(prev => ({ ...prev, confirm: !prev.confirm }))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    {showPassword.confirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.confirm_password && (
                  <p className="mt-1 text-sm text-red-600">{errors.confirm_password}</p>
                )}
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 text-sm text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 inline-block mr-2 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    'Update Password'
                  )}
                </button>
              </div>
            </form>
          )}

          {activeTab === 'notifications' && (
            <div className="space-y-4 max-w-xl">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Notification Preferences
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Choose how you want to be notified about important updates
                </p>
              </div>

              <div className="space-y-3">
                {[
                  { key: 'email', label: 'Email Notifications', description: 'Receive notifications via email' },
                  { key: 'push', label: 'Push Notifications', description: 'Receive push notifications in your browser' },
                  { key: 'chat', label: 'Chat Notifications', description: 'Get notified about new chat messages' },
                ].map(({ key, label, description }) => (
                  <div key={key} className="flex items-start justify-between py-3 border-b border-gray-200 dark:border-gray-700 last:border-0">
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white">{label}</h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{description}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setNotificationPrefs(prev => ({ ...prev, [key]: !prev[key as keyof typeof prev] }))}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        notificationPrefs[key as keyof typeof notificationPrefs]
                          ? 'bg-gray-900 dark:bg-white'
                          : 'bg-gray-200 dark:bg-gray-600'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full transition-transform ${
                          notificationPrefs[key as keyof typeof notificationPrefs]
                            ? 'translate-x-6 bg-white dark:bg-gray-900'
                            : 'translate-x-1 bg-white dark:bg-gray-300'
                        }`}
                      />
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={handleSaveNotifications}
                  disabled={saving}
                  className="px-4 py-2 text-sm text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 inline-block mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Preferences'
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
