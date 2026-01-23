import React from 'react';
import { ShieldAlert, ExternalLink } from 'lucide-react';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { getShopifyPricingUrl, formatSubscriptionStatus } from '@/lib/subscriptionService';
import { useConnectionStore } from '@/lib/connectionStore';

export function SubscriptionBlockedBanner() {
  const { hasActiveSubscription, isOverLimit, subscriptionStatus, usagePercentage } = useSubscription();
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
        subtitle: 'Reactivate your subscription to continue using Revoa',
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
    <div className="fixed top-0 left-0 lg:left-64 right-0 z-40 bg-red-50/80 dark:bg-red-900/20 backdrop-blur-md border-b border-red-200 dark:border-red-800 shadow-lg h-14 animate-in slide-in-from-top duration-300">
      <div className="max-w-7xl mx-auto px-4 h-full">
        <div className="flex items-center justify-between gap-4 h-full">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <ShieldAlert className="w-5 h-5 flex-shrink-0 text-red-600 dark:text-red-400" />
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
            className="flex-shrink-0 inline-flex items-center gap-2 px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg font-semibold text-sm hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors"
          >
            {isOverLimit ? 'Upgrade Plan' : 'Reactivate Plan'}
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>
    </div>
  );
}
