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
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-100 dark:bg-emerald-900/20 rounded-full mb-4">
          <Check className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
        </div>
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
          Store Connected Successfully!
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Your Shopify store is now connected to Revoa
        </p>
      </div>

      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg flex items-center justify-center">
              <Store className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
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

        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
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
