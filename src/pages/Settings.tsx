import React, { useState, useEffect, useRef } from 'react';
import {
  Mail, Bell, Globe, Moon, Sun, Languages, AlertTriangle, Facebook, Check,
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
  RefreshCw,
  User,
  Phone,
  Building,
  Lock,
  Save,
  ArrowRight,
  FileText,
  ExternalLink
} from 'lucide-react';
import { Button } from '@/components/Button';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { toast } from '@/lib/toast';
import { PaymentMethodManager } from '@/components/payments/PaymentMethodManager';
import { useClickOutside } from '@/lib/useClickOutside';
import { supabase } from '@/lib/supabase';
import { getActiveShopifyInstallation, subscribeToShopifyStatus } from '@/lib/shopify/status';
import ShopifyConnectModal from '@/components/settings/ShopifyConnectModal';
import { facebookAdsService } from '@/lib/facebookAds';
import { tiktokAdsService } from '@/lib/tiktokAds';
import { googleAdsService } from '@/lib/googleAds';
import type { AdAccount } from '@/types/ads';
import { useConnectionStore } from '@/lib/connectionStore';
import { StorePoliciesSettings } from '@/components/settings/StorePoliciesSettings';
import { formatRelativeTime } from '@/lib/utils';
import { useSyncStore } from '@/lib/syncStore';
import { useAdDataCache } from '@/lib/adDataCache';
import { SubscriptionStatusWidget } from '@/components/subscription/SubscriptionStatusWidget';
import { TierComparisonModal } from '@/components/subscription/TierComparisonModal';
import { shouldAllowManualShopifyConnect, isProduction } from '@/lib/environment';

interface UserProfile {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  company: string;
  profile_picture_url: string | null;
}

