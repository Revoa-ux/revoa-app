import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, RefreshCw, Unlink, Loader2, ExternalLink } from 'lucide-react';
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
  const [syncing, setSyncing] = useState<{ [key: string]: boolean }>({});

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
    }
  };

  const handleSyncStore = async () => {
    if (!store) return;

    try {
      setSyncing({ ...syncing, store: true });
      toast.info('Syncing store data...');

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
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
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

      {/* Shopify Store */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-4 flex-1">
              <div className="flex-shrink-0">
                <svg className="w-10 h-10 text-gray-700 dark:text-gray-300" viewBox="0 0 448 512" fill="currentColor">
                  <path d="M388.32,104.1a4.66,4.66,0,0,0-4.4-4c-2,0-37.23-.8-37.23-.8s-21.61-20.82-29.62-28.83V503.2L442.76,472S388.72,106.5,388.32,104.1ZM288.65,70.47a116.67,116.67,0,0,0-7.21-17.61C271,32.85,255.42,22,237,22a15,15,0,0,0-4,.4c-.4-.8-1.2-1.2-1.6-2C223.4,11.63,213,7.63,200.58,8c-24,.8-48,18-67.25,48.83-13.61,21.62-24,48.84-26.82,70.06-27.62,8.4-46.83,14.41-47.23,14.81-14,4.4-14.41,4.8-16,18-1.2,10-38,291.82-38,291.82L307.86,504V65.67a41.66,41.66,0,0,0-4.4.4S297.86,67.67,288.65,70.47ZM233.41,87.69c-16,4.8-33.63,10.4-50.84,15.61,4.8-18.82,14.41-37.63,25.62-50,4.4-4.4,10.41-9.61,17.21-12.81C232.21,54.86,233.81,74.48,233.41,87.69ZM200.58,24.44A27.49,27.49,0,0,1,215,28c-6.4,3.2-12.81,8.41-18.81,14.41-15.21,16.42-26.82,42-31.62,66.45-14.42,4.41-28.83,8.81-42,12.81C131.33,83.28,163.75,25.24,200.58,24.44ZM154.15,244.61c1.6,25.61,69.25,31.22,73.25,91.66,2.8,47.64-25.22,80.06-65.65,82.47-48.83,3.2-75.65-25.62-75.65-25.62l10.4-44s26.82,20.42,48.44,18.82c14-.8,19.22-12.41,18.81-20.42-2-33.62-57.24-31.62-60.84-86.86-3.2-46.44,27.22-93.27,94.47-97.68,26-1.6,39.23,4.81,39.23,4.81L221.4,225.39s-17.21-8-37.63-6.4C154.15,221,153.75,239.8,154.15,244.61ZM249.42,82.88c0-12-1.6-29.22-7.21-43.63,18.42,3.6,27.22,24,31.23,36.43Q262.63,78.68,249.42,82.88Z"/>
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-1">
                  <h3 className="text-base font-medium text-gray-900 dark:text-white">Shopify</h3>
                  {store && <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />}
                </div>
                {store ? (
                  <div className="space-y-1">
                    <p className="text-sm text-gray-900 dark:text-white font-medium">{store.store_url}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Connected {new Date(store.connected_at).toLocaleDateString()} • Last synced {formatDate(store.last_synced_at)}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Connect your Shopify store to sync orders and products
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-2 ml-4">
              {store ? (
                <>
                  <button
                    onClick={handleSyncStore}
                    disabled={syncing.store}
                    className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${syncing.store ? 'animate-spin' : ''}`} />
                    Sync
                  </button>
                  <button
                    onClick={handleDisconnectShopify}
                    className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-red-700 dark:text-red-400 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    <Unlink className="w-3.5 h-3.5 mr-1.5" />
                    Disconnect
                  </button>
                </>
              ) : (
                <button
                  onClick={handleConnectShopify}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
                >
                  Connect
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Ad Platforms Section */}
      {store && (
        <>
          <div className="pt-2">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Ad Platforms</h2>
          </div>

          {/* Facebook Ads */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4 flex-1">
                  <div className="flex-shrink-0">
                    <svg className="w-10 h-10 text-[#1877F2]" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <h3 className="text-base font-medium text-gray-900 dark:text-white">Facebook Ads</h3>
                      {facebookAccount && <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />}
                    </div>
                    {facebookAccount ? (
                      <div className="space-y-1">
                        <p className="text-sm text-gray-900 dark:text-white font-medium">
                          {facebookAccount.name || 'Facebook Ad Account'}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          ID: {facebookAccount.platform_account_id} • Last synced {formatDate(facebookAccount.last_synced_at)}
                        </p>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Connect to track ad spend and campaign performance
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2 ml-4">
                  {facebookAccount ? (
                    <>
                      <button
                        onClick={() => handleSyncAdAccount(facebookAccount.id, 'Facebook')}
                        disabled={syncing[facebookAccount.id]}
                        className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${syncing[facebookAccount.id] ? 'animate-spin' : ''}`} />
                        Sync
                      </button>
                      <button
                        onClick={() => handleDisconnectAdAccount(facebookAccount.id, 'Facebook')}
                        className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-red-700 dark:text-red-400 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      >
                        <Unlink className="w-3.5 h-3.5 mr-1.5" />
                        Disconnect
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={handleConnectFacebook}
                      className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
                    >
                      Connect
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Google Ads - Coming Soon */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 opacity-60">
            <div className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4 flex-1">
                  <div className="flex-shrink-0">
                    <svg className="w-10 h-10" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <h3 className="text-base font-medium text-gray-900 dark:text-white">Google Ads</h3>
                      <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded">
                        Coming Soon
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Track Google Ads spend and performance
                    </p>
                  </div>
                </div>
                <button
                  disabled
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-400 bg-gray-100 dark:bg-gray-700 rounded-md cursor-not-allowed"
                >
                  Connect
                </button>
              </div>
            </div>
          </div>

          {/* TikTok Ads - Coming Soon */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 opacity-60">
            <div className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4 flex-1">
                  <div className="flex-shrink-0">
                    <svg className="w-10 h-10 text-gray-700 dark:text-gray-300" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z"/>
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <h3 className="text-base font-medium text-gray-900 dark:text-white">TikTok Ads</h3>
                      <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded">
                        Coming Soon
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Monitor TikTok ad campaigns
                    </p>
                  </div>
                </div>
                <button
                  disabled
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-400 bg-gray-100 dark:bg-gray-700 rounded-md cursor-not-allowed"
                >
                  Connect
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Info message when no store connected */}
      {!store && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-blue-900 dark:text-blue-200">
                Connect your Shopify store to start integrating advertising platforms and tracking performance.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
