import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import ShopifyFormInput from "@/components/ShopifyFormInput";
import ShopifyConnectButton from "@/components/ShopifyConnectButton";
import ShopifyLogo from "@/components/ShopifyLogo";
import GlassCard from "@/components/GlassCard";
import StoreCard from "@/components/StoreCard";
import { generateAuthUrl, getShopifyAuth, clearShopifyAuth, isTokenValid } from "@/services/shopifyAuth";
import { toast } from "sonner";

const Index = () => {
  const [shopUrl, setShopUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [authData, setAuthData] = useState(getShopifyAuth());
  
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Check if we have valid auth data on mount
    const auth = getShopifyAuth();
    setAuthData(auth);
    
    // Check if we need to redirect to the dashboard
    if (auth && isTokenValid() && location.pathname === "/") {
      navigate("/dashboard");
    }
  }, [navigate, location.pathname]);

  const handleShopChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setShopUrl(e.target.value);
    setError("");
  };

  const handleConnect = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!shopUrl.trim()) {
      setError("Please enter your Shopify store URL");
      return;
    }

    try {
      setIsLoading(true);
      
      // Generate and redirect to Shopify OAuth URL
      const authUrl = generateAuthUrl(shopUrl);
      
      // In a real app, you might want to save the shop URL to session storage
      // to retrieve it later in the callback
      sessionStorage.setItem("shop_url", shopUrl);
      
      // Redirect to Shopify for authorization
      window.location.href = authUrl;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to connect to Shopify";
      setError(errorMessage);
      toast.error(errorMessage);
      setIsLoading(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      setIsLoading(true);
      clearShopifyAuth();
      setAuthData(null);
      toast.success("Store disconnected successfully");
      navigate("/");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to disconnect store";
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      {/* Grid Background */}
      <div 
        className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:64px_64px]"
        style={{ 
          maskImage: 'radial-gradient(circle at center, transparent, black 30%, transparent)',
          WebkitMaskImage: 'radial-gradient(circle at center, transparent, black 30%, transparent)'
        }}
      />

      <div className="w-full max-w-[420px] space-y-8 relative">
        <div className="text-center">
          <div className="flex justify-center mb-6">
            <div className="w-32 h-8 relative">
              <img 
                src="https://jfwmnaaujzuwrqqhgmuf.supabase.co/storage/v1/object/public/REVOA%20(Public)//REVOA%20LOGO.png" 
                alt="Logo" 
                className="w-full h-full object-contain"
              />
            </div>
          </div>
          <h2 className="text-3xl font-medium text-gray-900">Connect Your Store</h2>
          <p className="mt-2 text-sm text-gray-600">
            Connect your Shopify store to get started
          </p>
        </div>

        <GlassCard>
          {authData ? (
            <StoreCard
              storeName={authData.storeName}
              storeUrl={authData.storeUrl}
              onDisconnect={handleDisconnect}
            />
          ) : (
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
                />
              </div>

              <ShopifyConnectButton
                onClick={handleConnect}
                isLoading={isLoading}
                disabled={!shopUrl.trim()}
              />
            </form>
          )}
        </GlassCard>
      </div>
    </div>
  );
};

export default Index;