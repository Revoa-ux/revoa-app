import React, { useState, useEffect } from 'react';
import { HelpCircle, Link2, Play, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import ShopifyFormInput from '@/components/ShopifyFormInput';
import { getShopifyAuthUrl } from '@/lib/shopify/auth';
import { validateStoreUrl } from '@/lib/shopify/validation';
import { supabase } from '@/lib/supabase';

interface StoreIntegrationProps {
  onStoreConnected: (connected: boolean) => void;
}

const StoreIntegration: React.FC<StoreIntegrationProps> = ({ onStoreConnected }) => {
  const [shopUrl, setShopUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [checkInterval, setCheckInterval] = useState<NodeJS.Timeout | null>(null);
  const [hasError, setHasError] = useState(false);
  const [showVideo, setShowVideo] = useState(false);

  // Check if store is already connected on mount
  useEffect(() => {
    const checkExistingConnection = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return;

        const { data: installation } = await supabase
          .from('shopify_installations')
          .select('id')
          .eq('user_id', session.user.id)
          .eq('status', 'installed')
          .maybeSingle();

        if (installation) {
          onStoreConnected(true);
        }
      } catch (error) {
        console.error('Error checking existing connection:', error);
      }
    };

    checkExistingConnection();
  }, [onStoreConnected]);

  const handleShopChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setShopUrl(e.target.value);
  };

  // Set up message listener for the popup window
  useEffect(() => {
    const messageHandler = (event: MessageEvent) => {
      if (event.data.type === 'shopify:success') {
        onStoreConnected(true);
        setIsLoading(false);
        setHasError(false);
        if (checkInterval) {
          clearInterval(checkInterval);
          setCheckInterval(null);
        }
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
  }, [onStoreConnected, checkInterval]);

  const handleConnect = async (e: React.FormEvent) => {
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
                if (deleteError) {
                  console.error("Failed to delete session:", deleteError);
                } else {
                  console.log("Session deleted successfully.");
                }
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
              onStoreConnected(true);
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
            console.error("Unexpected error fetching installation:", err);
            clearInterval(intervalId);
            setCheckInterval(null);
            setIsLoading(false);
            setHasError(true);
          });
      }, 1000);

      setCheckInterval(intervalId);
    } catch (error) {
      console.error('Error connecting to Shopify:', error);
      setIsLoading(false);
      setHasError(true);
    }
  };

  return (
    <div className="max-w-[540px] mx-auto">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-24 w-24 mb-4">
            <img
              src="https://iipaykvimkbbnoobtpzz.supabase.co/storage/v1/object/public/public-bucket/Revoa%20Transparent%20Icon.png"
              alt="Revoa Store Sync"
              className="w-full h-full object-contain dark:invert dark:brightness-0 dark:contrast-200"
            />
          </div>
          <h2 className="text-3xl font-medium text-gray-900 dark:text-white mb-2">Connect Your Store</h2>
          <div className="max-w-md mx-auto mb-6">
            <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
              Find your store URL in Shopify Settings → Domains.{' '}
              <button
                type="button"
                onClick={() => setShowVideo(!showVideo)}
                className="inline-flex items-center text-xs font-normal text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 transition-colors"
              >
                {showVideo ? 'Hide tutorial' : 'Show tutorial'}
                <ChevronDown className={`w-3 h-3 ml-0.5 transition-transform duration-200 ${showVideo ? 'rotate-180' : ''}`} />
              </button>
            </p>
          </div>
        </div>

        <div className="max-w-md mx-auto">
          <div className="bg-gray-100/50 dark:bg-gray-900/50 backdrop-blur-sm shadow-sm rounded-2xl p-8">
            {/* Collapsible Tutorial Video - Moved above form */}
            {showVideo && (
              <div className="mb-6 animate-in slide-in-from-top-2 duration-300">
                <div className="relative rounded-lg overflow-hidden shadow-md">
                  <video
                    className="w-full h-auto"
                    autoPlay
                    loop
                    muted
                    playsInline
                  >
                    <source
                      src="https://iipaykvimkbbnoobtpzz.supabase.co/storage/v1/object/public/public-bucket/Revoa-add-store-instructions.mp4"
                      type="video/mp4"
                    />
                    Your browser does not support the video tag.
                  </video>
                </div>
              </div>
            )}

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
                    className="pr-12 !bg-white dark:!bg-gray-900 !text-gray-900 dark:!text-white !border-gray-300 dark:!border-gray-600"
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
            </form>

            {hasError && (
                <div className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-lg p-4">
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
                        <span>Make sure you are not logged into a different store in a separate tab</span>
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
        </div>
      </div>
    </div>
  );
};

export default StoreIntegration;
