import React, { useState, useEffect } from 'react';
import { HelpCircle, Link2 } from 'lucide-react';
import { toast } from 'sonner';
import ShopifyFormInput from '@/components/ShopifyFormInput';
import GlassCard from '@/components/GlassCard';
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
        toast.success('Successfully connected to Shopify');
      } else if (event.data.type === 'shopify:error') {
        setIsLoading(false);
        setHasError(true);
        if (checkInterval) {
          clearInterval(checkInterval);
          setCheckInterval(null);
        }
        toast.error(event.data.error || 'Failed to connect to Shopify');
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
      toast.error('Please enter your Shopify store URL');
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
        toast.error(validation.error);
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
              toast.error('Connection failed. Please try again.');
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

            if (oauthSession.error) {
              if (oauthSession.error === "Session Started...") {
                // Session is being created, keep polling
                return;
              }

              toast.error('Connection failed. Please try again.');
              cleanOauthSession(oauthSession);
              setHasError(true);
              if (authWindow && !authWindow.closed) {
                authWindow.close();
              }
              return;
            }

            // Success! Connection completed
            toast.success('Successfully connected to Shopify');
            cleanOauthSession(oauthSession);
            onStoreConnected(true);
            if (authWindow && !authWindow.closed) {
              authWindow.close();
            }
          })
          .catch((err) => {
            console.error("Unexpected error fetching installation:", err);
            toast.error('Connection failed. Please try again.');
            clearInterval(intervalId);
            setCheckInterval(null);
            setIsLoading(false);
            setHasError(true);
          });
      }, 1000);

      setCheckInterval(intervalId);
    } catch (error) {
      console.error('Error connecting to Shopify:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to connect to Shopify store');
      setIsLoading(false);
      setHasError(true);
    }
  };

  return (
    <div className="max-w-[540px] mx-auto">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-24 w-24 mb-4">
            <img
              src="https://iipaykvimkbbnoobtpzz.supabase.co/storage/v1/object/public/public-bucket/Revoa%20Transparent%20Icon.png"
              alt="Revoa Store Sync"
              className="w-full h-full object-contain"
            />
          </div>
          <h2 className="text-3xl font-medium text-gray-900 mb-2">Connect Your Store</h2>
          <p className="text-sm text-gray-600 max-w-md mx-auto mb-6">
            Enter your .myshopify.com URL below. You can find your URL in Settings {'>'} Domains on Shopify.
          </p>
        </div>

        <div className="max-w-md mx-auto">
          <GlassCard>
            <form onSubmit={handleConnect} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
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

              {hasError && (
                <div className="border border-gray-200 bg-white rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <HelpCircle className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div className="text-sm">
                    <p className="font-medium text-gray-900 mb-2.5">Having trouble connecting?</p>
                    <ul className="space-y-2 text-gray-600">
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
            </form>
          </GlassCard>
        </div>
      </div>
    </div>
  );
};

export default StoreIntegration;
