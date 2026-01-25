import React from 'react';
import { MousePointerClick, AlertCircle, Gem } from 'lucide-react';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { getShopifyPricingUrl, formatSubscriptionStatus } from '@/lib/subscriptionService';
import { useConnectionStore } from '@/lib/connectionStore';
import { toast } from '../../lib/toast';

export function SubscriptionBlockedBanner() {
  const { hasActiveSubscription, isOverLimit, subscriptionStatus, loading } = useSubscription();
  const { shopify } = useConnectionStore();

  if (loading) return null;

  const shouldShowBanner = !hasActiveSubscription || isOverLimit;

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
    <div className="mb-6 rounded-xl p-0.5 border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30">
      <div
        className="rounded-lg border border-red-300 dark:border-red-800/60 px-4 py-3"
        style={{ background: 'linear-gradient(to bottom, rgba(254, 242, 242, 1), rgba(254, 226, 226, 1))' }}
      >
        <style>{`
          .dark .subscription-blocked-inner {
            background: linear-gradient(to bottom, rgba(127, 29, 29, 0.15), rgba(127, 29, 29, 0.25)) !important;
          }
        `}</style>
        <div className="subscription-blocked-inner flex items-center justify-center gap-3 flex-wrap">
          <Gem className="w-5 h-5 flex-shrink-0 text-red-600 dark:text-red-400" />

          <div className="flex items-center gap-2 text-center">
            <span className="font-semibold text-sm text-gray-900 dark:text-white">
              {title}
            </span>
            <span className="text-gray-400 dark:text-gray-500">-</span>
            <span className="text-sm text-gray-700 dark:text-gray-300">
              {subtitle}
            </span>
          </div>

          <a
            href={getPricingUrl()}
            onClick={handleUpgradeClick}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-white transition-all duration-150 hover:-translate-y-0.5 ${!isStoreConnected ? 'cursor-not-allowed opacity-60' : ''}`}
            style={{
              background: 'linear-gradient(to bottom, #1f2937, #111827)',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
            }}
          >
            {!isStoreConnected && <AlertCircle className="w-3.5 h-3.5" />}
            <span>{isStoreConnected ? 'Upgrade Plan' : 'Connect Store'}</span>
            <MousePointerClick className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
}
