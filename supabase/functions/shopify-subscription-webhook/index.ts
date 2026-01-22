import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';
import { verifyShopifyHmac } from '../_shared/shopify-hmac.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Shopify-Hmac-Sha256, X-Shopify-Shop-Domain, X-Shopify-Topic',
};

interface AppSubscription {
  id: string;
  name: string;
  status: 'ACTIVE' | 'PENDING' | 'CANCELLED' | 'EXPIRED' | 'DECLINED' | 'FROZEN';
  test: boolean;
  trial_days: number;
  current_period_end: string;
  line_items: Array<{
    id: string;
    plan: {
      pricing_details: {
        price: {
          amount: string;
          currency_code: string;
        };
        interval: string;
      };
    };
  }>;
}

interface WebhookPayload {
  app_subscription: AppSubscription;
}

// Map Shopify plan names to our tier IDs
const PLAN_NAME_TO_TIER: Record<string, string> = {
  'Revoa Startup': 'startup',
  'Revoa Momentum': 'momentum',
  'Revoa Scale': 'scale',
  'Revoa Enterprise': 'enterprise',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    // Verify HMAC signature
    const hmacHeader = req.headers.get('X-Shopify-Hmac-Sha256');
    const shopDomain = req.headers.get('X-Shopify-Shop-Domain');
    const topic = req.headers.get('X-Shopify-Topic');

    if (!hmacHeader || !shopDomain) {
      console.error('Missing required headers');
      return new Response(JSON.stringify({ error: 'Missing required headers' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.text();

    // Verify webhook authenticity
    const isValid = await verifyShopifyHmac(body, hmacHeader);
    if (!isValid) {
      console.error('Invalid HMAC signature');
      return new Response(JSON.stringify({ error: 'Invalid signature' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const payload: WebhookPayload = JSON.parse(body);
    const subscription = payload.app_subscription;

    console.log('Processing subscription webhook:', {
      topic,
      shopDomain,
      subscriptionId: subscription.id,
      status: subscription.status,
      name: subscription.name,
    });

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Find the store by domain
    const storeUrl = `https://${shopDomain}`;
    const { data: store, error: storeError } = await supabase
      .from('shopify_stores')
      .select('id, current_tier, subscription_status')
      .eq('store_url', storeUrl)
      .single();

    if (storeError || !store) {
      console.error('Store not found:', storeError);
      return new Response(JSON.stringify({ error: 'Store not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Determine tier from plan name
    const tier = PLAN_NAME_TO_TIER[subscription.name] || 'startup';

    // Get pricing details
    const priceAmount = subscription.line_items[0]?.plan?.pricing_details?.price?.amount || '0';
    const currencyCode = subscription.line_items[0]?.plan?.pricing_details?.price?.currency_code || 'USD';

    // Calculate trial end date if in trial
    let trialEndDate = null;
    if (subscription.trial_days > 0 && subscription.status === 'ACTIVE') {
      const currentPeriodEnd = new Date(subscription.current_period_end);
      const now = new Date();
      const daysDiff = Math.ceil((currentPeriodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      if (daysDiff <= subscription.trial_days) {
        trialEndDate = currentPeriodEnd.toISOString();
      }
    }

    // Update store subscription details
    const { error: updateError } = await supabase
      .from('shopify_stores')
      .update({
        current_tier: tier,
        subscription_status: subscription.status,
        shopify_subscription_id: subscription.id,
        trial_end_date: trialEndDate,
        current_period_end: subscription.current_period_end,
        updated_at: new Date().toISOString(),
      })
      .eq('id', store.id);

    if (updateError) {
      console.error('Error updating store:', updateError);
      throw updateError;
    }

    // Determine event type for history
    let eventType = 'activated';
    if (subscription.status === 'CANCELLED') {
      eventType = 'cancelled';
    } else if (subscription.status === 'EXPIRED') {
      eventType = 'expired';
    } else if (subscription.status === 'DECLINED') {
      eventType = 'declined';
    } else if (subscription.status === 'FROZEN') {
      eventType = 'frozen';
    } else if (store.current_tier !== tier) {
      // Tier changed
      const oldTierOrder = ['startup', 'momentum', 'scale', 'enterprise'].indexOf(store.current_tier || 'startup');
      const newTierOrder = ['startup', 'momentum', 'scale', 'enterprise'].indexOf(tier);
      eventType = newTierOrder > oldTierOrder ? 'upgraded' : 'downgraded';
    }

    // Record subscription history
    const { error: historyError } = await supabase
      .from('subscription_history')
      .insert({
        store_id: store.id,
        shopify_subscription_id: subscription.id,
        previous_tier: store.current_tier,
        new_tier: tier,
        previous_status: store.subscription_status,
        new_status: subscription.status,
        price_amount: parseFloat(priceAmount),
        currency_code: currencyCode,
        trial_days: subscription.trial_days,
        event_type: eventType,
        metadata: {
          webhook_topic: topic,
          test: subscription.test,
          current_period_end: subscription.current_period_end,
        },
      });

    if (historyError) {
      console.error('Error recording history:', historyError);
      // Don't fail the webhook for history errors
    }

    console.log('Subscription webhook processed successfully:', {
      storeId: store.id,
      tier,
      status: subscription.status,
      eventType,
    });

    return new Response(
      JSON.stringify({
        success: true,
        storeId: store.id,
        tier,
        status: subscription.status,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error processing subscription webhook:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
