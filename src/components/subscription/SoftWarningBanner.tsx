import React, { useState, useEffect } from 'react';
import { AlertTriangle, ExternalLink, X, TrendingUp } from 'lucide-react';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { getShopifyPricingUrl } from '@/lib/subscriptionService';
import { useConnectionStore } from '@/lib/connectionStore';

const SESSION_STORAGE_KEY = 'revoa-subscription-warning-dismissed';

export function SoftWarningBanner() {
  const { hasActiveSubscription, isOverLimit, usagePercentage, orderCount, orderLimit } = useSubscription();
  const { shopify } = useConnectionStore();
  const [isDismissed, setIsDismissed] = useState(false);

  // Check if warning was dismissed this session
  useEffect(() => {
    const dismissed = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (dismissed) {
      setIsDismissed(true);
    }
  }, []);

  // Show banner if: active subscription + 80-99% usage + not dismissed
  const shouldShowWarning = hasActiveSubscription && !isOverLimit && usagePercentage >= 80;

  const getPricingUrl = (): string => {
    if (!shopify.installation?.store_url) return '#';

    const shopDomain = shopify.installation.store_url
      .replace('https://', '')
      .replace('.myshopify.com', '');

    return getShopifyPricingUrl(shopDomain);
  };

  const handleDismiss = () => {
    sessionStorage.setItem(SESSION_STORAGE_KEY, 'true');
    setIsDismissed(true);
  };

  if (!shouldShowWarning || isDismissed) return null;

  // Determine urgency level
  const isUrgent = usagePercentage >= 95;
  const roundedPercentage = Math.round(usagePercentage);

  return (
    <div
      className={`mb-6 rounded-lg border p-4 ${
        isUrgent
          ? 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/10'
          : 'border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/10'
      }`}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p
            className={`font-semibold text-sm ${
              isUrgent ? 'text-red-900 dark:text-red-100' : 'text-amber-900 dark:text-amber-100'
            }`}
          >
            {isUrgent ? 'Urgent: Near Order Limit' : 'Approaching Order Limit'}
          </p>
          <p
            className={`text-sm mt-0.5 ${
              isUrgent ? 'text-red-700 dark:text-red-300' : 'text-amber-700 dark:text-amber-300'
            }`}
          >
            {orderCount} of {orderLimit === Infinity ? 'unlimited' : orderLimit} orders ({roundedPercentage}% used)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleDismiss}
            className="px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            aria-label="Dismiss warning"
          >
            Dismiss
          </button>

          <a
            href={getPricingUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-shrink-0 px-4 py-2 text-sm bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-colors"
          >
            Upgrade
          </a>
        </div>
      </div>
    </div>
  );
}
