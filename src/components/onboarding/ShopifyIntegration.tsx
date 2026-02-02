import React, { useEffect, useState } from 'react';
import { Check, Store, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useConnectionStore } from '../../lib/connectionStore';
import { LoadingSpinner } from '../PageSkeletons';

interface ShopifyIntegrationProps {
  onStoreConnected?: (connected: boolean) => void;
}

const ShopifyIntegration: React.FC<ShopifyIntegrationProps> = ({ onStoreConnected }) => {
  const navigate = useNavigate();
  const { shopify, refreshShopifyStatus } = useConnectionStore();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkConnection = async () => {
      try {
        await refreshShopifyStatus();
        setIsLoading(false);

        if (!shopify.isConnected) {
          navigate('/onboarding/store', { replace: true });
        } else if (onStoreConnected) {
          onStoreConnected(true);
        }
      } catch (error) {
        console.error('Error checking Shopify connection:', error);
        setIsLoading(false);
        navigate('/onboarding/store', { replace: true });
      }
    };

    checkConnection();
  }, [shopify.isConnected, refreshShopifyStatus, navigate, onStoreConnected]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  if (!shopify.isConnected || !shopify.shop) {
    return null;
  }

  return (
    <div className="max-w-[540px] mx-auto">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center p-0.5 backdrop-blur-sm rounded-full shadow-sm bg-emerald-500/15 mb-4">
          <div
            className="w-14 h-14 rounded-full bg-emerald-500 flex items-center justify-center"
            style={{
              boxShadow: 'inset 0px 4px 12px 0px rgba(255,255,255,0.45), inset 0px -2px 4px 0px rgba(0,0,0,0.25)'
            }}
          >
            <Check className="w-6 h-6 text-white" strokeWidth={2.5} />
          </div>
        </div>
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
          Store Connected Successfully!
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Your Shopify store is now connected to Revoa
        </p>
      </div>

      <div className="bg-white dark:bg-dark border border-gray-200 dark:border-[#3a3a3a] rounded-lg p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            <div className="p-0.5 backdrop-blur-sm rounded-lg shadow-sm bg-emerald-500/15">
              <div
                className="w-11 h-11 rounded-md bg-emerald-500 flex items-center justify-center"
                style={{
                  boxShadow: 'inset 0px 3px 10px 0px rgba(255,255,255,0.4), inset 0px -2px 3px 0px rgba(0,0,0,0.2)'
                }}
              >
                <Store className="w-5 h-5 text-white" />
              </div>
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-1">
              Connected Store
            </h3>
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                {shopify.shop}
              </p>
              <a
                href={`https://${shopify.shop}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors"
              >
                <span>Visit store</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          <div className="flex-shrink-0">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300">
              <Check className="w-3 h-3" />
              Active
            </span>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-[#3a3a3a]">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Revoa will automatically sync your orders, products, and customer data from your Shopify store.
          </p>
        </div>
      </div>

      <div className="mt-6 text-center">
        <p className="text-sm text-gray-500 dark:text-gray-500">
          Ready to continue? Click "Next" to connect your ad platforms
        </p>
      </div>
    </div>
  );
};

export default ShopifyIntegration;
