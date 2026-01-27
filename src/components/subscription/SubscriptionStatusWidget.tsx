import React, { useEffect, useState, useCallback, useRef } from 'react';
import { CheckCircle, Clock, XCircle, AlertTriangle, RefreshCw, ExternalLink, BarChart3 } from 'lucide-react';
import type { SubscriptionStatus } from '@/types/pricing';
import { getSubscription, isInTrialPeriod, getTrialDaysRemaining, getOrderCountAnalysis } from '@/lib/subscriptionService';
import { pricingTiers } from '@/components/pricing/PricingTiers';
import { supabase } from '@/lib/supabase';

interface SubscriptionStatusWidgetProps {
  storeId: string;
  shopDomain?: string;
}

interface PollResult {
  success: boolean;
  status: SubscriptionStatus;
  tier: string | null;
  statusChanged?: boolean;
  tierChanged?: boolean;
  lastVerified?: string;
  currentPeriodEnd?: string;
  trialDays?: number;
  noPlanSelected?: boolean;
}

export function SubscriptionStatusWidget({ storeId, shopDomain }: SubscriptionStatusWidgetProps) {
  const [status, setStatus] = useState<SubscriptionStatus | null>(null);
  const [tier, setTier] = useState<string | null>(null);
  const [trialDays, setTrialDays] = useState<number>(0);
  const [inTrial, setInTrial] = useState(false);
  const [nextBillingDate, setNextBillingDate] = useState<string | null>(null);
  const [orderCount, setOrderCount] = useState(0);
  const [orderLimit, setOrderLimit] = useState(0);
  const [utilizationPercentage, setUtilizationPercentage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [polling, setPolling] = useState(false);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const loadSubscription = useCallback(async () => {
    try {
      const data = await getSubscription(storeId, true);
      if (data) {
        setStatus(data.subscriptionStatus);
        setTier(data.currentTier);
        setInTrial(isInTrialPeriod(data));
        setTrialDays(getTrialDaysRemaining(data));
        setNextBillingDate(data.currentPeriodEnd || null);
      }

      const analysis = await getOrderCountAnalysis(storeId);
      if (analysis) {
        setOrderCount(analysis.orderCount);
        const tierData = pricingTiers.find(t => t.id === analysis.currentTier);
        setOrderLimit(tierData?.orderMax || 100);
        setUtilizationPercentage(analysis.utilizationPercentage);
      }
    } catch (error) {
      console.error('Error loading subscription:', error);
    } finally {
      setLoading(false);
    }
  }, [storeId]);

  const pollShopifyStatus = useCallback(async (forceReload = false, showIndicator = false) => {
    if (!storeId) return;

    if (showIndicator) {
      setPolling(true);
    }
    try {
      const { data, error } = await supabase.functions.invoke('verify-shopify-subscription', {
        body: { storeId, pollMode: true }
      });

      if (error) {
        console.error('Poll error:', error);
        return;
      }

      const result = data as PollResult;
      if (result?.success) {
        const hasChanges = result.statusChanged || result.tierChanged || result.noPlanSelected !== undefined;
        const statusOrTierChanged = result.status !== status || result.tier !== tier;

        if (hasChanges || forceReload || statusOrTierChanged) {
          console.log('[Subscription] Status changed, updating UI:', {
            status: result.status,
            tier: result.tier,
            noPlanSelected: result.noPlanSelected,
            noAccessToken: (result as any).noAccessToken
          });
          setStatus(result.status);
          setTier(result.tier);
          if (result.currentPeriodEnd) {
            setNextBillingDate(result.currentPeriodEnd);
          }
          if (result.trialDays !== undefined) {
            setTrialDays(result.trialDays);
            setInTrial(result.trialDays > 0);
          } else if (result.noPlanSelected || !result.tier) {
            setTrialDays(0);
            setInTrial(false);
          }

          // Reload order count analysis after status change
          const analysis = await getOrderCountAnalysis(storeId);
          if (analysis) {
            setOrderCount(analysis.orderCount);
            const tierData = analysis.currentTier ? pricingTiers.find(t => t.id === analysis.currentTier) : null;
            setOrderLimit(tierData?.orderMax || 0);
            setUtilizationPercentage((analysis as any).noPlanSelected ? 0 : analysis.utilizationPercentage);
          }

          // Trigger page reload if subscription was cancelled to refresh all UI
          if (result.noPlanSelected && (result as any).noAccessToken) {
            console.log('[Subscription] App appears uninstalled, triggering full refresh');
            window.dispatchEvent(new CustomEvent('subscription-status-changed', { detail: result }));
          }
        }
      }
    } catch (error) {
      console.error('Poll error:', error);
    } finally {
      if (showIndicator) {
        setPolling(false);
      }
    }
  }, [storeId]);

  useEffect(() => {
    loadSubscription();

    pollIntervalRef.current = setInterval(() => {
      pollShopifyStatus();
    }, 15000);

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [loadSubscription, pollShopifyStatus]);

  useEffect(() => {
    const referrer = document.referrer;
    const urlParams = new URLSearchParams(window.location.search);
    const chargeAccepted = urlParams.get('charge_id') || urlParams.get('subscription_updated');

    const cameFromShopify = referrer.includes('admin.shopify.com') ||
                           referrer.includes('shopify.com') ||
                           chargeAccepted;

    if (cameFromShopify) {
      console.log('[Subscription] Detected return from Shopify, polling aggressively');

      // Clean URL params
      if (chargeAccepted) {
        window.history.replaceState({}, '', window.location.pathname);
      }

      // Immediate poll with force reload
      pollShopifyStatus(true);

      // Aggressive polling: every 2 seconds for 20 seconds (10 polls)
      let count = 0;
      const rapidPoll = setInterval(() => {
        count++;
        pollShopifyStatus(true);
        if (count >= 10) clearInterval(rapidPoll);
      }, 2000);

      return () => clearInterval(rapidPoll);
    }
  }, [pollShopifyStatus]);

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-32 bg-gray-100 dark:bg-[#2a2a2a] rounded-xl"></div>
        <div className="h-24 bg-gray-100 dark:bg-[#2a2a2a] rounded-xl"></div>
      </div>
    );
  }

  const currentTierData = pricingTiers.find(t => t.id === tier);
  const noPlanSelected = !tier || (status === 'CANCELLED' && !currentTierData);

  const getStatusConfig = (s: SubscriptionStatus | null) => {
    if (noPlanSelected) {
      return {
        label: 'No Plan Selected',
        color: '#F59E0B',
        bgColor: 'rgba(245, 158, 11, 0.15)',
        Icon: AlertTriangle,
        description: 'Please select a subscription plan'
      };
    }

    switch (s) {
      case 'ACTIVE':
        return {
          label: 'Active',
          color: '#10B981',
          bgColor: 'rgba(16, 185, 129, 0.15)',
          Icon: CheckCircle,
          description: 'Your subscription is active'
        };
      case 'PENDING':
        return {
          label: 'Pending Approval',
          color: '#F59E0B',
          bgColor: 'rgba(245, 158, 11, 0.15)',
          Icon: Clock,
          description: 'Waiting for Shopify approval'
        };
      case 'CANCELLED':
      case 'EXPIRED':
        return {
          label: s === 'CANCELLED' ? 'Cancelled' : 'Expired',
          color: '#F43F5E',
          bgColor: 'rgba(244, 63, 94, 0.15)',
          Icon: XCircle,
          description: 'Please select a plan to continue'
        };
      case 'DECLINED':
      case 'FROZEN':
        return {
          label: s === 'DECLINED' ? 'Payment Declined' : 'Frozen',
          color: '#F43F5E',
          bgColor: 'rgba(244, 63, 94, 0.15)',
          Icon: AlertTriangle,
          description: 'Please update your payment method'
        };
      default:
        return {
          label: 'No Plan Selected',
          color: '#F59E0B',
          bgColor: 'rgba(245, 158, 11, 0.15)',
          Icon: AlertTriangle,
          description: 'Please select a subscription plan'
        };
    }
  };

  const statusConfig = getStatusConfig(status);
  const StatusIcon = statusConfig.Icon;

  const getUsageIconConfig = () => {
    if (utilizationPercentage >= 100) {
      return { color: '#F43F5E', bgColor: 'rgba(244, 63, 94, 0.15)' };
    }
    if (utilizationPercentage >= 95) {
      return { color: '#F59E0B', bgColor: 'rgba(245, 158, 11, 0.15)' };
    }
    if (utilizationPercentage >= 80) {
      return { color: '#3B82F6', bgColor: 'rgba(59, 130, 246, 0.15)' };
    }
    return { color: '#10B981', bgColor: 'rgba(16, 185, 129, 0.15)' };
  };

  const usageIconConfig = getUsageIconConfig();

  const shopName = shopDomain?.replace('https://', '').replace('.myshopify.com', '') || '';
  const managePlanUrl = `https://admin.shopify.com/store/${shopName}/charges/revoa/pricing_plans`;

  return (
    <div className="space-y-4 max-w-full overflow-hidden">
      {/* Main Status Card */}
      <div className="rounded-xl p-0.5 border border-gray-200 dark:border-[#3a3a3a] bg-gray-50 dark:bg-[#2a2a2a]/50">
        <div className="bg-white dark:bg-[#1f1f1f] rounded-lg p-5">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              {/* 3D Status Icon */}
              <div
                className="inline-flex items-center justify-center p-0.5 backdrop-blur-sm rounded-full shadow-sm"
                style={{ backgroundColor: statusConfig.bgColor }}
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center"
                  style={{
                    backgroundColor: statusConfig.color,
                    boxShadow: 'inset 0px 3px 10px 0px rgba(255,255,255,0.4), inset 0px -2px 3px 0px rgba(0,0,0,0.2)'
                  }}
                >
                  <StatusIcon className="w-5 h-5 text-white" strokeWidth={2.5} />
                </div>
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                  {statusConfig.label}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {statusConfig.description}
                </p>
              </div>
            </div>

            {/* Refresh button */}
            <button
              onClick={() => pollShopifyStatus(true, true)}
              disabled={polling}
              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors disabled:opacity-50"
              title="Refresh subscription status from Shopify"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${polling ? 'animate-spin' : ''}`} />
              <span>{polling ? 'Syncing...' : 'Refresh'}</span>
            </button>
          </div>

          {/* Trial Banner - Double border style */}
          {inTrial && trialDays > 0 && (
            <div className="rounded-xl p-0.5 border border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-900/30">
              <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg px-3 py-2.5 border border-amber-200/50 dark:border-amber-800/30">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <div>
                    <span className="text-sm font-semibold text-amber-900 dark:text-amber-100">
                      Free Trial
                    </span>
                    <span className="text-xs text-amber-700 dark:text-amber-300 ml-1.5">
                      {trialDays} {trialDays === 1 ? 'day' : 'days'} left
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Next Billing */}
          {nextBillingDate && status === 'ACTIVE' && !inTrial && (
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Next billing: {new Date(nextBillingDate).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
              })}
            </div>
          )}
        </div>
      </div>

      {/* Order Usage Card */}
      {noPlanSelected ? (
        <div className="rounded-xl p-0.5 border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 overflow-hidden">
          <div className="bg-amber-50 dark:bg-amber-900/10 rounded-lg p-5 overflow-hidden">
            <div className="flex items-start gap-3">
              <div
                className="inline-flex items-center justify-center p-0.5 backdrop-blur-sm rounded-full shadow-sm flex-shrink-0"
                style={{ backgroundColor: 'rgba(245, 158, 11, 0.15)' }}
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center"
                  style={{
                    backgroundColor: '#F59E0B',
                    boxShadow: 'inset 0px 3px 10px 0px rgba(255,255,255,0.4), inset 0px -2px 3px 0px rgba(0,0,0,0.2)'
                  }}
                >
                  <BarChart3 className="w-5 h-5 text-white" strokeWidth={2.5} />
                </div>
              </div>
              <div className="flex-1 min-w-0 overflow-hidden">
                <h3 className="text-base font-semibold text-amber-900 dark:text-amber-100">
                  Select a Plan to Track Usage
                </h3>
                <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                  You currently have {orderCount.toLocaleString()} orders in the last 30 days.
                </p>
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  Select a plan to unlock full features.
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-xl p-0.5 border border-gray-200 dark:border-[#3a3a3a] bg-gray-50 dark:bg-[#2a2a2a]/50">
          <div className="bg-white dark:bg-[#1f1f1f] rounded-lg p-5">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div
                  className="inline-flex items-center justify-center p-0.5 backdrop-blur-sm rounded-full shadow-sm"
                  style={{ backgroundColor: usageIconConfig.bgColor }}
                >
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center"
                    style={{
                      backgroundColor: usageIconConfig.color,
                      boxShadow: 'inset 0px 3px 10px 0px rgba(255,255,255,0.4), inset 0px -2px 3px 0px rgba(0,0,0,0.2)'
                    }}
                  >
                    <BarChart3 className="w-5 h-5 text-white" strokeWidth={2.5} />
                  </div>
                </div>
                <div>
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                    Order Usage
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Rolling 30-day count
                  </p>
                </div>
              </div>
            </div>

            <div className="mb-3">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-gray-900 dark:text-white">
                  {orderCount.toLocaleString()}
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  / {orderLimit === Infinity ? 'Unlimited' : orderLimit.toLocaleString()} orders
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {Math.min(utilizationPercentage, 100)}% of your {currentTierData?.name || tier} plan
              </p>
            </div>

            <div
              className="relative w-full h-3 rounded-full overflow-hidden"
              style={{
                backgroundColor: 'rgba(0, 0, 0, 0.06)',
                boxShadow: 'inset 0px 1px 2px rgba(0, 0, 0, 0.1)'
              }}
            >
              <div
                className="absolute inset-y-0 left-0 transition-all duration-500 rounded-full"
                style={{
                  width: `${Math.min(utilizationPercentage, 100)}%`,
                  backgroundColor: usageIconConfig.color,
                  boxShadow: 'inset 0px 2px 4px rgba(255, 255, 255, 0.3), inset 0px -1px 2px rgba(0, 0, 0, 0.15)'
                }}
              />
            </div>

            {utilizationPercentage >= 80 && (
              <div className={`mt-3 rounded-lg p-2.5 ${
                utilizationPercentage >= 100
                  ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50'
                  : utilizationPercentage >= 95
                  ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50'
                  : 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50'
              }`}>
                <div className="flex items-center gap-2">
                  <AlertTriangle className={`w-3.5 h-3.5 ${
                    utilizationPercentage >= 95 ? 'text-red-500' : 'text-amber-500'
                  }`} />
                  <span className={`text-xs font-medium ${
                    utilizationPercentage >= 95
                      ? 'text-red-900 dark:text-red-100'
                      : 'text-amber-900 dark:text-amber-100'
                  }`}>
                    {utilizationPercentage >= 100
                      ? 'You\'ve exceeded your plan limit'
                      : utilizationPercentage >= 95
                      ? 'You\'re approaching your plan limit'
                      : 'Consider upgrading to avoid interruption'}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Manage Subscription Button */}
      <a
        href={managePlanUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="btn btn-secondary w-full justify-center"
      >
        Manage Subscription in Shopify
        <ExternalLink className="w-4 h-4" />
      </a>
    </div>
  );
}
