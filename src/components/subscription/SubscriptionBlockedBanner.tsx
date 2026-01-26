import React, { useEffect, useRef, useState } from 'react';
import { MousePointerClick, Gem, Loader2 } from 'lucide-react';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { useConnectionStore } from '@/lib/connectionStore';
import { useNavigate } from 'react-router-dom';

const SHOPIFY_APP_STORE_URL = import.meta.env.VITE_SHOPIFY_APP_STORE_URL || 'https://apps.shopify.com/revoa';
const POLL_INTERVAL_MS = 4000;
const MAX_POLL_DURATION_MS = 5 * 60 * 1000;

export function SubscriptionBlockedBanner() {
  const { hasActiveSubscription, isOverLimit, subscriptionStatus, loading, checkSubscription, noPlanSelected } = useSubscription();
  const { shopify, refreshShopifyStatus } = useConnectionStore();
  const navigate = useNavigate();
  const [isPolling, setIsPolling] = useState(false);
  const [clickedLink, setClickedLink] = useState(false);
  const pollStartTimeRef = useRef<number | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const isStoreConnected = !!shopify.installation?.store_url;

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
    if (hasActiveSubscription && !isOverLimit && !noPlanSelected && clickedLink) {
      console.log('[SubscriptionBlockedBanner] Plan selected, stopping polling');
      stopPolling();
      setClickedLink(false);
    }
  }, [hasActiveSubscription, isOverLimit, noPlanSelected, clickedLink]);

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

  const shouldShowBanner = !hasActiveSubscription || isOverLimit || noPlanSelected || !isStoreConnected;

  const getActionUrl = (): string => {
    if (!shopify.installation?.store_url) {
      return SHOPIFY_APP_STORE_URL;
    }

    const shopDomain = shopify.installation.store_url
      .replace('https://', '')
      .replace('.myshopify.com', '');

    return `https://admin.shopify.com/store/${shopDomain}/charges/revoa/pricing_plans`;
  };

  const getMessage = (): string => {
    if (!isStoreConnected) {
      return 'Connect your Shopify store to continue using Revoa';
    }

    if (noPlanSelected) {
      return 'Select a plan to continue using Revoa';
    }

    if (isOverLimit) {
      return 'Upgrade your plan to continue processing orders';
    }

    return 'Select a plan to continue using Revoa';
  };

  if (!shouldShowBanner) return null;

  const message = getMessage();

  const handleConnectStore = () => {
    navigate('/settings');
  };

  return (
    <div className="mb-6 rounded-xl p-0.5 border border-red-200 dark:border-red-800/50 bg-red-50 dark:bg-red-950/20">
      <div className="rounded-lg border border-red-300 dark:border-red-700/50 bg-gradient-to-b from-red-50 to-red-100 dark:from-red-950/30 dark:to-red-900/20 px-4 py-3">
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <Gem className="w-4 h-4 flex-shrink-0 text-red-400 dark:text-red-400" />

          <span className="text-sm text-gray-700 dark:text-gray-300">
            {message}
          </span>

          {!isStoreConnected ? (
            <button
              onClick={handleConnectStore}
              className="group inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-white transition-all duration-150 hover:brightness-110"
              style={{
                backgroundColor: '#F43F5E',
                boxShadow: 'inset 0px 3px 10px 0px rgba(255,255,255,0.4), inset 0px -2px 3px 0px rgba(0,0,0,0.2)'
              }}
            >
              <span>Connect Store</span>
              <MousePointerClick className="w-3.5 h-3.5 transition-transform duration-150 group-hover:scale-110" />
            </button>
          ) : (
            <a
              href={getActionUrl()}
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleLinkClick}
              className="group inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-white transition-all duration-150 hover:brightness-110"
              style={{
                backgroundColor: '#F43F5E',
                boxShadow: 'inset 0px 3px 10px 0px rgba(255,255,255,0.4), inset 0px -2px 3px 0px rgba(0,0,0,0.2)'
              }}
            >
              <span>Select a Plan</span>
              <MousePointerClick className="w-3.5 h-3.5 transition-transform duration-150 group-hover:scale-110" />
            </a>
          )}

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
