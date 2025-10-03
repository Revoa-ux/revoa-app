import React, { useState, useEffect } from 'react';
import { Store, HelpCircle, ArrowRight } from 'lucide-react';
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
      if (sessionError || !session?.user) {
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
         
          // Check the access token has been received
          supabase
          .from("oauth_sessions")
          .select("*")
          .eq("user_id", session.user.id)
          .eq("shop_domain", validDomain)
          .maybeSingle()
          .then(({ data: oauthSession, error }) => {
            if (error) {
              setError(`Authentication failed or installation not found, message: ${error}`);
              // Clean up after completion
              CleanOauthSession();
              authWindow.close();
              return;
            }
            if(!oauthSession){
              setError(`No oauth session table found for user and store url`);
              // Clean up after completion 
              CleanOauthSession();  
              authWindow.close();     
              return;    
            }
            if(oauthSession.error){
              if("Session Started..." == oauthSession.error)
                return;

              setError(`Authentication failed or installation not found, message: ${oauthSession.error}`);
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
            setError("Something went wrong checking the installation.");
          });
        
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
              src="https://iipaykvimkbbnoobtpzz.supabase.co/storage/v1/object/public/public-bucket/Revoa%20Transparent%20Icon.png"
              alt="Revoa Store Sync"
              className="w-full h-full object-contain"
            />
          </div>
          <h2 className="text-3xl font-medium text-gray-900">Connect Your Store</h2>
          <p className="text-gray-600 max-w-md mx-auto mb-6">
            Enter your .myshopify.com URL below to connect your store. You can find this URL by logging into your Shopify dashboard and finding the Domains page in your Settings.
          </p>
        </div>
        
        <div className="max-w-md mx-auto">
          <GlassCard>
            <form onSubmit={handleConnect} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Store URL
                </label>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <ShopifyFormInput
                      value={shopUrl}
                      onChange={handleShopChange}
                      error={error}
                      disabled={isLoading}
                      placeholder="your-store.myshopify.com"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isLoading || !shopUrl.trim()}
                    className="w-10 h-10 flex items-center justify-center bg-[linear-gradient(135deg,#E11D48_40%,#EC4899_80%,#E8795A_100%)] text-white rounded-md hover:scale-[1.02] transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100 flex-shrink-0"
                  >
                    {isLoading ? (
                      <div className="h-4 w-4 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                    ) : (
                      <ArrowRight className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-start space-x-3">
                  <HelpCircle className="w-5 h-5 text-gray-500 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-gray-600">
                    <p className="font-semibold text-gray-900 mb-2">Having trouble?</p>
                    <ul className="space-y-1.5">
                      <li className="flex items-start">
                        <span className="text-gray-400 mr-2">•</span>
                        <span>Make sure your browser allows popups</span>
                      </li>
                      <li className="flex items-start">
                        <span className="text-gray-400 mr-2">•</span>
                        <span>Make sure you are not logged into a different store in a separate tab</span>
                      </li>
                      <li className="flex items-start">
                        <span className="text-gray-400 mr-2">•</span>
                        <span>Must be on a paid and active Shopify plan</span>
                      </li>
                      <li className="flex items-start">
                        <span className="text-gray-400 mr-2">•</span>
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