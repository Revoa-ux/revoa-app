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
 */
export async function getSubscription(storeId: string): Promise<Subscription | null> {
  try {
    const { data, error } = await supabase
      .from('shopify_stores')
      .select('id, current_tier, subscription_status, shopify_subscription_id, trial_end_date, current_period_end, monthly_order_count, last_order_count_update')
      .eq('id', storeId)
      .single();

    if (error) throw error;
    if (!data) return null;

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
    // Update count first to ensure fresh data
    await updateOrderCount(storeId);

    const subscription = await getSubscription(storeId);
    if (!subscription) return null;

    const currentTierData = pricingTiers.find(t => t.id === subscription.currentTier) || pricingTiers[0];
    const recommendedTier = getTierForOrders(subscription.monthlyOrderCount);

    const isOverLimit = subscription.monthlyOrderCount > currentTierData.orderMax;
    const utilizationPercentage = Math.round(
      (subscription.monthlyOrderCount / currentTierData.orderMax) * 100
    );

    return {
      storeId,
      orderCount: subscription.monthlyOrderCount,
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
  const daysRemaining = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

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
