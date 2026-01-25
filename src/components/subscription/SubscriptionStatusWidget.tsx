import React, { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle, Clock, XCircle } from 'lucide-react';
import type { Subscription, SubscriptionStatus } from '@/types/pricing';
import { getSubscription, isInTrialPeriod, getTrialDaysRemaining, formatSubscriptionStatus } from '@/lib/subscriptionService';
import { pricingTiers } from '@/components/pricing/PricingTiers';

interface SubscriptionStatusWidgetProps {
  storeId: string;
}

export function SubscriptionStatusWidget({ storeId }: SubscriptionStatusWidgetProps) {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSubscription();
  }, [storeId]);

  const loadSubscription = async () => {
    setLoading(true);
    const data = await getSubscription(storeId);
    setSubscription(data);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6 animate-pulse">
        <div className="h-6 w-32 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
        <div className="h-4 w-48 bg-gray-200 dark:bg-gray-700 rounded"></div>
      </div>
    );
  }

  if (!subscription) {
    return (
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6">
        <p className="text-sm text-gray-500 dark:text-gray-400">No subscription found</p>
      </div>
    );
  }

  const currentTierData = pricingTiers.find(t => t.id === subscription.currentTier);
  const inTrial = isInTrialPeriod(subscription);
  const trialDays = getTrialDaysRemaining(subscription);

  const getStatusIcon = (status: SubscriptionStatus) => {
    switch (status) {
      case 'ACTIVE':
        return <CheckCircle className="w-5 h-5 text-emerald-500" />;
      case 'PENDING':
        return <Clock className="w-5 h-5 text-amber-500" />;
      case 'CANCELLED':
      case 'EXPIRED':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'DECLINED':
      case 'FROZEN':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: SubscriptionStatus) => {
    switch (status) {
      case 'ACTIVE':
        return 'text-emerald-600 dark:text-emerald-400';
      case 'PENDING':
        return 'text-amber-600 dark:text-amber-400';
      default:
        return 'text-red-600 dark:text-red-400';
    }
  };

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Subscription Status
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Current billing details
          </p>
        </div>
        {getStatusIcon(subscription.subscriptionStatus)}
      </div>

      <div className="space-y-4">
        {/* Current Tier */}
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Current Plan</p>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-gray-900 dark:text-white">
              {currentTierData?.name || subscription.currentTier}
            </span>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              ${currentTierData?.monthlyFee}/month
            </span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {currentTierData?.orderLimit}
          </p>
        </div>

        {/* Status */}
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Status</p>
          <span className={`text-sm font-medium ${getStatusColor(subscription.subscriptionStatus)}`}>
            {formatSubscriptionStatus(subscription.subscriptionStatus)}
          </span>
        </div>

        {/* Trial Info */}
        {inTrial && (
          <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span className="text-sm font-medium text-amber-900 dark:text-amber-100">
                Trial Period
              </span>
            </div>
            <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
              {trialDays} days remaining in your free trial
            </p>
          </div>
        )}

        {/* Next Billing Date */}
        {subscription.currentPeriodEnd && subscription.subscriptionStatus === 'ACTIVE' && (
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Next Billing Date</p>
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {new Date(subscription.currentPeriodEnd).toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
