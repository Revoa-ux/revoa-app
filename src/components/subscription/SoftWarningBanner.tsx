import React, { useState, useEffect } from 'react';
import { Diamond, MousePointerClick, X } from 'lucide-react';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { getShopifyPricingUrl } from '@/lib/subscriptionService';
import { useConnectionStore } from '@/lib/connectionStore';
import { toast } from '../../lib/toast';

const SESSION_STORAGE_KEY = 'revoa-subscription-warning-dismissed';

export function SoftWarningBanner() {
  const { hasActiveSubscription, isOverLimit, usagePercentage, orderCount, orderLimit, loading } = useSubscription();
  const { shopify } = useConnectionStore();
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    const dismissed = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (dismissed) {
      setIsDismissed(true);
    }
  }, []);

  if (loading) return null;

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
    if (isBlocked) return;
    sessionStorage.setItem(SESSION_STORAGE_KEY, 'true');
    setIsDismissed(true);
  };

  if (!shouldShowBanner || (isDismissed && !isBlocked)) return null;

  const roundedPercentage = Math.round(usagePercentage);

  const outerBorderColor = isBlocked
    ? 'border-red-200 dark:border-red-900/50'
    : isUrgent
    ? 'border-amber-200 dark:border-amber-900/50'
    : 'border-blue-200 dark:border-blue-900/50';

  const innerBorderColor = isBlocked
    ? 'border-red-300 dark:border-red-800/60'
    : isUrgent
    ? 'border-amber-300 dark:border-amber-800/60'
    : 'border-blue-300 dark:border-blue-800/60';

  const outerBg = isBlocked
    ? 'bg-red-50 dark:bg-red-950/30'
    : isUrgent
    ? 'bg-amber-50 dark:bg-amber-950/30'
    : 'bg-blue-50 dark:bg-blue-950/30';

  const innerGradient = isBlocked
    ? 'linear-gradient(to bottom, rgba(254, 242, 242, 1), rgba(254, 226, 226, 1))'
    : isUrgent
    ? 'linear-gradient(to bottom, rgba(255, 251, 235, 1), rgba(254, 243, 199, 1))'
    : 'linear-gradient(to bottom, rgba(239, 246, 255, 1), rgba(219, 234, 254, 1))';

  const innerGradientDark = isBlocked
    ? 'linear-gradient(to bottom, rgba(127, 29, 29, 0.15), rgba(127, 29, 29, 0.25))'
    : isUrgent
    ? 'linear-gradient(to bottom, rgba(120, 53, 15, 0.15), rgba(120, 53, 15, 0.25))'
    : 'linear-gradient(to bottom, rgba(30, 58, 138, 0.15), rgba(30, 58, 138, 0.25))';

  const iconColor = isBlocked
    ? 'text-red-600 dark:text-red-400'
    : isUrgent
    ? 'text-amber-600 dark:text-amber-400'
    : 'text-blue-600 dark:text-blue-400';

  const IconComponent = Diamond;

  return (
    <div className={`mb-6 rounded-xl p-0.5 border ${outerBorderColor} ${outerBg}`}>
      <div
        className={`rounded-lg border ${innerBorderColor} px-4 py-3`}
        style={{ background: `var(--banner-gradient, ${innerGradient})` }}
      >
        <style>{`
          .dark [style*="--banner-gradient"] {
            --banner-gradient: ${innerGradientDark} !important;
          }
        `}</style>
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <IconComponent className={`w-5 h-5 flex-shrink-0 ${iconColor}`} />

          <div className="flex items-center gap-2 text-center">
            <span className="font-semibold text-sm text-gray-900 dark:text-white">
              {isBlocked
                ? 'Order Limit Exceeded'
                : isUrgent
                ? 'Urgent: Near Order Limit'
                : 'Approaching Order Limit'}
            </span>
            <span className="text-gray-400 dark:text-gray-500">-</span>
            <span className="text-sm text-gray-700 dark:text-gray-300">
              {orderCount} of {orderLimit === Infinity ? 'unlimited' : orderLimit} orders ({roundedPercentage}% used)
            </span>
          </div>

          <div className="flex items-center gap-2">
            {!isBlocked && (
              <button
                onClick={handleDismiss}
                className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors px-2 py-1"
              >
                Dismiss
              </button>
            )}

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
    </div>
  );
}
