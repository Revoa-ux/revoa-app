import { Request, Response } from 'express';
import { createSupabaseClient } from '../db/client';
import { ShopifyService } from '../services/shopify';
import { pricingTiers } from '@/components/pricing/PricingTiers';

const supabase = createSupabaseClient();

export const createSubscription = async (req: Request, res: Response) => {
  try {
    const { tierId, shopDomain } = req.body;

    const { data: store } = await supabase
      .from('shopify_stores')
      .select('*')
      .eq('store_url', shopDomain)
      .single();

    if (!store) {
      return res.status(404).json({ error: 'Store not found' });
    }

    const shopify = new ShopifyService(supabase, {
      shopifyUrl: store.store_url,
      accessToken: store.access_token
    });

    const tier = pricingTiers.find(t => t.id === tierId);
    if (!tier) {
      return res.status(400).json({ error: 'Invalid tier selected' });
    }

    // Create Shopify recurring application charge
    const charge = await shopify.createRecurringCharge({
      name: `${tier.name} Plan`,
      price: tier.monthlyFee,
      test: process.env.NODE_ENV !== 'production',
      trialDays: 14
    });

    // Store subscription details
    const { data: subscription, error } = await supabase
      .from('subscriptions')
      .insert({
        user_id: req.user.id,
        tier_id: tierId,
        status: 'trialing',
        shopify_charge_id: charge.id,
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        trial_end: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    res.json({
      subscription,
      confirmationUrl: charge.confirmationUrl
    });
  } catch (error) {
    console.error('Error creating subscription:', error);
    res.status(500).json({ error: 'Failed to create subscription' });
  }
};

export const updateSubscription = async (req: Request, res: Response) => {
  try {
    const { subscriptionId } = req.params;
    const { tierId } = req.body;

    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('id', subscriptionId)
      .single();

    if (!subscription) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    // Update subscription in database
    const { data: updatedSubscription, error } = await supabase
      .from('subscriptions')
      .update({
        tier_id: tierId,
        updated_at: new Date().toISOString()
      })
      .eq('id', subscriptionId)
      .select()
      .single();

    if (error) throw error;

    res.json({ subscription: updatedSubscription });
  } catch (error) {
    console.error('Error updating subscription:', error);
    res.status(500).json({ error: 'Failed to update subscription' });
  }
};

export const cancelSubscription = async (req: Request, res: Response) => {
  try {
    const { subscriptionId } = req.params;
    const { cancelAtPeriodEnd } = req.body;

    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('id', subscriptionId)
      .single();

    if (!subscription) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    // Update subscription status
    const { error } = await supabase
      .from('subscriptions')
      .update({
        status: cancelAtPeriodEnd ? 'active' : 'cancelled',
        cancel_at_period_end: cancelAtPeriodEnd,
        cancelled_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', subscriptionId);

    if (error) throw error;

    res.json({ success: true });
  } catch (error) {
    console.error('Error canceling subscription:', error);
    res.status(500).json({ error: 'Failed to cancel subscription' });
  }
};

export const getSubscriptionUsage = async (req: Request, res: Response) => {
  try {
    const { subscriptionId, period } = req.params;

    const { data: usage, error } = await supabase
      .from('subscription_usage')
      .select('*')
      .eq('subscription_id', subscriptionId)
      .eq('period', period)
      .single();

    if (error) throw error;

    res.json({ usage });
  } catch (error) {
    console.error('Error fetching subscription usage:', error);
    res.status(500).json({ error: 'Failed to fetch subscription usage' });
  }
};