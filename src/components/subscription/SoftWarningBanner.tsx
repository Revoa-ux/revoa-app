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
    <div className="fixed top-3 left-3 lg:left-[268px] right-3 z-40 animate-in slide-in-from-top duration-300">
      <div
        className={`rounded-xl p-3 shadow-lg ${
          isUrgent
            ? 'border border-red-200/50 dark:border-red-800/50'
            : 'border border-amber-200/50 dark:border-amber-800/50'
        }`}
        style={{
          background: isUrgent
            ? 'linear-gradient(to right, #fef2f2 0%, #fee2e2 100%)'
            : 'linear-gradient(to right, #fffbeb 0%, #fef3c7 100%)',
        }}
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div
              className={`flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ${
                isUrgent ? 'bg-red-100 dark:bg-red-900/30' : 'bg-amber-100 dark:bg-amber-900/30'
              }`}
            >
              <TrendingUp
                className={`w-5 h-5 ${
                  isUrgent ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'
                }`}
              />
            </div>
            <div className="min-w-0 flex-1">
              <p
                className={`font-semibold text-sm truncate ${
                  isUrgent ? 'text-red-900 dark:text-red-100' : 'text-amber-900 dark:text-amber-100'
                }`}
              >
                {isUrgent ? 'Urgent: Near Order Limit' : 'Approaching Order Limit'}
              </p>
              <p
                className={`text-xs truncate ${
                  isUrgent ? 'text-red-700 dark:text-red-300' : 'text-amber-700 dark:text-amber-300'
                }`}
              >
                {orderCount} of {orderLimit === Infinity ? 'unlimited' : orderLimit} orders ({roundedPercentage}% used)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={getPricingUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-shrink-0 inline-flex items-center gap-1.5 px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg font-semibold text-sm hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors"
            >
              Upgrade
            </a>

            <button
              onClick={handleDismiss}
              className={`p-2 rounded-lg transition-colors ${
                isUrgent
                  ? 'hover:bg-red-100 dark:hover:bg-red-900/30'
                  : 'hover:bg-amber-100 dark:hover:bg-amber-900/30'
              }`}
              aria-label="Dismiss warning"
            >
              <X
                className={`w-4 h-4 ${
                  isUrgent ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'
                }`}
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
