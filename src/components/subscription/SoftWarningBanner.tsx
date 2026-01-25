import React, { useState, useEffect } from 'react';
import { MousePointerClick, Gem, AlertCircle, X } from 'lucide-react';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { getShopifyPricingUrl } from '@/lib/subscriptionService';
import { useConnectionStore } from '@/lib/connectionStore';
import { toast } from '../../lib/toast';

const SESSION_STORAGE_KEY = 'revoa-subscription-warning-dismissed';

function formatTierName(tier: string | null): string {
  if (!tier) return 'current';
  const tierMap: Record<string, string> = {
    'startup': 'Startup',
    'growth': 'Growth',
    'scale': 'Scale',
    'enterprise': 'Enterprise'
  };
  return tierMap[tier.toLowerCase()] || tier;
}

export function SoftWarningBanner() {
  const { hasActiveSubscription, isOverLimit, usagePercentage, orderCount, orderLimit, loading, currentTier } = useSubscription();
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

  const shouldShowBanner = hasActiveSubscription && !isBlocked && (isUrgent || isWarning);
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
  const tierName = formatTierName(currentTier);

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

  const closeButtonColor = isBlocked
    ? 'text-red-400 hover:text-red-600 dark:text-red-500 dark:hover:text-red-300'
    : isUrgent
    ? 'text-amber-400 hover:text-amber-600 dark:text-amber-500 dark:hover:text-amber-300'
    : 'text-blue-400 hover:text-blue-600 dark:text-blue-500 dark:hover:text-blue-300';

  const IconComponent = Gem;

  return (
    <div className={`mb-4 sm:mb-6 rounded-xl p-0.5 border ${outerBorderColor} ${outerBg}`}>
      <div
        className={`rounded-lg border ${innerBorderColor} px-3 sm:px-4 py-2.5 sm:py-3 relative`}
        style={{ background: `var(--banner-gradient, ${innerGradient})` }}
      >
        <style>{`
          .dark [style*="--banner-gradient"] {
            --banner-gradient: ${innerGradientDark} !important;
          }
          .upgrade-btn-icon {
            transition: transform 0.15s ease;
          }
          .upgrade-btn:hover .upgrade-btn-icon {
            transform: scale(1.15);
          }
        `}</style>
        <div className="flex items-center justify-center relative">
          <div className="flex items-center gap-2 sm:gap-3">
            <IconComponent className={`w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 ${iconColor}`} />
            <span className="text-xs sm:text-sm text-gray-700 dark:text-gray-300">
              {isBlocked ? (
                <>You've exceeded your <span className="font-semibold text-gray-900 dark:text-white">{tierName}</span> plan's {orderLimit === Infinity ? 'unlimited' : orderLimit} orders/month</>
              ) : (
                <>You've used <span className="font-semibold text-gray-900 dark:text-white">{roundedPercentage}%</span> of your <span className="font-semibold text-gray-900 dark:text-white">{tierName}</span> plan's {orderLimit === Infinity ? 'unlimited' : orderLimit} orders/month</>
              )}
            </span>
            <a
              href={getPricingUrl()}
              onClick={handleUpgradeClick}
              target="_blank"
              rel="noopener noreferrer"
              className={`upgrade-btn inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs sm:text-sm font-medium text-white transition-colors ${!isStoreConnected ? 'cursor-not-allowed opacity-60' : ''}`}
              style={{
                background: 'linear-gradient(to bottom, #1f2937, #111827)',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
              }}
            >
              {!isStoreConnected && <AlertCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5" />}
              <span>{isStoreConnected ? 'Upgrade' : 'Connect'}</span>
              <MousePointerClick className="w-3 h-3 sm:w-3.5 sm:h-3.5 upgrade-btn-icon" />
            </a>
          </div>

          {!isBlocked && (
            <button
              onClick={handleDismiss}
              className={`absolute right-0 p-1 rounded transition-colors ${closeButtonColor}`}
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
