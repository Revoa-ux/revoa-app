import React, { useState, useEffect } from 'react';
import { AlertTriangle, ExternalLink, X, TrendingUp, MousePointerClick, AlertCircle } from 'lucide-react';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { getShopifyPricingUrl } from '@/lib/subscriptionService';
import { useConnectionStore } from '@/lib/connectionStore';
import { toast } from 'sonner';

const SESSION_STORAGE_KEY = 'revoa-subscription-warning-dismissed';

export function SoftWarningBanner() {
  const { hasActiveSubscription, isOverLimit, usagePercentage, orderCount, orderLimit, loading } = useSubscription();
  const { shopify } = useConnectionStore();
  const [isDismissed, setIsDismissed] = useState(false);

  // Don't show banner while loading subscription data
  if (loading) return null;

  // Check if warning was dismissed this session
  useEffect(() => {
    const dismissed = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (dismissed) {
      setIsDismissed(true);
    }
  }, []);

  // Show banner if:
  // - Blocked (>= 100%): always show, can't dismiss
  // - Urgent (95-99%): show if not dismissed
  // - Warning (80-94%): show if not dismissed
  const isBlocked = isOverLimit || usagePercentage >= 100;
  const isUrgent = !isBlocked && usagePercentage >= 95;
  const isWarning = !isBlocked && !isUrgent && usagePercentage >= 80;

  const shouldShowBanner = hasActiveSubscription && (isBlocked || isUrgent || isWarning);
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

  const handleDismiss = () => {
    // Can't dismiss blocked state
    if (isBlocked) return;

    sessionStorage.setItem(SESSION_STORAGE_KEY, 'true');
    setIsDismissed(true);
  };

  // Don't allow dismissing blocked state
  if (!shouldShowBanner || (isDismissed && !isBlocked)) return null;

  const roundedPercentage = Math.round(usagePercentage);

  // Color scheme based on state:
  // Blocked (>= 100%): Red
  // Urgent (95-99%): Yellow/Amber
  // Warning (80-94%): Blue
  const gradientStyle = isBlocked
    ? 'linear-gradient(90deg, rgba(239, 68, 68, 0.08) 0%, rgba(244, 114, 182, 0.08) 50%, rgba(239, 68, 68, 0.05) 100%)'
    : isUrgent
    ? 'linear-gradient(90deg, rgba(245, 158, 11, 0.08) 0%, rgba(251, 191, 36, 0.08) 50%, rgba(245, 158, 11, 0.05) 100%)'
    : 'linear-gradient(90deg, rgba(59, 130, 246, 0.08) 0%, rgba(147, 197, 253, 0.08) 50%, rgba(59, 130, 246, 0.05) 100%)';

  const borderColor = isBlocked
    ? 'border-red-200/50 dark:border-red-800/50'
    : isUrgent
    ? 'border-amber-200/50 dark:border-amber-800/50'
    : 'border-blue-200/50 dark:border-blue-800/50';

  return (
    <div
      className={`mb-6 rounded-lg border p-3 relative overflow-hidden ${borderColor}`}
      style={{ background: gradientStyle }}
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
        <div className="min-w-0 flex-1 flex flex-col sm:flex-row sm:items-center sm:gap-2">
          <p className="font-semibold text-sm text-gray-900 dark:text-white">
            {isBlocked
              ? 'Order Limit Exceeded'
              : isUrgent
              ? 'Urgent: Near Order Limit'
              : 'Approaching Order Limit'}
          </p>
          <span className="hidden sm:inline text-gray-400 dark:text-gray-500">-</span>
          <p className="text-sm text-gray-700 dark:text-gray-300">
            {orderCount} of {orderLimit === Infinity ? 'unlimited' : orderLimit} orders ({roundedPercentage}% used)
          </p>
        </div>

        <div className="flex items-center gap-2">
          {!isBlocked && (
            <button
              onClick={handleDismiss}
              className="px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              aria-label="Dismiss warning"
            >
              Dismiss
            </button>
          )}

          <a
            href={getPricingUrl()}
            onClick={handleUpgradeClick}
            target="_blank"
            rel="noopener noreferrer"
            className={`relative flex-shrink-0 group w-full sm:w-auto ${!isStoreConnected ? 'cursor-not-allowed opacity-60' : ''}`}
          >
            <span className={`relative flex items-center justify-center sm:justify-start gap-2 h-8 px-3 bg-white text-gray-800 text-sm font-medium rounded-lg border border-gray-300 shadow-sm transition-all ${isStoreConnected ? 'hover:bg-gray-50' : ''}`}>
              {!isStoreConnected && <AlertCircle className="w-4 h-4" />}
              <span>{isStoreConnected ? 'Upgrade Plan On Shopify' : 'Connect Store to Upgrade'}</span>
              <MousePointerClick className={`w-4 h-4 ${isStoreConnected ? 'transition-transform group-hover:scale-110' : ''}`} />
            </span>
          </a>
        </div>
      </div>
    </div>
  );
}
