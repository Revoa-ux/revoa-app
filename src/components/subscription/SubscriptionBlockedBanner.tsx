import React from 'react';
import { MousePointerClick } from 'lucide-react';
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
    <div
      className="mb-6 rounded-lg border border-red-200/50 dark:border-red-800/50 p-4 relative overflow-hidden"
      style={{
        background: 'linear-gradient(90deg, rgba(239, 68, 68, 0.08) 0%, rgba(251, 146, 60, 0.08) 50%, rgba(239, 68, 68, 0.05) 100%)'
      }}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-sm text-gray-900 dark:text-white">
            {title}
          </p>
          <p className="text-sm text-gray-700 dark:text-gray-300 mt-0.5">
            {subtitle}
          </p>
        </div>

        <a
          href={getPricingUrl()}
          target="_blank"
          rel="noopener noreferrer"
          className="relative flex-shrink-0 group"
        >
          <span className="absolute inset-0 rounded-lg bg-gray-800 opacity-0 group-hover:opacity-100 transition-opacity" />
          <span className="relative flex items-center gap-2 h-8 px-3 bg-gray-800 text-white text-sm font-medium rounded-lg border border-gray-700 shadow-sm hover:bg-gray-700 transition-all">
            <MousePointerClick className="w-4 h-4 transition-transform group-hover:scale-110" />
            <span>Upgrade Plan On Shopify</span>
          </span>
        </a>
      </div>
    </div>
  );
}
