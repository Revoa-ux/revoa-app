import React, { useState, useEffect } from 'react';
import { Check, X, Loader2, Eye, EyeOff, AlertCircle, Clock } from 'lucide-react';
import { capiService, CAPISettings as CAPISettingsType } from '@/lib/capiService';
import { toast } from '../../lib/toast';

interface CAPISettingsProps {
  userId: string;
}

interface PlatformCardProps {
  platform: 'facebook' | 'google' | 'tiktok';
  title: string;
  icon: React.ReactNode;
  settings: CAPISettingsType | null;
  onSave: (settings: Omit<CAPISettingsType, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  onTest: (pixelId: string, accessToken: string, testEventCode?: string) => Promise<boolean>;
  onToggle: (isActive: boolean) => Promise<void>;
  onDelete: () => Promise<void>;
  userId: string;
  comingSoon?: boolean;
}

function PlatformCard({
  platform,
  title,
  icon,
  settings,
  onSave,
  onTest,
  onToggle,
  onDelete,
  userId,
  comingSoon = false,
}: PlatformCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [pixelId, setPixelId] = useState(settings?.pixel_id || '');
  const [accessToken, setAccessToken] = useState(settings?.access_token || '');
  const [testEventCode, setTestEventCode] = useState(settings?.test_event_code || '');
  const [showToken, setShowToken] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isToggling, setIsToggling] = useState(false);

  useEffect(() => {
    if (settings) {
      setPixelId(settings.pixel_id);
      setAccessToken(settings.access_token);
      setTestEventCode(settings.test_event_code || '');
    }
  }, [settings]);

