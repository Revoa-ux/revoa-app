import React, { useState, useEffect } from 'react';
import { AlertTriangle, ExternalLink, X, TrendingUp, MousePointerClick } from 'lucide-react';
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

  const gradientStyle = isUrgent
    ? 'linear-gradient(90deg, rgba(239, 68, 68, 0.08) 0%, rgba(244, 114, 182, 0.08) 50%, rgba(239, 68, 68, 0.05) 100%)'
    : 'linear-gradient(90deg, rgba(245, 158, 11, 0.08) 0%, rgba(251, 191, 36, 0.08) 50%, rgba(245, 158, 11, 0.05) 100%)';

  const borderColor = isUrgent
    ? 'border-red-200/50 dark:border-red-800/50'
    : 'border-amber-200/50 dark:border-amber-800/50';

  return (
    <div
      className={`mb-6 rounded-lg border p-4 relative overflow-hidden ${borderColor}`}
      style={{ background: gradientStyle }}
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div className="min-w-0 flex-1 flex flex-col sm:flex-row sm:items-center sm:gap-2">
          <p className="font-semibold text-sm text-gray-900 dark:text-white">
            {isUrgent ? 'Urgent: Near Order Limit' : 'Approaching Order Limit'}
          </p>
          <span className="hidden sm:inline text-gray-400 dark:text-gray-500">-</span>
          <p className="text-sm text-gray-700 dark:text-gray-300 mt-0.5 sm:mt-0">
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
            className="relative flex-shrink-0 group w-full sm:w-auto"
          >
            <span className="relative flex items-center justify-center sm:justify-start gap-2 h-9 sm:h-8 px-3 bg-white text-gray-800 text-sm font-medium rounded-lg border border-gray-300 shadow-sm hover:bg-gray-50 transition-all">
              <span>Upgrade Plan On Shopify</span>
              <MousePointerClick className="w-4 h-4 transition-transform group-hover:scale-110" />
            </span>
          </a>
        </div>
      </div>
    </div>
  );
}
