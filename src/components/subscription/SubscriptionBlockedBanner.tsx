import React from 'react';
import { TrendingUp } from 'lucide-react';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { getShopifyPricingUrl, formatSubscriptionStatus } from '@/lib/subscriptionService';
import { useConnectionStore } from '@/lib/connectionStore';

export function SubscriptionBlockedBanner() {
  const { hasActiveSubscription, isOverLimit, subscriptionStatus } = useSubscription();
  const { shopify } = useConnectionStore();

  // Show banner if subscription is inactive OR user is over their order limit
  const shouldShowBanner = !hasActiveSubscription || isOverLimit;

  const getPricingUrl = (): string => {
    if (!shopify.installation?.store_url) return '#';

    const shopDomain = shopify.installation.store_url
      .replace('https://', '')
      .replace('.myshopify.com', '');

    return getShopifyPricingUrl(shopDomain);
  };

  const getStatusMessage = (): { title: string; subtitle: string } => {
    if (!hasActiveSubscription && subscriptionStatus) {
      return {
        title: formatSubscriptionStatus(subscriptionStatus),
        subtitle: 'Select a plan to continue using Revoa',
      };
    }

    if (isOverLimit) {
      return {
        title: 'Order Limit Reached',
        subtitle: 'Upgrade your plan to continue processing orders',
      };
    }

    return {
      title: 'No Active Subscription',
      subtitle: 'Select a plan to continue using Revoa',
    };
  };

  if (!shouldShowBanner) return null;

  const { title, subtitle } = getStatusMessage();

  return (
    <div className="fixed top-3 left-3 lg:left-[268px] right-3 z-40 animate-in slide-in-from-top duration-300">
      <div
        className="rounded-xl p-3 shadow-lg border border-red-200/50 dark:border-red-800/50"
        style={{
          background: 'linear-gradient(to right, #fef2f2 0%, #fee2e2 100%)',
        }}
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-sm text-red-900 dark:text-red-100 truncate">
                {title}
              </p>
              <p className="text-xs text-red-700 dark:text-red-300 truncate">
                {subtitle}
              </p>
            </div>
          </div>

          <a
            href={getPricingUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-shrink-0 inline-flex items-center gap-1.5 px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg font-semibold text-sm hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors"
          >
            {isOverLimit ? 'Upgrade Plan' : 'Select Plan'}
          </a>
        </div>
      </div>
    </div>
  );
}
