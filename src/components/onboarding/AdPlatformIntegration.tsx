import React, { useState, useEffect, useCallback } from 'react';
import {
  Facebook,
  Loader2,
  X,
} from 'lucide-react';
import { facebookAdsService } from '@/lib/facebookAds';
import { toast } from 'sonner';
import { FacebookSyncOrchestrator } from '@/lib/facebookSyncOrchestrator';
import { SyncProgressModal } from '@/components/analytics/SyncProgressModal';
import { useAuth } from '@/contexts/AuthContext';

interface AdPlatformIntegrationProps {
  onPlatformsConnected: (platforms: string[]) => void;
}

const AdPlatformIntegration: React.FC<AdPlatformIntegrationProps> = ({ onPlatformsConnected }) => {
  const { user } = useAuth();
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [currentSyncJobId, setCurrentSyncJobId] = useState<string | null>(null);
  const [platforms, setPlatforms] = useState([
    {
      id: 'facebook',
      name: 'Facebook',
      icon: <Facebook className="w-5 h-5" />,
      color: 'bg-[#1877F2]',
      status: 'idle',
      comingSoon: false
    },
    {
      id: 'google',
      name: 'Google Ads',
      icon: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M22.54 11.23c0-.8-.07-1.57-.19-2.31H12v4.51h5.92c-.26 1.57-1.04 2.91-2.21 3.82v3.18h3.57c2.08-1.92 3.28-4.74 3.28-8.2z" fill="#4285F4"/>
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
      </svg>,
      color: 'bg-white',
      status: 'idle',
      comingSoon: true
    },
    {
      id: 'tiktok',
      name: 'TikTok',
      icon: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
      </svg>,
      color: 'bg-black',
      status: 'idle',
      comingSoon: true
    }
  ]);

  // Memoize the function that updates connected platforms
  const updateConnectedPlatforms = useCallback(() => {
    const connectedPlatforms = platforms
      .filter(p => p.status === 'connected')
      .map(p => p.id);
    
    onPlatformsConnected(connectedPlatforms);
  }, [platforms, onPlatformsConnected]);
  
  // Update parent component when platforms change
  useEffect(() => {
    updateConnectedPlatforms();
  }, [updateConnectedPlatforms]);

  // Check existing Facebook connection on mount
  useEffect(() => {
    const checkExistingConnection = async () => {
      try {
        const { connected } = await facebookAdsService.checkConnectionStatus();
        if (connected) {
          setPlatforms(prev =>
            prev.map(p =>
              p.id === 'facebook'
                ? { ...p, status: 'connected' }
                : p
            )
          );
        }
      } catch (error) {
        console.error('Error checking Facebook connection:', error);
      }
    };

    checkExistingConnection();
  }, []);

  // Listen for OAuth callback messages from popup
  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      console.log('[AdPlatformIntegration] Received postMessage:', event.data);

      if (event.data?.type === 'facebook-oauth-success') {
        console.log('[AdPlatformIntegration] Facebook OAuth success');
        handleFacebookSuccess(event.data.accountCount || 0);
      } else if (event.data?.type === 'facebook-oauth-error') {
        console.log('[AdPlatformIntegration] Facebook OAuth error:', event.data.error);
        setPlatforms(prev =>
          prev.map(p =>
            p.id === 'facebook'
              ? { ...p, status: 'error' }
              : p
          )
        );
        toast.error(event.data.error || 'Failed to connect Facebook Ads');
      }
    };

    window.addEventListener('message', handleMessage);

    // Also check localStorage for success (in case postMessage fails)
    const checkLocalStorage = setInterval(() => {
      const successData = localStorage.getItem('facebook_oauth_success');
      if (successData) {
        try {
          const parsed = JSON.parse(successData);
          // Only process if recent (within last 10 seconds)
          if (Date.now() - parsed.timestamp < 10000) {
            console.log('[AdPlatformIntegration] Detected success in localStorage');
            handleFacebookSuccess(parsed.accountCount || 0);
          }
          localStorage.removeItem('facebook_oauth_success');
        } catch (e) {
          console.error('Error parsing localStorage:', e);
        }
      }
    }, 500);

    return () => {
      window.removeEventListener('message', handleMessage);
      clearInterval(checkLocalStorage);
    };
  }, []);

  // Helper function to handle Facebook connection success
  const handleFacebookSuccess = async (accountCount: number) => {
    setPlatforms(prev =>
      prev.map(p =>
        p.id === 'facebook'
          ? { ...p, status: 'connected' }
          : p
      )
    );

    const plural = accountCount === 1 ? 'account' : 'accounts';
    toast.success(`Successfully connected ${accountCount} Facebook ad ${plural}`);

    // Start Phase 1 sync (recent 90 days) with progress modal
    setTimeout(async () => {
      try {
        if (!user) {
          throw new Error('User not authenticated');
        }

        const { accounts } = await facebookAdsService.checkConnectionStatus();
        if (accounts.length > 0) {
          // For now, sync the first account (we can add multi-account support later)
          const account = accounts[0];

          toast.info('Starting data sync...');

          // Start Phase 1 sync
          const syncJobId = await FacebookSyncOrchestrator.startPhase1Sync({
            userId: user.id,
            adAccountId: account.id,
            syncType: 'initial',
          });

          // Show sync progress modal
          setCurrentSyncJobId(syncJobId);
          setShowSyncModal(true);
        }
      } catch (error) {
        console.error('Error starting sync after connection:', error);
        toast.error('Connected but sync failed. You can manually sync in Settings.');
      }
    }, 2000);
  };

  const handleConnectPlatform = async (platformId: string) => {
    // Check if platform is coming soon
    const platform = platforms.find(p => p.id === platformId);
    if (platform?.comingSoon) {
      toast.info(`${platform.name} integration is coming soon!`);
      return;
    }

    setPlatforms(prev =>
      prev.map(p =>
        p.id === platformId
          ? { ...p, status: 'connecting' }
          : p
      )
    );

    if (platformId === 'facebook') {
      try {
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
            // Check localStorage for connection result
            setTimeout(async () => {
              const successData = localStorage.getItem('facebook_oauth_success');
              if (successData) {
                // Already handled by localStorage polling
                return;
              }

              // Fallback: check database directly
              const { connected } = await facebookAdsService.checkConnectionStatus();
              if (connected) {
                setPlatforms(prev =>
                  prev.map(p =>
                    p.id === platformId
                      ? { ...p, status: 'connected' }
                      : p
                  )
                );
                toast.success('Facebook Ads connected successfully');
              } else {
                // Reset to idle if not connected
                setPlatforms(prev =>
                  prev.map(p =>
                    p.id === platformId
                      ? { ...p, status: 'idle' }
                      : p
                  )
                );
              }
            }, 1500);
          }
        }, 500);

      } catch (error) {
        console.error('Error connecting Facebook:', error);
        toast.error(error instanceof Error ? error.message : 'Failed to connect Facebook Ads');
        setPlatforms(prev =>
          prev.map(p =>
            p.id === platformId
              ? { ...p, status: 'error' }
              : p
          )
        );
      }
    } else {
      const width = 800;
      const height = 600;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;

      window.open(
        'about:blank',
        `${platformId}-oauth`,
        `width=${width},height=${height},left=${left},top=${top}`
      );

      setTimeout(() => {
        setPlatforms(prev =>
          prev.map(p =>
            p.id === platformId
              ? { ...p, status: 'connected' }
              : p
          )
        );
      }, 2000);
    }
  };
  
  const handleDisconnectPlatform = (platformId: string) => {
    setPlatforms(prev => 
      prev.map(p => 
        p.id === platformId 
          ? { ...p, status: 'idle' } 
          : p
      )
    );
  };

  return (
    <>
      <div className="max-w-[540px] mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-24 w-24 mb-4">
            <img
              src="https://iipaykvimkbbnoobtpzz.supabase.co/storage/v1/object/public/public-bucket/Revoa%20Transparent%20Icon.png"
              alt="Revoa Ad Platform Sync"
              className="w-full h-full object-contain dark:invert dark:brightness-0 dark:contrast-200"
            />
          </div>
          <h2 className="text-3xl font-medium text-gray-900 dark:text-white mb-3">Connect Your Ad Platforms</h2>
          <p className="mt-1 text-gray-600 dark:text-gray-400 max-w-md mx-auto">
            Connect your advertising accounts to import your campaigns, ad sets, and performance data.
          </p>
        </div>
        
        <div className="space-y-3 mt-6">
          {platforms.map((platform) => (
            <div 
              key={platform.id} 
              className={`border rounded-lg overflow-hidden transition-all duration-200 ${
                platform.status === 'connected'
                  ? 'border-gray-900 dark:border-gray-600 bg-gray-50/50 dark:bg-gray-900/50'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center">
                  <div className={`w-10 h-10 rounded-lg ${platform.color} text-white flex items-center justify-center`}>
                    {platform.icon}
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white">{platform.name}</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {platform.status === 'idle' && (platform.comingSoon ? 'Coming soon' : 'Not connected')}
                      {platform.status === 'connecting' && 'Connecting...'}
                      {platform.status === 'connected' && 'Connected'}
                      {platform.status === 'error' && 'Connection error'}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center">
                  {platform.status === 'idle' && (
                    <button
                      onClick={() => handleConnectPlatform(platform.id)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                        platform.comingSoon
                          ? 'text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 cursor-default'
                          : 'text-white bg-gray-900 dark:bg-gray-700 hover:bg-gray-800 dark:hover:bg-gray-600 focus:ring-gray-500'
                      }`}
                    >
                      {platform.comingSoon ? 'Coming Soon' : 'Connect'}
                    </button>
                  )}
                  
                  {platform.status === 'connecting' && (
                    <Loader2 className="w-5 h-5 text-gray-600 dark:text-gray-400 animate-spin" />
                  )}
                  
                  {platform.status === 'connected' && (
                    <button
                      onClick={() => handleDisconnectPlatform(platform.id)}
                      className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                  
                  {platform.status === 'error' && (
                    <button
                      onClick={() => handleConnectPlatform(platform.id)}
                      className="px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                    >
                      Retry
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-medium text-gray-900 dark:text-white">Connected Platforms</h3>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                You can add more platforms later from your account settings.
              </p>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-xs bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
              {platforms.filter(p => p.status === 'connected').length} of {platforms.length}
            </span>
          </div>
        </div>
      </div>
      </div>

      {/* Sync Progress Modal */}
      {showSyncModal && currentSyncJobId && (
        <SyncProgressModal
          isOpen={showSyncModal}
          syncJobId={currentSyncJobId}
          onComplete={() => {
            setShowSyncModal(false);
            toast.success('Your recent data is ready! Historical data is syncing in the background.');
          }}
          onError={(error) => {
            setShowSyncModal(false);
            toast.error(`Sync error: ${error}`);
          }}
        />
      )}
    </>
  );
};

export default AdPlatformIntegration;