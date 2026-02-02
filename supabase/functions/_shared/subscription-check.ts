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
    // First get the installation to find the store
    // shopify_stores doesn't have user_id directly - we need to join via installation
    const { data: installation, error: installError } = await supabase
      .from('shopify_installations')
      .select('id, store_url')
      .eq('user_id', userId)
      .eq('status', 'installed')
      .is('uninstalled_at', null)
      .maybeSingle();

    if (installError || !installation) {
      console.log('[Subscription Check] No active installation found for user:', userId);
      return {
        isActive: false,
        status: null,
        storeId: null,
        pricingUrl: null,
      };
    }

    // Now get the store's subscription status using the installation ID
    // (shopify_stores.id matches shopify_installations.id)
    const { data: store, error: storeError } = await supabase
      .from('shopify_stores')
      .select('id, subscription_status, store_url')
      .eq('id', installation.id)
      .maybeSingle();

    if (storeError || !store) {
      console.log('[Subscription Check] No store found for installation:', installation.id);
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

    console.log('[Subscription Check] Result:', {
      userId,
      storeId: store.id,
      status: store.subscription_status,
      isActive
    });

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
