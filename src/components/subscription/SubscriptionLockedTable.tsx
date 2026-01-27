import React from 'react';
import { Lock, AlertCircle } from 'lucide-react';
import { getShopifyPricingUrl } from '@/lib/subscriptionService';
import { useConnectionStore } from '@/lib/connectionStore';
import { toast } from '../../lib/toast';

interface SubscriptionLockedTableProps {
  columns?: string[];
  message?: string;
}

export function SubscriptionLockedTable({
  columns = [],
  message = 'Upgrade to view data',
}: SubscriptionLockedTableProps) {
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

  const mockRowData = Array(5).fill(null).map(() =>
    columns.map(() => {
      const types = ['Campaign Name', '$1,234', '67.8%', 'Active', '2.4x'];
      return types[Math.floor(Math.random() * types.length)];
    })
  );

  return (
    <div className="bg-white dark:bg-dark rounded-xl border border-gray-200 dark:border-[#333333] overflow-hidden">
      {columns.length > 0 && (
        <div className="border-b border-gray-200 dark:border-[#333333] bg-gray-50 dark:bg-dark/50">
          <div className="grid gap-4 px-6 py-3" style={{ gridTemplateColumns: `repeat(${columns.length}, 1fr)` }}>
            {columns.map((column, index) => (
              <div key={index} className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {column}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="divide-y divide-gray-200 dark:divide-[#333333]">
        {mockRowData.map((row, rowIndex) => (
          <div key={rowIndex} className="relative">
            {/* Blurred row content */}
            <div className="blur-sm select-none pointer-events-none">
              <div className="grid gap-4 px-6 py-4" style={{ gridTemplateColumns: `repeat(${columns.length}, 1fr)` }}>
                {row.map((cell, cellIndex) => (
                  <div key={cellIndex} className="text-sm text-gray-900 dark:text-white">
                    {cell}
                  </div>
                ))}
              </div>
            </div>

            {/* Lock icon overlay */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-6 h-6 rounded-full bg-gray-100 dark:bg-[#2a2a2a] flex items-center justify-center">
                <Lock className="w-3 h-3 text-gray-400 dark:text-gray-500" />
              </div>
            </div>
          </div>
        ))}

        {/* Upgrade row */}
        <div className="bg-gray-50 dark:bg-dark/30 px-6 py-8 flex flex-col items-center justify-center text-center">
          <Lock className="w-6 h-6 text-gray-400 dark:text-gray-500 mb-3" />
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{message}</p>
          <a
            href={getPricingUrl()}
            onClick={handleUpgradeClick}
            target="_blank"
            rel="noopener noreferrer"
            className={`btn btn-danger text-sm ${isStoreConnected ? '' : 'opacity-60 cursor-not-allowed'}`}
          >
            {!isStoreConnected && <AlertCircle className="btn-icon w-4 h-4" />}
            {isStoreConnected ? 'View Plans' : 'Connect Store First'}
          </a>
        </div>
      </div>
    </div>
  );
}
