/**
 * Subscription Service
 *
 * Handles subscription management, order counting, and tier recommendations
 */

import { supabase } from './supabase';
import type { Subscription, SubscriptionStatus, PricingTier } from '@/types/pricing';
import { pricingTiers, getTierForOrders } from '@/components/pricing/PricingTiers';

interface OrderCountResult {
  storeId: string;
  orderCount: number;
  lastUpdated: string;
  recommendedTier: PricingTier;
  currentTier: PricingTier['id'];
  isOverLimit: boolean;
  utilizationPercentage: number;
}

/**
 * Get current subscription details for a store
 * @param storeId - The store ID
 * @param checkFreshness - If true, verify with Shopify if cache is stale (>5 minutes)
 */
export async function getSubscription(storeId: string, checkFreshness = false): Promise<Subscription | null> {
  try {
    const { data, error } = await supabase
      .from('shopify_stores')
      .select('id, current_tier, subscription_status, shopify_subscription_id, trial_end_date, current_period_end, monthly_order_count, last_order_count_update, last_verified_at, store_url')
      .eq('id', storeId)
      .single();

    if (error) throw error;
    if (!data) return null;

    // Check if data is stale (>5 minutes old) and refresh from Shopify if requested
    if (checkFreshness && data.last_verified_at && data.store_url && data.shopify_subscription_id) {
      const lastVerified = new Date(data.last_verified_at);
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

      if (lastVerified < fiveMinutesAgo) {
        console.log('[SubscriptionService] Cache is stale (>5 minutes), refreshing from Shopify...');
        try {
          // Extract shop domain from store_url
          const shopDomain = data.store_url.replace('https://', '');

          // Call verify-shopify-subscription to refresh from Shopify
          const { data: refreshResult, error: refreshError } = await supabase.functions.invoke(
            'verify-shopify-subscription',
            {
              body: {
                chargeId: data.shopify_subscription_id,
                shop: shopDomain,
              },
            }
          );

          if (refreshError) {
            console.error('[SubscriptionService] Failed to refresh subscription:', refreshError);
          } else if (refreshResult?.success) {
            console.log('[SubscriptionService] Successfully refreshed subscription from Shopify');

            // Re-fetch updated data
            const { data: updatedData } = await supabase
              .from('shopify_stores')
              .select('id, current_tier, subscription_status, shopify_subscription_id, trial_end_date, current_period_end, monthly_order_count, last_order_count_update, last_verified_at, store_url')
              .eq('id', storeId)
              .single();

            if (updatedData) {
              return {
                id: updatedData.id,
                storeId: updatedData.id,
                currentTier: updatedData.current_tier as PricingTier['id'],
                subscriptionStatus: updatedData.subscription_status as SubscriptionStatus,
                shopifySubscriptionId: updatedData.shopify_subscription_id,
                trialEndDate: updatedData.trial_end_date,
                currentPeriodEnd: updatedData.current_period_end,
                monthlyOrderCount: updatedData.monthly_order_count || 0,
                lastOrderCountUpdate: updatedData.last_order_count_update,
              };
            }
          }
        } catch (refreshError) {
          console.error('[SubscriptionService] Error refreshing subscription:', refreshError);
          // Fall through to return cached data
        }
      }
    }

    return {
      id: data.id,
      storeId: data.id,
      currentTier: data.current_tier as PricingTier['id'],
      subscriptionStatus: data.subscription_status as SubscriptionStatus,
      shopifySubscriptionId: data.shopify_subscription_id,
      trialEndDate: data.trial_end_date,
      currentPeriodEnd: data.current_period_end,
      monthlyOrderCount: data.monthly_order_count || 0,
      lastOrderCountUpdate: data.last_order_count_update,
    };
  } catch (error) {
    console.error('Error fetching subscription:', error);
    return null;
  }
}

/**
 * Update order count for a store
 * Calls the database function to recalculate rolling 30-day count
 */
export async function updateOrderCount(storeId: string): Promise<number> {
  try {
    const { error } = await supabase.rpc('update_store_order_count', {
      store_id_param: storeId,
    });

    if (error) throw error;

    // Fetch updated count
    const { data } = await supabase
      .from('shopify_stores')
      .select('monthly_order_count')
      .eq('id', storeId)
      .single();

    return data?.monthly_order_count || 0;
  } catch (error) {
    console.error('Error updating order count:', error);
    throw error;
  }
}

/**
 * Get order count with tier analysis
 */
export async function getOrderCountAnalysis(storeId: string): Promise<OrderCountResult | null> {
  try {
    await updateOrderCount(storeId);

    const subscription = await getSubscription(storeId);
    if (!subscription) return null;

    if (!subscription.currentTier) {
      return {
        storeId,
        orderCount: subscription.monthlyOrderCount,
        orderLimit: 0,
        lastUpdated: subscription.lastOrderCountUpdate,
        recommendedTier: getTierForOrders(subscription.monthlyOrderCount),
        currentTier: null as any,
        isOverLimit: true,
        utilizationPercentage: 100,
        noPlanSelected: true,
      } as OrderCountResult & { noPlanSelected: boolean };
    }

    const currentTierData = pricingTiers.find(t => t.id === subscription.currentTier);
    if (!currentTierData) {
      return {
        storeId,
        orderCount: subscription.monthlyOrderCount,
        orderLimit: 0,
        lastUpdated: subscription.lastOrderCountUpdate,
        recommendedTier: getTierForOrders(subscription.monthlyOrderCount),
        currentTier: subscription.currentTier,
        isOverLimit: true,
        utilizationPercentage: 100,
        noPlanSelected: true,
      } as OrderCountResult & { noPlanSelected: boolean };
    }

    const recommendedTier = getTierForOrders(subscription.monthlyOrderCount);
    const isOverLimit = subscription.monthlyOrderCount > currentTierData.orderMax;
    const utilizationPercentage = Math.round(
      (subscription.monthlyOrderCount / currentTierData.orderMax) * 100
    );

    return {
      storeId,
      orderCount: subscription.monthlyOrderCount,
      orderLimit: currentTierData.orderMax,
      lastUpdated: subscription.lastOrderCountUpdate,
      recommendedTier,
      currentTier: subscription.currentTier,
      isOverLimit,
      utilizationPercentage,
    };
  } catch (error) {
    console.error('Error analyzing order count:', error);
    return null;
  }
}