interface UserSettings {
  language: string;
  currency: string;
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
  const [shopifySyncing, setShopifySyncing] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [adminToken, setAdminToken] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [facebookConnecting, setFacebookConnecting] = useState(false);
  const [facebookSyncing, setFacebookSyncing] = useState(false);
  const [tiktokConnecting, setTiktokConnecting] = useState(false);
  const [tiktokSyncing, setTiktokSyncing] = useState(false);
  const [googleConnecting, setGoogleConnecting] = useState(false);
  const [googleSyncing, setGoogleSyncing] = useState(false);
  // Track which accounts have shown toast notifications (using ref to avoid re-render loops)
  const syncToastShownRef = useRef<{[key: string]: {started: boolean, completed: boolean}}>({});
  const [activeTab, setActiveTab] = useState<'profile' | 'security'>('profile');
  const [profile, setProfile] = useState<UserProfile>({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    company: '',
    profile_picture_url: null
  });
  const [originalProfile, setOriginalProfile] = useState<UserProfile>({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    company: '',
    profile_picture_url: null
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
  const [profileErrors, setProfileErrors] = useState<Record<string, string>>({});
  const [savingProfile, setSavingProfile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingPicture, setUploadingPicture] = useState(false);
  const [showTierModal, setShowTierModal] = useState(false);

  const hasProfileChanges =
    profile.first_name !== originalProfile.first_name ||
    profile.last_name !== originalProfile.last_name ||
    profile.phone !== originalProfile.phone ||
    profile.company !== originalProfile.company;

  const hasPasswordChanges =
    passwordData.new_password.length > 0 &&
    passwordData.confirm_password.length > 0;

  // Use centralized connection store
  const { shopify, facebook, tiktok, google, refreshFacebookAccounts, refreshShopifyStatus, refreshTikTokAccounts, refreshGoogleAccounts } = useConnectionStore();
  const shopifyStore = shopify.installation?.store_url || null;
  const facebookAccounts = facebook.accounts;
  const tiktokAccounts = tiktok.accounts;
  const googleAccounts = google.accounts;
  const integrationStatusShopify = shopify.isConnected;
  const integrationStatusFacebook = facebook.isConnected;
  const integrationStatusTikTok = tiktok.isConnected;
  const integrationStatusGoogle = google.isConnected;
  const [settings, setSettings] = useState<UserSettings>({
    language: 'English',
    currency: 'USD',
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

  // Load user profile data
  useEffect(() => {
    const loadProfile = async () => {
      if (!user?.id) return;

      try {
        const { data } = await supabase
          .from('user_profiles')
          .select('is_admin, first_name, last_name, display_name, phone, company, profile_picture_url')
          .eq('user_id', user.id)
          .maybeSingle();

        if (data) {
          // If first_name/last_name are empty but display_name exists, try to parse it
          let firstName = data.first_name || '';
          let lastName = data.last_name || '';

          if (!firstName && !lastName && data.display_name) {
            const names = data.display_name.trim().split(' ');
            if (names.length >= 2) {
              firstName = names[0];
              lastName = names.slice(1).join(' ');
            } else {
              firstName = names[0];
            }
          }

          const profileData = {
            first_name: firstName,
            last_name: lastName,
            email: user?.email || '',
            phone: data.phone || '',
            company: data.company || '',
            profile_picture_url: data.profile_picture_url || null
          };
          setProfile(profileData);
          setOriginalProfile(profileData);

          if (data.is_admin) {
            setIsAdmin(true);
            const { data: session } = await supabase.auth.getSession();
            if (session?.session?.access_token) {
              setAdminToken(session.session.access_token);
            }
          }
        }
      } catch (error) {
        console.error('Error loading profile:', error);
      }
    };

    loadProfile();
  }, [user?.id]);

  // Sync integration status from store - use direct values instead of state
  useEffect(() => {
    console.log('[Settings] Connection store changed:');
    console.log('[Settings] - Shopify connected:', integrationStatusShopify);
    console.log('[Settings] - Facebook connected:', integrationStatusFacebook);
    console.log('[Settings] - TikTok connected:', integrationStatusTikTok);
    console.log('[Settings] - Google connected:', integrationStatusGoogle);

    setIntegrationStatus({
      shopify: integrationStatusShopify,
      facebook: integrationStatusFacebook,
      google: integrationStatusGoogle,
      tiktok: integrationStatusTikTok
    });

    console.log('[Settings] Integration status updated - buttons should change now');
  }, [integrationStatusShopify, integrationStatusFacebook, integrationStatusTikTok, integrationStatusGoogle]);

  // Load user profile data and check admin status
  useEffect(() => {
    const loadProfileAndCheckAdmin = async () => {
      if (!user?.id) return;

      try {
        const { data: profileData } = await supabase
          .from("user_profiles")
          .select("is_admin, first_name, last_name, display_name, phone, company")
          .eq("user_id", user.id)
          .maybeSingle();

        if (profileData) {
          if (profileData.first_name || profileData.last_name) {
            setProfile(prev => ({
              ...prev,
              firstName: profileData.first_name || "",
              lastName: profileData.last_name || ""
            }));
          } else if (profileData.display_name) {
            const nameParts = profileData.display_name.trim().split(" ");
            const firstName = nameParts[0] || "";
            const lastName = nameParts.slice(1).join(" ") || "";
            setProfile(prev => ({
              ...prev,
              firstName,
              lastName
            }));
          }

          if (profileData.is_admin) {
            setIsAdmin(true);
            const { data } = await supabase.auth.getSession();
            if (data?.session?.access_token) {
              setAdminToken(data.session.access_token);
            }
          }
        }
      } catch (error) {
        console.error("Error loading profile:", error);
      }
    };
    loadProfileAndCheckAdmin();
  }, [user?.id]);

  // Connection store is automatically initialized in Layout component
  // No need to initialize here, just refresh Facebook accounts if needed
  useEffect(() => {
    if (facebook.isConnected && facebook.accounts.length === 0) {
      console.log('[Settings] Facebook connected but no accounts loaded, refreshing...');
      refreshFacebookAccounts();
    }
  }, [facebook.isConnected, facebook.accounts.length, refreshFacebookAccounts]);

  // Monitor for active Phase 1 sync jobs and show toast notifications
  useEffect(() => {
    if (!facebook.isConnected || facebook.accounts.length === 0) {
      return;
    }

    const checkActiveSyncJobs = async () => {
      try {
        for (const account of facebook.accounts) {
          const { data: syncJob, error } = await supabase
            .from('sync_jobs')
            .select('id, status, sync_phase, progress_percentage, ad_account_id, created_at')
            .eq('ad_account_id', account.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (!error && syncJob) {
            const key = account.id;
            const syncToastId = `sync-${key}`;

            const jobAge = Date.now() - new Date(syncJob.created_at).getTime();
            const ONE_HOUR = 60 * 60 * 1000;
            const isRecentJob = jobAge < ONE_HOUR;

            if (syncJob.status === 'in_progress' && !isRecentJob) {
              continue;
            }

            if (syncJob.sync_phase === 'recent_90_days' &&
                syncJob.status === 'in_progress' &&
                isRecentJob &&
                !syncToastShownRef.current[key]?.started) {

              const justConnected = localStorage.getItem('facebook_sync_toast_shown');
              if (!justConnected) {
                toast.info('Syncing your recent 90 days of data...', { id: syncToastId, duration: Infinity });
              }
              syncToastShownRef.current[key] = { started: true, completed: false };
            }

            // Show "Phase 1 completed" toast
            if (syncJob.status === 'completed' &&
                syncJob.sync_phase === 'recent_90_days' &&
                syncToastShownRef.current[key]?.started &&
                !syncToastShownRef.current[key]?.completed) {
              toast.dismiss(syncToastId);
              toast.success('Recent 90 days synced! Historical data sync continuing in background...');
              syncToastShownRef.current[key] = { started: true, completed: true };
            }

            // Show "All data completed" toast
            if (syncJob.status === 'completed' &&
                syncJob.sync_phase === 'historical' &&
                syncJob.progress_percentage === 100) {
              toast.dismiss(syncToastId);
              toast.success('All historical data synced successfully!');
              // Reset for this account so future syncs can show toasts again
              delete syncToastShownRef.current[key];
            }

            // Handle failed sync
            if (syncJob.status === 'failed') {
              toast.dismiss(syncToastId);
              delete syncToastShownRef.current[key];
            }
          }
        }
      } catch (error) {
        // Silent fail
      }
    };

    // Check immediately
    checkActiveSyncJobs();

    // Poll every 5 seconds
    const interval = setInterval(checkActiveSyncJobs, 5000);

    return () => clearInterval(interval);
  }, [facebook.isConnected, facebook.accounts]);

  // Listen for OAuth callback messages (both postMessage and localStorage polling)
  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      console.log('[Settings] Received postMessage:', event.data);

      if (event.data?.type === 'shopify:success') {
        console.log('[Settings] Shopify connection successful');
        setShopifyConnecting(false);
        setShowShopifyModal(false);

        // Show success toast immediately
        toast.success('Shopify store connected successfully!');

        // Refetch status from connection store
        await refreshShopifyStatus();

        // Force a second refresh after delay to ensure store propagation
        setTimeout(() => {
          refreshShopifyStatus();
        }, 500);

        localStorage.removeItem('shopify_oauth_success');
      } else if (event.data?.type === 'shopify:error') {
        console.log('[Settings] Shopify connection error:', event.data.error);
        setShopifyConnecting(false);
        setShowShopifyModal(false);
        toast.error(event.data.error || 'Failed to connect Shopify');
        localStorage.removeItem('shopify_oauth_error');
      } else if (event.data?.type === 'facebook-oauth-success') {
        console.log('[Settings] Facebook OAuth success:', event.data);

        // Show success toast immediately
        const accountCount = event.data.accountCount || 1;
        const plural = accountCount === 1 ? 'account' : 'accounts';
        toast.success(`Successfully connected ${accountCount} Facebook ad ${plural}`);

        // Mark that we've shown the initial success toast
        localStorage.setItem('facebook_sync_toast_shown', 'true');

        // Refresh accounts to update UI FIRST
        await refreshFacebookAccounts();

        // THEN set connecting to false after refresh completes
        setFacebookConnecting(false);

        // Force a second refresh after delay to ensure store update propagates
        setTimeout(async () => {
          await refreshFacebookAccounts();
        }, 1000);

        // Clear the flag after 10 seconds to allow future toasts
        setTimeout(() => {
          localStorage.removeItem('facebook_sync_toast_shown');
        }, 10000);
      } else if (event.data?.type === 'facebook-oauth-error') {
        console.log('[Settings] Facebook OAuth error:', event.data.error);
        setFacebookConnecting(false);
        toast.error(event.data.error || 'Failed to connect Facebook Ads');
      } else if (event.data?.type === 'tiktok-oauth-success') {
        console.log('[Settings] TikTok OAuth success:', event.data);

        // Show success toast immediately
        const accountCount = event.data.accountCount || 1;
        const plural = accountCount === 1 ? 'account' : 'accounts';
        toast.success(`Successfully connected ${accountCount} TikTok ad ${plural}`);

        // Refresh accounts to update UI
        await refreshTikTokAccounts();

        // Set connecting to false after refresh completes
        setTiktokConnecting(false);

        // Force a second refresh after delay to ensure store update propagates
        setTimeout(async () => {
          await refreshTikTokAccounts();
        }, 1000);

        localStorage.removeItem('tiktok_oauth_success');
      } else if (event.data?.type === 'tiktok-oauth-error') {
        console.log('[Settings] TikTok OAuth error:', event.data.error);
        setTiktokConnecting(false);
        toast.error(event.data.error || 'Failed to connect TikTok Ads');
        localStorage.removeItem('tiktok_oauth_error');
      }
    };

    // Poll localStorage as fallback for when postMessage doesn't work
    const pollInterval = setInterval(async () => {
      const shopifySuccessFlag = localStorage.getItem('shopify_oauth_success');
      const shopifyErrorFlag = localStorage.getItem('shopify_oauth_error');
      const facebookSuccessFlag = localStorage.getItem('facebook_oauth_success');
      const facebookErrorFlag = localStorage.getItem('facebook_oauth_error');
      const tiktokSuccessFlag = localStorage.getItem('tiktok_oauth_success');
      const tiktokErrorFlag = localStorage.getItem('tiktok_oauth_error');

      if (shopifySuccessFlag) {
        try {
          const data = JSON.parse(shopifySuccessFlag);
          console.log('[Settings] Detected Shopify OAuth success in localStorage:', data);

          setShopifyConnecting(false);
          setShowShopifyModal(false);

          // Show success toast immediately
          toast.success('Shopify store connected successfully!');

          // Refetch status from connection store
          await refreshShopifyStatus();

          // Force a second refresh after delay
          setTimeout(() => {
            refreshShopifyStatus();
          }, 500);

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

          // Show success toast immediately
          const accountCount = data.accountCount || 1;
          const plural = accountCount === 1 ? 'account' : 'accounts';
          toast.success(`Successfully connected ${accountCount} Facebook ad ${plural}`);

          // Mark that we've shown the initial success toast
          localStorage.setItem('facebook_sync_toast_shown', 'true');

          // Refresh accounts to update UI FIRST
          await refreshFacebookAccounts();

          // THEN set connecting to false after refresh completes
          setFacebookConnecting(false);

          // Force a second refresh after delay
          setTimeout(async () => {
            await refreshFacebookAccounts();
          }, 1000);

          // Clear the flag after 10 seconds to allow future toasts
          setTimeout(() => {
            localStorage.removeItem('facebook_sync_toast_shown');
          }, 10000);

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

      if (tiktokSuccessFlag) {
        try {
          const data = JSON.parse(tiktokSuccessFlag);
          console.log('[Settings] Detected TikTok OAuth success in localStorage:', data);

          // Show success toast immediately
          const accountCount = data.accountCount || 1;
          const plural = accountCount === 1 ? 'account' : 'accounts';
          toast.success(`Successfully connected ${accountCount} TikTok ad ${plural}`);

          // Refresh accounts to update UI
          await refreshTikTokAccounts();

          // Set connecting to false after refresh completes
          setTiktokConnecting(false);

          // Force a second refresh after delay
          setTimeout(async () => {
            await refreshTikTokAccounts();
          }, 1000);

          localStorage.removeItem('tiktok_oauth_success');
        } catch (error) {
          console.error('[Settings] Error parsing TikTok success flag:', error);
        }
      }

      if (tiktokErrorFlag) {
        try {
          const data = JSON.parse(tiktokErrorFlag);
          console.error('[Settings] Detected TikTok OAuth error in localStorage:', data.error);
          setTiktokConnecting(false);
          toast.error(data.error || 'Failed to connect TikTok Ads');
          localStorage.removeItem('tiktok_oauth_error');
        } catch (error) {
          console.error('[Settings] Error parsing TikTok error flag:', error);
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

  const handleProfileChange = (field: keyof UserProfile, value: string) => {
    setProfile(prev => ({ ...prev, [field]: value }));
    if (profileErrors[field]) {
      setProfileErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handlePasswordChange = (field: string, value: string) => {
    setPasswordData(prev => ({ ...prev, [field]: value }));
    if (profileErrors[field]) {
      setProfileErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validateProfile = (): boolean => {
    const errors: Record<string, string> = {};
    if (!profile.first_name.trim()) errors.first_name = 'First name is required';
    if (!profile.last_name.trim()) errors.last_name = 'Last name is required';
    if (!profile.email.trim()) errors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email)) {
      errors.email = 'Please enter a valid email address';
    }
    setProfileErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validatePassword = (): boolean => {
    const errors: Record<string, string> = {};
    if (!passwordData.current_password) errors.current_password = 'Current password is required';
    if (!passwordData.new_password) errors.new_password = 'New password is required';
    else if (passwordData.new_password.length < 8) errors.new_password = 'Password must be at least 8 characters';
    if (passwordData.new_password !== passwordData.confirm_password) {
      errors.confirm_password = 'Passwords do not match';
    }
    setProfileErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateProfile() || !user?.id) return;

    setSavingProfile(true);
    try {
      // Update email if it changed
      if (profile.email !== user.email) {
        const { data: session } = await supabase.auth.getSession();
        if (!session.session) {
          throw new Error('Not authenticated');
        }

        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-email-verification`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${session.session.access_token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ newEmail: profile.email }),
          }
        );

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Failed to send verification email');
        }

        toast.success('Verification email sent! Please check your inbox to confirm the change.');
      }

      // Update profile data
      const updateData = {
        first_name: profile.first_name,
        last_name: profile.last_name,
        phone: profile.phone,
        company: profile.company,
        display_name: `${profile.first_name} ${profile.last_name}`.trim(),
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('user_profiles')
        .update(updateData)
        .eq('user_id', user.id);

      if (error) throw error;

      setOriginalProfile(profile);

      if (profile.email === user.email) {
        toast.success('Profile updated successfully');
      }
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast.error(error.message || 'Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validatePassword()) return;

    setSavingProfile(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordData.new_password
      });

      if (error) throw error;

      toast.success('Password changed successfully');
      setPasswordData({
        current_password: '',
        new_password: '',
        confirm_password: '',
      });
      setProfileErrors({});
    } catch (error: any) {
      console.error('Error changing password:', error);
      toast.error(error.message || 'Failed to change password');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }

    if (!['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error('Only JPEG, PNG, and WebP images are allowed');
      return;
    }

    setUploadingPicture(true);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('profile-pictures')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('profile-pictures')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({ profile_picture_url: publicUrl })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      setProfile(prev => ({ ...prev, profile_picture_url: publicUrl }));
      toast.success('Profile picture updated successfully');
    } catch (error) {
      console.error('Error uploading picture:', error);
      toast.error('Failed to upload profile picture');
    } finally {
      setUploadingPicture(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemovePicture = async () => {
    if (!user?.id) return;

    setSavingProfile(true);
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ profile_picture_url: null })
        .eq('user_id', user.id);

      if (error) throw error;

      setProfile(prev => ({ ...prev, profile_picture_url: null }));
      toast.success('Profile picture removed successfully');
    } catch (error) {
      console.error('Error removing picture:', error);
      toast.error('Failed to remove profile picture');
    } finally {
      setSavingProfile(false);
    }
  };

  const getInitials = () => {
    if (profile.first_name) {
      return profile.first_name.charAt(0).toUpperCase();
    }
    if (profile.last_name) {
      return profile.last_name.charAt(0).toUpperCase();
    }
    return user?.email?.charAt(0).toUpperCase() || 'U';
  };

  const handleNotificationToggle = async (type: keyof UserSettings['notifications']) => {
    try {
      setIsLoading(true);
      await new Promise(resolve => setTimeout(resolve, 500));
      setSettings(prev => ({
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

  const handleDataSharingToggle = async (type: keyof UserSettings['dataSharing']) => {
    try {
      setIsLoading(true);
      await new Promise(resolve => setTimeout(resolve, 500));
      setSettings(prev => ({
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
    console.log('[Settings] Shopify connection successful:', storeUrl);
    setShowShopifyModal(false);
    setShopifyConnecting(false);

    // Refresh immediately
    await refreshShopifyStatus();
    console.log('[Settings] First refresh completed - UI should update now');

    // Force a second refresh after a delay to catch any async DB updates
    setTimeout(async () => {
      await refreshShopifyStatus();
      console.log('[Settings] Second refresh completed');
    }, 500);

    // Force a third refresh to be absolutely sure
    setTimeout(async () => {
      await refreshShopifyStatus();
      console.log('[Settings] Final refresh completed');
    }, 1500);

    toast.success('Shopify store connected successfully!', {
      duration: 3000
    });
  };


  const handleSyncShopifyOrders = async () => {
    if (!user?.id || !shopify.installation) return;

    try {
      setShopifySyncing(true);

      // Show immediate feedback
      toast.info('Syncing Shopify orders...');

      const { data: session } = await supabase.auth.getSession();
      if (!session.session) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync-shopify-orders`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: user.id,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to sync orders');
      }

      // Refresh Shopify status to update last_synced_at
      await refreshShopifyStatus();

      // Show detailed success message
      const message = result.pages > 1
        ? `Synced ${result.totalOrders} orders (${result.fulfillmentsCreated} matched to quotes, ${result.pages} pages)`
        : `Synced ${result.totalOrders} orders (${result.fulfillmentsCreated} matched to quotes)`;

      toast.success(message, { duration: 5000 });
    } catch (error: any) {
      console.error('Error syncing orders:', error);
      toast.error(error.message || 'Failed to sync orders');
    } finally {
      setShopifySyncing(false);
    }
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

      // Only check if popup is completely null (blocked by browser)
      // Don't check popup.closed immediately as it may not be set yet
      if (!popup) {
        throw new Error('Popup blocked. Please allow popups for this site.');
      }

      const checkPopupClosed = setInterval(() => {
        try {
          if (!popup || popup.closed) {
            clearInterval(checkPopupClosed);
            setTimeout(async () => {
              console.log('[Settings] Facebook popup closed, refreshing accounts...');
              await refreshFacebookAccounts();
              console.log('[Settings] First refresh completed - UI should update now');

              // Check if connection was successful
              const updatedAccounts = await facebookAdsService.getAdAccounts('facebook');
              if (updatedAccounts.length > 0) {
                console.log('[Settings] Facebook Ads connected successfully');
                toast.success('Facebook Ads connected successfully!', {
                  duration: 3000
                });

                console.log('[Settings] Auto-syncing Facebook Ads data for', updatedAccounts.length, 'accounts...');

                try {
                  const syncStoreState = useSyncStore.getState();
                  const adCacheState = useAdDataCache.getState();

                  if (syncStoreState.startSync('settings')) {
                    console.log('[Settings] Starting automatic incremental sync');
                    facebookAdsService.syncAdAccount(updatedAccounts[0].platform_account_id, undefined, undefined, true)
                      .then(() => {
                        console.log('[Settings] Background incremental sync completed');
                        adCacheState.markStale();
                        useSyncStore.getState().completeSync();
                      })
                      .catch((err) => {
                        console.error('[Settings] Background sync failed:', err);
                        useSyncStore.getState().completeSync(err.message || 'Sync failed');
                      });
                  }
                } catch (syncError) {
                  console.error('[Settings] Auto-sync failed:', syncError);
                }
              }

              setFacebookConnecting(false);
            }, 1000);
          }
        } catch (e) {
          // COOP errors are expected when checking popup.closed on cross-origin popups
          // This is normal browser security behavior, not an actual error
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
    const syncStore = useSyncStore.getState();
    const adDataCache = useAdDataCache.getState();

    if (!syncStore.startSync('settings')) {
      toast.info('Sync already in progress...');
      return;
    }

    try {
      setFacebookSyncing(true);

      console.log('[Settings] Starting manual incremental sync');
      toast.info('Syncing Facebook Ads data...');

      const result = await facebookAdsService.syncAdAccount(platformAccountId, undefined, undefined, true);
      console.log('[Settings] Sync result:', result);

      await refreshFacebookAccounts();

      if ((result as any).errors && (result as any).errors.length > 0) {
        console.error('[Settings] Sync errors:', (result as any).errors);
        const errorMessages = (result as any).errors.slice(0, 3).join('\n');
        toast.error(`Sync failed:\n${errorMessages}`, { duration: 10000 });
        syncStore.completeSync('Sync failed');
      } else {
        adDataCache.markStale();
        syncStore.completeSync();

        if (result.data) {
          const { campaigns, adSets, ads, metrics } = result.data;
          toast.success(
            `Sync complete! ${campaigns} campaigns, ${adSets} ad sets, ${ads} ads, ${metrics} metrics`,
            { duration: 5000 }
          );
        } else {
          toast.success('Data synced successfully!', { duration: 5000 });
        }
      }
    } catch (error) {
      console.error('[Settings] Error syncing Facebook:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to sync Facebook Ads data';
      console.error('[Settings] Error message:', errorMessage);
      toast.error(errorMessage);
      syncStore.completeSync(errorMessage);
    } finally {
      setFacebookSyncing(false);
    }
  };

  // Removed loadFacebookAccounts - now using refreshFacebookAccounts from store

  const handleConnectTikTok = async () => {
    if (!user?.id) {
      toast.error('Please log in to connect TikTok Ads');
      return;
    }

    try {
      setTiktokConnecting(true);

      const oauthUrl = await tiktokAdsService.connectTikTokAds();

      const width = 800;
      const height = 700;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;

      const popup = window.open(
        oauthUrl,
        'tiktok-oauth',
        `width=${width},height=${height},left=${left},top=${top},toolbar=no,location=no,status=no,menubar=no,scrollbars=yes,resizable=yes`
      );

      if (!popup) {
        throw new Error('Popup blocked. Please allow popups for this site.');
      }

      const checkPopupClosed = setInterval(() => {
        try {
          if (!popup || popup.closed) {
            clearInterval(checkPopupClosed);
            setTimeout(async () => {
              console.log('[Settings] TikTok popup closed, refreshing accounts...');
              await refreshTikTokAccounts();

              const updatedAccounts = await tiktokAdsService.getAdAccounts();
              if (updatedAccounts.length > 0) {
                toast.success('TikTok Ads connected successfully!', { duration: 3000 });

                try {
                  const syncStoreState = useSyncStore.getState();
                  const adCacheState = useAdDataCache.getState();

                  if (syncStoreState.startSync('settings')) {
                    tiktokAdsService.syncAdAccount(updatedAccounts[0].platform_account_id, undefined, undefined, true)
                      .then(() => {
                        adCacheState.markStale();
                        useSyncStore.getState().completeSync();
                      })
                      .catch((err) => {
                        useSyncStore.getState().completeSync(err.message || 'Sync failed');
                      });
                  }
                } catch (syncError) {
                  console.error('[Settings] Auto-sync failed:', syncError);
                }
              }

              setTiktokConnecting(false);
            }, 1000);
          }
        } catch (e) {
          // COOP errors are expected when checking popup.closed on cross-origin popups
          // This is normal browser security behavior, not an actual error
        }
      }, 500);

    } catch (error) {
      console.error('Error connecting TikTok:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to connect TikTok Ads');
      setTiktokConnecting(false);
    }
  };

  const handleDisconnectTikTok = async (accountId: string) => {
    try {
      setTiktokConnecting(true);
      await tiktokAdsService.disconnectAdAccount(accountId);
      await refreshTikTokAccounts();
      toast.success('TikTok Ads disconnected successfully');
    } catch (error) {
      console.error('Error disconnecting TikTok:', error);
      toast.error('Failed to disconnect TikTok Ads');
    } finally {
      setTiktokConnecting(false);
    }
  };

  const handleSyncTikTok = async (platformAccountId: string) => {
    const syncStore = useSyncStore.getState();
    const adDataCache = useAdDataCache.getState();

    if (!syncStore.startSync('settings')) {
      toast.info('Sync already in progress...');
      return;
    }

    try {
      setTiktokSyncing(true);
      toast.info('Syncing TikTok Ads data...');

      const result = await tiktokAdsService.syncAdAccount(platformAccountId, undefined, undefined, true);
      await refreshTikTokAccounts();

      if ((result as any).errors && (result as any).errors.length > 0) {
        console.error('[TikTok Ads Sync] Errors:', (result as any).errors);
        toast.warning(`Sync completed with ${(result as any).errors.length} warnings`);
      } else {
        toast.success('TikTok Ads data synced successfully');
      }

      adDataCache.markStale();
      syncStore.completeSync();
    } catch (error) {
      console.error('Error syncing TikTok:', error);
      toast.error('Failed to sync TikTok Ads data');
      syncStore.completeSync(error instanceof Error ? error.message : 'Sync failed');
    } finally {
      setTiktokSyncing(false);
    }
  };

  const handleConnectGoogle = async () => {
    if (!user?.id) {
      toast.error('Please log in to connect Google Ads');
      return;
    }

    try {
      setGoogleConnecting(true);

      const oauthUrl = await googleAdsService.connectGoogleAds();

      const width = 800;
      const height = 700;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;

      const popup = window.open(
        oauthUrl,
        'google-oauth',
        `width=${width},height=${height},left=${left},top=${top},toolbar=no,location=no,status=no,menubar=no,scrollbars=yes,resizable=yes`
      );

      if (!popup) {
        throw new Error('Popup blocked. Please allow popups for this site.');
      }

      const checkPopupClosed = setInterval(() => {
        try {
          if (!popup || popup.closed) {
            clearInterval(checkPopupClosed);
            setTimeout(async () => {
              console.log('[Settings] ✓ Google popup closed, refreshing accounts...');
              await refreshGoogleAccounts();

              console.log('[Settings] Fetching updated accounts...');
              const updatedAccounts = await googleAdsService.getAdAccounts();
              console.log('[Settings] Found accounts:', updatedAccounts.length, updatedAccounts);

              if (updatedAccounts.length > 0) {
                toast.success('Google Ads connected successfully!', { duration: 3000 });

                try {
                  const syncStoreState = useSyncStore.getState();
                  const adCacheState = useAdDataCache.getState();

                  console.log('[Settings] Starting auto-sync for account:', updatedAccounts[0].platform_account_id);

                  if (syncStoreState.startSync('settings')) {
                    console.log('[Settings] Sync lock acquired, calling syncAdAccount...');
                    googleAdsService.syncAdAccount(updatedAccounts[0].platform_account_id, undefined, undefined, true)
                      .then(() => {
                        console.log('[Settings] ✓ Auto-sync completed successfully');
                        adCacheState.markStale();
                        useSyncStore.getState().completeSync();
                      })
                      .catch((err) => {
                        console.error('[Settings] ✗ Auto-sync failed:', err);
                        toast.error('Failed to sync Google Ads data');
                        useSyncStore.getState().completeSync(err.message || 'Sync failed');
                      });
                  } else {
                    console.log('[Settings] Sync lock already held, skipping auto-sync');
                  }
                } catch (syncError) {
                  console.error('[Settings] Auto-sync exception:', syncError);
                }
              } else {
                console.error('[Settings] ✗ No Google Ads accounts found after connection!');
                toast.error('No Google Ads accounts found. Please try connecting again.');
              }

              setGoogleConnecting(false);
            }, 1000);
          }
        } catch (e) {
          // COOP errors are expected when checking popup.closed on cross-origin popups
          // This is normal browser security behavior, not an actual error
        }
      }, 500);

    } catch (error) {
      console.error('Error connecting Google:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to connect Google Ads');
      setGoogleConnecting(false);
    }
  };

  const handleDisconnectGoogle = async (accountId: string) => {
    try {
      setGoogleConnecting(true);
      await googleAdsService.disconnectAdAccount(accountId);
      await refreshGoogleAccounts();
      toast.success('Google Ads disconnected successfully');
    } catch (error) {
      console.error('Error disconnecting Google:', error);
      toast.error('Failed to disconnect Google Ads');
    } finally {
      setGoogleConnecting(false);
    }
  };

  const handleSyncGoogle = async (platformAccountId: string) => {
    const syncStore = useSyncStore.getState();
    const adDataCache = useAdDataCache.getState();

    if (!syncStore.startSync('settings')) {
      toast.info('Sync already in progress...');
      return;
    }

    try {
      setGoogleSyncing(true);
      toast.info('Syncing Google Ads data...');

      const result = await googleAdsService.syncAdAccount(platformAccountId, undefined, undefined, true);
      await refreshGoogleAccounts();

      if ((result as any).errors && (result as any).errors.length > 0) {
        console.error('[Google Ads Sync] Errors:', (result as any).errors);
        toast.warning(`Sync completed with ${(result as any).errors.length} warnings`);
      } else {
        toast.success('Google Ads data synced successfully');
      }

      adDataCache.markStale();
      syncStore.completeSync();
    } catch (error) {
      console.error('Error syncing Google:', error);
      toast.error('Failed to sync Google Ads data');
      syncStore.completeSync(error instanceof Error ? error.message : 'Sync failed');
    } finally {
      setGoogleSyncing(false);
    }
  };

  const handleConnectPlatform = async (platform: keyof IntegrationStatus) => {
    if (platform === 'shopify') {
      await handleConnectShopify();
      return;
    }

    if (platform === 'facebook') {
      await handleConnectFacebook();
      return;
    }

    if (platform === 'tiktok') {
      await handleConnectTikTok();
      return;
    }

    if (platform === 'google') {
      await handleConnectGoogle();
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
        settings,
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

      <div className="max-w-[1050px] mx-auto px-0 sm:px-0">
      {/* Title Section */}
      <div className="mb-8">
        <h1 className="text-2xl font-normal text-gray-900 dark:text-white mb-2">
          Account Settings
        </h1>
        <div className="flex items-start sm:items-center space-x-2">
          <div className="w-1.5 h-1.5 bg-red-500 rounded-full mt-1.5 sm:mt-0 flex-shrink-0"></div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Manage your account settings and preferences
          </p>
        </div>
      </div>

      <div className="flex-1 space-y-6">
        {/* Profile Settings */}
        <div className="bg-white dark:bg-[#1f1f1f] rounded-xl border border-gray-200 dark:border-[#3a3a3a] overflow-visible">
          <div className="border-b border-gray-200 dark:border-[#3a3a3a]">
            <div className="flex space-x-8 px-6">
              {[
                { id: 'profile', label: 'Profile', icon: User },
                { id: 'security', label: 'Security', icon: Lock },
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id as any)}
                  className={`flex items-center space-x-2 px-4 py-4 border-b-2 transition-colors ${
                    activeTab === id
                      ? 'border-gray-900 text-gray-900 dark:border-white dark:text-white'
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
                {/* Profile Picture */}
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-[linear-gradient(135deg,#E11D48_0%,#EC4899_40%,#F87171_70%,#E8795A_100%)] flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {profile.profile_picture_url ? (
                      <img
                        src={profile.profile_picture_url}
                        alt="Profile"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-lg font-semibold text-white">
                        {getInitials()}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/webp"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingPicture}
                      className="btn btn-secondary disabled:opacity-50"
                    >
                      {uploadingPicture ? 'Uploading...' : 'Upload photo'}
                    </button>
                    {profile.profile_picture_url && (
                      <button
                        type="button"
                        onClick={handleRemovePicture}
                        disabled={savingProfile}
                        className="btn btn-ghost text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 disabled:opacity-50"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>

                {/* Name Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      First Name <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        value={profile.first_name}
                        onChange={(e) => handleProfileChange('first_name', e.target.value)}
                        className={`w-full pl-9 pr-3 py-2 text-sm border rounded-lg bg-gray-50 dark:bg-[#3a3a3a] text-gray-900 dark:text-white ${
                          profileErrors.first_name ? 'border-red-500' : 'border-gray-300 dark:border-[#4a4a4a]'
                        } focus:ring-2 focus:ring-red-500/50 focus:bg-white dark:focus:bg-gray-700`}
                        placeholder="John"
                      />
                    </div>
                    {profileErrors.first_name && (
                      <p className="mt-1 text-sm text-red-600">{profileErrors.first_name}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      Last Name <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        value={profile.last_name}
                        onChange={(e) => handleProfileChange('last_name', e.target.value)}
                        className={`w-full pl-9 pr-3 py-2 text-sm border rounded-lg bg-gray-50 dark:bg-[#3a3a3a] text-gray-900 dark:text-white ${
                          profileErrors.last_name ? 'border-red-500' : 'border-gray-300 dark:border-[#4a4a4a]'
                        } focus:ring-2 focus:ring-red-500/50 focus:bg-white dark:focus:bg-gray-700`}
                        placeholder="Doe"
                      />
                    </div>
                    {profileErrors.last_name && (
                      <p className="mt-1 text-sm text-red-600">{profileErrors.last_name}</p>
                    )}
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="email"
                      value={profile.email}
                      onChange={(e) => handleProfileChange('email', e.target.value)}
                      className={`w-full pl-9 pr-3 py-2 text-sm border rounded-lg bg-gray-50 dark:bg-[#3a3a3a] text-gray-900 dark:text-white ${
                        profileErrors.email ? 'border-red-500' : 'border-gray-300 dark:border-[#4a4a4a]'
                      } focus:ring-2 focus:ring-red-500/50 focus:bg-white dark:focus:bg-gray-700`}
                      placeholder="you@example.com"
                    />
                  </div>
                  {profileErrors.email && (
                    <p className="mt-1 text-sm text-red-600">{profileErrors.email}</p>
                  )}
                  {profile.email !== user?.email && (
                    <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                      You'll receive a confirmation email to verify your new address
                    </p>
                  )}
                </div>

                {/* Phone & Company */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      Phone Number
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="tel"
                        value={profile.phone}
                        onChange={(e) => handleProfileChange('phone', e.target.value)}
                        className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 dark:border-[#4a4a4a] rounded-lg bg-gray-50 dark:bg-[#3a3a3a] text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500/50 focus:bg-white dark:focus:bg-gray-700"
                        placeholder="+1 (555) 123-4567"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      Company
                    </label>
                    <div className="relative">
                      <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        value={profile.company}
                        onChange={(e) => handleProfileChange('company', e.target.value)}
                        className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 dark:border-[#4a4a4a] rounded-lg bg-gray-50 dark:bg-[#3a3a3a] text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500/50 focus:bg-white dark:focus:bg-gray-700"
                        placeholder="Your Company"
                      />
                    </div>
                  </div>
                </div>

                {/* Save Button */}
                <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-[#3a3a3a]">
                  <button
                    type="submit"
                    disabled={savingProfile || !hasProfileChanges}
                    className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {savingProfile ? (
                      <>
                        <Loader2 className="btn-icon w-4 h-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        Save Changes
                        <ArrowRight className="btn-icon btn-icon-arrow" />
                      </>
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
                    Ensure your account is using a strong password with at least 8 characters.
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
                      className={`w-full pl-9 pr-10 py-2 text-sm border rounded-lg bg-gray-50 dark:bg-[#3a3a3a] text-gray-900 dark:text-white ${
                        profileErrors.current_password ? 'border-red-500' : 'border-gray-300 dark:border-[#4a4a4a]'
                      } focus:ring-2 focus:ring-red-500/50 focus:bg-white dark:focus:bg-gray-700`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(prev => ({ ...prev, current: !prev.current }))}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      {showPassword.current ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {profileErrors.current_password && (
                    <p className="mt-1 text-sm text-red-600">{profileErrors.current_password}</p>
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
                      className={`w-full pl-9 pr-10 py-2 text-sm border rounded-lg bg-gray-50 dark:bg-[#3a3a3a] text-gray-900 dark:text-white ${
                        profileErrors.new_password ? 'border-red-500' : 'border-gray-300 dark:border-[#4a4a4a]'
                      } focus:ring-2 focus:ring-red-500/50 focus:bg-white dark:focus:bg-gray-700`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(prev => ({ ...prev, new: !prev.new }))}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      {showPassword.new ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {profileErrors.new_password && (
                    <p className="mt-1 text-sm text-red-600">{profileErrors.new_password}</p>
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
                      className={`w-full pl-9 pr-10 py-2 text-sm border rounded-lg bg-gray-50 dark:bg-[#3a3a3a] text-gray-900 dark:text-white ${
                        profileErrors.confirm_password ? 'border-red-500' : 'border-gray-300 dark:border-[#4a4a4a]'
                      } focus:ring-2 focus:ring-red-500/50 focus:bg-white dark:focus:bg-gray-700`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(prev => ({ ...prev, confirm: !prev.confirm }))}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      {showPassword.confirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {profileErrors.confirm_password && (
                    <p className="mt-1 text-sm text-red-600">{profileErrors.confirm_password}</p>
                  )}
                </div>

                <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-[#3a3a3a]">
                  <button
                    type="submit"
                    disabled={savingProfile || !hasPasswordChanges}
                    className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {savingProfile ? (
                      <>
                        <Loader2 className="btn-icon w-4 h-4 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      <>
                        Update Password
                        <ArrowRight className="btn-icon btn-icon-arrow" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* Store Policies Section */}
        {user?.id && <StorePoliciesSettings userId={user.id} />}

        {/* Preferences Section */}
        <div className="bg-white dark:bg-[#1f1f1f] rounded-xl border border-gray-200 dark:border-[#3a3a3a]">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-[#3a3a3a]">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white">Preferences</h2>
            </div>

            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              <div className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-gray-100 dark:bg-[#3a3a3a] rounded-lg">
                      <DollarSign className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-900 dark:text-white">Currency</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{settings.currency}</p>
                    </div>
                  </div>
                  <div className="relative" ref={currencyDropdownRef}>
                    <button
                      onClick={() => setShowCurrencyDropdown(!showCurrencyDropdown)}
                      className="flex items-center space-x-1 text-sm text-gray-700 dark:text-gray-300"
                    >
                      <span>{settings.currency}</span>
                      <ChevronDown className={`w-4 h-4 text-gray-400 dark:text-gray-500 transition-transform ${showCurrencyDropdown ? 'rotate-180' : ''}`} />
                    </button>

                    {showCurrencyDropdown && (
                      <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-[#1f1f1f] rounded-lg shadow-lg border border-gray-200 dark:border-[#3a3a3a] py-1 z-50">
                        {['USD', 'EUR', 'GBP', 'CAD', 'AUD'].map((currency) => (
                          <button
                            key={currency}
                            onClick={() => {
                              setSettings(prev => ({ ...prev, currency }));
                              setShowCurrencyDropdown(false);
                            }}
                            className="flex items-center justify-between w-full px-4 py-2 text-sm text-left text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#3a3a3a]"
                          >
                            <span>{currency}</span>
                            {settings.currency === currency && <Check className="w-4 h-4 text-primary-500" />}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-[#1f1f1f] rounded-xl border border-gray-200 dark:border-[#3a3a3a]">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-[#3a3a3a]">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white">Notifications</h2>
            </div>
            
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              <div className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-gray-100 dark:bg-[#3a3a3a] rounded-lg">
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
                      settings.notifications.email ? 'bg-primary-500' : 'bg-gray-200 dark:bg-[#3a3a3a]'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        settings.notifications.email ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>

              <div className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-gray-100 dark:bg-[#3a3a3a] rounded-lg">
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
                      settings.notifications.push ? 'bg-primary-500' : 'bg-gray-200 dark:bg-[#3a3a3a]'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        settings.notifications.push ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>

              <div className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-gray-100 dark:bg-[#3a3a3a] rounded-lg">
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
                      settings.notifications.inApp ? 'bg-primary-500' : 'bg-gray-200 dark:bg-[#3a3a3a]'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        settings.notifications.inApp ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-[#1f1f1f] rounded-xl border border-gray-200 dark:border-[#3a3a3a]">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-[#3a3a3a]">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white">Payment Methods</h2>
            </div>
            <div className="p-6">
              <PaymentMethodManager />
            </div>
          </div>

          <div className="bg-white dark:bg-[#1f1f1f] rounded-xl border border-gray-200 dark:border-[#3a3a3a]">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-[#3a3a3a]">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white">Integrations</h2>
            </div>

            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              <div className="px-4 sm:px-6 py-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center space-x-3 min-w-0 flex-1">
                    <div className="p-2 bg-gray-100 dark:bg-[#3a3a3a] rounded-lg flex-shrink-0">
                      <img
                        src="https://iipaykvimkbbnoobtpzz.supabase.co/storage/v1/object/public/public-bucket/shopify_glyph_black.svg"
                        alt="Shopify"
                        className="w-7 h-7 object-contain dark:hidden"
                      />
                      <img
                        src="https://iipaykvimkbbnoobtpzz.supabase.co/storage/v1/object/public/public-bucket/shopify_glyph_white.svg"
                        alt="Shopify"
                        className="w-7 h-7 object-contain hidden dark:block"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-medium text-gray-900 dark:text-white">Shopify Store</h3>
                      {shopifyStore && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                          {shopifyStore.replace('https://', '').replace('.myshopify.com', '')}
                          {shopify.installation?.last_synced_at && (
                            <span className="text-gray-400"> • {formatRelativeTime(shopify.installation.last_synced_at)}</span>
                          )}
                        </p>
                      )}
                      {!shopify.isConnected && !shopify.loading && isProduction() && (
                        <a
                          href="https://apps.shopify.com/revoa"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 mt-1 transition-colors"
                        >
                          <span>Install from Shopify App Store</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {shopify.loading ? (
                      <div className="p-2">
                        <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                      </div>
                    ) : (
                      <>
                        {shopify.isConnected && (
                          <>
                            <button
                              onClick={handleSyncShopifyOrders}
                              disabled={shopifySyncing}
                              className="p-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-[#3a3a3a] hover:bg-gray-200 dark:hover:bg-[#4a4a4a] rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                              title="Sync Orders"
                            >
                              <RefreshCw className={`w-4 h-4 ${shopifySyncing ? 'animate-spin' : ''}`} />
                            </button>
                          </>
                        )}
                        {shopify.isConnected ? (
                          <button
                            onClick={handleDisconnectShopify}
                            disabled={shopifyConnecting}
                            className="p-2 text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Disconnect"
                          >
                            {shopifyConnecting ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <X className="w-4 h-4" />
                            )}
                          </button>
                        ) : shouldAllowManualShopifyConnect() ? (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleConnectPlatform('shopify')}
                            disabled={shopifyConnecting}
                            loading={shopifyConnecting}
                            icon={<ExternalLink className="w-3.5 h-3.5" />}
                            iconPosition="right"
                          >
                            Connect
                          </Button>
                        ) : (
                          <a
                            href="https://apps.shopify.com/revoa"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 px-3 p-2 text-sm text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg transition-all"
                            title="Install from App Store"
                          >
                            <span className="text-sm">Install App</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="px-4 sm:px-6 py-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center space-x-3 min-w-0 flex-1">
                    <div className="p-2 bg-gray-100 dark:bg-[#3a3a3a] rounded-lg flex-shrink-0">
                      <svg className="w-6 h-6 text-gray-900 dark:text-white" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                      </svg>
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-medium text-gray-900 dark:text-white">Facebook Ads</h3>
                      {facebookAccounts.length > 0 && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                          {facebookAccounts[0].account_name}
                          {facebookAccounts[0].last_synced_at && (
                            <span className="text-gray-400"> • {formatRelativeTime(facebookAccounts[0].last_synced_at)}</span>
                          )}
                        </p>
                      )}
                    </div>
                  </div>
                  {facebook.loading ? (
                    <div className="p-2">
                      <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                    </div>
                  ) : facebook.isConnected ? (
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => facebookAccounts[0] && handleSyncFacebook(facebookAccounts[0].platform_account_id)}
                        disabled={facebookSyncing || facebookAccounts.length === 0}
                        className="p-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-[#3a3a3a] hover:bg-gray-200 dark:hover:bg-[#4a4a4a] rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Sync"
                      >
                        <RefreshCw className={`w-4 h-4 ${facebookSyncing ? 'animate-spin' : ''}`} />
                      </button>
                      <button
                        onClick={() => facebookAccounts[0] && handleDisconnectFacebook(facebookAccounts[0].platform_account_id)}
                        disabled={facebookConnecting || facebookAccounts.length === 0}
                        className="p-2 text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Disconnect"
                      >
                        {facebookConnecting ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <X className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  ) : (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleConnectPlatform('facebook')}
                      disabled={facebookConnecting}
                      loading={facebookConnecting}
                      icon={<ExternalLink className="w-3.5 h-3.5" />}
                      iconPosition="right"
                    >
                      Connect
                    </Button>
                  )}
                </div>
              </div>

              <div className="px-4 sm:px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3 min-w-0 flex-1">
                    <div className="p-2 bg-gray-100 dark:bg-[#3a3a3a] rounded-lg flex-shrink-0">
                      <svg className="w-6 h-6 text-gray-900 dark:text-white" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M22.54 11.23c0-.8-.07-1.57-.19-2.31H12v4.51h5.92c-.26 1.57-1.04 2.91-2.21 3.82v3.18h3.57c2.08-1.92 3.28-4.74 3.28-8.2z"/>
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-medium text-gray-900 dark:text-white">Google Ads</h3>
                      {googleAccounts.length > 0 && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                          {googleAccounts[0].account_name}
                          {googleAccounts[0].last_synced_at && (
                            <span className="text-gray-400"> • {formatRelativeTime(googleAccounts[0].last_synced_at)}</span>
                          )}
                        </p>
                      )}
                    </div>
                  </div>
                  {google.loading ? (
                    <div className="p-2">
                      <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                    </div>
                  ) : google.isConnected ? (
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => googleAccounts[0] && handleSyncGoogle(googleAccounts[0].platform_account_id)}
                        disabled={googleSyncing || googleAccounts.length === 0}
                        className="p-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-[#3a3a3a] hover:bg-gray-200 dark:hover:bg-[#4a4a4a] rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Sync"
                      >
                        <RefreshCw className={`w-4 h-4 ${googleSyncing ? 'animate-spin' : ''}`} />
                      </button>
                      <button
                        onClick={() => googleAccounts[0] && handleDisconnectGoogle(googleAccounts[0].platform_account_id)}
                        disabled={googleConnecting || googleAccounts.length === 0}
                        className="p-2 text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Disconnect"
                      >
                        {googleConnecting ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <X className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  ) : (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleConnectPlatform('google')}
                      disabled={googleConnecting}
                      loading={googleConnecting}
                      icon={<ExternalLink className="w-3.5 h-3.5" />}
                      iconPosition="right"
                    >
                      Connect
                    </Button>
                  )}
                </div>
              </div>

              <div className="px-4 sm:px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3 min-w-0 flex-1">
                    <div className="p-2 bg-gray-100 dark:bg-[#3a3a3a] rounded-lg flex-shrink-0">
                      <svg className="w-6 h-6 text-gray-900 dark:text-white" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
                      </svg>
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-medium text-gray-900 dark:text-white">TikTok Ads</h3>
                      {tiktokAccounts.length > 0 && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                          {tiktokAccounts[0].account_name}
                          {tiktokAccounts[0].last_synced_at && (
                            <span className="text-gray-400"> • {formatRelativeTime(tiktokAccounts[0].last_synced_at)}</span>
                          )}
                        </p>
                      )}
                    </div>
                  </div>
                  {tiktok.loading ? (
                    <div className="p-2">
                      <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                    </div>
                  ) : tiktok.isConnected ? (
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => tiktokAccounts[0] && handleSyncTikTok(tiktokAccounts[0].platform_account_id)}
                        disabled={tiktokSyncing || tiktokAccounts.length === 0}
                        className="p-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-[#3a3a3a] hover:bg-gray-200 dark:hover:bg-[#4a4a4a] rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Sync"
                      >
                        <RefreshCw className={`w-4 h-4 ${tiktokSyncing ? 'animate-spin' : ''}`} />
                      </button>
                      <button
                        onClick={() => tiktokAccounts[0] && handleDisconnectTikTok(tiktokAccounts[0].platform_account_id)}
                        disabled={tiktokConnecting || tiktokAccounts.length === 0}
                        className="p-2 text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Disconnect"
                      >
                        {tiktokConnecting ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <X className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  ) : (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleConnectPlatform('tiktok')}
                      disabled={tiktokConnecting}
                      loading={tiktokConnecting}
                      icon={<ExternalLink className="w-3.5 h-3.5" />}
                      iconPosition="right"
                    >
                      Connect
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Subscription & Usage Section */}
          {shopify.isConnected && shopify.installation && (
            <div className="bg-white dark:bg-[#1f1f1f] rounded-xl border border-gray-200 dark:border-[#3a3a3a] overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-[#3a3a3a]">
                <h2 className="text-lg font-medium text-gray-900 dark:text-white">Subscription & Usage</h2>
              </div>
              <div className="p-6 overflow-hidden">
                <SubscriptionStatusWidget
                  storeId={shopify.installation.id}
                  shopDomain={shopify.installation.store_url}
                />
              </div>
            </div>
          )}

          <div className="bg-white dark:bg-[#1f1f1f] rounded-xl border border-gray-200 dark:border-[#3a3a3a]">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-[#3a3a3a]">
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
                      settings.dataSharing.analytics ? 'bg-primary-500' : 'bg-gray-200 dark:bg-[#3a3a3a]'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        settings.dataSharing.analytics ? 'translate-x-6' : 'translate-x-1'
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
                      settings.dataSharing.marketing ? 'bg-primary-500' : 'bg-gray-200 dark:bg-[#3a3a3a]'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        settings.dataSharing.marketing ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {isAdmin && (
            <div className="bg-white dark:bg-[#1f1f1f] rounded-xl border border-gray-200 dark:border-[#3a3a3a]">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-[#3a3a3a]">
                <h2 className="text-lg font-medium text-gray-900 dark:text-white">Developer</h2>
              </div>

              <div className="p-6">
                <div className="space-y-4">
                  <div className="rounded-xl p-0.5 border border-blue-200 dark:border-blue-900/50 bg-blue-50 dark:bg-blue-950/30">
                    <div className="rounded-lg border border-blue-300 dark:border-blue-800/60 p-4" style={{ background: 'linear-gradient(to bottom, rgba(239, 246, 255, 1), rgba(219, 234, 254, 1))' }}>
                    <div className="flex items-start space-x-3">
                      <Key className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base font-medium text-gray-900 dark:text-white mb-1">API Authentication Token</h3>
                        <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
                          Use this token to authenticate API requests for integrations and AI agents.
                        </p>

                        <div className="space-y-3">
                          <div className="relative">
                            <input
                              type={showToken ? "text" : "password"}
                              value={adminToken || "Loading..."}
                              readOnly
                              className="w-full px-3 py-2 pr-24 text-sm font-mono bg-white dark:bg-[#1f1f1f] border border-blue-200 dark:border-blue-700 rounded-lg text-gray-900 dark:text-gray-100"
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

                          <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                            <p>- Use in Authorization header: <code className="bg-white/50 dark:bg-[#1f1f1f]/40 px-1.5 py-0.5 rounded border border-gray-200 dark:border-[#3a3a3a]">Bearer YOUR_TOKEN</code></p>
                            <p>- For AI agent setup, see: <code className="bg-white/50 dark:bg-[#1f1f1f]/40 px-1.5 py-0.5 rounded border border-gray-200 dark:border-[#3a3a3a]">AI_AGENT_QUICKSTART.md</code></p>
                            <p>- This token expires periodically. Refresh this page to get a new one.</p>
                          </div>
                        </div>
                      </div>
                    </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="bg-white dark:bg-[#1f1f1f] rounded-xl border border-gray-200 dark:border-[#3a3a3a]">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-[#3a3a3a]">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white">Danger Zone</h2>
            </div>
            
            <div className="p-6">
              <div className="space-y-4">
                <div className="info-banner info-banner-red p-4">
                  <div className="flex items-start space-x-3">
                    <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5" />
                    <div>
                      <h3 className="text-base font-medium text-red-900 dark:text-red-300">Delete Account</h3>
                      <p className="text-sm text-red-700 dark:text-red-400/80 mt-1">
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
                              className="btn btn-secondary"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={handleDeleteAccount}
                              disabled={isLoading}
                              className="btn btn-danger"
                            >
                              {isLoading ? (
                                <>
                                  <Loader2 className="btn-icon w-4 h-4 animate-spin" />
                                  <span>Deleting...</span>
                                </>
                              ) : (
                                <>
                                  <Trash2 className="btn-icon w-4 h-4" />
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

                <div className="border-t border-gray-200 dark:border-[#3a3a3a] pt-4">
                  <button
                    onClick={handleExportData}
                    disabled={exportLoading}
                    className="btn btn-secondary w-full justify-center disabled:opacity-50"
                  >
                    {exportLoading ? (
                      <>
                        <Loader2 className="btn-icon w-4 h-4 animate-spin" />
                        Exporting Data...
                      </>
                    ) : (
                      <>
                        <Download className="btn-icon w-4 h-4" />
                        Export Account Data
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tier Comparison Modal */}
      {showTierModal && shopify.installation && (
        <TierComparisonModal
          isOpen={showTierModal}
          onClose={() => setShowTierModal(false)}
          storeId={shopify.installation.id}
          currentTier={shopify.installation.subscription_tier || 'startup'}
        />
      )}
    </>
  );
};

export default SettingsPage;