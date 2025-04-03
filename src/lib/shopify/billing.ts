import { supabase } from '../supabase';
import { PricingTier } from '@/types/pricing';
import { Subscription, SubscriptionUsage } from '@/types/subscription';

interface ShopifyBillingResponse {
  confirmationUrl?: string;
  chargeId?: string;
  error?: string;
}

export const createSubscription = async (
  tierId: PricingTier['id'],
  shopDomain: string
): Promise<ShopifyBillingResponse> => {
  try {
    const response = await fetch('/api/shopify/billing/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        tierId,
        shopDomain
      })
    });

    if (!response.ok) {
      throw new Error('Failed to create subscription');
    }

    return await response.json();
  } catch (error) {
    console.error('Error creating subscription:', error);
    return { error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

export const updateSubscription = async (
  subscriptionId: string,
  tierId: PricingTier['id']
): Promise<ShopifyBillingResponse> => {
  try {
    const response = await fetch(`/api/shopify/billing/update/${subscriptionId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ tierId })
    });

    if (!response.ok) {
      throw new Error('Failed to update subscription');
    }

    return await response.json();
  } catch (error) {
    console.error('Error updating subscription:', error);
    return { error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

export const cancelSubscription = async (
  subscriptionId: string,
  cancelAtPeriodEnd: boolean = true
): Promise<{ success: boolean; error?: string }> => {
  try {
    const response = await fetch(`/api/shopify/billing/cancel/${subscriptionId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ cancelAtPeriodEnd })
    });

    if (!response.ok) {
      throw new Error('Failed to cancel subscription');
    }

    return { success: true };
  } catch (error) {
    console.error('Error canceling subscription:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
};

export const getSubscriptionUsage = async (
  subscriptionId: string,
  period?: string
): Promise<SubscriptionUsage | null> => {
  try {
    const { data, error } = await supabase
      .from('subscription_usage')
      .select('*')
      .eq('subscription_id', subscriptionId)
      .eq('period', period || new Date().toISOString().slice(0, 7))
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching subscription usage:', error);
    return null;
  }
};

export const getCurrentSubscription = async (): Promise<Subscription | null> => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;

    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', session.user.id)
      .eq('status', 'active')
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching current subscription:', error);
    return null;
  }
};

export const validateSubscriptionAccess = async (
  feature: string
): Promise<boolean> => {
  try {
    const subscription = await getCurrentSubscription();
    if (!subscription) return false;

    const tier = pricingTiers.find(t => t.id === subscription.tierId);
    if (!tier) return false;

    // Check if feature is included in the tier
    return tier.features.some(f => 
      f.toLowerCase().includes(feature.toLowerCase())
    );
  } catch (error) {
    console.error('Error validating subscription access:', error);
    return false;
  }
};