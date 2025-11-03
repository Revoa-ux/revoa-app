import React, { useState, useEffect } from 'react';
import { HelpCircle, Link2, X } from 'lucide-react';
import ShopifyFormInput from '@/components/ShopifyFormInput';
import GlassCard from '@/components/GlassCard';
import { getShopifyAuthUrl } from '@/lib/shopify/auth';
import { validateStoreUrl } from '@/lib/shopify/validation';
import { supabase } from '@/lib/supabase';

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
  const [checkInterval, setCheckInterval] = useState<NodeJS.Timeout | null>(null);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  const handleShopChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setShopUrl(e.target.value);
  };

  useEffect(() => {
    const messageHandler = (event: MessageEvent) => {
      if (event.data.type === 'shopify:success') {
        setIsLoading(false);
        setHasError(false);
        if (checkInterval) {
          clearInterval(checkInterval);
          setCheckInterval(null);
        }
        onSuccess(event.data.shop);
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
  }, [checkInterval, onSuccess]);

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

      const width = 800;
      const height = 600;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;

      console.log('Opening OAuth window...');
      const authWindow = window.open(
        authUrl,
        'shopify-auth',
        `width=${width},height=${height},left=${left},top=${top}`
      );

      if (!authWindow) {
        console.error('Failed to open popup window');
        throw new Error('Please allow pop-ups for this site to connect your Shopify store');
      }
      console.log('OAuth window opened successfully');

      if (checkInterval) {
        clearInterval(checkInterval);
      }

      const intervalId = setInterval(() => {
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
              return;
            }

            if (oauthSession.error) {
              if (oauthSession.error === "Session Started...") {
                return;
              }

              cleanOauthSession(oauthSession);
              setHasError(true);
              if (authWindow && !authWindow.closed) {
                authWindow.close();
              }
              return;
            }

            cleanOauthSession(oauthSession);
            onSuccess(validDomain);
            if (authWindow && !authWindow.closed) {
              authWindow.close();
            }
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
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          <div className="text-center mb-6">
            <div className="mx-auto flex items-center justify-center h-20 w-20 mb-4">
              <img
                src="https://iipaykvimkbbnoobtpzz.supabase.co/storage/v1/object/public/public-bucket/Revoa%20Transparent%20Icon.png"
                alt="Revoa Store Sync"
                className="w-full h-full object-contain"
              />
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Enter your .myshopify.com URL below. You can find your URL in Settings {'>'} Domains on Shopify.
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

              {hasError && (
                <div className="border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <HelpCircle className="w-5 h-5 text-red-500 dark:text-red-400 mt-0.5 flex-shrink-0" />
                    <div className="text-sm">
                      {errorMessage && (
                        <p className="font-medium text-red-600 dark:text-red-400 mb-2.5">{errorMessage}</p>
                      )}
                      <p className="font-medium text-gray-900 dark:text-white mb-2.5">Having trouble connecting?</p>
                      <ul className="space-y-2 text-gray-700 dark:text-gray-300">
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
                  </div>
                </div>
              )}
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShopifyConnectModal;
