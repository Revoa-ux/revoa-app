import { create } from 'zustand';
import { supabase } from './supabase';
import { getActiveShopifyInstallation, subscribeToShopifyStatus, type ShopifyInstallation } from './shopify/status';
import { facebookAdsService } from './facebookAds';
import { tiktokAdsService } from './tiktokAds';
import { googleAdsService } from './googleAds';
import type { AdAccount } from '../types/ads';

interface ConnectionState {
  shopify: {
    isConnected: boolean;
    installation: ShopifyInstallation | null;
    loading: boolean;
  };
  facebook: {
    isConnected: boolean;
    accounts: AdAccount[];
    adAccounts: AdAccount[]; // Alias for backwards compatibility
    loading: boolean;
  };
  tiktok: {
    isConnected: boolean;
    accounts: AdAccount[];
    loading: boolean;
  };
  google: {
    isConnected: boolean;
    accounts: AdAccount[];
    loading: boolean;
  };
  initialized: boolean;

  initializeShopify: (userId: string) => Promise<void>;
  initializeFacebook: (userId: string) => Promise<void>;
  initializeTikTok: (userId: string) => Promise<void>;
  initializeGoogle: (userId: string) => Promise<void>;
  subscribeToShopifyChanges: (userId: string) => () => void;
  refreshShopifyStatus: () => Promise<void>;
  refreshFacebookAccounts: () => Promise<void>;
  refreshTikTokAccounts: () => Promise<void>;
  refreshGoogleAccounts: () => Promise<void>;
  reset: () => void;
}

export const useConnectionStore = create<ConnectionState>((set, get) => ({
  shopify: {
    isConnected: false,
    installation: null,
    loading: true,
  },
  facebook: {
    isConnected: false,
    accounts: [],
    adAccounts: [], // Alias for backwards compatibility
    loading: true,
  },
  tiktok: {
    isConnected: false,
    accounts: [],
    loading: true,
  },
  google: {
    isConnected: false,
    accounts: [],
    loading: true,
  },
  initialized: false,

  initializeShopify: async (userId: string) => {
    set(state => ({
      shopify: { ...state.shopify, loading: true }
    }));

    try {
      const { data: allInstallations } = await supabase
        .from('shopify_installations')
        .select('id, store_url, status, uninstalled_at, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      const installation = await getActiveShopifyInstallation(userId);

      set({
        shopify: {
          isConnected: installation !== null,
          installation,
          loading: false,
        },
      });
    } catch (error) {
      set({
        shopify: {
          isConnected: false,
          installation: null,
          loading: false,
        },
      });
    }
  },

  initializeFacebook: async (userId: string) => {
    set(state => ({
      facebook: { ...state.facebook, loading: true }
    }));

    try {
      const result = await facebookAdsService.checkConnectionStatus();
      set({
        facebook: {
          isConnected: result.connected,
          accounts: result.accounts,
          adAccounts: result.accounts,
          loading: false,
        },
      });
    } catch (error) {
      set({
        facebook: {
          isConnected: false,
          accounts: [],
          adAccounts: [],
          loading: false,
        },
      });
    }
  },

  initializeTikTok: async (userId: string) => {
    set(state => ({
      tiktok: { ...state.tiktok, loading: true }
    }));

    try {
      const accounts = await tiktokAdsService.getAdAccounts();
      set({
        tiktok: {
          isConnected: accounts.length > 0,
          accounts,
          loading: false,
        },
      });
    } catch (error) {
      set({
        tiktok: {
          isConnected: false,
          accounts: [],
          loading: false,
        },
      });
    }
  },

  initializeGoogle: async (userId: string) => {
    set(state => ({
      google: { ...state.google, loading: true }
    }));

    try {
      const accounts = await googleAdsService.getAdAccounts();
      set({
        google: {
          isConnected: accounts.length > 0,
          accounts,
          loading: false,
        },
      });
    } catch (error) {
      set({
        google: {
          isConnected: false,
          accounts: [],
          loading: false,
        },
      });
    }
  },

  subscribeToShopifyChanges: (userId: string) => {
    return subscribeToShopifyStatus(userId, (isConnected, installation) => {
      set({
        shopify: {
          isConnected,
          installation,
          loading: false,
        },
      });
    });
  },

  refreshShopifyStatus: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return;
    }
    set(state => ({
      shopify: { ...state.shopify, loading: true }
    }));

    try {
      const installation = await getActiveShopifyInstallation(user.id);
      const isConnected = installation !== null;

      set({
        shopify: {
          isConnected,
          installation,
          loading: false,
        },
      });

      return { success: true, isConnected, installation };
    } catch (error) {
      set(state => ({
        shopify: { ...state.shopify, loading: false }
      }));
      throw error;
    }
  },

  refreshFacebookAccounts: async () => {
    set(state => ({
      facebook: { ...state.facebook, loading: true }
    }));

    try {
      const result = await facebookAdsService.checkConnectionStatus();
      set({
        facebook: {
          isConnected: result.connected,
          accounts: result.accounts,
          adAccounts: result.accounts,
          loading: false,
        },
      });
    } catch (error) {
      set(state => ({
        facebook: { ...state.facebook, loading: false }
      }));
    }
  },

  refreshTikTokAccounts: async () => {
    set(state => ({
      tiktok: { ...state.tiktok, loading: true }
    }));

    try {
      const accounts = await tiktokAdsService.getAdAccounts();
      set({
        tiktok: {
          isConnected: accounts.length > 0,
          accounts,
          loading: false,
        },
      });
    } catch (error) {
      set(state => ({
        tiktok: { ...state.tiktok, loading: false }
      }));
    }
  },

  refreshGoogleAccounts: async () => {
    set(state => ({
      google: { ...state.google, loading: true }
    }));

    try {
      const accounts = await googleAdsService.getAdAccounts();
      set({
        google: {
          isConnected: accounts.length > 0,
          accounts,
          loading: false,
        },
      });
    } catch (error) {
      set(state => ({
        google: { ...state.google, loading: false }
      }));
    }
  },

  reset: () => {
    set({
      shopify: {
        isConnected: false,
        installation: null,
        loading: true,
      },
      facebook: {
        isConnected: false,
        accounts: [],
        adAccounts: [],
        loading: true,
      },
      tiktok: {
        isConnected: false,
        accounts: [],
        loading: true,
      },
      google: {
        isConnected: false,
        accounts: [],
        loading: true,
      },
      initialized: false,
    });
  },
}));

export const initializeConnections = async (userId: string) => {
  const store = useConnectionStore.getState();

  if (!userId) {
    return;
  }

  await Promise.all([
    store.initializeShopify(userId),
    store.initializeFacebook(userId),
    store.initializeTikTok(userId),
    store.initializeGoogle(userId),
  ]);

  const unsubscribe = store.subscribeToShopifyChanges(userId);

  useConnectionStore.setState({ initialized: true });

  return unsubscribe;
};
