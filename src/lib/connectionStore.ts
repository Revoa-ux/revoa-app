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
    adAccounts: AdAccount[]; // Alias for backwards compatibility
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
    adAccounts: [], // Alias for backwards compatibility
    loading: true,
  },
  initialized: false,

  initializeShopify: async (userId: string) => {    set(state => ({
      shopify: { ...state.shopify, loading: true }
    }));

    try {
      // DEBUG: Check what installations exist
      const { data: allInstallations } = await supabase
        .from('shopify_installations')
        .select('id, store_url, status, uninstalled_at, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      // Try to get active installation
      const installation = await getActiveShopifyInstallation(userId);
      // If no active but we have recent installations, log the problem
      if (!installation && allInstallations && allInstallations.length > 0) {
        const recent = allInstallations[0];      }

      set({
        shopify: {
          isConnected: installation !== null,
          installation,
          loading: false,
        },
      });    } catch (error) {      set({
        shopify: {
          isConnected: false,
          installation: null,
          loading: false,
        },
      });
    }
  },

  initializeFacebook: async (userId: string) => {    set(state => ({
      facebook: { ...state.facebook, loading: true }
    }));

    try {
      const result = await facebookAdsService.checkConnectionStatus();
      set({
        facebook: {
          isConnected: result.connected,
          accounts: result.accounts,
          adAccounts: result.accounts, // Alias for backwards compatibility
          loading: false,
        },
      });
    } catch (error) {      set({
        facebook: {
          isConnected: false,
          accounts: [],
          adAccounts: [], // Alias for backwards compatibility
          loading: false,
        },
      });
    }
  },

  subscribeToShopifyChanges: (userId: string) => {
    return subscribeToShopifyStatus(userId, (isConnected, installation) => {      set({
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
    if (!user) {      return;
    }
    set(state => ({
      shopify: { ...state.shopify, loading: true }
    }));

    try {      const installation = await getActiveShopifyInstallation(user.id);
      const isConnected = installation !== null;

      // Update the store state - this will automatically notify all subscribers
      set({
        shopify: {
          isConnected,
          installation,
          loading: false,
        },
      });
      // Verify the state was actually set and log subscriber notification
      const currentState = useConnectionStore.getState();
      return { success: true, isConnected, installation };
    } catch (error) {      set(state => ({
        shopify: { ...state.shopify, loading: false }
      }));
      throw error;
    }
  },

  refreshFacebookAccounts: async () => {    set(state => ({
      facebook: { ...state.facebook, loading: true }
    }));

    try {
      const result = await facebookAdsService.checkConnectionStatus();
      set({
        facebook: {
          isConnected: result.connected,
          accounts: result.accounts,
          adAccounts: result.accounts, // Alias for backwards compatibility
          loading: false,
        },
      });
    } catch (error) {      set(state => ({
        facebook: { ...state.facebook, loading: false }
      }));
    }
  },

  reset: () => {    set({
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
      initialized: false,
    });
  },
}));

export const initializeConnections = async (userId: string) => {
  const store = useConnectionStore.getState();

  if (!userId) {    return;
  }
  await Promise.all([
    store.initializeShopify(userId),
    store.initializeFacebook(userId),
  ]);

  const unsubscribe = store.subscribeToShopifyChanges(userId);

  useConnectionStore.setState({ initialized: true });

  return unsubscribe;
};
