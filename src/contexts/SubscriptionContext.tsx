import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { useConnectionStore } from '@/lib/connectionStore';
import { getSubscription, hasActiveSubscription as checkSubscriptionActive, getOrderCountAnalysis } from '@/lib/subscriptionService';
import type { SubscriptionStatus } from '@/types/pricing';

interface SubscriptionContextType {
  hasActiveSubscription: boolean;
  isOverLimit: boolean;
  usagePercentage: number;
  subscriptionStatus: SubscriptionStatus | null;
  currentTier: string | null;
  orderCount: number;
  orderLimit: number;
  loading: boolean;
  checkSubscription: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType>({
  hasActiveSubscription: false,
  isOverLimit: false,
  usagePercentage: 0,
  subscriptionStatus: null,
  currentTier: null,
  orderCount: 0,
  orderLimit: 0,
  loading: true,
  checkSubscription: async () => {},
});

export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
};

export const SubscriptionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { shopify } = useConnectionStore();
  const [subscriptionActive, setSubscriptionActive] = useState(false);
  const [isOverLimit, setIsOverLimit] = useState(false);
  const [usagePercentage, setUsagePercentage] = useState(0);
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(null);
  const [currentTier, setCurrentTier] = useState<string | null>(null);
  const [orderCount, setOrderCount] = useState(0);
  const [orderLimit, setOrderLimit] = useState(0);
  const [loading, setLoading] = useState(true);

  const checkSubscription = async () => {
    if (!shopify.installation?.id) {
      console.log('[SubscriptionContext] No installation ID, skipping check');
      setLoading(false);
      return;
    }

    try {
      console.log('[SubscriptionContext] Checking subscription for store:', shopify.installation.id);
      // Get subscription status with freshness check (will verify with Shopify if cache is >5 minutes old)
      const subscription = await getSubscription(shopify.installation.id, true);

      console.log('[SubscriptionContext] Subscription data:', {
        exists: !!subscription,
        tier: subscription?.currentTier,
        status: subscription?.subscriptionStatus,
        shopifySubId: subscription?.shopifySubscriptionId
      });

      if (!subscription) {
        console.log('[SubscriptionContext] No subscription found');
        setSubscriptionActive(false);
        setSubscriptionStatus(null);
        setIsOverLimit(false);
        setLoading(false);
        return;
      }

      const active = checkSubscriptionActive(subscription.subscriptionStatus);
      console.log('[SubscriptionContext] Subscription active:', active, 'Status:', subscription.subscriptionStatus);
      setSubscriptionActive(active);
      setSubscriptionStatus(subscription.subscriptionStatus);
      setCurrentTier(subscription.currentTier);

      // Get order count analysis to determine if over limit
      const analysis = await getOrderCountAnalysis(shopify.installation.id);

      if (analysis) {
        setIsOverLimit(analysis.isOverLimit);
        setUsagePercentage(analysis.utilizationPercentage);
        setOrderCount(analysis.orderCount);
        setOrderLimit(analysis.currentTier === 'enterprise' ? Infinity : analysis.orderCount);
      }

      setLoading(false);
    } catch (error) {
      console.error('[SubscriptionContext] Error checking subscription:', error);
      setSubscriptionActive(false);
      setIsOverLimit(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    checkSubscription();

    // If user just came from Shopify admin (billing), poll for updates
    const referrer = document.referrer;
    const cameFromShopifyAdmin = referrer.includes('admin.shopify.com');

    if (cameFromShopifyAdmin && shopify.installation?.id) {
      console.log('[SubscriptionContext] Detected return from Shopify admin, polling for subscription updates...');

      let pollCount = 0;
      const maxPolls = 5;
      const pollInterval = setInterval(async () => {
        pollCount++;
        console.log(`[SubscriptionContext] Auto-polling subscription status (${pollCount}/${maxPolls})...`);
        await checkSubscription();

        if (pollCount >= maxPolls) {
          clearInterval(pollInterval);
          console.log('[SubscriptionContext] Auto-polling complete');
        }
      }, 2000);

      return () => clearInterval(pollInterval);
    }
  }, [user?.id, shopify.installation?.id]);

  // Listen for subscription updates from URL parameter (after billing redirect)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const subscriptionUpdated = urlParams.get('subscription_updated');

    if (subscriptionUpdated === 'true' && shopify.installation?.id) {
      console.log('[SubscriptionContext] Subscription updated, refreshing...');
      // Remove the parameter from URL
      window.history.replaceState({}, '', window.location.pathname);

      // Immediately check subscription
      checkSubscription();

      // Poll every 2 seconds for 10 seconds to catch webhook updates
      let pollCount = 0;
      const maxPolls = 5;
      const pollInterval = setInterval(async () => {
        pollCount++;
        console.log(`[SubscriptionContext] Polling subscription status (${pollCount}/${maxPolls})...`);
        await checkSubscription();

        if (pollCount >= maxPolls) {
          clearInterval(pollInterval);
          console.log('[SubscriptionContext] Polling complete');
        }
      }, 2000);

      return () => clearInterval(pollInterval);
    }
  }, [window.location.search, shopify.installation?.id]);

  const value: SubscriptionContextType = {
    hasActiveSubscription: subscriptionActive,
    isOverLimit,
    usagePercentage,
    subscriptionStatus,
    currentTier,
    orderCount,
    orderLimit,
    loading,
    checkSubscription,
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
};
