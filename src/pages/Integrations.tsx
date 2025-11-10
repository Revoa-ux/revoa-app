import React, { useState, useEffect } from 'react';
import { Store, Facebook, AlertCircle, CheckCircle, RefreshCw, Unlink, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { facebookAdsService } from '../lib/facebookAds';
import { toast } from 'sonner';
import { GlassCard } from '../components/GlassCard';

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
  const [syncing, setSyncing] = useState<{ [key: string]: boolean }>({});

  useEffect(() => {
    loadIntegrations();
  }, []);

  const loadIntegrations = async () => {
    try {
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get user's store
      const { data: storeData, error: storeError } = await supabase
        .from('stores')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .maybeSingle();

      if (storeError) throw storeError;
      setStore(storeData);

      // Get ad accounts linked to this store
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

  const handleSyncStore = async () => {
    if (!store) return;

    try {
      setSyncing({ ...syncing, store: true });
      toast.info('Syncing store data...');

      // Call sync endpoint (to be implemented)
      // For now, just update last_synced_at
      const { error } = await supabase
        .from('stores')
        .update({ last_synced_at: new Date().toISOString() })
        .eq('id', store.id);

      if (error) throw error;

      toast.success('Store synced successfully');
      await loadIntegrations();
    } catch (error) {
      console.error('Error syncing store:', error);
      toast.error('Failed to sync store');
    } finally {
      setSyncing({ ...syncing, store: false });
    }
  };

  const handleSyncAdAccount = async (accountId: string, platform: string) => {
    try {
      setSyncing({ ...syncing, [accountId]: true });
      toast.info(`Syncing ${platform} ads...`);

      if (platform === 'facebook') {
        const result = await facebookAdsService.syncAdData([accountId]);

        if (result.success) {
          toast.success(`Synced ${result.stats?.campaigns || 0} campaigns`);
        } else {
          throw new Error(result.error || 'Sync failed');
        }
      }

      await loadIntegrations();
    } catch (error) {
      console.error('Error syncing ad account:', error);
      toast.error(`Failed to sync ${platform} ads`);
    } finally {
      setSyncing({ ...syncing, [accountId]: false });
    }
  };

  const handleConnectFacebook = async () => {
    try {
      if (!store) {
        toast.error('Please connect a Shopify store first');
        return;
      }

      const authUrl = await facebookAdsService.connectFacebookAds();
      window.location.href = authUrl;
    } catch (error) {
      console.error('Error connecting Facebook:', error);
      toast.error('Failed to initiate Facebook connection');
    }
  };

  const handleDisconnectAdAccount = async (accountId: string, platform: string) => {
    if (!confirm(`Are you sure you want to disconnect this ${platform} account?`)) {
      return;
    }

    try {
      await facebookAdsService.disconnectAdAccount(accountId);
      toast.success(`${platform} account disconnected`);
      await loadIntegrations();
    } catch (error) {
      console.error('Error disconnecting account:', error);
      toast.error(`Failed to disconnect ${platform} account`);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
  };

  const facebookAccount = adAccounts.find(acc => acc.platform === 'facebook');
  const googleAccount = adAccounts.find(acc => acc.platform === 'google');
  const tiktokAccount = adAccounts.find(acc => acc.platform === 'tiktok');

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Integrations</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Connect your store and advertising platforms to track performance
        </p>
      </div>

      {/* Shopify Store Section */}
      <GlassCard className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-4">
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <Store className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-1">
                <h3 className="text-lg font-semibold">Shopify Store</h3>
                {store && (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                )}
              </div>
              {store ? (
                <>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    {store.store_url}
                  </p>
                  <p className="text-xs text-gray-500">
                    Last synced: {formatDate(store.last_synced_at)}
                  </p>
                </>
              ) : (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  No store connected
                </p>
              )}
            </div>
          </div>
          {store && (
            <button
              onClick={handleSyncStore}
              disabled={syncing.store}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${syncing.store ? 'animate-spin' : ''}`} />
              <span>Sync Now</span>
            </button>
          )}
        </div>
      </GlassCard>

      {/* Advertising Platforms Section */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Advertising Platforms</h2>
        <div className="space-y-4">

          {/* Facebook Ads */}
          <GlassCard className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-4">
                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <Facebook className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <h3 className="text-lg font-semibold">Facebook Ads</h3>
                    {facebookAccount && (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    )}
                  </div>
                  {facebookAccount ? (
                    <>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                        {facebookAccount.name || 'Facebook Ad Account'}
                      </p>
                      <p className="text-xs text-gray-500 mb-2">
                        Account ID: {facebookAccount.platform_account_id}
                      </p>
                      <p className="text-xs text-gray-500">
                        Last synced: {formatDate(facebookAccount.last_synced_at)}
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      Connect your Facebook Ads account to track ad spend and performance
                    </p>
                  )}
                </div>
              </div>
              <div className="flex space-x-2">
                {facebookAccount ? (
                  <>
                    <button
                      onClick={() => handleSyncAdAccount(facebookAccount.id, 'facebook')}
                      disabled={syncing[facebookAccount.id]}
                      className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <RefreshCw className={`w-4 h-4 ${syncing[facebookAccount.id] ? 'animate-spin' : ''}`} />
                      <span>Sync</span>
                    </button>
                    <button
                      onClick={() => handleDisconnectAdAccount(facebookAccount.id, 'Facebook')}
                      className="flex items-center space-x-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                    >
                      <Unlink className="w-4 h-4" />
                    </button>
                  </>
                ) : (
                  <button
                    onClick={handleConnectFacebook}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    Connect
                  </button>
                )}
              </div>
            </div>
          </GlassCard>

          {/* Google Ads - Coming Soon */}
          <GlassCard className="p-6 opacity-60">
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-4">
                <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-lg">
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z" className="text-red-600 dark:text-red-400"/>
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <h3 className="text-lg font-semibold">Google Ads</h3>
                    <span className="text-xs px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded-full">
                      Coming Soon
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Track your Google Ads spend and performance
                  </p>
                </div>
              </div>
              <button
                disabled
                className="px-4 py-2 bg-gray-300 dark:bg-gray-700 text-gray-500 rounded-lg cursor-not-allowed"
              >
                Connect
              </button>
            </div>
          </GlassCard>

          {/* TikTok Ads - Coming Soon */}
          <GlassCard className="p-6 opacity-60">
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-4">
                <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z" className="text-gray-600 dark:text-gray-400"/>
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <h3 className="text-lg font-semibold">TikTok Ads</h3>
                    <span className="text-xs px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded-full">
                      Coming Soon
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Monitor your TikTok Ads campaigns
                  </p>
                </div>
              </div>
              <button
                disabled
                className="px-4 py-2 bg-gray-300 dark:bg-gray-700 text-gray-500 rounded-lg cursor-not-allowed"
              >
                Connect
              </button>
            </div>
          </GlassCard>
        </div>
      </div>

      {/* Info Box */}
      {!store && (
        <GlassCard className="p-4 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                Connect your Shopify store to start tracking performance and integrating advertising platforms.
              </p>
            </div>
          </div>
        </GlassCard>
      )}
    </div>
  );
}
