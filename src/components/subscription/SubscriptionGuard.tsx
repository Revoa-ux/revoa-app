import React, { useEffect, useState } from 'react';
import { ShieldAlert, ExternalLink } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getSubscription, hasActiveSubscription, getShopifyPricingUrl } from '@/lib/subscriptionService';
import { useConnectionStore } from '@/lib/connectionStore';
import type { SubscriptionStatus } from '@/types/pricing';

interface SubscriptionGuardProps {
  children: React.ReactNode;
}

export function SubscriptionGuard({ children }: SubscriptionGuardProps) {
  const { user } = useAuth();
  const { shopify } = useConnectionStore();
  const [isActive, setIsActive] = useState<boolean | null>(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkSubscription();
  }, [user?.id, shopify.installation?.id]);

  const checkSubscription = async () => {
    if (!shopify.installation?.id) {
      setLoading(false);
      return;
    }

    try {
      const subscription = await getSubscription(shopify.installation.id);

      if (!subscription) {
        setIsActive(false);
        setSubscriptionStatus(null);
        setLoading(false);
        return;
      }

      const active = hasActiveSubscription(subscription.subscriptionStatus);
      setIsActive(active);
      setSubscriptionStatus(subscription.subscriptionStatus);
      setLoading(false);
    } catch (error) {
      console.error('[SubscriptionGuard] Error checking subscription:', error);
      setIsActive(false);
      setLoading(false);
    }
  };

  const getStatusMessage = (): string => {
    if (!subscriptionStatus) return 'No active subscription found';

    switch (subscriptionStatus) {
      case 'CANCELLED':
        return 'Your subscription has been cancelled';
      case 'EXPIRED':
        return 'Your subscription has expired';
      case 'DECLINED':
        return 'Your subscription payment was declined';
      case 'FROZEN':
        return 'Your subscription has been frozen';
      default:
        return 'Subscription inactive';
    }
  };

  const getPricingUrl = (): string => {
    if (!shopify.installation?.store_url) return '#';

    const shopDomain = shopify.installation.store_url
      .replace('https://', '')
      .replace('.myshopify.com', '');

    return getShopifyPricingUrl(shopDomain);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-white"></div>
      </div>
    );
  }

  if (isActive === false) {
    return (
      <div className="fixed inset-0 bg-gray-900/50 dark:bg-gray-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-8 border border-gray-200 dark:border-gray-700">
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-6">
              <ShieldAlert className="w-8 h-8 text-red-600 dark:text-red-400" />
            </div>

            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
              Subscription Required
            </h2>

            <p className="text-gray-600 dark:text-gray-400 mb-2">
              {getStatusMessage()}
            </p>

            <p className="text-sm text-gray-500 dark:text-gray-500 mb-8">
              To continue using Revoa, please select a subscription plan.
            </p>

            <a
              href={getPricingUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg font-semibold hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors"
            >
              Select a Plan
              <ExternalLink className="w-4 h-4" />
            </a>

            <p className="text-xs text-gray-500 dark:text-gray-500 mt-6">
              This will open in Shopify admin where you can choose your plan.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
