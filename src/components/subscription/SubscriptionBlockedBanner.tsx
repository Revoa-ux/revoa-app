import React, { useState } from 'react';
import { MousePointerClick, RefreshCw } from 'lucide-react';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { getShopifyPricingUrl, formatSubscriptionStatus } from '@/lib/subscriptionService';
import { useConnectionStore } from '@/lib/connectionStore';
import { toast } from 'sonner';

export function SubscriptionBlockedBanner() {
  const { hasActiveSubscription, isOverLimit, subscriptionStatus, checkSubscription } = useSubscription();
  const { shopify } = useConnectionStore();
  const [refreshing, setRefreshing] = useState(false);

  // Show banner if subscription is inactive OR user is over their order limit
  const shouldShowBanner = !hasActiveSubscription || isOverLimit;

  const getPricingUrl = (): string => {
    if (!shopify.installation?.store_url) return '#';

    const shopDomain = shopify.installation.store_url
      .replace('https://', '')
      .replace('.myshopify.com', '');

    return getShopifyPricingUrl(shopDomain);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await checkSubscription();
      toast.success('Subscription status refreshed from Shopify');
    } catch (error) {
      console.error('Error refreshing subscription:', error);
      toast.error('Failed to refresh subscription status');
    } finally {
      setRefreshing(false);
    }
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
      className="mb-6 rounded-lg border border-red-200/50 dark:border-red-800/50 p-3 relative overflow-hidden"
      style={{
        background: 'linear-gradient(90deg, rgba(239, 68, 68, 0.08) 0%, rgba(251, 146, 60, 0.08) 50%, rgba(239, 68, 68, 0.05) 100%)'
      }}
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
        <div className="min-w-0 flex-1 flex flex-col sm:flex-row sm:items-center sm:gap-2">
          <p className="font-semibold text-sm text-gray-900 dark:text-white">
            {title}
          </p>
          <span className="hidden sm:inline text-gray-400 dark:text-gray-500">-</span>
          <p className="text-sm text-gray-700 dark:text-gray-300">
            {subtitle}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="relative flex-shrink-0 group"
          >
            <span className="relative flex items-center justify-center gap-2 h-8 px-3 bg-white text-gray-800 text-sm font-medium rounded-lg border border-gray-300 shadow-sm hover:bg-gray-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
              <RefreshCw className={`w-4 h-4 transition-transform ${refreshing ? 'animate-spin' : 'group-hover:rotate-180'}`} />
              <span>Refresh Status</span>
            </span>
          </button>

          <a
            href={getPricingUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="relative flex-shrink-0 group"
          >
            <span className="relative flex items-center justify-center gap-2 h-8 px-3 bg-white text-gray-800 text-sm font-medium rounded-lg border border-gray-300 shadow-sm hover:bg-gray-50 transition-all">
              <span>Upgrade Plan On Shopify</span>
              <MousePointerClick className="w-4 h-4 transition-transform group-hover:scale-110" />
            </span>
          </a>
        </div>
      </div>
    </div>
  );
}
