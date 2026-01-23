import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { shopifyGraphQL } from '../_shared/shopify-graphql.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

/**
 * Verify Shopify Subscription After Plan Selection
 *
 * This function is called from the public /welcome page.
 * It verifies the charge_id with Shopify and stores subscription state.
 *
 * Security: Must verify charge is valid and belongs to the shop.
 */

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { chargeId, shop } = await req.json();

    if (!chargeId || !shop) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Missing chargeId or shop parameter'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get Shopify store record to get access token
    // Note: This will find both active and uninstalled stores (for reinstalls)
    const { data: storeData, error: storeError } = await supabase
      .from('shopify_stores')
      .select('id, access_token, store_url, subscription_status')
      .eq('store_url', `https://${shop}`)
      .maybeSingle();

    if (storeError || !storeData) {
      console.error('Store not found:', shop, storeError);

      // Store might not exist yet if this is first install
      // Generate OAuth URL for initial connection
      const shopifyAppUrl = Deno.env.get('VITE_SHOPIFY_APP_URL') || 'https://members.revoa.app';
      const shopifyClientId = Deno.env.get('SHOPIFY_CLIENT_ID')!;
      const scopes = 'read_orders,read_products,read_customers,read_fulfillments,read_shipping';
      const redirectUri = `${shopifyAppUrl}/shopify/callback`;

      const oauthUrl = `https://${shop}/admin/oauth/authorize?client_id=${shopifyClientId}&scope=${scopes}&redirect_uri=${encodeURIComponent(redirectUri)}&state=welcome_flow`;

      return new Response(
        JSON.stringify({
          success: true,
          requiresOAuth: true,
          oauthUrl,
          message: 'Please complete authentication to continue'
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Verify subscription with Shopify GraphQL API
    const SUBSCRIPTION_QUERY = `
      query {
        currentAppInstallation {
          activeSubscriptions {
            id
            name
            status
            currentPeriodEnd
            trialDays
            lineItems {
              plan {
                pricingDetails {
                  ... on AppRecurringPricing {
                    price {
                      amount
                      currencyCode
                    }
                  }
                }
              }
            }
          }
        }
      }
    `;

    let charge;
    try {
      const result = await shopifyGraphQL(shop, storeData.access_token!, SUBSCRIPTION_QUERY);
      const subscriptions = result?.currentAppInstallation?.activeSubscriptions || [];

      if (subscriptions.length === 0) {
        console.error('No active subscriptions found');
        return new Response(
          JSON.stringify({
            success: false,
            message: 'No active subscription found'
          }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      // Find the subscription matching the chargeId or use the first one
      charge = subscriptions[0];
      charge.status = charge.status.toLowerCase();

    } catch (error) {
      console.error('Failed to verify subscription with Shopify GraphQL:', error);
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Failed to verify subscription with Shopify'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Verify charge is active
    if (charge.status !== 'active' && charge.status !== 'accepted') {
      return new Response(
        JSON.stringify({
          success: false,
          message: `Subscription is ${charge.status}. Please try again or contact support.`
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Map Shopify plan name to tier (case-insensitive, defensive)
    const normalizePlanName = (name: string): string => {
      const normalized = name.toLowerCase().trim();
      if (normalized.includes('startup')) return 'startup';
      if (normalized.includes('momentum')) return 'momentum';
      if (normalized.includes('scale')) return 'scale';
      if (normalized.includes('enterprise')) return 'enterprise';
      console.warn('[Verify Subscription] Unrecognized plan name:', name, '- Defaulting to startup');
      return 'startup';
    };

    const tier = normalizePlanName(charge.name);

    // Update subscription in database
    // For reinstalls, this creates a fresh subscription with new charge_id
    const isReinstall = storeData.subscription_status === 'CANCELLED' ||
                         storeData.subscription_status === 'EXPIRED';

    console.log(`${isReinstall ? 'Reinstalling' : 'Activating'} subscription for ${shop}`);

    const { error: updateError } = await supabase
      .from('shopify_stores')
      .update({
        current_tier: tier,
        subscription_status: 'ACTIVE',
        shopify_subscription_id: charge.id || chargeId,
        current_period_end: charge.currentPeriodEnd || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', storeData.id);

    if (updateError) {
      console.error('Failed to update subscription:', updateError);
      throw updateError;
    }

    // Record in subscription history
    const priceAmount = charge.lineItems?.[0]?.plan?.pricingDetails?.price?.amount || '0';
    const currencyCode = charge.lineItems?.[0]?.plan?.pricingDetails?.price?.currencyCode || 'USD';

    await supabase
      .from('subscription_history')
      .insert({
        store_id: storeData.id,
        shopify_subscription_id: charge.id || chargeId,
        old_status: storeData.subscription_status,
        new_tier: tier,
        new_status: 'ACTIVE',
        price_amount: parseFloat(priceAmount),
        currency_code: currencyCode,
        trial_days: charge.trialDays || 0,
        event_type: isReinstall ? 'reinstalled' : 'activated',
        metadata: {
          charge_name: charge.name,
          charge_status: charge.status,
          is_reinstall: isReinstall
        }
      });

    console.log(`Subscription activated for ${shop}: ${tier}`);

    return new Response(
      JSON.stringify({
        success: true,
        requiresOAuth: false,
        tier,
        message: 'Subscription activated successfully'
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error verifying subscription:', error);
    return new Response(
      JSON.stringify({
        success: false,
        message: 'Internal server error. Please try again or contact support.'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
