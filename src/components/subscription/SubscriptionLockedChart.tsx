import React from 'react';
import { Lock, TrendingUp, DollarSign, ShoppingCart, AlertCircle } from 'lucide-react';
import { getShopifyPricingUrl } from '@/lib/subscriptionService';
import { useConnectionStore } from '@/lib/connectionStore';
import { toast } from '../../lib/toast';

interface SubscriptionLockedChartProps {
  message?: string;
  height?: number;
}

export function SubscriptionLockedChart({
  message = 'Upgrade to view analytics',
}: SubscriptionLockedChartProps) {
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

  const mockCards = [
    { icon: DollarSign, title: 'Total Revenue', value: '$24,567', change: '+12.5%' },
    { icon: ShoppingCart, title: 'Total Orders', value: '1,234', change: '+8.2%' },
    { icon: TrendingUp, title: 'Avg Order Value', value: '$19.89', change: '+3.1%' },
    { icon: TrendingUp, title: 'Profit Margin', value: '34.2%', change: '+1.8%' },
    { icon: DollarSign, title: 'Ad Spend', value: '$8,432', change: '-5.3%' },
    { icon: TrendingUp, title: 'ROAS', value: '2.91x', change: '+18.4%' },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {mockCards.map((card, index) => (
        <div
          key={index}
          className="relative bg-white dark:bg-dark rounded-xl border border-gray-200 dark:border-[#333333] p-5 overflow-hidden"
        >
          {/* Blurred content */}
          <div className="blur-sm select-none pointer-events-none">
            <div className="flex items-center justify-between mb-4">
              <card.icon className="w-5 h-5 text-gray-400" />
              <span className="text-xs text-emerald-600">{card.change}</span>
            </div>
            <h3 className="text-sm text-gray-600 dark:text-gray-400 mb-1">{card.title}</h3>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{card.value}</p>
          </div>

          {/* Lock icon overlay */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-[#2a2a2a] flex items-center justify-center">
              <Lock className="w-4 h-4 text-gray-400 dark:text-gray-500" />
            </div>
          </div>
        </div>
      ))}

      {/* Upgrade card at the end */}
      <div className="bg-gray-50 dark:bg-dark/30 rounded-xl border border-gray-200 dark:border-[#333333] p-5 flex flex-col items-center justify-center text-center">
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
  );
}
