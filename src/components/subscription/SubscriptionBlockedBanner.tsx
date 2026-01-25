import React, { useEffect, useRef, useState } from 'react';
import { MousePointerClick, Gem, Loader2 } from 'lucide-react';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { formatSubscriptionStatus } from '@/lib/subscriptionService';
import { useConnectionStore } from '@/lib/connectionStore';

const SHOPIFY_APP_STORE_URL = import.meta.env.VITE_SHOPIFY_APP_STORE_URL || 'https://apps.shopify.com/revoa';
const POLL_INTERVAL_MS = 4000;
const MAX_POLL_DURATION_MS = 5 * 60 * 1000;

export function SubscriptionBlockedBanner() {
  const { hasActiveSubscription, isOverLimit, subscriptionStatus, loading, checkSubscription } = useSubscription();
  const { shopify, refreshShopifyStatus } = useConnectionStore();
  const [isPolling, setIsPolling] = useState(false);
  const [clickedLink, setClickedLink] = useState(false);
  const pollStartTimeRef = useRef<number | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const startPolling = () => {
    if (pollIntervalRef.current) return;

    setIsPolling(true);
    pollStartTimeRef.current = Date.now();

    console.log('[SubscriptionBlockedBanner] Starting installation polling...');

    pollIntervalRef.current = setInterval(async () => {
      const elapsed = Date.now() - (pollStartTimeRef.current || 0);

      if (elapsed >= MAX_POLL_DURATION_MS) {
        console.log('[SubscriptionBlockedBanner] Polling timeout reached, stopping');
        stopPolling();
        return;
      }

      console.log('[SubscriptionBlockedBanner] Checking for installation...');

      try {
        await refreshShopifyStatus();
        await checkSubscription();
      } catch (error) {
        console.error('[SubscriptionBlockedBanner] Poll error:', error);
      }
    }, POLL_INTERVAL_MS);
  };

  const stopPolling = () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    setIsPolling(false);
    pollStartTimeRef.current = null;
  };

  useEffect(() => {
    if (hasActiveSubscription && !isOverLimit && clickedLink) {
      console.log('[SubscriptionBlockedBanner] Installation detected, stopping polling');
      stopPolling();
      setClickedLink(false);
    }
  }, [hasActiveSubscription, isOverLimit, clickedLink]);

  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  const handleLinkClick = () => {
    setClickedLink(true);
    startPolling();
  };

  if (loading) return null;

  const shouldShowBanner = !hasActiveSubscription || isOverLimit;

  const isStoreConnected = !!shopify.installation?.store_url;

  const getActionUrl = (): string => {
    if (!shopify.installation?.store_url) {
      return SHOPIFY_APP_STORE_URL;
    }

    const shopDomain = shopify.installation.store_url
      .replace('https://', '')
      .replace('.myshopify.com', '');

    return `https://admin.shopify.com/store/${shopDomain}/settings/apps/app_installations/app/revoa`;
  };

  const getStatusMessage = (): { title: string; subtitle: string } => {
    if (!isStoreConnected) {
      return {
        title: 'No Store Connected',
        subtitle: 'Connect your Shopify store to continue using Revoa',
      };
    }

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
            href={getActionUrl()}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleLinkClick}
            className="group inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-white transition-all duration-150 hover:brightness-110"
            style={{
              background: '#111827',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.1), inset 0 -1px 0 rgba(0,0,0,0.2), 0 1px 3px rgba(0,0,0,0.15)'
            }}
          >
            <span>Select a Plan</span>
            <MousePointerClick className="w-3.5 h-3.5 transition-transform duration-150 group-hover:scale-110" />
          </a>

          {isPolling && (
            <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>Waiting for installation...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
