import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { shopifyGraphQL } from '../_shared/shopify-graphql.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey, x-supabase-client-platform, x-supabase-api-version',
};

/**
 * Verify Shopify Subscription
 *
 * Modes:
 * 1. Initial verification (chargeId + shop) - After plan selection
 * 2. Status poll (storeId OR shop) - For live status updates
 *
 * Security: Must verify charge is valid and belongs to the shop.
 */

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { chargeId, shop, storeId, pollMode } = body;

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Poll mode - just check current status from Shopify
    if (pollMode && (storeId || shop)) {
      return await handlePollMode(supabase, storeId, shop);
    }

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

    // Consistent status mapping (matches webhook handler)
    const statusMap: Record<string, string> = {
      'active': 'ACTIVE',
      'accepted': 'ACTIVE',    // Trial or payment pending
      'pending': 'PENDING',     // Awaiting merchant approval
      'declined': 'CANCELLED',
      'expired': 'EXPIRED',
      'frozen': 'PENDING',
      'cancelled': 'CANCELLED',
    };

    let charge;
    let shopifyStatus: string;
    try {
      const result = await shopifyGraphQL(shop, storeData.access_token!, SUBSCRIPTION_QUERY);
      const subscriptions = result?.currentAppInstallation?.activeSubscriptions || [];

      if (subscriptions.length === 0) {
        console.log('No active subscriptions found - may be pending approval');
        return new Response(
          JSON.stringify({
            success: true,
            status: 'PENDING',
            requiresApproval: true,
            message: 'Waiting for subscription approval from Shopify'
          }),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      // Find the subscription matching the chargeId or use the first one
      charge = subscriptions[0];
      shopifyStatus = charge.status.toLowerCase();

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

    // Map Shopify status to our internal status
    const mappedStatus = statusMap[shopifyStatus] || 'PENDING';

    // Handle declined or cancelled subscriptions
    if (mappedStatus === 'CANCELLED' || mappedStatus === 'EXPIRED') {
      return new Response(
        JSON.stringify({
          success: false,
          status: mappedStatus,
          message: `Subscription is ${shopifyStatus}. Please select a plan to continue.`
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Handle pending subscriptions (awaiting approval)
    if (mappedStatus === 'PENDING') {
      // Update DB with pending status
      await supabase
        .from('shopify_stores')
        .update({
          subscription_status: 'PENDING',
          last_verified_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', storeData.id);

      return new Response(
        JSON.stringify({
          success: true,
          status: 'PENDING',
          requiresApproval: true,
          message: 'Subscription is pending approval from Shopify'
        }),
        {
          status: 200,
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
        subscription_status: mappedStatus,
        shopify_subscription_id: charge.id || chargeId,
        current_period_end: charge.currentPeriodEnd || null,
        last_verified_at: new Date().toISOString(),
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

async function handlePollMode(supabase: any, storeId?: string, shop?: string) {
  try {
    let storeData;

    if (storeId) {
      const { data, error } = await supabase
        .from('shopify_stores')
        .select('id, access_token, store_url, subscription_status, current_tier, shopify_subscription_id, trial_end_date, current_period_end, monthly_order_count')
        .eq('id', storeId)
        .maybeSingle();

      if (error || !data) {
        return new Response(
          JSON.stringify({ success: false, message: 'Store not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      storeData = data;
    } else if (shop) {
      const { data, error } = await supabase
        .from('shopify_stores')
        .select('id, access_token, store_url, subscription_status, current_tier, shopify_subscription_id, trial_end_date, current_period_end, monthly_order_count')
        .eq('store_url', `https://${shop}`)
        .maybeSingle();

      if (error || !data) {
        return new Response(
          JSON.stringify({ success: false, message: 'Store not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      storeData = data;
    }

    if (!storeData?.access_token) {
      const status = storeData?.subscription_status || 'CANCELLED';
      const tier = storeData?.current_tier || null;
      const noPlanSelected = !tier || status === 'CANCELLED';

      return new Response(
        JSON.stringify({
          success: true,
          status,
          tier,
          noPlanSelected,
          fromCache: true,
          noAccessToken: true,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const shopDomain = storeData.store_url.replace('https://', '');

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

    const statusMap: Record<string, string> = {
      'active': 'ACTIVE',
      'accepted': 'ACTIVE',
      'pending': 'PENDING',
      'declined': 'CANCELLED',
      'expired': 'EXPIRED',
      'frozen': 'PENDING',
      'cancelled': 'CANCELLED',
    };

    try {
      const result = await shopifyGraphQL(shopDomain, storeData.access_token, SUBSCRIPTION_QUERY);
      const subscriptions = result?.currentAppInstallation?.activeSubscriptions || [];

      if (subscriptions.length === 0) {
        await supabase
          .from('shopify_stores')
          .update({
            subscription_status: 'CANCELLED',
            shopify_subscription_id: null,
            current_tier: null,
            last_verified_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', storeData.id);

        return new Response(
          JSON.stringify({
            success: true,
            status: 'CANCELLED',
            tier: null,
            noPlanSelected: true,
            message: 'No active subscription found. Please select a plan.',
            lastVerified: new Date().toISOString(),
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const charge = subscriptions[0];
      const shopifyStatus = charge.status.toLowerCase();
      const mappedStatus = statusMap[shopifyStatus] || 'PENDING';

      const normalizePlanName = (name: string): string => {
        const normalized = name.toLowerCase().trim();
        if (normalized.includes('startup')) return 'startup';
        if (normalized.includes('momentum')) return 'momentum';
        if (normalized.includes('scale')) return 'scale';
        if (normalized.includes('enterprise')) return 'enterprise';
        return 'startup';
      };

      const tier = normalizePlanName(charge.name);
      const priceAmount = charge.lineItems?.[0]?.plan?.pricingDetails?.price?.amount || '0';

      const statusChanged = storeData.subscription_status !== mappedStatus;
      const tierChanged = storeData.current_tier !== tier;

      if (statusChanged || tierChanged) {
        console.log(`[Poll] Status/tier changed for ${shopDomain}: ${storeData.subscription_status} -> ${mappedStatus}, ${storeData.current_tier} -> ${tier}`);

        await supabase
          .from('shopify_stores')
          .update({
            subscription_status: mappedStatus,
            current_tier: tier,
            shopify_subscription_id: charge.id,
            current_period_end: charge.currentPeriodEnd || null,
            last_verified_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', storeData.id);

        if (statusChanged) {
          await supabase.from('subscription_history').insert({
            store_id: storeData.id,
            shopify_subscription_id: charge.id,
            old_status: storeData.subscription_status,
            new_tier: tier,
            new_status: mappedStatus,
            price_amount: parseFloat(priceAmount),
            event_type: 'status_change',
            metadata: { source: 'poll', charge_status: charge.status }
          });
        }
      } else {
        await supabase
          .from('shopify_stores')
          .update({ last_verified_at: new Date().toISOString() })
          .eq('id', storeData.id);
      }

      return new Response(
        JSON.stringify({
          success: true,
          status: mappedStatus,
          tier,
          shopifyStatus: charge.status,
          currentPeriodEnd: charge.currentPeriodEnd,
          trialDays: charge.trialDays,
          priceAmount,
          statusChanged,
          tierChanged,
          lastVerified: new Date().toISOString(),
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } catch (shopifyError) {
      console.error('[Poll] Shopify API error:', shopifyError);
      return new Response(
        JSON.stringify({
          success: true,
          status: storeData.subscription_status,
          tier: storeData.current_tier,
          fromCache: true,
          error: 'Failed to verify with Shopify',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('[Poll] Error:', error);
    return new Response(
      JSON.stringify({ success: false, message: 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}
