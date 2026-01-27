import React, { useState, useEffect } from 'react';
import { HelpCircle, Link2, ChevronDown, Check, Loader2, ExternalLink } from 'lucide-react';
import { toast } from '../../lib/toast';
import ShopifyFormInput from '@/components/ShopifyFormInput';
import { getShopifyAuthUrl } from '@/lib/shopify/auth';
import { validateStoreUrl } from '@/lib/shopify/validation';
import { supabase } from '@/lib/supabase';
import { getActiveShopifyInstallation } from '@/lib/shopify/status';
import { useConnectionStore } from '@/lib/connectionStore';
import { createPendingInstall, getAppStoreUrl } from '@/lib/shopify/pendingInstalls';
import { useAuth } from '@/contexts/AuthContext';

interface StoreIntegrationProps {
  onStoreConnected: (connected: boolean) => void;
}

const StoreIntegration: React.FC<StoreIntegrationProps> = ({ onStoreConnected }) => {
  const [shopUrl, setShopUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [checkInterval, setCheckInterval] = useState<NodeJS.Timeout | null>(null);
  const [hasError, setHasError] = useState(false);
  const [connectedStoreUrl, setConnectedStoreUrl] = useState<string | null>(null);
  const [wasAlreadyConnected, setWasAlreadyConnected] = useState(false);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [isPolling, setIsPolling] = useState(false);

  const { user } = useAuth();
  const { shopify, refreshShopifyStatus } = useConnectionStore();

  // Check for existing connection on mount
  useEffect(() => {
    const checkExistingConnection = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return;

        const installation = await getActiveShopifyInstallation(session.user.id);
        if (installation) {
          setConnectedStoreUrl(installation.store_url);
          setIsSuccess(true);
          setWasAlreadyConnected(true);
          onStoreConnected(true);
        }
      } catch (error) {
        // Silent fail
      }
    };

    checkExistingConnection();
  }, [onStoreConnected]);

  // Watch for Shopify connection changes from the store
  useEffect(() => {
    if (shopify.isConnected) {
      setIsSuccess(true);

      if (!wasAlreadyConnected) {
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 3000);
      }

      onStoreConnected(true);
      setIsLoading(false);
      setIsPolling(false);

      if (checkInterval) {
        clearInterval(checkInterval);
        setCheckInterval(null);
      }

      if (shopify.installation) {
        setConnectedStoreUrl(shopify.installation.store_url);
      }
    }
  }, [shopify.isConnected, onStoreConnected, wasAlreadyConnected, checkInterval]);

  // Start polling for connection when user returns from App Store
  useEffect(() => {
    if (isPolling && !isSuccess) {
      let pollCount = 0;
      const maxPolls = 10; // Poll for 30 seconds (3s intervals)

      const pollInterval = setInterval(async () => {
        pollCount++;

        try {
          await refreshShopifyStatus();

          if (shopify.isConnected) {
            clearInterval(pollInterval);
            setIsPolling(false);
          } else if (pollCount >= maxPolls) {
            clearInterval(pollInterval);
            setIsPolling(false);
          }
        } catch (error) {
          console.error('Polling error:', error);
        }
      }, 3000);

      return () => clearInterval(pollInterval);
    }
  }, [isPolling, isSuccess, shopify.isConnected, refreshShopifyStatus]);

  // Start polling on mount if user just returned
  useEffect(() => {
    if (!isSuccess && !wasAlreadyConnected) {
      setIsPolling(true);
    }
  }, []);

  const handleShopChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setShopUrl(e.target.value);
  };

  // Handle App Store installation button click
  const handleAppStoreInstall = async () => {
    if (!user) {
      toast.error('Please sign in to continue');
      return;
    }

    try {
      setIsLoading(true);
      setHasError(false);

      // Create pending install record
      const stateToken = await createPendingInstall(user.id, 'onboarding');

      // Get App Store URL with state token
      const appStoreUrl = getAppStoreUrl(stateToken);

      // Open in new tab
      const opened = window.open(appStoreUrl, '_blank', 'noopener,noreferrer');

      if (!opened) {
        toast.error('Please allow pop-ups to install from Shopify App Store');
        setIsLoading(false);
        setHasError(true);
        return;
      }

      // Start polling for connection in background
      setIsLoading(false);
      setIsPolling(true);

      toast.info('Complete installation on Shopify to continue', {
        duration: 5000,
      });
    } catch (error) {
      console.error('Error initiating App Store install:', error);
      toast.error('Failed to start installation. Please try again.');
      setIsLoading(false);
      setHasError(true);
    }
  };

  // Set up message listener for the popup window (manual entry)
  useEffect(() => {
    const messageHandler = async (event: MessageEvent) => {
      if (event.data.type === 'shopify:success') {
        setIsLoading(false);
        setIsSuccess(true);
        setHasError(false);

        if (!wasAlreadyConnected) {
          setShowConfetti(true);
          setTimeout(() => setShowConfetti(false), 3000);
        }

        if (checkInterval) {
          clearInterval(checkInterval);
          setCheckInterval(null);
        }

        // Force refresh the connection store to pick up the new installation
        await refreshShopifyStatus();
        // Give the store a moment to update, then notify parent
        setTimeout(() => {
          onStoreConnected(true);
        }, 500);
      } else if (event.data.type === 'shopify:error') {
        setIsLoading(false);
        setHasError(true);
        if (checkInterval) {
          clearInterval(checkInterval);
          setCheckInterval(null);
        }
      }
    };

    window.addEventListener('message', messageHandler);
    return () => {
      window.removeEventListener('message', messageHandler);
      if (checkInterval) {
        clearInterval(checkInterval);
      }
    };
  }, [onStoreConnected, checkInterval, wasAlreadyConnected, refreshShopifyStatus]);

  // Manual URL entry handler (for reviewers)
  const handleManualConnect = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!shopUrl.trim()) {
      return;
    }

    setIsLoading(true);
    setHasError(false);

    try {
      // Verify we have a valid session first
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session?.user) {
        throw new Error('Please sign in to connect your store');
      }

      const validation = validateStoreUrl(shopUrl);
      if (!validation.success) {
        setIsLoading(false);
        setHasError(true);
        return;
      }

      const validDomain = validation.data;
      // Get auth URL and open in new window
      const authUrl = await getShopifyAuthUrl(validDomain);

      // Open auth in new window
      const width = 800;
      const height = 600;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;

      const authWindow = window.open(
        authUrl,
        'shopify-auth',
        `width=${width},height=${height},left=${left},top=${top}`
      );

      if (!authWindow) {
        throw new Error('Please allow pop-ups for this site to connect your Shopify store');
      }

      // Clear any existing interval
      if (checkInterval) {
        clearInterval(checkInterval);
      }

      // Check if window was closed before completing auth
      const intervalId = setInterval(() => {
        // Helper function to clean up session and interval
        const cleanOauthSession = (oauthSession: any) => {
          if (oauthSession?.id) {
            supabase
              .from("oauth_sessions")
              .delete()
              .eq("id", oauthSession.id)
              .then(({ error: deleteError }) => {
                // Silent cleanup
              });
          }

          clearInterval(intervalId);
          setCheckInterval(null);
          setIsLoading(false);
        };

        // Check the access token has been received
        supabase
          .from("oauth_sessions")
          .select("*")
          .eq("user_id", session.user.id)
          .eq("shop_domain", validDomain)
          .maybeSingle()
          .then(({ data: oauthSession, error }) => {
            if (error) {
              cleanOauthSession(null);
              setHasError(true);
              if (authWindow && !authWindow.closed) {
                authWindow.close();
              }
              return;
            }

            if (!oauthSession) {
              // Still waiting for session to be created
              return;
            }

            // Check if the OAuth session completed successfully
            if (oauthSession.completed_at) {
              // Success! Connection completed
              cleanOauthSession(oauthSession);
              setIsSuccess(true);

              if (!wasAlreadyConnected) {
                setShowConfetti(true);
                setTimeout(() => setShowConfetti(false), 3000);
              }

              // Force refresh the connection store to pick up the new installation
              refreshShopifyStatus().then(() => {
                onStoreConnected(true);
              });

              if (authWindow && !authWindow.closed) {
                authWindow.close();
              }
              return;
            }

            // Check for errors
            if (oauthSession.error && oauthSession.error !== "Session Started...") {
              cleanOauthSession(oauthSession);
              setHasError(true);
              if (authWindow && !authWindow.closed) {
                authWindow.close();
              }
              return;
            }

            // Still in progress, keep polling
          })
          .catch((err) => {
            clearInterval(intervalId);
            setCheckInterval(null);
            setIsLoading(false);
            setHasError(true);
          });
      }, 1000);

      setCheckInterval(intervalId);
    } catch (error) {
      setIsLoading(false);
      setHasError(true);
    }
  };

  return (
    <div className="max-w-[540px] mx-auto relative">
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
          {Array.from({ length: 50 }).map((_, i) => (
            <div
              key={i}
              className="confetti"
              style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 0.5}s`,
                animationDuration: `${2 + Math.random() * 1}s`,
              }}
            />
          ))}
        </div>
      )}
      <style>{`
        @keyframes confetti-fall {
          0% {
            transform: translateY(-100vh) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }
        .confetti {
          position: absolute;
          width: 10px;
          height: 10px;
          background: linear-gradient(135deg, #E11D48 40%, #EC4899 80%, #E8795A 100%);
          animation: confetti-fall linear forwards;
          top: -10px;
        }
        .confetti:nth-child(2n) {
          background: linear-gradient(135deg, #EC4899 40%, #E8795A 80%, #F59E0B 100%);
          width: 8px;
          height: 8px;
        }
        .confetti:nth-child(3n) {
          background: linear-gradient(135deg, #E8795A 40%, #F59E0B 80%, #E11D48 100%);
          width: 6px;
          height: 12px;
        }
        .confetti:nth-child(4n) {
          width: 12px;
          height: 6px;
        }
      `}</style>

      <div className="bg-white dark:bg-[#1f1f1f] rounded-lg shadow-sm border border-gray-200 dark:border-[#3a3a3a] p-8">
        {/* Success State */}
        {isSuccess && connectedStoreUrl && (
          <div className="text-center space-y-6">
            <div className="flex justify-center">
              <div className="p-0.5 backdrop-blur-sm rounded-full shadow-sm bg-emerald-500/15">
                <div
                  className="w-12 h-12 rounded-full bg-emerald-500 flex items-center justify-center"
                  style={{
                    boxShadow: 'inset 0px 4px 12px 0px rgba(255,255,255,0.45), inset 0px -2px 4px 0px rgba(0,0,0,0.25)'
                  }}
                >
                  <Check className="w-5 h-5 text-white" strokeWidth={2.5} />
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <h2 className="text-3xl font-medium text-gray-900 dark:text-white">
                Store Connected
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Your Shopify store is now connected
              </p>
              <div className="inline-flex items-center px-4 py-2 rounded-lg bg-gray-100 dark:bg-[#3a3a3a]">
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {connectedStoreUrl}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Installation Flow */}
        {!isSuccess && (
          <>
            {/* Heading */}
            <div className="text-center mb-8">
              <h2 className="text-3xl font-medium text-gray-900 dark:text-white mb-3">
                Connect Your Store
              </h2>
              <p className="text-base text-gray-600 dark:text-gray-400 max-w-lg mx-auto">
                Install Revoa from the Shopify App Store to automatically sync your orders, products, and customer data.
              </p>
            </div>

            {/* Main Install Button */}
            <div className="flex flex-col items-center space-y-4 mb-8">
              <button
                onClick={handleAppStoreInstall}
                disabled={isLoading}
                className="btn btn-primary group"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Opening...</span>
                  </>
                ) : (
                  <>
                    <span>Install on Shopify</span>
                    <ExternalLink className="shrink-0 w-4 h-4 text-white transition-transform group-hover:scale-110" strokeWidth={1.5} />
                  </>
                )}
              </button>
            </div>

            {/* How It Works */}
            <div className="bg-gray-50 dark:bg-[#1f1f1f]/50 rounded-lg p-6 mb-6">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
                How Installation Works
              </h3>
              <ol className="space-y-3">
                <li className="flex items-start text-sm text-gray-600 dark:text-gray-400">
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-gray-200 dark:bg-[#3a3a3a] text-xs font-medium text-gray-700 dark:text-gray-300 mr-3 mt-0.5 flex-shrink-0">
                    1
                  </span>
                  <span>Click the button above to visit the Shopify App Store</span>
                </li>
                <li className="flex items-start text-sm text-gray-600 dark:text-gray-400">
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-gray-200 dark:bg-[#3a3a3a] text-xs font-medium text-gray-700 dark:text-gray-300 mr-3 mt-0.5 flex-shrink-0">
                    2
                  </span>
                  <span>Choose your plan (includes 14 day free trial)</span>
                </li>
                <li className="flex items-start text-sm text-gray-600 dark:text-gray-400">
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-gray-200 dark:bg-[#3a3a3a] text-xs font-medium text-gray-700 dark:text-gray-300 mr-3 mt-0.5 flex-shrink-0">
                    3
                  </span>
                  <span>Complete installation and return here to continue setup</span>
                </li>
              </ol>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-4">
                Your account will be automatically linked during installation
              </p>
            </div>

            {/* Manual Entry for Shopify Reviewers */}
            <div className="rounded-xl px-4 py-4 bg-gradient-to-b from-blue-50 to-white dark:from-blue-900/35 dark:to-blue-950/20 border border-blue-300 dark:border-blue-800 shadow-[0_0_0_2px_#dbeafe] dark:shadow-[0_0_0_2px_rgba(30,58,138,0.3)]">
              <button
                type="button"
                onClick={() => setShowManualEntry(!showManualEntry)}
                className="w-full flex items-start gap-3"
              >
                <HelpCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-blue-600 dark:text-blue-400" />
                <div className="flex-1 text-left">
                  <p className="font-semibold text-sm text-gray-900 dark:text-white mb-1">
                    For Shopify Reviewers
                  </p>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    Use the manual connection option below to connect your development store for review purposes.
                  </p>
                </div>
                <ChevronDown className={`w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5 transition-transform duration-200 ${showManualEntry ? 'rotate-180' : ''}`} />
              </button>

              {showManualEntry && (
                <div className="mt-4 pt-4 border-t border-blue-200 dark:border-blue-800">
                  <form onSubmit={handleManualConnect} className="space-y-4">
                    <div className="text-left">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Store URL
                      </label>
                      <div className="relative">
                        <ShopifyFormInput
                          value={shopUrl}
                          onChange={handleShopChange}
                          disabled={isLoading}
                          placeholder="your-store.myshopify.com"
                          className="pr-12 !bg-white dark:!bg-[#1f1f1f] !text-gray-900 dark:!text-white !border-gray-300 dark:!border-gray-600"
                        />
                        <button
                          type="submit"
                          disabled={!shopUrl.trim() || isLoading}
                          className="absolute right-0 top-0 h-full px-6 rounded-r-lg disabled:cursor-not-allowed flex items-center justify-center bg-[linear-gradient(135deg,#E11D48_40%,#EC4899_80%,#E8795A_100%)] hover:opacity-90 disabled:opacity-50 text-white"
                          aria-label="Connect store"
                        >
                          {isLoading ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                          ) : (
                            <Link2 className="w-5 h-5" />
                          )}
                        </button>
                      </div>
                    </div>
                  </form>

                  {hasError && (
                    <div className="mt-4 border border-gray-200 dark:border-[#3a3a3a] bg-white dark:bg-[#1f1f1f] rounded-lg p-4">
                      <div className="flex items-start space-x-3">
                        <HelpCircle className="w-5 h-5 text-gray-400 dark:text-gray-500 mt-0.5 flex-shrink-0" />
                        <div className="text-sm">
                          <p className="font-medium text-gray-900 dark:text-white mb-2.5">Having trouble connecting?</p>
                          <ul className="space-y-2 text-gray-600 dark:text-gray-400">
                            <li className="flex items-start">
                              <span className="inline-block w-1 h-1 rounded-full bg-gray-400 mt-1.5 mr-2 flex-shrink-0"></span>
                              <span>Make sure your browser allows popups</span>
                            </li>
                            <li className="flex items-start">
                              <span className="inline-block w-1 h-1 rounded-full bg-gray-400 mt-1.5 mr-2 flex-shrink-0"></span>
                              <span>Must be on a paid and active Shopify plan</span>
                            </li>
                            <li className="flex items-start">
                              <span className="inline-block w-1 h-1 rounded-full bg-gray-400 mt-1.5 mr-2 flex-shrink-0"></span>
                              <span>Must be an admin of the Shopify store</span>
                            </li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default StoreIntegration;
