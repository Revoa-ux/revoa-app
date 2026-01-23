/**
 * Subscription Check Helper for Edge Functions
 *
 * Validates that a store has an active subscription before allowing
 * access to paid features. Required for Shopify App Store compliance.
 */

import { SupabaseClient } from 'npm:@supabase/supabase-js@2.39.7';

interface SubscriptionCheckResult {
  isActive: boolean;
  status: string | null;
  storeId: string | null;
  pricingUrl: string | null;
}

/**
 * Check if a store has an active subscription
 * @param supabase - Supabase client with service role key
 * @param userId - User ID to check subscription for
 * @returns Subscription check result
 */
export async function checkSubscription(
  supabase: SupabaseClient,
  userId: string
): Promise<SubscriptionCheckResult> {
  try {
    // Get the user's store and subscription status
    const { data: store, error } = await supabase
      .from('shopify_stores')
      .select('id, subscription_status, store_url')
      .eq('user_id', userId)
      .maybeSingle();

    if (error || !store) {
      return {
        isActive: false,
        status: null,
        storeId: null,
        pricingUrl: null,
      };
    }

    // Check if subscription is active
    const activeStatuses = ['ACTIVE', 'PENDING'];
    const isActive = activeStatuses.includes(store.subscription_status);

    // Generate pricing URL for reactivation
    const shopDomain = store.store_url
      ?.replace('https://', '')
      ?.replace('.myshopify.com', '');
    const appHandle = Deno.env.get('VITE_SHOPIFY_API_KEY') || 'revoa';
    const pricingUrl = shopDomain
      ? `https://admin.shopify.com/store/${shopDomain}/charges/${appHandle}/pricing_plans`
      : null;

    return {
      isActive,
      status: store.subscription_status,
      storeId: store.id,
      pricingUrl,
    };
  } catch (err) {
    console.error('[Subscription Check] Error:', err);
    return {
      isActive: false,
      status: null,
      storeId: null,
      pricingUrl: null,
    };
  }
}

/**
 * Create a standardized 403 response for inactive subscriptions
 */
export function createSubscriptionRequiredResponse(
  status: string | null,
  pricingUrl: string | null,
  corsHeaders: Record<string, string>
): Response {
  return new Response(
    JSON.stringify({
      error: 'Subscription required',
      message: status
        ? `Your subscription is ${status.toLowerCase()}. Please reactivate to continue using Revoa.`
        : 'No active subscription found. Please select a plan to continue.',
      subscription_status: status,
      reactivate_url: pricingUrl,
    }),
    {
      status: 403,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    }
  );
}
