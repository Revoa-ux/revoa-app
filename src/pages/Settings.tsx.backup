import React, { useState, useEffect, useRef } from 'react';
import {
  Mail, Bell, Globe, Moon, Sun, Languages, AlertTriangle, Facebook, Check, ChevronRight,
  Download,
  Trash2,
  Loader2,
  ChevronDown,
  X,
  MessageSquare,
  Key,
  Copy,
  Eye,
  EyeOff,
  DollarSign,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { toast } from 'sonner';
import { PaymentMethodManager } from '@/components/payments/PaymentMethodManager';
import { useClickOutside } from '@/lib/useClickOutside';
import ProfileForm from '@/components/settings/ProfileForm';
import { supabase } from '@/lib/supabase';
import { getActiveShopifyInstallation, subscribeToShopifyStatus } from '@/lib/shopify/status';
import ShopifyConnectModal from '@/components/settings/ShopifyConnectModal';
import { facebookAdsService } from '@/lib/facebookAds';
import type { AdAccount } from '@/types/ads';
import { useConnectionStore } from '@/lib/connectionStore';

interface UserProfile {
  firstName: string;
  lastName: string;
  email: string;
  avatar?: string;
  language: string;
  currency: string;
  theme: 'light' | 'dark' | 'system';
  notifications: {
    email: boolean;
    push: boolean;
    inApp: boolean;
  };
  dataSharing: {
    analytics: boolean;
    marketing: boolean;
  };
}

interface IntegrationStatus {
  shopify: boolean;
  facebook: boolean;
  google: boolean;
  tiktok: boolean;
}

const SettingsPage = () => {
  const { user, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const [isLoading, setIsLoading] = useState(false);
  const [shopifyConnecting, setShopifyConnecting] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [adminToken, setAdminToken] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [facebookConnecting, setFacebookConnecting] = useState(false);
  const [facebookSyncing, setFacebookSyncing] = useState(false);

  // Use centralized connection store
  const { shopify, facebook, refreshFacebookAccounts, refreshShopifyStatus } = useConnectionStore();
  const shopifyStore = shopify.installation?.store_url || null;
  const facebookAccounts = facebook.accounts;
  const integrationStatusShopify = shopify.isConnected;
  const integrationStatusFacebook = facebook.isConnected;
  const [profile, setProfile] = useState<UserProfile>({
    firstName: 'John',
    lastName: 'Doe',
    email: user?.email || '',
    language: 'English',
    currency: 'USD',
    theme: 'system',
    notifications: {
      email: true,
      push: true,
      inApp: true
    },
    dataSharing: {
      analytics: true,
      marketing: false
    }
  });

  const [integrationStatus, setIntegrationStatus] = useState<IntegrationStatus>({
    shopify: false,
    facebook: false,
    google: false,
    tiktok: false
  });

  // Sync integration status from store - use direct values instead of state
  useEffect(() => {
    setIntegrationStatus({
      shopify: integrationStatusShopify,
      facebook: integrationStatusFacebook,
      google: false,
      tiktok: false
    });
  }, [integrationStatusShopify, integrationStatusFacebook]);

  // Check if user is admin and fetch token
  useEffect(() => {
    const checkAdminAndFetchToken = async () => {
      if (!user?.id) return;

      const { data: profileData } = await supabase
        .from('user_profiles')
        .select('is_admin')
        .eq('user_id', user.id)
        .maybeSingle();

      if (profileData?.is_admin) {
        setIsAdmin(true);
        const { data } = await supabase.auth.getSession();
        if (data?.session?.access_token) {
          setAdminToken(data.session.access_token);
        }
      }
    };
    checkAdminAndFetchToken();
  }, [user?.id]);

  // Connection store is automatically initialized in Layout component
  // No need to initialize here, just refresh Facebook accounts if needed
  useEffect(() => {
    if (facebook.isConnected && facebook.accounts.length === 0) {
      console.log('[Settings] Facebook connected but no accounts loaded, refreshing...');
      refreshFacebookAccounts();
    }
  }, [facebook.isConnected, facebook.accounts.length, refreshFacebookAccounts]);

  // Listen for OAuth callback messages (both postMessage and localStorage polling)
  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      console.log('[Settings] Received postMessage:', event.data);

      if (event.data?.type === 'shopify:success') {
        console.log('[Settings] Shopify connection successful');
        setShopifyConnecting(false);
        setShowShopifyModal(false);

        // Refetch status from connection store
        await refreshShopifyStatus();

        localStorage.removeItem('shopify_oauth_success');
      } else if (event.data?.type === 'shopify:error') {
        console.log('[Settings] Shopify connection error:', event.data.error);
        setShopifyConnecting(false);
        setShowShopifyModal(false);
        toast.error(event.data.error || 'Failed to connect Shopify');
        localStorage.removeItem('shopify_oauth_error');
      } else if (event.data?.type === 'facebook-oauth-success') {
        console.log('[Settings] Facebook OAuth success:', event.data);
        setFacebookConnecting(false);

        await refreshFacebookAccounts();
      } else if (event.data?.type === 'facebook-oauth-error') {
        console.log('[Settings] Facebook OAuth error:', event.data.error);
        setFacebookConnecting(false);
        toast.error(event.data.error || 'Failed to connect Facebook Ads');
      }
    };

    // Poll localStorage as fallback for when postMessage doesn't work
    const pollInterval = setInterval(async () => {
      const shopifySuccessFlag = localStorage.getItem('shopify_oauth_success');
      const shopifyErrorFlag = localStorage.getItem('shopify_oauth_error');
      const facebookSuccessFlag = localStorage.getItem('facebook_oauth_success');
      const facebookErrorFlag = localStorage.getItem('facebook_oauth_error');

      if (shopifySuccessFlag) {
        try {
          const data = JSON.parse(shopifySuccessFlag);
          console.log('[Settings] Detected Shopify OAuth success in localStorage:', data);

          setShopifyConnecting(false);
          setShowShopifyModal(false);

          // Refetch status from connection store
          await refreshShopifyStatus();

          localStorage.removeItem('shopify_oauth_success');
        } catch (error) {
          console.error('[Settings] Error parsing success flag:', error);
        }
      }

      if (shopifyErrorFlag) {
        try {
          const data = JSON.parse(shopifyErrorFlag);
          console.error('[Settings] Detected Shopify OAuth error in localStorage:', data.error);
          setShopifyConnecting(false);
          setShowShopifyModal(false);
          localStorage.removeItem('shopify_oauth_error');
        } catch (error) {
          console.error('[Settings] Error parsing error flag:', error);
        }
      }

      if (facebookSuccessFlag) {
        try {
          const data = JSON.parse(facebookSuccessFlag);
          console.log('[Settings] Detected Facebook OAuth success in localStorage:', data);

          setFacebookConnecting(false);
          await refreshFacebookAccounts();

          localStorage.removeItem('facebook_oauth_success');
        } catch (error) {
          console.error('[Settings] Error parsing Facebook success flag:', error);
        }
      }

      if (facebookErrorFlag) {
        try {
          const data = JSON.parse(facebookErrorFlag);
          console.error('[Settings] Detected Facebook OAuth error in localStorage:', data.error);
          setFacebookConnecting(false);
          localStorage.removeItem('facebook_oauth_error');
        } catch (error) {
          console.error('[Settings] Error parsing Facebook error flag:', error);
        }
      }
    }, 500); // Poll every 500ms

    window.addEventListener('message', handleMessage);

    return () => {
      window.removeEventListener('message', handleMessage);
      clearInterval(pollInterval);
    };
  }, [user?.id]);
  
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);
  const [showCurrencyDropdown, setShowCurrencyDropdown] = useState(false);
  const [showThemeDropdown, setShowThemeDropdown] = useState(false);
  const [showShopifyModal, setShowShopifyModal] = useState(false);
  
  const languageDropdownRef = useRef<HTMLDivElement>(null);
  const currencyDropdownRef = useRef<HTMLDivElement>(null);
  const themeDropdownRef = useRef<HTMLDivElement>(null);
  
  useClickOutside(languageDropdownRef, () => setShowLanguageDropdown(false));
  useClickOutside(currencyDropdownRef, () => setShowCurrencyDropdown(false));
  useClickOutside(themeDropdownRef, () => setShowThemeDropdown(false));

  const handleProfileUpdate = async (updates: Partial<UserProfile>) => {
    try {
      setIsLoading(true);
      await new Promise(resolve => setTimeout(resolve, 1000));
      setProfile(prev => ({ ...prev, ...updates }));
      toast.success('Profile updated successfully');
    } catch (error) {
      toast.error('Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handleNotificationToggle = async (type: keyof UserProfile['notifications']) => {
    try {
      setIsLoading(true);
      await new Promise(resolve => setTimeout(resolve, 500));
      setProfile(prev => ({
        ...prev,
        notifications: {
          ...prev.notifications,
          [type]: !prev.notifications[type]
        }
      }));
    } catch (error) {
      toast.error('Failed to update notification preferences');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDataSharingToggle = async (type: keyof UserProfile['dataSharing']) => {
    try {
      setIsLoading(true);
      await new Promise(resolve => setTimeout(resolve, 500));
      setProfile(prev => ({
        ...prev,
        dataSharing: {
          ...prev.dataSharing,
          [type]: !prev.dataSharing[type]
        }
      }));
    } catch (error) {
      toast.error('Failed to update data sharing preferences');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnectShopify = async () => {
    if (!user?.id) {
      toast.error('Please log in to connect Shopify');
      return;
    }

    setShowShopifyModal(true);
  };

  const handleShopifySuccess = async (storeUrl: string) => {
    setShowShopifyModal(false);
    // Store will automatically update via real-time subscription
  };

  const handleDisconnectShopify = async () => {
    if (!user?.id) return;

    try {
      setShopifyConnecting(true);

      const { error } = await supabase
        .from('shopify_installations')
        .update({ status: 'uninstalled', uninstalled_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .eq('status', 'installed');

      if (error) throw error;

      // Refresh connection store to reflect changes
      await refreshShopifyStatus();
      toast.success('Shopify disconnected successfully');
    } catch (error) {
      console.error('Error disconnecting Shopify:', error);
      toast.error('Failed to disconnect Shopify');
    } finally {
      setShopifyConnecting(false);
    }
  };

  const handleConnectFacebook = async () => {
    if (!user?.id) {
      toast.error('Please log in to connect Facebook Ads');
      return;
    }

    try {
      setFacebookConnecting(true);

      const oauthUrl = await facebookAdsService.connectFacebookAds();

      const width = 800;
      const height = 700;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;

      const popup = window.open(
        oauthUrl,
        'facebook-oauth',
        `width=${width},height=${height},left=${left},top=${top},toolbar=no,location=no,status=no,menubar=no,scrollbars=yes,resizable=yes`
      );

      if (!popup) {
        throw new Error('Popup blocked. Please allow popups for this site.');
      }

      const checkPopupClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkPopupClosed);
          setTimeout(async () => {
            console.log('[Settings] Facebook popup closed, refreshing accounts...');
            await refreshFacebookAccounts();

            // Auto-sync data for newly connected accounts
            const updatedAccounts = await facebookAdsService.getAdAccounts('facebook');
            if (updatedAccounts.length > 0) {
              console.log('[Settings] Auto-syncing Facebook Ads data for', updatedAccounts.length, 'accounts...');
              toast.info('Syncing Facebook Ads data...', { duration: 2000 });

              try {
                const endDate = new Date().toISOString().split('T')[0];
                // Fetch ALL historical data (Facebook allows up to 37 months, we'll use 3 years to be safe)
                const startDate = new Date(Date.now() - 3 * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

                console.log('[Settings] Auto-syncing from', startDate, 'to', endDate);
                await facebookAdsService.syncAdAccount(updatedAccounts[0].platform_account_id, startDate, endDate);
              } catch (syncError) {
                console.error('[Settings] Auto-sync failed:', syncError);
              }
            }

            setFacebookConnecting(false);
          }, 1000);
        }
      }, 500);

    } catch (error) {
      console.error('Error connecting Facebook:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to connect Facebook Ads');
      setFacebookConnecting(false);
    }
  };

  const handleDisconnectFacebook = async (accountId: string) => {
    try {
      setFacebookConnecting(true);
      console.log('[Settings] Disconnecting Facebook account:', accountId);

      await facebookAdsService.disconnectAdAccount(accountId);
      console.log('[Settings] Disconnect API call completed');

      await refreshFacebookAccounts();
      console.log('[Settings] Refreshed Facebook accounts after disconnect');
      console.log('[Settings] New Facebook state:', facebook);

      toast.success('Facebook Ads disconnected successfully');
    } catch (error) {
      console.error('Error disconnecting Facebook:', error);
      toast.error('Failed to disconnect Facebook Ads');
    } finally {
      setFacebookConnecting(false);
      console.log('[Settings] Disconnect process complete');
    }
  };

  const handleSyncFacebook = async (platformAccountId: string) => {
    try {
      setFacebookSyncing(true);

      const endDate = new Date().toISOString().split('T')[0];
      // Fetch ALL historical data (Facebook allows up to 37 months, we'll use 3 years to be safe)
      const startDate = new Date(Date.now() - 3 * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      console.log('[Settings] Manual sync from', startDate, 'to', endDate);

      const result = await facebookAdsService.syncAdAccount(platformAccountId, startDate, endDate);

      console.log('[Settings] Sync result:', result);
      toast.success('Data synced successfully');

      await refreshFacebookAccounts();
    } catch (error) {
      console.error('[Settings] Error syncing Facebook:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to sync Facebook Ads data';
      console.error('[Settings] Error message:', errorMessage);
      toast.error(errorMessage);
    } finally {
      setFacebookSyncing(false);
    }
  };

  // Removed loadFacebookAccounts - now using refreshFacebookAccounts from store

  const handleConnectPlatform = async (platform: keyof IntegrationStatus) => {
    if (platform === 'shopify') {
      await handleConnectShopify();
      return;
    }

    if (platform === 'facebook') {
      await handleConnectFacebook();
      return;
    }

    try {
      setIsLoading(true);
      await new Promise(resolve => setTimeout(resolve, 1500));

      setIntegrationStatus(prev => ({
        ...prev,
        [platform]: true
      }));

      toast.success(`${platform.charAt(0).toUpperCase() + platform.slice(1)} connected successfully`);
    } catch (error) {
      toast.error(`Failed to connect ${platform}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyToken = async () => {
    if (!adminToken) {
      toast.error('Token not available');
      return;
    }

    try {
      await navigator.clipboard.writeText(adminToken);
      toast.success('Token copied to clipboard!');
    } catch (error) {
      toast.error('Failed to copy token');
    }
  };

  const handleExportData = async () => {
    try {
      setExportLoading(true);
      await new Promise(resolve => setTimeout(resolve, 2000));

      const data = {
        profile,
      };

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'my-data-export.json';
      a.click();
      window.URL.revokeObjectURL(url);

      toast.success('Data exported successfully');
    } catch (error) {
      toast.error('Failed to export data');
    } finally {
      setExportLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      setIsLoading(true);
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      await signOut();
      toast.success('Account deleted successfully');
    } catch (error) {
      toast.error('Failed to delete account');
      setShowDeleteConfirm(false);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <ShopifyConnectModal
        isOpen={showShopifyModal}
        onClose={() => setShowShopifyModal(false)}
        onSuccess={handleShopifySuccess}
      />

      <div className="max-w-[1050px] mx-auto">
      {/* Title Section */}
      <div className="mb-8">
        <h1 className="text-2xl font-normal text-gray-900 dark:text-white mb-2">
          Account Settings
        </h1>
        <div className="flex items-center space-x-2">
          <div className="w-1.5 h-1.5 bg-primary-500 rounded-full"></div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Manage your account settings and preferences
          </p>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Left column - Scrollable content */}
        <div className="flex-1 max-w-[650px] space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white">Preferences</h2>
            </div>
            
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              <div className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                      <Languages className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-900 dark:text-white">Language</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{profile.language}</p>
                    </div>
                  </div>
                  <div className="relative" ref={languageDropdownRef}>
                    <button
                      onClick={() => setShowLanguageDropdown(!showLanguageDropdown)}
                      className="flex items-center space-x-1 text-sm text-gray-700 dark:text-gray-300"
                    >
                      <span>{profile.language}</span>
                      <ChevronDown className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                    </button>
                    
                    {showLanguageDropdown && (
                      <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50">
                        {['English', 'Spanish', 'French'].map((lang) => (
                          <button
                            key={lang}
                            onClick={() => {
                              handleProfileUpdate({ language: lang });
                              setShowLanguageDropdown(false);
                            }}
                            className="flex items-center justify-between w-full px-4 py-2 text-sm text-left text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                          >
                            <span>{lang}</span>
                            {profile.language === lang && <Check className="w-4 h-4 text-primary-500" />}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                      <DollarSign className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-900 dark:text-white">Currency</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{profile.currency}</p>
                    </div>
                  </div>
                  <div className="relative" ref={currencyDropdownRef}>
                    <button
                      onClick={() => setShowCurrencyDropdown(!showCurrencyDropdown)}
                      className="flex items-center space-x-1 text-sm text-gray-700 dark:text-gray-300"
                    >
                      <span>{profile.currency}</span>
                      <ChevronDown className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                    </button>
                    
                    {showCurrencyDropdown && (
                      <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50">
                        {['USD', 'EUR', 'GBP'].map((currency) => (
                          <button
                            key={currency}
                            onClick={() => {
                              handleProfileUpdate({ currency });
                              setShowCurrencyDropdown(false);
                            }}
                            className="flex items-center justify-between w-full px-4 py-2 text-sm text-left text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                          >
                            <span>{currency}</span>
                            {profile.currency === currency && <Check className="w-4 h-4 text-primary-500" />}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                      {theme === 'dark' ? (
                        <Moon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                      ) : (
                        <Sun className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                      )}
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-900 dark:text-white">Theme</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {theme.charAt(0).toUpperCase() + theme.slice(1)} mode
                      </p>
                    </div>
                  </div>
                  <div className="relative" ref={themeDropdownRef}>
                    <button
                      onClick={() => setShowThemeDropdown(!showThemeDropdown)}
                      className="flex items-center space-x-1 text-sm text-gray-700 dark:text-gray-300"
                    >
                      <span>{theme.charAt(0).toUpperCase() + theme.slice(1)}</span>
                      <ChevronDown className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                    </button>

                    {showThemeDropdown && (
                      <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50">
                        {['light', 'dark', 'system'].map((themeOption) => (
                          <button
                            key={themeOption}
                            onClick={() => {
                              setTheme(themeOption as 'light' | 'dark' | 'system');
                              setShowThemeDropdown(false);
                              toast.success(`Theme changed to ${themeOption}`);
                            }}
                            className="flex items-center justify-between w-full px-4 py-2 text-sm text-left text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                          >
                            <span>{themeOption.charAt(0).toUpperCase() + themeOption.slice(1)}</span>
                            {theme === themeOption && <Check className="w-4 h-4 text-primary-500" />}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white">Notifications</h2>
            </div>
            
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              <div className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                      <Mail className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-900 dark:text-white">Email Notifications</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Receive updates via email</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleNotificationToggle('email')}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      profile.notifications.email ? 'bg-primary-500' : 'bg-gray-200 dark:bg-gray-700'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        profile.notifications.email ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>

              <div className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                      <Bell className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-900 dark:text-white">Push Notifications</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Receive push notifications</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleNotificationToggle('push')}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      profile.notifications.push ? 'bg-primary-500' : 'bg-gray-200 dark:bg-gray-700'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        profile.notifications.push ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>

              <div className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                      <Globe className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-900 dark:text-white">In-App Notifications</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Receive in-app notifications</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleNotificationToggle('inApp')}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      profile.notifications.inApp ? 'bg-primary-500' : 'bg-gray-200 dark:bg-gray-700'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        profile.notifications.inApp ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white">Payment Methods</h2>
            </div>
            <div className="p-6">
              <PaymentMethodManager />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white">Integrations</h2>
            </div>

            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              <div className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                      <img
                        src="https://iipaykvimkbbnoobtpzz.supabase.co/storage/v1/object/public/public-bucket/Shopify%20logo%20black.png"
                        alt="Shopify"
                        className="w-6 h-6 object-contain grayscale dark:grayscale-0 dark:invert dark:brightness-0 dark:contrast-200"
                      />
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-900 dark:text-white">Shopify Store</h3>
                      {shopifyStore && (
                        <p className="text-sm text-gray-500 dark:text-gray-400">{shopifyStore}</p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={integrationStatus.shopify ? handleDisconnectShopify : () => handleConnectPlatform('shopify')}
                    disabled={shopifyConnecting}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                      integrationStatus.shopify
                        ? 'text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30'
                        : 'text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {shopifyConnecting ? 'Loading...' : integrationStatus.shopify ? 'Disconnect' : (
                      <>
                        Connect
                        <ChevronRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                      <svg className="w-5 h-5 text-gray-700 dark:text-white" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-900 dark:text-white">Facebook Ads</h3>
                      {facebookAccounts.length > 0 && (
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {facebookAccounts[0].account_name}
                          {facebookAccounts[0].last_synced_at && (
                            <span className="text-gray-400"> • {new Date(facebookAccounts[0].last_synced_at).toLocaleDateString()}</span>
                          )}
                        </p>
                      )}
                    </div>
                  </div>
                  {integrationStatus.facebook ? (
                    <div className="flex gap-3">
                      <button
                        onClick={() => facebookAccounts[0] && handleSyncFacebook(facebookAccounts[0].platform_account_id)}
                        disabled={facebookSyncing || facebookAccounts.length === 0}
                        className="px-3 py-1.5 text-sm font-medium text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {facebookSyncing ? 'Syncing...' : 'Sync'}
                      </button>
                      <button
                        onClick={() => facebookAccounts[0] && handleDisconnectFacebook(facebookAccounts[0].platform_account_id)}
                        disabled={facebookConnecting || facebookAccounts.length === 0}
                        className="px-3 py-1.5 text-sm font-medium text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {facebookConnecting ? 'Loading...' : 'Disconnect'}
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleConnectPlatform('facebook')}
                      disabled={facebookConnecting}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {facebookConnecting ? 'Connecting...' : (
                        <>
                          Connect
                          <ChevronRight className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>

              <div className="px-6 py-4 opacity-60">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                      <svg className="w-6 h-6 text-gray-700 dark:text-white" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M22.54 11.23c0-.8-.07-1.57-.19-2.31H12v4.51h5.92c-.26 1.57-1.04 2.91-2.21 3.82v3.18h3.57c2.08-1.92 3.28-4.74 3.28-8.2z"/>
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-900 dark:text-white">Google Ads</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Coming soon</p>
                    </div>
                  </div>
                  <button
                    disabled
                    className="px-4 py-2 text-sm font-medium text-gray-400 bg-gray-100 dark:bg-gray-700 rounded-lg cursor-not-allowed"
                  >
                    Connect
                  </button>
                </div>
              </div>

              <div className="px-6 py-4 opacity-60">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                      <svg className="w-6 h-6 text-gray-700 dark:text-white" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-900 dark:text-white">TikTok Ads</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Coming soon</p>
                    </div>
                  </div>
                  <button
                    disabled
                    className="px-4 py-2 text-sm font-medium text-gray-400 bg-gray-100 dark:bg-gray-700 rounded-lg cursor-not-allowed"
                  >
                    Connect
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white">Privacy & Data</h2>
            </div>
            
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              <div className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white">Analytics Data Collection</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Allow collection of analytics data</p>
                  </div>
                  <button
                    onClick={() => handleDataSharingToggle('analytics')}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      profile.dataSharing.analytics ? 'bg-primary-500' : 'bg-gray-200 dark:bg-gray-700'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        profile.dataSharing.analytics ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>

              <div className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white">Marketing Communications</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Receive marketing updates</p>
                  </div>
                  <button
                    onClick={() => handleDataSharingToggle('marketing')}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      profile.dataSharing.marketing ? 'bg-primary-500' : 'bg-gray-200 dark:bg-gray-700'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        profile.dataSharing.marketing ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {isAdmin && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-medium text-gray-900 dark:text-white">Developer</h2>
              </div>

              <div className="p-6">
                <div className="space-y-4">
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-lg">
                    <div className="flex items-start space-x-3">
                      <Key className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base font-medium text-blue-900 dark:text-blue-100 mb-1">API Authentication Token</h3>
                        <p className="text-sm text-blue-600 dark:text-blue-400 mb-3">
                          Use this token to authenticate API requests for integrations and AI agents.
                        </p>

                        <div className="space-y-3">
                          <div className="relative">
                            <input
                              type={showToken ? "text" : "password"}
                              value={adminToken || "Loading..."}
                              readOnly
                              className="w-full px-3 py-2 pr-24 text-sm font-mono bg-white dark:bg-gray-900 border border-blue-200 dark:border-blue-700 rounded-lg text-gray-900 dark:text-gray-100"
                            />
                            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center space-x-1">
                              <button
                                onClick={() => setShowToken(!showToken)}
                                className="p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                                title={showToken ? "Hide token" : "Show token"}
                              >
                                {showToken ? (
                                  <EyeOff className="w-4 h-4" />
                                ) : (
                                  <Eye className="w-4 h-4" />
                                )}
                              </button>
                              <button
                                onClick={handleCopyToken}
                                disabled={!adminToken}
                                className="p-1.5 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors disabled:opacity-50"
                                title="Copy token"
                              >
                                <Copy className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          <div className="text-xs text-blue-600 dark:text-blue-400 space-y-1">
                            <p>• Use in Authorization header: <code className="bg-blue-100 dark:bg-blue-900/40 px-1.5 py-0.5 rounded">Bearer YOUR_TOKEN</code></p>
                            <p>• For AI agent setup, see: <code className="bg-blue-100 dark:bg-blue-900/40 px-1.5 py-0.5 rounded">AI_AGENT_QUICKSTART.md</code></p>
                            <p>• This token expires periodically. Refresh this page to get a new one.</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white">Danger Zone</h2>
            </div>
            
            <div className="p-6">
              <div className="space-y-4">
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-lg">
                  <div className="flex items-start space-x-3">
                    <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5" />
                    <div>
                      <h3 className="text-base font-medium text-red-900 dark:text-red-100">Delete Account</h3>
                      <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                        Once you delete your account, there is no going back. Please be certain.
                      </p>
                      {showDeleteConfirm ? (
                        <div className="mt-4 space-y-3">
                          <p className="text-sm text-red-600 dark:text-red-400">
                            Are you sure you want to delete your account? This action cannot be undone.
                          </p>
                          <div className="flex space-x-3">
                            <button
                              onClick={() => setShowDeleteConfirm(false)}
                              className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={handleDeleteAccount}
                              disabled={isLoading}
                              className="px-4 py-2 text-sm text-white bg-red-600 dark:bg-red-500 rounded-lg hover:bg-red-700 dark:hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center"
                            >
                              {isLoading ? (
                                <>
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                  <span>Deleting...</span>
                                </>
                              ) : (
                                <>
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  <span>Delete Account</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => setShowDeleteConfirm(true)}
                          className="mt-4 px-4 py-2 text-sm text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors flex items-center"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete Account
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                  <button
                    onClick={handleExportData}
                    disabled={exportLoading}
                    className="w-full flex items-center justify-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
                  >
                    {exportLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Exporting Data...
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4 mr-2" />
                        Export Account Data
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right column - Fixed profile section */}
        <div className="w-[400px] sticky top-6 h-fit">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white">Profile Settings</h2>
            </div>
            <div className="p-6">
              <ProfileForm
                firstName={profile.firstName}
                lastName={profile.lastName}
                email={profile.email}
                avatar={profile.avatar}
                onUpdate={handleProfileUpdate}
              />
            </div>
          </div>
        </div>
      </div>
      </div>
    </>
  );
};

export default SettingsPage;