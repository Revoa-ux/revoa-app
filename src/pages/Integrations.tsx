import React, { useState, useEffect } from 'react';
import { AlertCircle, Loader2, Facebook } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { facebookAdsService } from '../lib/facebookAds';
import { toast } from 'sonner';

interface StoreData {
  id: string;
  store_url: string;
  store_name: string | null;
  status: string;
  connected_at: string;
  last_synced_at: string | null;
}

interface AdAccountData {
  id: string;
  platform: string;
  name: string | null;
  platform_account_id: string;
  status: string;
  last_synced_at: string | null;
}

export default function Integrations() {
  const [store, setStore] = useState<StoreData | null>(null);
  const [adAccounts, setAdAccounts] = useState<AdAccountData[]>([]);
  const [loading, setLoading] = useState(true);
  const [shopifyConnecting, setShopifyConnecting] = useState(false);
  const [facebookConnecting, setFacebookConnecting] = useState(false);
  const [facebookSyncing, setFacebookSyncing] = useState(false);

  useEffect(() => {
    loadIntegrations();
  }, []);

  const loadIntegrations = async () => {
    try {
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: storeData, error: storeError } = await supabase
        .from('stores')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .maybeSingle();

      if (storeError) throw storeError;
      setStore(storeData);

      if (storeData) {
        const { data: accountsData, error: accountsError } = await supabase
          .from('ad_accounts')
          .select('*')
          .eq('store_id', storeData.id)
          .eq('status', 'active')
          .order('created_at', { ascending: false });

        if (accountsError) throw accountsError;
        setAdAccounts(accountsData || []);
      }
    } catch (error) {
      console.error('Error loading integrations:', error);
      toast.error('Failed to load integrations');
    } finally {
      setLoading(false);
    }
  };

  const handleConnectShopify = () => {
    window.location.href = '/shopify-setup';
  };

  const handleDisconnectShopify = async () => {
    if (!store || !confirm('Are you sure you want to disconnect your Shopify store? This will also disconnect all linked ad accounts.')) {
      return;
    }

    try {
      setShopifyConnecting(true);
      const { error } = await supabase
        .from('stores')
        .update({ status: 'disconnected' })
        .eq('id', store.id);

      if (error) throw error;

      toast.success('Shopify store disconnected');
      await loadIntegrations();
    } catch (error) {
      console.error('Error disconnecting store:', error);
      toast.error('Failed to disconnect store');
    } finally {
      setShopifyConnecting(false);
    }
  };

  const handleConnectFacebook = async () => {
    try {
      if (!store) {
        toast.error('Please connect a Shopify store first');
        return;
      }

      setFacebookConnecting(true);
      const authUrl = await facebookAdsService.connectFacebookAds();
      window.location.href = authUrl;
    } catch (error) {
      console.error('Error connecting Facebook:', error);
      toast.error('Failed to initiate Facebook connection');
      setFacebookConnecting(false);
    }
  };

  const handleSyncFacebook = async (accountId: string) => {
    try {
      setFacebookSyncing(true);
      toast.info('Syncing Facebook ads...');

      const result = await facebookAdsService.syncAdData([accountId]);

      if (result.success) {
        toast.success(`Synced ${result.stats?.campaigns || 0} campaigns`);
      } else {
        throw new Error(result.error || 'Sync failed');
      }

      await loadIntegrations();
    } catch (error) {
      console.error('Error syncing Facebook:', error);
      toast.error('Failed to sync Facebook ads');
    } finally {
      setFacebookSyncing(false);
    }
  };

  const handleDisconnectFacebook = async (accountId: string) => {
    if (!confirm('Are you sure you want to disconnect this Facebook account?')) {
      return;
    }

    try {
      setFacebookConnecting(true);
      await facebookAdsService.disconnectAdAccount(accountId);
      toast.success('Facebook account disconnected');
      await loadIntegrations();
    } catch (error) {
      console.error('Error disconnecting Facebook:', error);
      toast.error('Failed to disconnect Facebook account');
    } finally {
      setFacebookConnecting(false);
    }
  };

  const facebookAccount = adAccounts.find(acc => acc.platform === 'facebook');

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">Integrations</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Connect your store and advertising platforms
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {/* Shopify */}
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-900/20 dark:to-emerald-900/20 flex items-center justify-center flex-shrink-0">
                  <img
                    src="https://iipaykvimkbbnoobtpzz.supabase.co/storage/v1/object/public/public-bucket/shopify%20(1).svg"
                    alt="Shopify"
                    className="w-8 h-8"
                  />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white">Shopify Store</h3>
                  {store && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">{store.store_url}</p>
                  )}
                </div>
              </div>
              <button
                onClick={store ? handleDisconnectShopify : handleConnectShopify}
                disabled={shopifyConnecting}
                className={`px-5 py-2.5 text-sm font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                  store
                    ? 'text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30'
                    : 'text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-sm'
                }`}
              >
                {shopifyConnecting ? 'Loading...' : store ? 'Disconnect' : 'Connect'}
              </button>
            </div>
          </div>

          {/* Facebook Ads */}
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-900/20 dark:to-indigo-900/20 flex items-center justify-center flex-shrink-0">
                  <Facebook className="w-8 h-8 text-[#1877F2]" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white">Facebook Ads</h3>
                  {facebookAccount && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                      {facebookAccount.name || 'Connected'}
                      {facebookAccount.last_synced_at && (
                        <span className="text-gray-400"> • {new Date(facebookAccount.last_synced_at).toLocaleDateString()}</span>
                      )}
                    </p>
                  )}
                </div>
              </div>
              {facebookAccount ? (
                <div className="flex gap-3">
                  <button
                    onClick={() => handleSyncFacebook(facebookAccount.id)}
                    disabled={facebookSyncing}
                    className="px-5 py-2.5 text-sm font-medium text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {facebookSyncing ? 'Syncing...' : 'Sync'}
                  </button>
                  <button
                    onClick={() => handleDisconnectFacebook(facebookAccount.id)}
                    disabled={facebookConnecting}
                    className="px-5 py-2.5 text-sm font-medium text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {facebookConnecting ? 'Loading...' : 'Disconnect'}
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleConnectFacebook}
                  disabled={facebookConnecting || !store}
                  className="px-5 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 rounded-lg transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {facebookConnecting ? 'Connecting...' : 'Connect'}
                </button>
              )}
            </div>
          </div>

          {/* Google Ads */}
          <div className="p-6 opacity-60">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center flex-shrink-0">
                  <svg className="w-8 h-8" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                </div>
                <div>
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white">Google Ads</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">Coming soon</p>
                </div>
              </div>
              <button
                disabled
                className="px-5 py-2.5 text-sm font-medium text-gray-400 bg-gray-100 dark:bg-gray-700 rounded-lg cursor-not-allowed"
              >
                Connect
              </button>
            </div>
          </div>

          {/* TikTok Ads */}
          <div className="p-6 opacity-60">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center flex-shrink-0">
                  <svg className="w-8 h-8 text-gray-700 dark:text-gray-300" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z"/>
                  </svg>
                </div>
                <div>
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white">TikTok Ads</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">Coming soon</p>
                </div>
              </div>
              <button
                disabled
                className="px-5 py-2.5 text-sm font-medium text-gray-400 bg-gray-100 dark:bg-gray-700 rounded-lg cursor-not-allowed"
              >
                Connect
              </button>
            </div>
          </div>
        </div>
      </div>

      {!store && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-blue-900 dark:text-blue-200">
                Connect your Shopify store first to enable advertising platform integrations.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
