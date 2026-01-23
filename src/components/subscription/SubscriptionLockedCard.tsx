import React from 'react';
import { Lock, ExternalLink } from 'lucide-react';
import { getShopifyPricingUrl } from '@/lib/subscriptionService';
import { useConnectionStore } from '@/lib/connectionStore';

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

  const getPricingUrl = (): string => {
    if (!shopify.installation?.store_url) return '#';

    const shopDomain = shopify.installation.store_url
      .replace('https://', '')
      .replace('.myshopify.com', '');

    return getShopifyPricingUrl(shopDomain);
  };

  return (
    <div className={`rounded-xl p-1 border border-gray-200 bg-gray-50 ${className}`}>
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-300 dark:border-gray-700">
        <div className="flex flex-col items-center justify-center text-center py-8">
          <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 rounded-full flex items-center justify-center mb-4">
            <Lock className="w-8 h-8 text-gray-400 dark:text-gray-500" />
          </div>

          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{title}</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 max-w-xs">{message}</p>

          <a
            href={getPricingUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg font-semibold text-sm hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors"
          >
            View Plans
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>
    </div>
  );
}
