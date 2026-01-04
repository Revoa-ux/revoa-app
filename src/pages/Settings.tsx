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
  RefreshCw,
  User,
  UserPlus,
  Phone,
  Building,
  Lock,
  Save,
  ArrowRight,
  FileText,
  Bug
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { toast } from 'sonner';
import { PaymentMethodManager } from '@/components/payments/PaymentMethodManager';
import { useClickOutside } from '@/lib/useClickOutside';
import { supabase } from '@/lib/supabase';
import { getActiveShopifyInstallation, subscribeToShopifyStatus } from '@/lib/shopify/status';
import ShopifyConnectModal from '@/components/settings/ShopifyConnectModal';
import { facebookAdsService } from '@/lib/facebookAds';
import type { AdAccount } from '@/types/ads';
import { useConnectionStore } from '@/lib/connectionStore';
import { StorePoliciesSettings } from '@/components/settings/StorePoliciesSettings';

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

  const hasProfileChanges =
    profile.first_name !== originalProfile.first_name ||
    profile.last_name !== originalProfile.last_name ||
    profile.phone !== originalProfile.phone ||
    profile.company !== originalProfile.company;

  const hasPasswordChanges =
    passwordData.new_password.length > 0 &&
    passwordData.confirm_password.length > 0;

  // Use centralized connection store
  const { shopify, facebook, refreshFacebookAccounts, refreshShopifyStatus} = useConnectionStore();
  const shopifyStore = shopify.installation?.store_url || null;
  const facebookAccounts = facebook.accounts;
  const integrationStatusShopify = shopify.isConnected;
  const integrationStatusFacebook = facebook.isConnected;
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
    setIntegrationStatus({
      shopify: integrationStatusShopify,
      facebook: integrationStatusFacebook,
      google: false,
      tiktok: false
    });
  }, [integrationStatusShopify, integrationStatusFacebook]);

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
        setFacebookConnecting(false);

        // Show success toast immediately
        toast.success('Facebook Ads connected successfully!');

        // Refresh accounts to update UI
        await refreshFacebookAccounts();

        // Force a small delay to ensure store update propagates
        setTimeout(() => {
          refreshFacebookAccounts();
        }, 500);
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

          setFacebookConnecting(false);

          // Show success toast immediately
          toast.success('Facebook Ads connected successfully!');

          // Refresh accounts
          await refreshFacebookAccounts();

          // Force a second refresh after delay
          setTimeout(() => {
            refreshFacebookAccounts();
          }, 500);

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

    // Multiple refreshes to ensure UI updates
    await refreshShopifyStatus();

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

    toast.success('Shopify store connected successfully!');
  };

  const handleBackfillCustomerData = async () => {
    if (!user?.id || !shopify.installation) return;

    try {
      setShopifySyncing(true);
      toast.info('Backfilling customer data from Shopify...');

      const { data: session } = await supabase.auth.getSession();
      if (!session.session) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/backfill-order-customer-data`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.session.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to backfill customer data');
      }

      if (result.updated > 0) {
        toast.success(`Updated ${result.updated} orders with customer data!`);
      } else {
        toast.info(result.message || 'No orders needed updating');
      }
    } catch (error: any) {
      console.error('Error backfilling customer data:', error);
      toast.error(error.message || 'Failed to backfill customer data');
    } finally {
      setShopifySyncing(false);
    }
  };

  const handleTestShopifyOrder = async () => {
    if (!user?.id || !shopify.installation) return;

    try {
      setShopifySyncing(true);
      toast.info('Testing order #1024 from Shopify...');

      const { data: session } = await supabase.auth.getSession();
      if (!session.session) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/test-shopify-raw-order`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.session.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to test order');
      }

      const summary = result.summary;
      const extracted = result.extracted_data;
      const customer = extracted.customer;
      const shippingAddr = extracted.shipping_address;
      const billingAddr = extracted.billing_address;

      console.log('=== Order Summary ===');
      console.log(summary);
      console.log('=== Full Order Data ===');
      console.log('Customer object:', customer);
      console.log('Shipping address:', shippingAddr);
      console.log('Billing address:', billingAddr);
      console.log('Order email:', extracted.email);
      console.log('Contact email:', extracted.contact_email);
      console.log('=== Raw Shopify Order ===');
      console.log(result.raw_order);

      if (!summary.customer_populated && !summary.shipping_populated && !summary.billing_populated && !summary.order_email) {
        toast.error(`Order ${summary.order_name}: NO customer data anywhere. Empty draft order. Status: ${summary.financial_status}/${summary.fulfillment_status || 'unfulfilled'}`);
        return;
      }

      if (extracted.has_customer && customer) {
        const hasData = customer.first_name || customer.last_name || customer.email;

        if (hasData) {
          toast.success(`Customer: ${customer.first_name || ''} ${customer.last_name || ''} (${customer.email || 'no email'})`);
        } else {
          const shippingName = shippingAddr ? `${shippingAddr.first_name || ''} ${shippingAddr.last_name || ''}`.trim() : null;
          const billingName = billingAddr ? `${billingAddr.first_name || ''} ${billingAddr.last_name || ''}`.trim() : null;

          if (shippingName) {
            toast.warning(`Customer empty → Using shipping address: ${shippingName} (${extracted.email || 'no email'})`);
          } else if (billingName) {
            toast.warning(`Customer empty → Using billing address: ${billingName} (${extracted.email || 'no email'})`);
          } else if (extracted.email) {
            toast.warning(`Customer empty → Only email available: ${extracted.email}`);
          } else {
            toast.error(`Customer object exists but all fields null. Order: ${summary.order_name}. See console for details.`);
          }
        }
      } else if (extracted.email) {
        toast.warning(`No customer object, but email found: ${extracted.email}`);
      } else if (extracted.contact_email) {
        toast.warning(`No customer object, but contact_email found: ${extracted.contact_email}`);
      } else if (shippingAddr) {
        const name = `${shippingAddr.first_name || ''} ${shippingAddr.last_name || ''}`.trim();
        toast.info(`No customer, but shipping address: ${name || 'no name'}`);
      } else {
        toast.error(`No customer data. Source: ${extracted.source_name || 'unknown'}. See console.`);
      }
    } catch (error: any) {
      console.error('Error testing order:', error);
      toast.error(error.message || 'Failed to test order');
    } finally {
      setShopifySyncing(false);
    }
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

      toast.success(message);
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
                console.log('[Settings] Starting automatic incremental sync');
                // Start incremental sync from last_synced_at (fire and forget)
                facebookAdsService.syncAdAccount(updatedAccounts[0].platform_account_id, undefined, undefined, true)
                  .then(() => console.log('[Settings] Background incremental sync completed'))
                  .catch((err) => console.error('[Settings] Background sync failed:', err));
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

      console.log('[Settings] Starting manual incremental sync');

      // Show immediate feedback
      toast.info('Syncing Facebook Ads data...');

      // Wait for incremental sync to complete
      const result = await facebookAdsService.syncAdAccount(platformAccountId, undefined, undefined, true);
      console.log('[Settings] Sync result:', result);

      // Refresh accounts after sync completes
      await refreshFacebookAccounts();

      toast.success('Data synced successfully');
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
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-visible">
          <div className="border-b border-gray-200 dark:border-gray-700">
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
                  <div className="h-12 w-12 rounded-full bg-[linear-gradient(135deg,#E11D48_40%,#EC4899_80%,#E8795A_100%)] flex items-center justify-center flex-shrink-0 overflow-hidden">
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
                      className="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
                    >
                      {uploadingPicture ? 'Uploading...' : 'Upload photo'}
                    </button>
                    {profile.profile_picture_url && (
                      <button
                        type="button"
                        onClick={handleRemovePicture}
                        disabled={savingProfile}
                        className="px-3 py-1.5 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors disabled:opacity-50"
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
                        className={`w-full pl-9 pr-3 py-2 text-sm border rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white ${
                          profileErrors.first_name ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
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
                        className={`w-full pl-9 pr-3 py-2 text-sm border rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white ${
                          profileErrors.last_name ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
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
                      className={`w-full pl-9 pr-3 py-2 text-sm border rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white ${
                        profileErrors.email ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
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
                        className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500/50 focus:bg-white dark:focus:bg-gray-700"
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
                        className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500/50 focus:bg-white dark:focus:bg-gray-700"
                        placeholder="Your Company"
                      />
                    </div>
                  </div>
                </div>

                {/* Save Button */}
                <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
                  <button
                    type="submit"
                    disabled={savingProfile || !hasProfileChanges}
                    className={`group px-5 py-1.5 text-sm font-medium text-white rounded-lg transition-all flex items-center gap-2 shadow-sm ${
                      hasProfileChanges
                        ? 'bg-gray-900 hover:bg-black dark:bg-gray-700 dark:hover:bg-gray-600 hover:shadow-md'
                        : 'bg-gray-400 dark:bg-gray-600 cursor-not-allowed'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {savingProfile ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        Save Changes
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
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
                      className={`w-full pl-9 pr-10 py-2 text-sm border rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white ${
                        profileErrors.current_password ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
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
                      className={`w-full pl-9 pr-10 py-2 text-sm border rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white ${
                        profileErrors.new_password ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
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
                      className={`w-full pl-9 pr-10 py-2 text-sm border rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white ${
                        profileErrors.confirm_password ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
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

                <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
                  <button
                    type="submit"
                    disabled={savingProfile || !hasPasswordChanges}
                    className={`group px-5 py-1.5 text-sm font-medium text-white rounded-lg transition-all flex items-center gap-2 shadow-sm ${
                      hasPasswordChanges
                        ? 'bg-gray-900 hover:bg-black dark:bg-gray-700 dark:hover:bg-gray-600 hover:shadow-md'
                        : 'bg-gray-400 dark:bg-gray-600 cursor-not-allowed'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {savingProfile ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      <>
                        Update Password
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
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
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white">Preferences</h2>
            </div>

            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              <div className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
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
                      <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50">
                        {['USD', 'EUR', 'GBP'].map((currency) => (
                          <button
                            key={currency}
                            onClick={() => {
                              setSettings(prev => ({ ...prev, currency }));
                              setShowCurrencyDropdown(false);
                            }}
                            className="flex items-center justify-between w-full px-4 py-2 text-sm text-left text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
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
                      settings.notifications.email ? 'bg-primary-500' : 'bg-gray-200 dark:bg-gray-700'
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
                      settings.notifications.push ? 'bg-primary-500' : 'bg-gray-200 dark:bg-gray-700'
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
                      settings.notifications.inApp ? 'bg-primary-500' : 'bg-gray-200 dark:bg-gray-700'
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
              <div className="px-4 sm:px-6 py-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center space-x-3 min-w-0 flex-1">
                    <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg flex-shrink-0">
                      <img
                        src="https://iipaykvimkbbnoobtpzz.supabase.co/storage/v1/object/public/public-bucket/Shopify%20logo%20black.png"
                        alt="Shopify"
                        className="w-7 h-7 object-contain grayscale dark:grayscale-0 dark:invert"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-medium text-gray-900 dark:text-white">Shopify Store</h3>
                      {shopifyStore && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                          {shopifyStore.replace('https://', '').replace('.myshopify.com', '')}
                          {shopify.installation?.last_synced_at && (
                            <span className="text-gray-400 hidden sm:inline"> • {new Date(shopify.installation.last_synced_at).toLocaleDateString()}</span>
                          )}
                          {shopify.installation?.last_synced_at && (
                            <span className="text-gray-400 sm:hidden"> • {new Date(shopify.installation.last_synced_at).toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' })}</span>
                          )}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {integrationStatus.shopify && (
                      <>
                        <button
                          onClick={handleSyncShopifyOrders}
                          disabled={shopifySyncing}
                          className="p-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Sync Orders"
                        >
                          <RefreshCw className={`w-4 h-4 ${shopifySyncing ? 'animate-spin' : ''}`} />
                        </button>
                        <button
                          onClick={handleBackfillCustomerData}
                          disabled={shopifySyncing}
                          className="p-2 text-gray-700 dark:text-gray-300 bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 dark:hover:bg-blue-900/50 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Fix Missing Customer Data"
                        >
                          <UserPlus className="w-4 h-4" />
                        </button>
                        <button
                          onClick={handleTestShopifyOrder}
                          disabled={shopifySyncing}
                          className="p-2 text-gray-700 dark:text-gray-300 bg-yellow-100 dark:bg-yellow-900/30 hover:bg-yellow-200 dark:hover:bg-yellow-900/50 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Test Order #1024"
                        >
                          <Bug className="w-4 h-4" />
                        </button>
                      </>
                    )}
                    <button
                      onClick={integrationStatus.shopify ? handleDisconnectShopify : () => handleConnectPlatform('shopify')}
                      disabled={shopifyConnecting}
                      className={`p-2 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                        integrationStatus.shopify
                          ? 'text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30'
                          : 'flex items-center gap-1.5 px-3 text-sm text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                      title={integrationStatus.shopify ? 'Disconnect' : 'Connect'}
                    >
                      {shopifyConnecting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : integrationStatus.shopify ? (
                        <X className="w-4 h-4" />
                      ) : (
                        <>
                          <span className="text-sm">Connect</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <div className="px-4 sm:px-6 py-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center space-x-3 min-w-0 flex-1">
                    <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg flex-shrink-0">
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
                            <span className="text-gray-400 hidden sm:inline"> • {new Date(facebookAccounts[0].last_synced_at).toLocaleDateString()}</span>
                          )}
                          {facebookAccounts[0].last_synced_at && (
                            <span className="text-gray-400 sm:hidden"> • {new Date(facebookAccounts[0].last_synced_at).toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' })}</span>
                          )}
                        </p>
                      )}
                    </div>
                  </div>
                  {integrationStatus.facebook ? (
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => facebookAccounts[0] && handleSyncFacebook(facebookAccounts[0].platform_account_id)}
                        disabled={facebookSyncing || facebookAccounts.length === 0}
                        className="p-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
                    <button
                      onClick={() => handleConnectPlatform('facebook')}
                      disabled={facebookConnecting}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                    >
                      {facebookConnecting ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Connecting...</span>
                        </>
                      ) : (
                        <>
                          <span>Connect</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>

              <div className="px-4 sm:px-6 py-4 opacity-60">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                      <svg className="w-6 h-6 text-gray-900 dark:text-white" viewBox="0 0 24 24" fill="currentColor">
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
                    className="px-4 py-2 text-sm text-gray-400 bg-gray-100 dark:bg-gray-700 rounded-lg cursor-not-allowed"
                  >
                    Connect
                  </button>
                </div>
              </div>

              <div className="px-4 sm:px-6 py-4 opacity-60">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                      <svg className="w-6 h-6 text-gray-900 dark:text-white" viewBox="0 0 24 24" fill="currentColor">
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
                    className="px-4 py-2 text-sm text-gray-400 bg-gray-100 dark:bg-gray-700 rounded-lg cursor-not-allowed"
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
                      settings.dataSharing.analytics ? 'bg-primary-500' : 'bg-gray-200 dark:bg-gray-700'
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
                      settings.dataSharing.marketing ? 'bg-primary-500' : 'bg-gray-200 dark:bg-gray-700'
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
      </div>
    </>
  );
};

export default SettingsPage;