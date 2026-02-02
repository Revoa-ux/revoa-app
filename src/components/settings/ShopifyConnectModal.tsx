import React, { useState, useEffect, useRef } from 'react';
import { Info, Link2, X, Check, ChevronDown, RefreshCw, ExternalLink } from 'lucide-react';
import ShopifyFormInput from '@/components/ShopifyFormInput';
import GlassCard from '@/components/GlassCard';
import { getShopifyAuthUrl } from '@/lib/shopify/auth';
import { validateStoreUrl } from '@/lib/shopify/validation';
import { supabase } from '@/lib/supabase';
import { useConnectionStore } from '@/lib/connectionStore';
import { toast } from '../../lib/toast';
import { shouldAllowManualShopifyConnect, isProduction } from '@/lib/environment';

interface ShopifyConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (storeUrl: string) => void;
}

const ShopifyConnectModal: React.FC<ShopifyConnectModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [shopUrl, setShopUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [checkInterval, setCheckInterval] = useState<NodeJS.Timeout | null>(null);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isHelpExpanded, setIsHelpExpanded] = useState(false);
  const [isCheckingConnection, setIsCheckingConnection] = useState(false);
  const [autoCheckTimeout, setAutoCheckTimeout] = useState<NodeJS.Timeout | null>(null);
  const [popupWatcherInterval, setPopupWatcherInterval] = useState<NodeJS.Timeout | null>(null);
  const [localStoragePollerInterval, setLocalStoragePollerInterval] = useState<NodeJS.Timeout | null>(null);

  // Watch connection store for Shopify changes
  const { shopify, refreshShopifyStatus } = useConnectionStore();

  // Use refs to hold stable references to callbacks to avoid recreating message listener
  const onSuccessRef = useRef(onSuccess);
  const onCloseRef = useRef(onClose);

  // Update refs when callbacks change
  useEffect(() => {
    onSuccessRef.current = onSuccess;
    onCloseRef.current = onClose;
  }, [onSuccess, onClose]);

  // Auto-expand help section when error occurs
  useEffect(() => {
    if (hasError) {
      setIsHelpExpanded(true);
    }
  }, [hasError]);

  // Auto-close modal when Shopify gets connected
  useEffect(() => {
    if (shopify.isConnected && isOpen) {
      if (checkInterval) {
        clearInterval(checkInterval);
        setCheckInterval(null);
      }

      // Close immediately
      onSuccess(shopify.installation?.store_url || '');
      onClose();

      // Reset states for next time
      setTimeout(() => {
        setIsSuccess(false);
        setShopUrl('');
        setHasError(false);
        setErrorMessage('');
        setIsHelpExpanded(false);
        setIsLoading(false);
      }, 300);
    }
  }, [shopify.isConnected, isOpen, checkInterval, onSuccess, onClose, shopify.installation]);

  const handleShopChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setShopUrl(e.target.value);
  };

  const handleManualConnectionCheck = async () => {    setIsCheckingConnection(true);

    try {
      const result = await refreshShopifyStatus();
      if (result && result.isConnected) {
        // Stop any polling
        if (checkInterval) {
          clearInterval(checkInterval);
          setCheckInterval(null);
        }
        if (autoCheckTimeout) {
          clearTimeout(autoCheckTimeout);
          setAutoCheckTimeout(null);
        }

        // Call onSuccess callback
        onSuccessRef.current(result.installation?.store_url || '');

        // Close modal - NO PAGE RELOAD, let reactive store update the UI
        onCloseRef.current();
      } else {        setIsCheckingConnection(false);
      }
    } catch (err) {      setIsCheckingConnection(false);
    }
  };

  useEffect(() => {
    const messageHandler = async (event: MessageEvent) => {
      // Verify the message is from our callback page
      if (!event.data || !event.data.type) {        return;
      }
      if (event.data.type === 'shopify:success') {
        // Stop polling and auto-check timeout immediately
        if (checkInterval) {
          clearInterval(checkInterval);
          setCheckInterval(null);
        }
        if (autoCheckTimeout) {
          clearTimeout(autoCheckTimeout);
          setAutoCheckTimeout(null);        }

        // Refresh connection store and close immediately        await refreshShopifyStatus();        onClose();

      } else if (event.data.type === 'shopify:error') {
        // Stop polling and auto-check timeout
        if (checkInterval) {
          clearInterval(checkInterval);
          setCheckInterval(null);
        }
        if (autoCheckTimeout) {
          clearTimeout(autoCheckTimeout);
          setAutoCheckTimeout(null);
        }

        // Show error
        setIsLoading(false);
        setHasError(true);
        setErrorMessage(event.data.error || 'Failed to connect to Shopify');
      }
    };

    // Also listen for localStorage changes as a backup
    const storageHandler = async (event: StorageEvent) => {
      if (event.key === 'shopify_oauth_success' && event.newValue) {
        try {
          const data = JSON.parse(event.newValue);
          // Stop polling and auto-check timeout
          if (checkInterval) {
            clearInterval(checkInterval);
            setCheckInterval(null);
          }
          if (autoCheckTimeout) {
            clearTimeout(autoCheckTimeout);
            setAutoCheckTimeout(null);
          }

          // Clean up localStorage
          localStorage.removeItem('shopify_oauth_success');

          // Set local loading and success states immediately (CRITICAL - don't wait for store)
          setIsLoading(false);
          setIsSuccess(true);
          setHasError(false);

          // CRITICAL: Refresh connection store in background          await refreshShopifyStatus();
          // The useEffect watching shopify.isConnected should trigger and close modal
          // But as a backup, directly close after a delay
          setTimeout(() => {            onClose();
          }, 1000);
        } catch (err) {        }
      }

      if (event.key === 'shopify_oauth_error' && event.newValue) {
        try {
          const data = JSON.parse(event.newValue);
          if (checkInterval) {
            clearInterval(checkInterval);
            setCheckInterval(null);
          }
          if (autoCheckTimeout) {
            clearTimeout(autoCheckTimeout);
            setAutoCheckTimeout(null);
          }

          setIsLoading(false);
          setHasError(true);
          setErrorMessage(data.error || 'Failed to connect to Shopify');

          // Clean up localStorage
          localStorage.removeItem('shopify_oauth_error');
        } catch (err) {        }
      }
    };

    window.addEventListener('message', messageHandler);
    window.addEventListener('storage', storageHandler);
    return () => {      window.removeEventListener('message', messageHandler);
      window.removeEventListener('storage', storageHandler);
      if (checkInterval) {
        clearInterval(checkInterval);
      }
      if (autoCheckTimeout) {
        clearTimeout(autoCheckTimeout);
      }
      if (popupWatcherInterval) {
        clearInterval(popupWatcherInterval);
      }
      if (localStoragePollerInterval) {
        clearInterval(localStoragePollerInterval);
      }
    };
  }, []); // No dependencies - stable listener that uses refs for callbacks

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shopUrl.trim()) {      return;
    }

    setIsLoading(true);
    setHasError(false);
    setErrorMessage('');

    try {      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session?.user) {
        throw new Error('Please sign in to connect your store');
      }      const validation = validateStoreUrl(shopUrl);
      if (!validation.success) {        setIsLoading(false);
        setHasError(true);
        setErrorMessage(validation.error || 'Invalid store URL');
        return;
      }

      const validDomain = validation.data;      const authUrl = await getShopifyAuthUrl(validDomain);
      // Debug: Show the URL before opening
      if (!authUrl || !authUrl.startsWith('https://')) {
        alert(`ERROR: Invalid auth URL generated: ${authUrl}\n\nCheck console for details.`);
        throw new Error('Invalid auth URL generated');
      }

      const width = 800;
      const height = 600;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;      const authWindow = window.open(
        authUrl,
        'shopify-auth',
        `width=${width},height=${height},left=${left},top=${top}`
      );

      if (!authWindow) {        setIsLoading(false);
        // Don't show error - help section already mentions popup requirement
        return;
      }
      // Clean up any existing pollers
      if (popupWatcherInterval) {
        clearInterval(popupWatcherInterval);
      }
      if (localStoragePollerInterval) {
        clearInterval(localStoragePollerInterval);
      }

      // Watch for popup window closing
      const popupWatcher = setInterval(async () => {
        if (authWindow.closed) {          clearInterval(popupWatcher);
          setPopupWatcherInterval(null);

          // Wait a moment for database to update
          await new Promise(resolve => setTimeout(resolve, 1000));

          // Force check connection status
          try {
            const result = await refreshShopifyStatus();
            if (result?.isConnected) {
              onClose();
            }
          } catch (err) {
            // Error checking connection
          }
        }
      }, 500);
      setPopupWatcherInterval(popupWatcher);

      // ALSO poll localStorage directly every 500ms (faster than database polling)
      const localStoragePoller = setInterval(() => {
        const successData = localStorage.getItem('shopify_oauth_success');
        if (successData) {
          clearInterval(localStoragePoller);
          setLocalStoragePollerInterval(null);
          if (popupWatcher) {
            clearInterval(popupWatcher);
            setPopupWatcherInterval(null);
          }

          try {
            const data = JSON.parse(successData);
            // Clean up
            localStorage.removeItem('shopify_oauth_success');

            // Refresh connection store and close immediately
            refreshShopifyStatus().then(() => {
              onClose();
            });
          } catch (err) {
            // Error parsing localStorage data
          }
        }
      }, 500);
      setLocalStoragePollerInterval(localStoragePoller);

      if (checkInterval) {
        clearInterval(checkInterval);
      }

      // Set up automatic connection check every 2 seconds as a robust fallback
      // This catches cases where postMessage might not work or be blocked
      let fallbackCheckCount = 0;
      const maxFallbackChecks = 60; // Check for up to 2 minutes
      const fallbackIntervalId = setInterval(async () => {
        fallbackCheckCount++;
        try {
          const result = await refreshShopifyStatus();
          if (result && result.isConnected) {
            clearInterval(fallbackIntervalId);

            // Close popup if still open
            try {
              if (authWindow && !authWindow.closed) {
                authWindow.close();
              }
            } catch (e) {
              // Could not close popup
            }

            // Close modal immediately
            onClose();
          } else if (fallbackCheckCount >= maxFallbackChecks) {
            clearInterval(fallbackIntervalId);
          }
        } catch (err) {
          // Error checking status
        }
      }, 2000);
      let pollAttempts = 0;
      const maxPollAttempts = 120; // 2 minutes (120 * 1 second)

      const intervalId = setInterval(() => {
        pollAttempts++;
        const cleanOauthSession = (oauthSession: any) => {
          if (oauthSession?.id) {
            supabase
              .from("oauth_sessions")
              .delete()
              .eq("id", oauthSession.id)
              .then(({ error: deleteError }) => {
                // Session deleted
              });
          }

          clearInterval(intervalId);
          setCheckInterval(null);
          setIsLoading(false);
        };

        // Check if window was closed by user
        if (authWindow && authWindow.closed) {
          cleanOauthSession(null);
          setHasError(true);
          setErrorMessage('Authentication window was closed. Please try again.');
          return;
        }

        // Check if we've exceeded max attempts
        if (pollAttempts >= maxPollAttempts) {
          cleanOauthSession(null);
          setHasError(true);
          setErrorMessage('Connection timeout. Please try again.');
          if (authWindow && !authWindow.closed) {
            authWindow.close();
          }
          return;
        }

        supabase
          .from("oauth_sessions")
          .select("*")
          .eq("user_id", session.user.id)
          .eq("shop_domain", validDomain)
          .maybeSingle()
          .then(async ({ data: oauthSession, error }) => {
            if (error) {
              cleanOauthSession(null);
              setHasError(true);
              setErrorMessage('Database error. Please try again.');
              if (authWindow && !authWindow.closed) {
                authWindow.close();
              }
              return;
            }

            if (!oauthSession) {
              return;
            }
            // Check if OAuth completed successfully
            if (oauthSession.completed_at) {
              // Close popup window
              if (authWindow && !authWindow.closed) {
                authWindow.close();
              }

              // Clean up oauth session and stop polling
              cleanOauthSession(oauthSession);

              // Set local loading and success states immediately (CRITICAL - don't wait for store)
              setIsSuccess(true);
              setIsLoading(false);
              setHasError(false);

              // CRITICAL: Refresh connection store in background
              refreshShopifyStatus().then(() => {
                // The useEffect watching shopify.isConnected should trigger and close modal
                // But as a backup, directly close after a delay
                setTimeout(() => {
                  onClose();
                }, 1000);
              });

              return;
            }

            // Check for errors (but ignore "Session Started...")
            if (oauthSession.error && oauthSession.error !== "Session Started...") {
              cleanOauthSession(oauthSession);
              setHasError(true);
              setErrorMessage(oauthSession.error);
              if (authWindow && !authWindow.closed) {
                authWindow.close();
              }
              return;
            }

            // Still in progress, keep polling
          })
          .catch(() => {
            clearInterval(intervalId);
            setCheckInterval(null);
            setIsLoading(false);
            setHasError(true);
          });
      }, 1000);

      setCheckInterval(intervalId);
    } catch (error) {      setIsLoading(false);
      setHasError(true);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to connect to Shopify');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-dark rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-[#333333]">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Connect Shopify Store
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#2a2a2a] rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {isSuccess ? (
            <>
              {/* Success State */}
              <div className="text-center mb-6">
                <div className="mx-auto flex items-center justify-center mb-4">
                  <div className="inline-flex items-center justify-center p-0.5 backdrop-blur-sm rounded-full shadow-sm" style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)' }}>
                    <div
                      className="w-20 h-20 rounded-full flex items-center justify-center"
                      style={{
                        backgroundColor: '#10B981',
                        boxShadow: 'inset 0px 3px 10px 0px rgba(255,255,255,0.4), inset 0px -2px 3px 0px rgba(0,0,0,0.2)'
                      }}
                    >
                      <Check className="w-10 h-10 text-white" strokeWidth={2.5} />
                    </div>
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Connection Successful!
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Your Shopify store has been connected successfully.
                </p>
              </div>

              {/* Success Actions */}
              <div className="space-y-3">
                <div className="rounded-xl p-0.5 border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50 dark:bg-emerald-950/30">
                  <div className="rounded-lg border border-emerald-300 dark:border-emerald-800/60 p-3 text-sm text-gray-700 dark:text-gray-300" style={{ background: 'linear-gradient(to bottom, rgba(236, 253, 245, 1), rgba(209, 250, 229, 1))' }}>
                    <p className="font-medium">This dialog will close automatically and your connection will appear below.</p>
                  </div>
                </div>

                <button
                  onClick={onClose}
                  className="btn btn-danger w-full"
                >
                  Close
                </button>
              </div>
            </>
          ) : isLoading ? (
            <>
              {/* Loading State */}
              <div className="text-center mb-6">
                <div className="mx-auto flex items-center justify-center mb-4">
                  <div className="w-12 h-12 rounded-full animate-spin relative" style={{ background: 'conic-gradient(from 0deg, #E11D48, #EC4899, #F87171, #E8795A, #E11D48)' }}>
                    <div className="absolute inset-[3px] rounded-full bg-white dark:bg-[#262626]" />
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Connecting to Shopify
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Complete the authorization in the popup window...
                </p>
              </div>

              {/* Loading message only - button removed */}
              <div className="space-y-3">
                <div className="text-center text-sm text-gray-500 dark:text-gray-400">
                  Automatically checking connection status...
                </div>
              </div>
            </>
          ) : !shouldAllowManualShopifyConnect() ? (
            <>
              {/* Production Environment - App Store Installation Required */}
              <div className="text-center mb-6">
                <div className="mx-auto flex items-center justify-center mb-4 h-32">
                  <img
                    src="https://iipaykvimkbbnoobtpzz.supabase.co/storage/v1/object/public/public-bucket/REVOA%20Sync%20to%20Shopify%20Image%20Light%20Mode.png"
                    alt="Revoa Store Sync"
                    className="w-56 h-32 object-contain dark:hidden"
                  />
                  <img
                    src="https://iipaykvimkbbnoobtpzz.supabase.co/storage/v1/object/public/public-bucket/REVOA%20Sync%20to%20Shopify%20Image%20Dark%20Mode.png"
                    alt="Revoa Store Sync"
                    className="w-56 h-32 object-contain hidden dark:block"
                  />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Install from Shopify App Store
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                  To connect your Shopify store, please install Revoa from the Shopify App Store. This ensures a secure and compliant connection.
                </p>
              </div>

              <div className="space-y-3">
                <div className="rounded-xl p-0.5 border border-blue-200 dark:border-blue-900/50 bg-blue-50 dark:bg-blue-950/30">
                  <div className="rounded-lg border border-blue-300 dark:border-blue-800/60 p-3" style={{ background: 'linear-gradient(to bottom, rgba(239, 246, 255, 1), rgba(219, 234, 254, 1))' }}>
                    <div className="flex items-start space-x-3">
                      <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                          Why App Store installation?
                        </p>
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                          Installing through the Shopify App Store provides the most secure connection method and ensures compliance with Shopify's policies.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <a
                  href="https://apps.shopify.com/revoa"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[linear-gradient(135deg,#E11D48_40%,#EC4899_80%,#E8795A_100%)] text-white rounded-lg hover:opacity-90 transition-opacity font-medium"
                >
                  <span>Open Shopify App Store</span>
                  <ExternalLink className="w-4 h-4" />
                </a>

                <button
                  onClick={onClose}
                  className="btn btn-secondary w-full"
                >
                  Close
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Development Environment - Manual URL Entry */}
              <div className="text-center mb-6">
                <div className="mx-auto flex items-center justify-center mb-4 h-32">
                  <img
                    src="https://iipaykvimkbbnoobtpzz.supabase.co/storage/v1/object/public/public-bucket/REVOA%20Sync%20to%20Shopify%20Image%20Light%20Mode.png"
                    alt="Revoa Store Sync"
                    className="w-56 h-32 object-contain dark:hidden"
                  />
                  <img
                    src="https://iipaykvimkbbnoobtpzz.supabase.co/storage/v1/object/public/public-bucket/REVOA%20Sync%20to%20Shopify%20Image%20Dark%20Mode.png"
                    alt="Revoa Store Sync"
                    className="w-56 h-32 object-contain hidden dark:block"
                  />
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Enter your .myshopify.com URL below. You can find your URL in Settings &gt; Domains on Shopify.
                </p>
              </div>

          <div className="bg-gray-50 dark:bg-dark/50 rounded-xl p-6">
            <form onSubmit={handleConnect} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Store URL
                </label>
                <div className="relative">
                  <ShopifyFormInput
                    value={shopUrl}
                    onChange={handleShopChange}
                    disabled={isLoading}
                    placeholder="your-store.myshopify.com"
                    className="pr-12"
                  />
                  <button
                    type="submit"
                    disabled={!shopUrl.trim()}
                    className="absolute right-0 top-0 h-full px-4 bg-[linear-gradient(135deg,#E11D48_40%,#EC4899_80%,#E8795A_100%)] text-white rounded-r-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                    aria-label="Connect store"
                  >
                    <Link2 className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {hasError && errorMessage && (
                <div className="border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/20 rounded-lg p-3">
                  <p className="text-sm font-medium text-red-600 dark:text-red-400">{errorMessage}</p>
                </div>
              )}

              <div className="border border-gray-200 dark:border-[#333333] bg-gray-100 dark:bg-dark rounded-lg overflow-hidden">
                <button
                  type="button"
                  onClick={() => setIsHelpExpanded(!isHelpExpanded)}
                  className="w-full flex items-center justify-between p-3 hover:bg-gray-200 dark:hover:bg-[#2a2a2a] transition-colors"
                >
                  <div className="flex items-center space-x-2">
                    <Info className="w-4 h-4 text-gray-500 dark:text-gray-400 flex-shrink-0" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Connection Help
                    </span>
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 text-gray-500 dark:text-gray-400 transition-transform duration-200 ${
                      isHelpExpanded ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {isHelpExpanded && (
                  <div className="px-3 pb-3 text-sm text-gray-600 dark:text-gray-400">
                    <p className="font-medium text-gray-700 dark:text-gray-300 mb-2">Common connection requirements:</p>
                    <ul className="space-y-2">
                      <li className="flex items-start">
                        <span className="inline-block w-1 h-1 rounded-full bg-gray-500 dark:bg-gray-400 mt-1.5 mr-2 flex-shrink-0"></span>
                        <span>Make sure your browser allows popups</span>
                      </li>
                      <li className="flex items-start">
                        <span className="inline-block w-1 h-1 rounded-full bg-gray-500 dark:bg-gray-400 mt-1.5 mr-2 flex-shrink-0"></span>
                        <span>Make sure you are not logged into a different store in a separate tab</span>
                      </li>
                      <li className="flex items-start">
                        <span className="inline-block w-1 h-1 rounded-full bg-gray-500 dark:bg-gray-400 mt-1.5 mr-2 flex-shrink-0"></span>
                        <span>Must be on a paid and active Shopify plan</span>
                      </li>
                      <li className="flex items-start">
                        <span className="inline-block w-1 h-1 rounded-full bg-gray-500 dark:bg-gray-400 mt-1.5 mr-2 flex-shrink-0"></span>
                        <span>Must be an admin of the Shopify store</span>
                      </li>
                    </ul>
                  </div>
                )}
              </div>
            </form>
          </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ShopifyConnectModal;
