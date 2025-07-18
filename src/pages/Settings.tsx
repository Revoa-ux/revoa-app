import React, { useState, useEffect, useRef } from 'react';
import { 
  User, Mail, Lock, Bell, Globe, DollarSign, Moon, Sun, Languages, CreditCard, Building2, AlertTriangle, Facebook, Check, ChevronRight,
  Download,
  Trash2,
  Loader2,
  ChevronDown,
  X,
  UserPlus,
  Settings as SettingsIcon,
  Shield, // eslint-disable-next-line @typescript-eslint/no-unused-vars
  MessageSquare,
  FileText,
  ExternalLink,
  Plus,
  Minus,
  DollarSign as DollarSignIcon,
  Truck
} from 'lucide-react'; // eslint-disable-next-line @typescript-eslint/no-unused-vars
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import { PaymentMethodManager } from '@/components/payments/PaymentMethodManager';
import { useClickOutside } from '@/lib/useClickOutside';
import ProfileForm from '@/components/settings/ProfileForm';

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
  const [isLoading, setIsLoading] = useState(false);
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
  
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);
  const [showCurrencyDropdown, setShowCurrencyDropdown] = useState(false);
  const [showThemeDropdown, setShowThemeDropdown] = useState(false);
  
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
      toast.success('Notification preferences updated');
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
      toast.success('Data sharing preferences updated');
    } catch (error) {
      toast.error('Failed to update data sharing preferences');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnectPlatform = async (platform: keyof IntegrationStatus) => {
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
                      {profile.theme === 'dark' ? (
                        <Moon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                      ) : (
                        <Sun className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                      )}
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-900 dark:text-white">Theme</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {profile.theme.charAt(0).toUpperCase() + profile.theme.slice(1)} mode
                      </p>
                    </div>
                  </div>
                  <div className="relative" ref={themeDropdownRef}>
                    <button
                      onClick={() => setShowThemeDropdown(!showThemeDropdown)}
                      className="flex items-center space-x-1 text-sm text-gray-700 dark:text-gray-300"
                    >
                      <span>{profile.theme.charAt(0).toUpperCase() + profile.theme.slice(1)}</span>
                      <ChevronDown className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                    </button>
                    
                    {showThemeDropdown && (
                      <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50">
                        {['light', 'dark', 'system'].map((theme) => (
                          <button
                            key={theme}
                            onClick={() => {
                              handleProfileUpdate({ theme: theme as UserProfile['theme'] });
                              setShowThemeDropdown(false);
                            }}
                            className="flex items-center justify-between w-full px-4 py-2 text-sm text-left text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                          >
                            <span>{theme.charAt(0).toUpperCase() + theme.slice(1)}</span>
                            {profile.theme === theme && <Check className="w-4 h-4 text-primary-500" />}
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
                    <div className="w-10 h-10 rounded-lg bg-gray-50 dark:bg-gray-700 flex items-center justify-center">
                      <img 
                        src="https://jfwmnaaujzuwrqqhgmuf.supabase.co/storage/v1/object/public/REVOA%20(Public)//shopify%20(1).svg"
                        alt="Shopify"
                        className="w-6 h-6"
                      />
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-900 dark:text-white">Shopify Store</h3>
                    </div>
                  </div>
                  {integrationStatus.shopify ? (
                    <div className="flex items-center space-x-2 text-gray-900 dark:text-white">
                      <span className="text-sm">Connected</span>
                      <Check className="w-4 h-4" />
                    </div>
                  ) : (
                    <button
                      onClick={() => handleConnectPlatform('shopify')}
                      disabled={isLoading}
                      className="flex items-center space-x-1.5 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50"
                    >
                      <span>Connect</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              <div className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-lg bg-gray-50 dark:bg-gray-700 flex items-center justify-center">
                      <Facebook className="w-6 h-6 text-[#1877F2]" />
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-900 dark:text-white">Facebook Ads</h3>
                    </div>
                  </div>
                  {integrationStatus.facebook ? (
                    <div className="flex items-center space-x-2 text-gray-900 dark:text-white">
                      <span className="text-sm">Connected</span>
                      <Check className="w-4 h-4" />
                    </div>
                  ) : (
                    <button
                      onClick={() => handleConnectPlatform('facebook')}
                      disabled={isLoading}
                      className="flex items-center space-x-1.5 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50"
                    >
                      <span>Connect</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              <div className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-lg bg-gray-50 dark:bg-gray-700 flex items-center justify-center">
                      <svg className="w-6 h-6" viewBox="0 0 24 24">
                        <path d="M22.54 11.23c0-.8-.07-1.57-.19-2.31H12v4.51h5.92c-.26 1.57-1.04 2.91-2.21 3.82v3.18h3.57c2.08-1.92 3.28-4.74 3.28-8.2z" fill="#4285F4"/>
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-900 dark:text-white">Google Ads</h3>
                    </div>
                  </div>
                  {integrationStatus.google ? (
                    <div className="flex items-center space-x-2 text-gray-900 dark:text-white">
                      <span className="text-sm">Connected</span>
                      <Check className="w-4 h-4" />
                    </div>
                  ) : (
                    <button
                      onClick={() => handleConnectPlatform('google')}
                      disabled={isLoading}
                      className="flex items-center space-x-1.5 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50"
                    >
                      <span>Connect</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              <div className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-lg bg-gray-50 dark:bg-gray-700 flex items-center justify-center">
                      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-900 dark:text-white">TikTok Ads</h3>
                    </div>
                  </div>
                  {integrationStatus.tiktok ? (
                    <div className="flex items-center space-x-2 text-gray-900 dark:text-white">
                      <span className="text-sm">Connected</span>
                      <Check className="w-4 h-4" />
                    </div>
                  ) : (
                    <button
                      onClick={() => handleConnectPlatform('tiktok')}
                      disabled={isLoading}
                      className="flex items-center space-x-1.5 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50"
                    >
                      <span>Connect</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  )}
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
  );
};

export default SettingsPage;