import React, { useState, useEffect } from 'react';
import { Store, HelpCircle, Link2, Loader2 } from 'lucide-react';
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

  const handleShopChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setShopUrl(e.target.value);
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
      toast.error('Please enter your Shopify store URL');
      return;
    }

    setIsLoading(true);
    setError('');

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
              // Clean up after completion
              CleanOauthSession();
              authWindow.close();
              return;
            }
            if(!oauthSession){
              toast.error('Connection failed. Please try again.');
              // Clean up after completion
              CleanOauthSession();
              authWindow.close();
              return;
            }
            if(oauthSession.error){
              if("Session Started..." == oauthSession.error)
                return;

              toast.error('Connection failed. Please try again.');
              // Clean up after completion
              CleanOauthSession();
              authWindow.close();
              return;
            }            

            // Clean up after completion 
            CleanOauthSession();              
            onStoreConnected(true);            
            authWindow.close();

            function CleanOauthSession() {
              if (oauthSession?.id) {
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
              }

              clearInterval(checkTabClosed);
              setIsLoading(false);
            }
          })
          .catch((err) => {
            console.error("Unexpected error fetching installation:", err);
            toast.error('Connection failed. Please try again.');
            clearInterval(checkTabClosed);
            setIsLoading(false);
          });
        
      }, 1000);
    } catch (error) {
      console.error('Error connecting to Shopify:', error);
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
              src="https://iipaykvimkbbnoobtpzz.supabase.co/storage/v1/object/public/public-bucket/Revoa%20Transparent%20Icon.png"
              alt="Revoa Store Sync"
              className="w-full h-full object-contain"
            />
          </div>
          <h2 className="text-3xl font-medium text-gray-900 mb-2">Connect Your Store</h2>
          <p className="text-sm text-gray-600 max-w-md mx-auto mb-6">
            Enter your .myshopify.com URL below. You can find your URL in Settings {'->'} Domains.
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
                    disabled={isLoading || !shopUrl.trim()}
                    className="absolute right-0 top-0 w-10 h-10 flex items-center justify-center bg-[linear-gradient(135deg,#E11D48_40%,#EC4899_80%,#E8795A_100%)] text-white rounded-r-md hover:opacity-90 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:opacity-60"
                  >
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Link2 className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

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
            </form>
          </GlassCard>
        </div>
      </div>
    </div>
  );
};

export default StoreIntegration;