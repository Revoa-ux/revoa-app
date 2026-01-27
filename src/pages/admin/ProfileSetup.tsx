import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Mail, Phone, Clock, FileText, Loader2 } from 'lucide-react';
import { toast } from '../../lib/toast';
import { useAuth } from '@/contexts/AuthContext';
import { adminProfileService } from '@/lib/adminProfileService';
import { validateProfileSetup, ProfileSetupData, commonTimezones } from '@/lib/adminProfileValidation';
import { ProfilePictureUpload } from '@/components/admin/ProfilePictureUpload';
import { LoadingPage } from '@/components/LoadingPage';

export default function AdminProfileSetup() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profilePictureUrl, setProfilePictureUrl] = useState<string | null>(null);
  const [formData, setFormData] = useState<ProfileSetupData>({
    first_name: '',
    last_name: '',
    display_name: '',
    phone: '',
    bio: '',
    timezone: 'America/New_York',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    checkProfileStatus();
  }, [user]);

  const checkProfileStatus = async () => {
    if (!user) {
      navigate('/auth');
      return;
    }

    try {
      const profile = await adminProfileService.getProfile(user.id);

      if (!profile?.is_admin) {
        toast.error('You do not have admin access');
        navigate('/');
        return;
      }

      if (profile.profile_completed) {
        navigate('/admin/dashboard');
        return;
      }

      if (profile.first_name) setFormData(prev => ({ ...prev, first_name: profile.first_name || '' }));
      if (profile.last_name) setFormData(prev => ({ ...prev, last_name: profile.last_name || '' }));
      if (profile.display_name) setFormData(prev => ({ ...prev, display_name: profile.display_name || '' }));
      if (profile.phone) setFormData(prev => ({ ...prev, phone: profile.phone || '' }));
      if (profile.bio) setFormData(prev => ({ ...prev, bio: profile.bio || '' }));
      if (profile.timezone) setFormData(prev => ({ ...prev, timezone: profile.timezone || 'America/New_York' }));
      if (profile.profile_picture_url) setProfilePictureUrl(profile.profile_picture_url);

      setLoading(false);
    } catch (error) {
      console.error('Error checking profile status:', error);
      toast.error('Failed to load profile');
      setLoading(false);
    }
  };

  const handleChange = (field: keyof ProfileSetupData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }

    if (field === 'first_name' || field === 'last_name') {
      const firstName = field === 'first_name' ? value : formData.first_name;
      const lastName = field === 'last_name' ? value : formData.last_name;
      if (firstName && lastName) {
        setFormData(prev => ({
          ...prev,
          display_name: `${firstName} ${lastName}`,
        }));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validation = validateProfileSetup(formData);
    if (!validation.success) {
      setErrors(validation.errors);
      toast.error('Please fix the errors in the form');
      return;
    }

    setSaving(true);
    try {
      await adminProfileService.setupProfile(user!.id, formData);
      toast.success('Profile setup complete!');
      navigate('/admin/dashboard');
    } catch (error) {
      console.error('Error setting up profile:', error);
      toast.error('Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingPage />;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="bg-white dark:bg-dark rounded-xl shadow-lg border border-gray-200 dark:border-[#3a3a3a] overflow-hidden">
          <div className="bg-gradient-to-r from-[#E85B81] to-[#E87D55] px-8 py-6">
            <h1 className="text-2xl font-bold text-white">Complete Your Profile</h1>
            <p className="text-white/90 mt-2">
              Let's set up your admin profile to get started
            </p>
          </div>

          <form onSubmit={handleSubmit} className="p-8 space-y-8">
            <div className="flex justify-center">
              <ProfilePictureUpload
                currentPictureUrl={profilePictureUrl}
                userId={user!.id}
                onUploadSuccess={setProfilePictureUrl}
                onDeleteSuccess={() => setProfilePictureUrl(null)}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  First Name *
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={formData.first_name}
                    onChange={(e) => handleChange('first_name', e.target.value)}
                    className={`w-full pl-10 pr-4 py-2.5 border rounded-lg bg-white dark:bg-[#3a3a3a] text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-[#E85B81]/20 focus:border-[#E85B81] transition-colors ${
                      errors.first_name ? 'border-red-500' : 'border-gray-300 dark:border-[#4a4a4a]'
                    }`}
                    placeholder="John"
                  />
                </div>
                {errors.first_name && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.first_name}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Last Name *
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={formData.last_name}
                    onChange={(e) => handleChange('last_name', e.target.value)}
                    className={`w-full pl-10 pr-4 py-2.5 border rounded-lg bg-white dark:bg-[#3a3a3a] text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-[#E85B81]/20 focus:border-[#E85B81] transition-colors ${
                      errors.last_name ? 'border-red-500' : 'border-gray-300 dark:border-[#4a4a4a]'
                    }`}
                    placeholder="Doe"
                  />
                </div>
                {errors.last_name && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.last_name}</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Display Name *
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={formData.display_name}
                  onChange={(e) => handleChange('display_name', e.target.value)}
                  className={`w-full pl-10 pr-4 py-2.5 border rounded-lg bg-white dark:bg-[#3a3a3a] text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-[#E85B81]/20 focus:border-[#E85B81] transition-colors ${
                    errors.display_name ? 'border-red-500' : 'border-gray-300 dark:border-[#4a4a4a]'
                  }`}
                  placeholder="John Doe"
                />
              </div>
              {errors.display_name && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.display_name}</p>
              )}
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                This is how your name will appear to users
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Phone (Optional)
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleChange('phone', e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-[#4a4a4a] rounded-lg bg-white dark:bg-[#3a3a3a] text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-[#E85B81]/20 focus:border-[#E85B81] transition-colors"
                    placeholder="+1 (555) 000-0000"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Timezone
                </label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <select
                    value={formData.timezone}
                    onChange={(e) => handleChange('timezone', e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-[#4a4a4a] rounded-lg bg-white dark:bg-[#3a3a3a] text-gray-900 dark:text-white focus:ring-2 focus:ring-[#E85B81]/20 focus:border-[#E85B81] transition-colors"
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
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Bio (Optional)
              </label>
              <div className="relative">
                <FileText className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <textarea
                  value={formData.bio}
                  onChange={(e) => handleChange('bio', e.target.value)}
                  rows={4}
                  maxLength={500}
                  className={`w-full pl-10 pr-4 py-2.5 border rounded-lg bg-white dark:bg-[#3a3a3a] text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-[#E85B81]/20 focus:border-[#E85B81] transition-colors resize-none ${
                    errors.bio ? 'border-red-500' : 'border-gray-300 dark:border-[#4a4a4a]'
                  }`}
                  placeholder="Tell us a bit about yourself..."
                />
              </div>
              <div className="flex justify-between mt-1">
                {errors.bio && (
                  <p className="text-sm text-red-600 dark:text-red-400">{errors.bio}</p>
                )}
                <p className="text-xs text-gray-500 dark:text-gray-400 ml-auto">
                  {formData.bio?.length || 0}/500
                </p>
              </div>
            </div>

            <div className="flex gap-4 pt-4">
              <button
                type="submit"
                disabled={saving}
                className="btn btn-primary w-full flex items-center justify-center disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 className="btn-icon w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Complete Setup'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
