import React from 'react';
import { Lock, ExternalLink, AlertCircle } from 'lucide-react';
import { getShopifyPricingUrl } from '@/lib/subscriptionService';
import { useConnectionStore } from '@/lib/connectionStore';
import { toast } from '../../lib/toast';

interface SubscriptionLockedCardProps {
  title?: string;
  message?: string;
  className?: string;
}

export function SubscriptionLockedCard({
  title = 'Upgrade Required',
  message = 'Upgrade to access this feature',
  className = '',
}: SubscriptionLockedCardProps) {
  const { shopify } = useConnectionStore();
  const isStoreConnected = !!shopify.installation?.store_url;

  const handleUpgradeClick = (e: React.MouseEvent) => {
    if (!isStoreConnected) {
      e.preventDefault();
      toast.error('Please connect your Shopify store first', {
        description: 'Go to Settings > Integrations to connect your store',
      });
    }
  };

  const getPricingUrl = (): string => {
    if (!shopify.installation?.store_url) return '#';

    const shopDomain = shopify.installation.store_url
      .replace('https://', '')
      .replace('.myshopify.com', '');

    return getShopifyPricingUrl(shopDomain);
  };

  return (
    <div className={`rounded-xl p-1 border border-gray-200 bg-gray-50 ${className}`}>
      <div className="bg-white dark:bg-dark rounded-lg p-6 border border-gray-300 dark:border-[#333333]">
        <div className="flex flex-col items-center justify-center text-center py-8">
          <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-[#2a2a2a] dark:to-[#262626] rounded-full flex items-center justify-center mb-4">
            <Lock className="w-8 h-8 text-gray-400 dark:text-gray-500" />
          </div>

          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{title}</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 max-w-xs">{message}</p>

          <a
            href={getPricingUrl()}
            onClick={handleUpgradeClick}
            target="_blank"
            rel="noopener noreferrer"
            className={`btn btn-primary ${isStoreConnected ? '' : 'opacity-60 cursor-not-allowed'}`}
          >
            {!isStoreConnected && <AlertCircle className="btn-icon w-4 h-4" />}
            {isStoreConnected ? 'View Plans' : 'Connect Store First'}
            <ExternalLink className="btn-icon btn-icon-arrow w-4 h-4" />
          </a>
        </div>
      </div>
    </div>
  );
}
