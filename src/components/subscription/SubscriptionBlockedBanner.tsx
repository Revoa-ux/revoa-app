import React, { useEffect, useState } from 'react';
import { AlertTriangle, ExternalLink } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getSubscription, hasActiveSubscription, getShopifyPricingUrl, formatSubscriptionStatus } from '@/lib/subscriptionService';
import { useConnectionStore } from '@/lib/connectionStore';
import type { SubscriptionStatus } from '@/types/pricing';

export function SubscriptionBlockedBanner() {
  const { user } = useAuth();
  const { shopify } = useConnectionStore();
  const [isBlocked, setIsBlocked] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(null);

  useEffect(() => {
    checkSubscription();
  }, [user?.id, shopify.installation?.id]);

  const checkSubscription = async () => {
    if (!shopify.installation?.id) return;

    try {
      const subscription = await getSubscription(shopify.installation.id);

      if (!subscription) {
        setIsBlocked(true);
        setSubscriptionStatus(null);
        return;
      }

      const active = hasActiveSubscription(subscription.subscriptionStatus);
      setIsBlocked(!active);
      setSubscriptionStatus(subscription.subscriptionStatus);
    } catch (error) {
      console.error('[SubscriptionBlockedBanner] Error checking subscription:', error);
    }
  };

  const getPricingUrl = (): string => {
    if (!shopify.installation?.store_url) return '#';

    const shopDomain = shopify.installation.store_url
      .replace('https://', '')
      .replace('.myshopify.com', '');

    return getShopifyPricingUrl(shopDomain);
  };

  if (!isBlocked) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-40 bg-red-600 dark:bg-red-700 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <div className="min-w-0">
              <p className="font-semibold text-sm">
                {subscriptionStatus ? formatSubscriptionStatus(subscriptionStatus) : 'No Active Subscription'}
              </p>
              <p className="text-xs text-red-100 dark:text-red-200">
                Reactivate your subscription to continue using Revoa
              </p>
            </div>
          </div>

          <a
            href={getPricingUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-shrink-0 inline-flex items-center gap-2 px-4 py-2 bg-white text-red-600 rounded-lg font-semibold text-sm hover:bg-red-50 transition-colors"
          >
            Reactivate Plan
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>
    </div>
  );
}
