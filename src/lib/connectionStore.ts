import { create } from 'zustand';
import { supabase } from './supabase';
import { getActiveShopifyInstallation, subscribeToShopifyStatus, type ShopifyInstallation } from './shopify/status';
import { facebookAdsService } from './facebookAds';
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
    loading: boolean;
  };
  initialized: boolean;

  initializeShopify: (userId: string) => Promise<void>;
  initializeFacebook: (userId: string) => Promise<void>;
  subscribeToShopifyChanges: (userId: string) => () => void;
  refreshShopifyStatus: () => Promise<void>;
  refreshFacebookAccounts: () => Promise<void>;
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
    loading: true,
  },
  initialized: false,

  initializeShopify: async (userId: string) => {
    console.log('[ConnectionStore] ===== SHOPIFY INIT START =====');
    console.log('[ConnectionStore] Initializing Shopify for user:', userId);
    set(state => ({
      shopify: { ...state.shopify, loading: true }
    }));

    try {
      // DEBUG: Check what installations exist
      const { data: allInstallations } = await supabase
        .from('shopify_installations')
        .select('id, store_url, status, uninstalled_at, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      console.log('[ConnectionStore] ALL installations found:', allInstallations);

      // Try to get active installation
      const installation = await getActiveShopifyInstallation(userId);
      console.log('[ConnectionStore] Active installation:', installation);

      // If no active but we have recent installations, log the problem
      if (!installation && allInstallations && allInstallations.length > 0) {
        const recent = allInstallations[0];
        console.error('[ConnectionStore] ⚠️  FOUND SHOPIFY INSTALLATION BUT IT\'S NOT ACTIVE!');
        console.error('[ConnectionStore] Store:', recent.store_url);
        console.error('[ConnectionStore] Status:', recent.status);
        console.error('[ConnectionStore] Uninstalled at:', recent.uninstalled_at);
        console.error('[ConnectionStore] Problem: uninstalled_at should be NULL for active stores');
      }

      set({
        shopify: {
          isConnected: installation !== null,
          installation,
          loading: false,
        },
      });
      console.log('[ConnectionStore] ===== SHOPIFY INIT DONE ===== isConnected:', installation !== null);
    } catch (error) {
      console.error('[ConnectionStore] Error initializing Shopify:', error);
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
    console.log('[ConnectionStore] Initializing Facebook connection for user:', userId);
    set(state => ({
      facebook: { ...state.facebook, loading: true }
    }));

    try {
      const result = await facebookAdsService.checkConnectionStatus();
      console.log('[ConnectionStore] Facebook connection status:', result);

      set({
        facebook: {
          isConnected: result.connected,
          accounts: result.accounts,
          loading: false,
        },
      });
    } catch (error) {
      console.error('[ConnectionStore] Error initializing Facebook:', error);
      set({
        facebook: {
          isConnected: false,
          accounts: [],
          loading: false,
        },
      });
    }
  },

  subscribeToShopifyChanges: (userId: string) => {
    console.log('[ConnectionStore] Setting up Shopify real-time subscription');

    return subscribeToShopifyStatus(userId, (isConnected, installation) => {
      console.log('[ConnectionStore] Shopify status changed:', { isConnected, installation });
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
    console.log('[ConnectionStore] Refreshing Shopify status');

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('[ConnectionStore] No user found for Shopify refresh');
      return;
    }

    set(state => ({
      shopify: { ...state.shopify, loading: true }
    }));

    try {
      const installation = await getActiveShopifyInstallation(user.id);
      set({
        shopify: {
          isConnected: installation !== null,
          installation,
          loading: false,
        },
      });
      console.log('[ConnectionStore] Shopify status refreshed:', { isConnected: installation !== null });
    } catch (error) {
      console.error('[ConnectionStore] Error refreshing Shopify status:', error);
      set(state => ({
        shopify: { ...state.shopify, loading: false }
      }));
    }
  },

  refreshFacebookAccounts: async () => {
    console.log('[ConnectionStore] Refreshing Facebook accounts');
    set(state => ({
      facebook: { ...state.facebook, loading: true }
    }));

    try {
      const result = await facebookAdsService.checkConnectionStatus();
      set({
        facebook: {
          isConnected: result.connected,
          accounts: result.accounts,
          loading: false,
        },
      });
    } catch (error) {
      console.error('[ConnectionStore] Error refreshing Facebook accounts:', error);
      set(state => ({
        facebook: { ...state.facebook, loading: false }
      }));
    }
  },

  reset: () => {
    console.log('[ConnectionStore] Resetting connection state');
    set({
      shopify: {
        isConnected: false,
        installation: null,
        loading: true,
      },
      facebook: {
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
    console.warn('[ConnectionStore] Cannot initialize without userId');
    return;
  }

  console.log('[ConnectionStore] Initializing all connections for user:', userId);

  await Promise.all([
    store.initializeShopify(userId),
    store.initializeFacebook(userId),
  ]);

  const unsubscribe = store.subscribeToShopifyChanges(userId);

  useConnectionStore.setState({ initialized: true });

  return unsubscribe;
};
