import React, { useState, useEffect } from 'react';
import { Store } from 'lucide-react';
import { toast } from 'sonner';
import ShopifyFormInput from '@/components/ShopifyFormInput';
import ShopifyConnectButton from '@/components/ShopifyConnectButton';
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
  const [error, setError] = useState('');

  const handleShopChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setShopUrl(e.target.value);
    setError('');
  };

  // Set up message listener for the popup window
  useEffect(() => {
    const messageHandler = (event: MessageEvent) => {
      if (event.data.type === 'shopify:success') {
        onStoreConnected(true);
        setIsLoading(false);
        toast.success('Successfully connected to Shopify');
      } else if (event.data.type === 'shopify:error') {
        setError(event.data.error || 'Failed to connect to Shopify');
        setIsLoading(false);
        toast.error(event.data.error || 'Failed to connect to Shopify');
      }
    };

    window.addEventListener('message', messageHandler);
    return () => window.removeEventListener('message', messageHandler);
  }, [onStoreConnected]);

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!shopUrl.trim()) {
      setError('Please enter your Shopify store URL');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Verify we have a valid session first
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        throw new Error('Please sign in to connect your store');
      }

      const validation = validateStoreUrl(shopUrl);
      if (!validation.success) {
        setError(validation.error);
        setIsLoading(false);
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

      // Check if window was closed before completing auth
      const checkTabClosed = setInterval(() => {
        if (authWindow.closed) {
          clearInterval(checkTabClosed);
          setIsLoading(false);          
          
          // Check the access token has been received
          supabase
          .from("oauth_sessions")
          .select("*")
          .eq("user_id", session.user.id)
          .eq("shop_domain", validDomain)
          .single()
          .then(({ data: oauthSession, error }) => {
            if (error) {
              setError(`Authentication failed or installation not found, message: ${error}`);
              return;
            }
            if(!oauthSession){
              setError(`No oauth session table found for user and store url`);
              return;            
            }
            if(oauthSession.error){
              setError(`Authentication failed or installation not found, message: ${oauthSession.error}`);
              return;
            }            

            // Clean up after completion 
            supabase
            .from("oauth_sessions")
            .delete()
            .eq("id", oauthSession.id)
            .then(({ error: deleteError }) => {
              if (deleteError) {
                console.error("Failed to delete session:", deleteError);
                return;
              } else {
                console.log("Session deleted successfully.");
              }
            });

            onStoreConnected(true);
            
          })
          .catch((err) => {
            console.error("Unexpected error fetching installation:", err);
            setError("Something went wrong checking the installation.");
          });
            }
      }, 1000);
    } catch (error) {
      console.error('Error connecting to Shopify:', error);
      setError(error instanceof Error ? error.message : 'Failed to connect to Shopify store');
      toast.error(error instanceof Error ? error.message : 'Failed to connect to Shopify store');
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-[540px] mx-auto">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-24 w-24 mb-4">
            <img 
              src="https://jfwmnaaujzuwrqqhgmuf.supabase.co/storage/v1/object/public/REVOA%20(Public)//REVOA%20Sync%20Store.png"
              alt="Revoa Store Sync"
              className="w-full h-full object-contain"
            />
          </div>
          <h2 className="text-3xl font-medium text-gray-900">Connect Your Store</h2>
          <p className="text-gray-600 max-w-md mx-auto mb-6">
            Connect your Shopify store to import your products, orders, and customers
          </p>
        </div>
        
        <div className="max-w-md mx-auto">
          <GlassCard>
            <form onSubmit={handleConnect} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Store URL
                </label>
                <ShopifyFormInput
                  value={shopUrl}
                  onChange={handleShopChange}
                  error={error}
                  disabled={isLoading}
                  placeholder="your-store.myshopify.com"
                />
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-start space-x-3">
                  <Store className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div className="text-sm text-gray-600">
                    <p className="font-medium text-gray-900 mb-1">Store Requirements</p>
                    <ul className="space-y-1">
                      <li>• Must be on a paid Shopify plan</li>
                      <li>• Admin access is required</li>
                      <li>• Store must be active and not frozen</li>
                    </ul>
                  </div>
                </div>
              </div>

              <ShopifyConnectButton
                loading={isLoading}
                disabled={!shopUrl.trim()}
              >
                Connect Store
              </ShopifyConnectButton>
            </form>
          </GlassCard>
        </div>
      </div>
    </div>
  );
};

export default StoreIntegration;