  const handleSave = async () => {
    if (!pixelId.trim() || !accessToken.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSaving(true);
    try {
      await onSave({
        user_id: userId,
        platform,
        pixel_id: pixelId.trim(),
        access_token: accessToken.trim(),
        test_event_code: testEventCode.trim() || null,
        is_active: settings?.is_active || false,
      });
      toast.success(`${title} settings saved successfully`);
    } catch (error) {
      toast.error('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTest = async () => {
    if (!pixelId.trim() || !accessToken.trim()) {
      toast.error('Please save your settings first');
      return;
    }

    setIsTesting(true);
    try {
      const success = await onTest(pixelId.trim(), accessToken.trim(), testEventCode.trim() || undefined);
      if (success) {
        toast.success('Connection test successful!');
      }
    } finally {
      setIsTesting(false);
    }
  };

  const handleToggle = async () => {
    if (!settings) {
      toast.error('Please save your settings first');
      return;
    }

    setIsToggling(true);
    try {
      await onToggle(!settings.is_active);
      toast.success(settings.is_active ? 'CAPI disabled' : 'CAPI enabled');
    } catch (error) {
      toast.error('Failed to toggle CAPI status');
    } finally {
      setIsToggling(false);
    }
  };

  const handleDelete = async () => {
    if (!settings) return;

    if (!confirm('Are you sure you want to remove these settings?')) return;

    try {
      await onDelete();
      setPixelId('');
      setAccessToken('');
      setTestEventCode('');
      toast.success('Settings removed');
    } catch (error) {
      toast.error('Failed to remove settings');
    }
  };

  const isConfigured = !!settings?.pixel_id && !!settings?.access_token;

  if (comingSoon) {
    return (
      <div className="bg-white dark:bg-dark rounded-xl border border-gray-200 dark:border-[#333333] p-6 opacity-60">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gray-100 dark:bg-[#2a2a2a] rounded-xl flex items-center justify-center">
              {icon}
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">{title}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Coming Soon</p>
            </div>
          </div>
          <span className="px-3 py-1 text-xs font-medium bg-gray-100 dark:bg-[#2a2a2a] text-gray-600 dark:text-gray-400 rounded-full">
            Coming Soon
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-dark rounded-xl border border-gray-200 dark:border-[#333333] overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-6 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-[#2a2a2a]/50 transition-colors"
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gray-100 dark:bg-[#2a2a2a] rounded-xl flex items-center justify-center">
            {icon}
          </div>
          <div className="text-left">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">{title}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {isConfigured ? 'Configured' : 'Not configured'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {isConfigured && (
            <div className="flex items-center gap-2">
              {settings?.is_active ? (
                <span className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full">
                  <Check className="w-3 h-3" />
                  Active
                </span>
              ) : (
                <span className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-gray-100 dark:bg-[#2a2a2a] text-gray-600 dark:text-gray-400 rounded-full">
                  <X className="w-3 h-3" />
                  Inactive
                </span>
              )}
              {settings?.last_verified_at && (
                <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                  <Clock className="w-3 h-3" />
                  Verified {new Date(settings.last_verified_at).toLocaleDateString()}
                </span>
              )}
            </div>
          )}
          <svg
            className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {isExpanded && (
        <div className="px-6 pb-6 border-t border-gray-100 dark:border-[#333333]">
          <div className="pt-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Pixel ID <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={pixelId}
                onChange={(e) => setPixelId(e.target.value)}
                placeholder="Enter your Pixel ID"
                className="w-full px-4 py-2.5 bg-white dark:bg-[#2a2a2a] border border-gray-200 dark:border-[#4a4a4a] rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Find this in your Facebook Events Manager under Data Sources
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Conversions API Access Token <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showToken ? 'text' : 'password'}
                  value={accessToken}
                  onChange={(e) => setAccessToken(e.target.value)}
                  placeholder="Enter your Access Token"
                  className="w-full px-4 py-2.5 pr-12 bg-white dark:bg-[#2a2a2a] border border-gray-200 dark:border-[#4a4a4a] rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowToken(!showToken)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Generate this in Events Manager &gt; Settings &gt; Conversions API &gt; Generate Access Token
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Test Event Code (Optional)
              </label>
              <input
                type="text"
                value={testEventCode}
                onChange={(e) => setTestEventCode(e.target.value)}
                placeholder="TEST12345"
                className="w-full px-4 py-2.5 bg-white dark:bg-[#2a2a2a] border border-gray-200 dark:border-[#4a4a4a] rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Use this to verify events in Test Events tool without affecting production data
              </p>
            </div>

            <div className="flex items-center gap-3 pt-4">
              <button
                onClick={handleSave}
                disabled={isSaving || !pixelId.trim() || !accessToken.trim()}
                className="btn btn-primary"
              >
                {isSaving ? <Loader2 className="btn-icon w-4 h-4 animate-spin" /> : <Check className="btn-icon w-4 h-4" />}
                Save Settings
              </button>

              <button
                onClick={handleTest}
                disabled={isTesting || !pixelId.trim() || !accessToken.trim()}
                className="btn btn-secondary"
              >
                {isTesting ? <Loader2 className="btn-icon w-4 h-4 animate-spin" /> : <AlertCircle className="btn-icon w-4 h-4" />}
                Test Connection
              </button>

              {isConfigured && (
                <>
                  <button
                    onClick={handleToggle}
                    disabled={isToggling}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors text-sm font-medium ${
                      settings?.is_active
                        ? 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50'
                        : 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/50'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {isToggling ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : settings?.is_active ? (
                      <X className="w-4 h-4" />
                    ) : (
                      <Check className="w-4 h-4" />
                    )}
                    {settings?.is_active ? 'Disable' : 'Enable'}
                  </button>

                  <button
                    onClick={handleDelete}
                    className="flex items-center gap-2 px-4 py-2 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors text-sm"
                  >
                    Remove
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function CAPISettings({ userId }: CAPISettingsProps) {
  const [settings, setSettings] = useState<Record<string, CAPISettingsType | null>>({
    facebook: null,
    google: null,
    tiktok: null,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, [userId]);

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const allSettings = await capiService.getSettings(userId);
      const settingsMap: Record<string, CAPISettingsType | null> = {
        facebook: null,
        google: null,
        tiktok: null,
      };

      allSettings.forEach((s) => {
        settingsMap[s.platform] = s;
      });

      setSettings(settingsMap);
    } catch (error) {
      console.error('[CAPI] Error loading settings:', error);
      toast.error('Failed to load CAPI settings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (platform: string, newSettings: Omit<CAPISettingsType, 'id' | 'created_at' | 'updated_at'>) => {
    const saved = await capiService.saveSettings(newSettings);
    setSettings((prev) => ({ ...prev, [platform]: saved }));
  };

  const handleTestFacebook = async (pixelId: string, accessToken: string, testEventCode?: string): Promise<boolean> => {
    const result = await capiService.testFacebookConnection(pixelId, accessToken, testEventCode);
    if (result.success) {
      await capiService.updateLastVerified(userId, 'facebook');
      await loadSettings();
      return true;
    } else {
      toast.error(result.error || 'Connection test failed');
      return false;
    }
  };

  const handleToggle = async (platform: string, isActive: boolean) => {
    await capiService.toggleActive(userId, platform, isActive);
    await loadSettings();
  };

  const handleDelete = async (platform: string) => {
    await capiService.deleteSettings(userId, platform);
    setSettings((prev) => ({ ...prev, [platform]: null }));
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white dark:bg-dark rounded-xl border border-gray-200 dark:border-[#333333] p-6 animate-pulse">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gray-200 dark:bg-[#2a2a2a] rounded-xl" />
              <div className="space-y-2">
                <div className="w-32 h-4 bg-gray-200 dark:bg-[#2a2a2a] rounded" />
                <div className="w-24 h-3 bg-gray-200 dark:bg-[#2a2a2a] rounded" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PlatformCard
        platform="facebook"
        title="Facebook / Meta CAPI"
        icon={
          <svg className="w-5 h-5 text-gray-700 dark:text-white" viewBox="0 0 24 24" fill="currentColor">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
          </svg>
        }
        settings={settings.facebook}
        onSave={(s) => handleSave('facebook', s)}
        onTest={handleTestFacebook}
        onToggle={(isActive) => handleToggle('facebook', isActive)}
        onDelete={() => handleDelete('facebook')}
        userId={userId}
      />

      <PlatformCard
        platform="google"
        title="Google Ads CAPI"
        icon={
          <svg className="w-6 h-6 text-gray-700 dark:text-white" viewBox="0 0 24 24" fill="currentColor">
            <path d="M22.54 11.23c0-.8-.07-1.57-.19-2.31H12v4.51h5.92c-.26 1.57-1.04 2.91-2.21 3.82v3.18h3.57c2.08-1.92 3.28-4.74 3.28-8.2z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
        }
        settings={settings.google}
        onSave={(s) => handleSave('google', s)}
        onTest={async () => false}
        onToggle={(isActive) => handleToggle('google', isActive)}
        onDelete={() => handleDelete('google')}
        userId={userId}
        comingSoon
      />

      <PlatformCard
        platform="tiktok"
        title="TikTok Events API"
        icon={
          <svg className="w-6 h-6 text-gray-700 dark:text-white" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
          </svg>
        }
        settings={settings.tiktok}
        onSave={(s) => handleSave('tiktok', s)}
        onTest={async () => false}
        onToggle={(isActive) => handleToggle('tiktok', isActive)}
        onDelete={() => handleDelete('tiktok')}
        userId={userId}
        comingSoon
      />
    </div>
  );
}
