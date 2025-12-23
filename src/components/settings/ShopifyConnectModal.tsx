import React, { useState, useEffect } from 'react';
import { Info, Link2, X, Check, ChevronDown } from 'lucide-react';
import ShopifyFormInput from '@/components/ShopifyFormInput';
import GlassCard from '@/components/GlassCard';
import { getShopifyAuthUrl } from '@/lib/shopify/auth';
import { validateStoreUrl } from '@/lib/shopify/validation';
import { supabase } from '@/lib/supabase';
import { useConnectionStore } from '@/lib/connectionStore';

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

  // Watch connection store for Shopify changes
  const { shopify, refreshShopifyStatus } = useConnectionStore();

  // Auto-expand help section when error occurs
  useEffect(() => {
    if (hasError) {
      setIsHelpExpanded(true);
    }
  }, [hasError]);

  // Auto-close modal when Shopify gets connected
  useEffect(() => {
    console.log('[ShopifyConnectModal useEffect] Triggered - isConnected:', shopify.isConnected, 'isOpen:', isOpen, 'isSuccess:', isSuccess);

    if (shopify.isConnected && isOpen && !isSuccess) {
      console.log('[ShopifyConnectModal] Connection detected, closing modal');
      console.log('[ShopifyConnectModal] Store URL:', shopify.installation?.store_url);

      if (checkInterval) {
        clearInterval(checkInterval);
        setCheckInterval(null);
      }
      setIsSuccess(true);
      setIsLoading(false);

      // Small delay to show success state before closing
      setTimeout(() => {
        console.log('[ShopifyConnectModal] Calling onSuccess and onClose');
        onSuccess(shopify.installation?.store_url || '');
        onClose();
        // Reset states for next time
        setTimeout(() => {
          setIsSuccess(false);
          setShopUrl('');
          setHasError(false);
          setErrorMessage('');
          setIsHelpExpanded(false);
        }, 300);
      }, 800);
    }
  }, [shopify.isConnected, isOpen, isSuccess, checkInterval, onSuccess, onClose, shopify.installation]);

  const handleShopChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setShopUrl(e.target.value);
  };

  useEffect(() => {
    const messageHandler = async (event: MessageEvent) => {
      // Verify the message is from our callback page
      if (!event.data || !event.data.type) return;

      if (event.data.type === 'shopify:success') {
        console.log('[ShopifyConnectModal] ✓ OAuth Success message received from callback page!');
        console.log('[ShopifyConnectModal] Shop:', event.data.shop);

        // Stop polling immediately
        if (checkInterval) {
          clearInterval(checkInterval);
          setCheckInterval(null);
        }

        // Update UI state
        setIsLoading(false);
        setIsSuccess(true);
        setHasError(false);
        setErrorMessage('');

        // Refresh connection store
        console.log('[ShopifyConnectModal] Refreshing connection store...');
        await refreshShopifyStatus();

        // Close modal after showing success briefly
        setTimeout(() => {
          console.log('[ShopifyConnectModal] Closing modal');
          onSuccess(event.data.shop);
          onClose();

          // Reset states after modal animation
          setTimeout(() => {
            setIsSuccess(false);
            setShopUrl('');
            setHasError(false);
            setErrorMessage('');
            setIsHelpExpanded(false);
          }, 300);
        }, 800);

      } else if (event.data.type === 'shopify:error') {
        console.log('[ShopifyConnectModal] ✗ OAuth Error received from callback page:', event.data.error);

        // Stop polling
        if (checkInterval) {
          clearInterval(checkInterval);
          setCheckInterval(null);
        }

        // Show error
        setIsLoading(false);
        setHasError(true);
        setErrorMessage(event.data.error || 'Failed to connect to Shopify');
      }
    };

    window.addEventListener('message', messageHandler);
    return () => {
      window.removeEventListener('message', messageHandler);
      if (checkInterval) {
        clearInterval(checkInterval);
      }
    };
  }, [checkInterval, onSuccess, onClose, refreshShopifyStatus]);

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('handleConnect called', { shopUrl });

    if (!shopUrl.trim()) {
      console.log('Shop URL is empty, returning');
      return;
    }

    setIsLoading(true);
    setHasError(false);
    setErrorMessage('');

    try {
      console.log('Getting session...');
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session?.user) {
        throw new Error('Please sign in to connect your store');
      }
      console.log('Session found:', session.user.id);

      console.log('Validating store URL:', shopUrl);
      const validation = validateStoreUrl(shopUrl);
      if (!validation.success) {
        console.error('Validation failed:', validation.error);
        setIsLoading(false);
        setHasError(true);
        setErrorMessage(validation.error || 'Invalid store URL');
        return;
      }

      const validDomain = validation.data;
      console.log('Valid domain:', validDomain);
      console.log('Getting Shopify auth URL...');
      const authUrl = await getShopifyAuthUrl(validDomain);
      console.log('Auth URL generated:', authUrl);

      // Debug: Show the URL before opening
      if (!authUrl || !authUrl.startsWith('https://')) {
        alert(`ERROR: Invalid auth URL generated: ${authUrl}\n\nCheck console for details.`);
        throw new Error('Invalid auth URL generated');
      }

      const width = 800;
      const height = 600;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;

      console.log('Opening OAuth window with URL:', authUrl);
      const authWindow = window.open(
        authUrl,
        'shopify-auth',
        `width=${width},height=${height},left=${left},top=${top}`
      );

      if (!authWindow) {
        console.error('Failed to open popup window - popup was blocked');
        setIsLoading(false);
        // Don't show error - help section already mentions popup requirement
        return;
      }
      console.log('OAuth window opened successfully');

      if (checkInterval) {
        clearInterval(checkInterval);
      }

      let pollAttempts = 0;
      const maxPollAttempts = 120; // 2 minutes (120 * 1 second)

      const intervalId = setInterval(() => {
        pollAttempts++;
        console.log(`[ShopifyConnectModal Polling] Attempt ${pollAttempts}/${maxPollAttempts} - Checking oauth session...`);

        const cleanOauthSession = (oauthSession: any) => {
          if (oauthSession?.id) {
            supabase
              .from("oauth_sessions")
              .delete()
              .eq("id", oauthSession.id)
              .then(({ error: deleteError }) => {
                if (deleteError) {
                  console.error("Failed to delete session:", deleteError);
                }
              });
          }

          clearInterval(intervalId);
          setCheckInterval(null);
          setIsLoading(false);
        };

        // Check if window was closed by user
        if (authWindow && authWindow.closed) {
          console.log('[ShopifyConnectModal Polling] ✗ Window closed by user');
          cleanOauthSession(null);
          setHasError(true);
          setErrorMessage('Authentication window was closed. Please try again.');
          return;
        }

        // Check if we've exceeded max attempts
        if (pollAttempts >= maxPollAttempts) {
          console.error('[ShopifyConnectModal Polling] ✗ Max polling attempts reached');
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
              console.error('[ShopifyConnectModal Polling] ✗ Database error:', error);
              cleanOauthSession(null);
              setHasError(true);
              setErrorMessage('Database error. Please try again.');
              if (authWindow && !authWindow.closed) {
                authWindow.close();
              }
              return;
            }

            if (!oauthSession) {
              console.log(`[ShopifyConnectModal Polling] Attempt ${pollAttempts}/${maxPollAttempts} - No session found yet`);
              return;
            }

            console.log(`[ShopifyConnectModal Polling] Attempt ${pollAttempts}/${maxPollAttempts} - Session found, completed_at:`, oauthSession.completed_at);

            // Check if OAuth completed successfully
            if (oauthSession.completed_at) {
              console.log('[ShopifyConnectModal Polling] ✓ OAuth session completed!');
              console.log('[ShopifyConnectModal Polling] completed_at:', oauthSession.completed_at);

              // Close popup window
              if (authWindow && !authWindow.closed) {
                authWindow.close();
              }

              // Clean up oauth session and stop polling
              cleanOauthSession(oauthSession);

              // Show success state
              console.log('[ShopifyConnectModal Polling] Setting success state');
              setIsSuccess(true);
              setIsLoading(false);
              setHasError(false);
              setErrorMessage('');

              // Refresh connection store
              console.log('[ShopifyConnectModal Polling] Refreshing connection store...');
              await refreshShopifyStatus();

              // Close modal after brief success display
              setTimeout(() => {
                console.log('[ShopifyConnectModal Polling] Closing modal with store:', validDomain);
                onSuccess(validDomain);
                onClose();

                // Reset states
                setTimeout(() => {
                  setIsSuccess(false);
                  setShopUrl('');
                  setHasError(false);
                  setErrorMessage('');
                  setIsHelpExpanded(false);
                }, 300);
              }, 800);

              return;
            }

            // Check for errors (but ignore "Session Started...")
            if (oauthSession.error && oauthSession.error !== "Session Started...") {
              console.error('[ShopifyConnectModal] OAuth error:', oauthSession.error);
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
    } catch (error) {
      console.error('Error connecting to Shopify:', error);
      console.error('Error details:', {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        error
      });
      setIsLoading(false);
      setHasError(true);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to connect to Shopify');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Connect Shopify Store
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          <div className="text-center mb-6">
            <div className="mx-auto flex items-center justify-center mb-4 h-32">
              {isSuccess ? (
                <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <Check className="w-10 h-10 text-green-600 dark:text-green-400" />
                </div>
              ) : (
                <>
                  <img
                    src="https://iipaykvimkbbnoobtpzz.supabase.co/storage/v1/object/public/public-bucket/REVOA%20Sync%20to%20Shopify%20Image.png"
                    alt="Revoa Store Sync"
                    className="w-56 h-32 object-contain dark:hidden"
                  />
                  <img
                    src="https://iipaykvimkbbnoobtpzz.supabase.co/storage/v1/object/public/public-bucket/REVOA%20Sync%20to%20Shopify%20Image%20Dark%20Mode.png"
                    alt="Revoa Store Sync"
                    className="w-56 h-32 object-contain hidden dark:block"
                  />
                </>
              )}
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {isSuccess
                ? 'Store connected successfully!'
                : 'Enter your .myshopify.com URL below. You can find your URL in Settings > Domains on Shopify.'
              }
            </p>
          </div>

          <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-6">
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

              <div className="border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden">
                <button
                  type="button"
                  onClick={() => setIsHelpExpanded(!isHelpExpanded)}
                  className="w-full flex items-center justify-between p-3 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
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
        </div>
      </div>
    </div>
  );
};

export default ShopifyConnectModal;