/**
 * Check if store should be notified about tier upgrade
 * Returns true if at 80% or 95% of limit
 */
export function shouldNotifyUpgrade(orderCount: number, currentTier: PricingTier['id']): {
  shouldNotify: boolean;
  notificationLevel: 'warning' | 'urgent' | null;
  message: string;
} {
  const tier = pricingTiers.find(t => t.id === currentTier) || pricingTiers[0];
  const percentage = (orderCount / tier.orderMax) * 100;

  if (percentage >= 95) {
    return {
      shouldNotify: true,
      notificationLevel: 'urgent',
      message: `You're at ${Math.round(percentage)}% of your plan's order limit. Upgrade now to avoid service interruption.`,
    };
  }

  if (percentage >= 80) {
    return {
      shouldNotify: true,
      notificationLevel: 'warning',
      message: `You're at ${Math.round(percentage)}% of your plan's order limit. Consider upgrading to the next tier.`,
    };
  }

  return {
    shouldNotify: false,
    notificationLevel: null,
    message: '',
  };
}

/**
 * Get subscription history for a store
 */
export async function getSubscriptionHistory(storeId: string, limit = 10) {
  try {
    const { data, error } = await supabase
      .from('subscription_history')
      .select('*')
      .eq('store_id', storeId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching subscription history:', error);
    return [];
  }
}

/**
 * Check if subscription is in trial period
 */
export function isInTrialPeriod(subscription: Subscription): boolean {
  if (!subscription.trialEndDate) return false;

  const now = new Date();
  const trialEnd = new Date(subscription.trialEndDate);

  return now < trialEnd;
}

/**
 * Get days remaining in trial
 */
export function getTrialDaysRemaining(subscription: Subscription): number {
  if (!isInTrialPeriod(subscription)) return 0;

  const now = new Date();
  const trialEnd = new Date(subscription.trialEndDate!);
  const daysRemaining = Math.floor((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  return Math.max(0, daysRemaining);
}

/**
 * Check if subscription is active (not cancelled, expired, etc.)
 */
export function hasActiveSubscription(status: SubscriptionStatus): boolean {
  return status === 'ACTIVE' || status === 'PENDING';
}

/**
 * Get Shopify plan selection URL
 *
 * Returns the URL to Shopify's hosted pricing page where merchants can
 * select plans, upgrade, downgrade, or switch between monthly/annual billing.
 * All billing operations MUST be performed on Shopify's UI, not in our app.
 */
export function getShopifyPricingUrl(shopDomain: string): string {
  // This URL will be hosted by Shopify when using Managed Pricing
  const appHandle = import.meta.env.VITE_SHOPIFY_API_KEY || 'revoa';
  return `https://admin.shopify.com/store/${shopDomain.replace('.myshopify.com', '')}/charges/${appHandle}/pricing_plans`;
}

/**
 * Format subscription status for display
 */
export function formatSubscriptionStatus(status: SubscriptionStatus): string {
  const statusMap: Record<SubscriptionStatus, string> = {
    ACTIVE: 'Active',
    PENDING: 'Pending Approval',
    CANCELLED: 'Cancelled',
    EXPIRED: 'Expired',
    DECLINED: 'Payment Declined',
    FROZEN: 'Frozen',
  };

  return statusMap[status] || status;
}

/**
 * Get tier upgrade path
 */
export function getTierUpgradePath(currentTier: PricingTier['id']): PricingTier | null {
  const tierOrder: PricingTier['id'][] = ['startup', 'momentum', 'scale', 'enterprise'];
  const currentIndex = tierOrder.indexOf(currentTier);

  if (currentIndex === -1 || currentIndex === tierOrder.length - 1) {
    return null; // Already at highest tier
  }

  const nextTierId = tierOrder[currentIndex + 1];
  return pricingTiers.find(t => t.id === nextTierId) || null;
}

/**
 * Calculate cost difference for tier upgrade
 *
 * NOTE: This is for DISPLAY purposes only. Actual billing, proration,
 * and charge calculations are handled entirely by Shopify Managed Pricing.
 * This function helps merchants understand the price difference when
 * comparing plans, but the actual billing mechanics are controlled by Shopify.
 */
export function calculateUpgradeCost(currentTier: PricingTier['id'], targetTier: PricingTier['id']): number {
  const current = pricingTiers.find(t => t.id === currentTier);
  const target = pricingTiers.find(t => t.id === targetTier);

  if (!current || !target) return 0;

  return target.monthlyFee - current.monthlyFee;
}
