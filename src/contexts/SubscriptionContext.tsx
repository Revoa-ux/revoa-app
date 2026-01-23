import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { useConnectionStore } from '@/lib/connectionStore';
import { getSubscription, hasActiveSubscription, getOrderCountAnalysis } from '@/lib/subscriptionService';
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
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false);
  const [isOverLimit, setIsOverLimit] = useState(false);
  const [usagePercentage, setUsagePercentage] = useState(0);
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(null);
  const [currentTier, setCurrentTier] = useState<string | null>(null);
  const [orderCount, setOrderCount] = useState(0);
  const [orderLimit, setOrderLimit] = useState(0);
  const [loading, setLoading] = useState(true);

  const checkSubscription = async () => {
    if (!shopify.installation?.id) {
      setLoading(false);
      return;
    }

    try {
      // Get subscription status
      const subscription = await getSubscription(shopify.installation.id);

      if (!subscription) {
        setHasActiveSubscription(false);
        setSubscriptionStatus(null);
        setIsOverLimit(false);
        setLoading(false);
        return;
      }

      const active = hasActiveSubscription(subscription.subscriptionStatus);
      setHasActiveSubscription(active);
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
      setHasActiveSubscription(false);
      setIsOverLimit(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    checkSubscription();
  }, [user?.id, shopify.installation?.id]);

  const value: SubscriptionContextType = {
    hasActiveSubscription,
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
