import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { useConnectionStore } from '@/lib/connectionStore';
import { getSubscription, hasActiveSubscription as checkSubscriptionActive, getOrderCountAnalysis } from '@/lib/subscriptionService';
import { supabase } from '@/lib/supabase';
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
  noPlanSelected: boolean;
  checkSubscription: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType>({
  hasActiveSubscription: true,
  isOverLimit: false,
  usagePercentage: 0,
  subscriptionStatus: null,
  currentTier: null,
  orderCount: 0,
  orderLimit: 0,
  loading: true,
  noPlanSelected: false,
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
  const [subscriptionActive, setSubscriptionActive] = useState(true);
  const [isOverLimit, setIsOverLimit] = useState(false);
  const [usagePercentage, setUsagePercentage] = useState(0);
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(null);
  const [currentTier, setCurrentTier] = useState<string | null>(null);
  const [orderCount, setOrderCount] = useState(0);
  const [orderLimit, setOrderLimit] = useState(0);
  const [loading, setLoading] = useState(true);
  const [noPlanSelected, setNoPlanSelected] = useState(false);

  const checkSubscription = async () => {
    if (shopify.loading) {
      console.log('[SubscriptionContext] Shopify still loading, waiting...');
      return;
    }

    if (!shopify.installation?.id) {
      console.log('[SubscriptionContext] No installation ID, marking as no active subscription');
      setSubscriptionActive(false);
      setSubscriptionStatus(null);
      setNoPlanSelected(true);
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
        setNoPlanSelected(true);
        setLoading(false);
        return;
      }

      const hasPlan = !!subscription.currentTier;
      const active = hasPlan && checkSubscriptionActive(subscription.subscriptionStatus);
      console.log('[SubscriptionContext] Subscription active:', active, 'Status:', subscription.subscriptionStatus, 'Tier:', subscription.currentTier);
      setSubscriptionActive(active);
      setSubscriptionStatus(subscription.subscriptionStatus);
      setCurrentTier(subscription.currentTier);
      setNoPlanSelected(!hasPlan);

      const analysis = await getOrderCountAnalysis(shopify.installation.id);

      if (analysis) {
        const analysisNoPlan = (analysis as any).noPlanSelected === true;
        setNoPlanSelected(analysisNoPlan || !hasPlan);
        setIsOverLimit(analysis.isOverLimit);
        setUsagePercentage(analysisNoPlan ? 0 : analysis.utilizationPercentage);
        setOrderCount(analysis.orderCount);
        setOrderLimit(analysis.currentTier === 'enterprise' ? Infinity : analysis.orderLimit);
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

    // Detect return from Shopify billing - check URL params AND referrer
    const urlParams = new URLSearchParams(window.location.search);
    const chargeId = urlParams.get('charge_id');
    const returnedFromBilling = chargeId || urlParams.get('subscription_updated');
    const referrer = document.referrer;
    const cameFromShopifyAdmin = referrer.includes('admin.shopify.com') || referrer.includes('shopify.com');

    if ((returnedFromBilling || cameFromShopifyAdmin) && shopify.installation?.id) {
      console.log('[SubscriptionContext] Detected return from Shopify billing, triggering verification...');
      console.log('[SubscriptionContext] charge_id:', chargeId, 'referrer:', referrer);

      // Clean URL immediately
      if (returnedFromBilling) {
        window.history.replaceState({}, '', window.location.pathname);
      }

      // Call verify-shopify-subscription directly with the store to check Shopify's API
      const verifyWithShopify = async () => {
        try {
          const shopDomain = shopify.installation?.store_url?.replace('https://', '').replace('http://', '');
          if (!shopDomain) return;

          console.log('[SubscriptionContext] Calling verify-shopify-subscription for', shopDomain);
          const { data, error } = await supabase.functions.invoke('verify-shopify-subscription', {
            body: {
              storeId: shopify.installation?.id,
              pollMode: true
            }
          });

          console.log('[SubscriptionContext] Verification result:', data, error);

          if (data?.success && (data?.statusChanged || data?.tierChanged)) {
            console.log('[SubscriptionContext] Status/tier changed, refreshing...');
            await checkSubscription();
          }
        } catch (err) {
          console.error('[SubscriptionContext] Verification error:', err);
        }
      };

      // Immediate verification
      verifyWithShopify();

      // Aggressive polling: every 2 seconds for 20 seconds (10 polls)
      let pollCount = 0;
      const maxPolls = 10;
      const pollInterval = setInterval(async () => {
        pollCount++;
        console.log(`[SubscriptionContext] Polling subscription status (${pollCount}/${maxPolls})...`);
        await verifyWithShopify();
        await checkSubscription();

        if (pollCount >= maxPolls) {
          clearInterval(pollInterval);
          console.log('[SubscriptionContext] Polling complete');
        }
      }, 2000);

      return () => clearInterval(pollInterval);
    }
  }, [user?.id, shopify.installation?.id, shopify.loading]);

  // Listen for subscription status changes from other components (e.g., SubscriptionStatusWidget)
  useEffect(() => {
    const handleSubscriptionChange = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      console.log('[SubscriptionContext] Received subscription-status-changed event:', detail);

      if (detail?.noPlanSelected) {
        setSubscriptionActive(false);
        setNoPlanSelected(true);
        setCurrentTier(detail.tier || null);
        setSubscriptionStatus(detail.status || 'CANCELLED');
      }

      // Always refresh to get latest state
      checkSubscription();
    };

    window.addEventListener('subscription-status-changed', handleSubscriptionChange);
    return () => window.removeEventListener('subscription-status-changed', handleSubscriptionChange);
  }, []);

  const value: SubscriptionContextType = {
    hasActiveSubscription: subscriptionActive,
    isOverLimit,
    usagePercentage,
    subscriptionStatus,
    currentTier,
    orderCount,
    orderLimit,
    loading,
    noPlanSelected,
    checkSubscription,
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
};
