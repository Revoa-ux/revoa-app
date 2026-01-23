import React from 'react';
import { Lock, ExternalLink } from 'lucide-react';
import { getShopifyPricingUrl } from '@/lib/subscriptionService';
import { useConnectionStore } from '@/lib/connectionStore';

interface SubscriptionLockedTableProps {
  columns?: string[];
  message?: string;
}

export function SubscriptionLockedTable({
  columns = [],
  message = 'Upgrade to view data',
}: SubscriptionLockedTableProps) {
  const { shopify } = useConnectionStore();

  const getPricingUrl = (): string => {
    if (!shopify.installation?.store_url) return '#';

    const shopDomain = shopify.installation.store_url
      .replace('https://', '')
      .replace('.myshopify.com', '');

    return getShopifyPricingUrl(shopDomain);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      {columns.length > 0 && (
        <div className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
          <div className="grid gap-4 px-6 py-3" style={{ gridTemplateColumns: `repeat(${columns.length}, 1fr)` }}>
            {columns.map((column, index) => (
              <div key={index} className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {column}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col items-center justify-center py-16 px-6">
        <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 rounded-full flex items-center justify-center mb-4">
          <Lock className="w-8 h-8 text-gray-400 dark:text-gray-500" />
        </div>

        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Upgrade Required</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 max-w-xs text-center">{message}</p>

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
  );
}
