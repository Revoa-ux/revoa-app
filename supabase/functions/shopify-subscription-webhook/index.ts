import { createClient } from 'npm:@supabase/supabase-js@2.39.7';
import { verifyShopifyWebhook, getWebhookSecret } from '../_shared/shopify-hmac.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Shopify-Hmac-Sha256, X-Shopify-Shop-Domain, X-Shopify-API-Version, X-Shopify-Webhook-Id',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
};

/**
 * Shopify APP_SUBSCRIPTIONS_UPDATE Webhook Handler
 *
 * This webhook is triggered when a merchant upgrades, downgrades, or cancels
 * their subscription from Shopify admin. It keeps our database in sync with
 * Shopify's subscription state.
 *
 * Required for Shopify Managed Pricing compliance.
 */

interface ShopifySubscriptionPayload {
  app_subscription: {
    admin_graphql_api_id: string;
    name: string;
    status: string;
    admin_graphql_api_shop_id: string;
    created_at: string;
    updated_at: string;
    currency: string;
    capped_amount?: string;
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    console.log('[Subscription Webhook] Received request');

    const shop = req.headers.get('X-Shopify-Shop-Domain');
    const hmac = req.headers.get('X-Shopify-Hmac-Sha256');
    const apiVersion = req.headers.get('X-Shopify-API-Version');
    const webhookId = req.headers.get('X-Shopify-Webhook-Id');

    console.log('[Subscription Webhook] Headers:', { shop, hasHmac: !!hmac, apiVersion, webhookId });

    if (!shop || !hmac) {
      console.error('[Subscription Webhook] Missing required headers');
      throw new Error('Missing required headers: shop or HMAC');
    }

    const body = await req.text();
    console.log('[Subscription Webhook] Body received, length:', body.length);

    let secret: string;
    try {
      secret = getWebhookSecret();
    } catch (error) {
      console.error('[Subscription Webhook] Error getting webhook secret:', error);
      throw new Error('Server configuration error: Webhook secret not configured');
    }

    console.log('[Subscription Webhook] Using webhook secret for HMAC verification');

    const isValid = await verifyShopifyWebhook(body, hmac, secret);
    if (!isValid) {
      console.error('[Subscription Webhook] ❌ Invalid HMAC signature');
      return new Response(
        JSON.stringify({
          error: 'Unauthorized',
          message: 'Invalid HMAC signature',
          timestamp: new Date().toISOString(),
        }),
        {
          status: 401,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    console.log('[Subscription Webhook] ✅ HMAC verified successfully');

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseKey) {
      console.error('[Subscription Webhook] Missing Supabase credentials');
      throw new Error('Server configuration error');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const responsePromise = new Response(
      JSON.stringify({
        success: true,
        message: 'Webhook received and verified',
        shop,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );

    const backgroundProcessing = (async () => {
      try {
        if (webhookId) {
          const { data: existingWebhook } = await supabase
            .from('webhook_logs')
            .select('id')
            .eq('webhook_id', webhookId)
            .maybeSingle();

          if (existingWebhook) {
            console.log('[Subscription Webhook] Duplicate webhook detected, skipping:', webhookId);
            return;
          }

          await supabase.from('webhook_logs').insert({
            webhook_id: webhookId,
            topic: 'app_subscriptions/update',
            shop_domain: shop,
            processed_at: new Date().toISOString(),
          });
        }

        const payload: ShopifySubscriptionPayload = JSON.parse(body);
        const subscription = payload.app_subscription;

        console.log('[Subscription Webhook] Processing subscription update:', {
          name: subscription.name,
          status: subscription.status,
          shop,
        });

        // Map Shopify plan name to tier (case-insensitive, defensive)
        // Normalize plan name and handle various formats (including annual variants)
        const normalizePlanName = (name: string): string => {
          const normalized = name.toLowerCase().trim();

          // Handle exact matches and common variations (both monthly and annual)
          if (normalized.includes('startup')) return 'startup';
          if (normalized.includes('momentum')) return 'momentum';
          if (normalized.includes('scale')) return 'scale';
          if (normalized.includes('enterprise')) return 'enterprise';

          // Log warning if unrecognized plan name
          console.warn('[Subscription Webhook] Unrecognized plan name:', name, '- Defaulting to startup tier');
          return 'startup'; // Safe default
        };

        // Detect billing interval (monthly vs annual)
        const detectBillingInterval = (name: string): 'monthly' | 'annual' => {
          const normalized = name.toLowerCase().trim();
          return normalized.includes('annual') || normalized.includes('yearly') ? 'annual' : 'monthly';
        };

        const billingInterval = detectBillingInterval(subscription.name);

        // Map Shopify status to our status (consistent with verify-shopify-subscription)
        const statusMap: Record<string, string> = {
          'active': 'ACTIVE',
          'accepted': 'ACTIVE',    // Trial or payment pending
          'pending': 'PENDING',     // Awaiting merchant approval
          'declined': 'CANCELLED',
          'expired': 'EXPIRED',
          'frozen': 'PENDING',
          'cancelled': 'CANCELLED',
        };

        const newStatus = statusMap[subscription.status.toLowerCase()] || 'PENDING';

        // Only set tier if subscription is active, otherwise null
        const newTier = (newStatus === 'ACTIVE' || newStatus === 'PENDING')
          ? normalizePlanName(subscription.name)
          : null;

        // Get store ID and previous state
        const { data: storeData, error: storeError } = await supabase
          .from('shopify_stores')
          .select('id, current_tier, subscription_status, user_id')
          .eq('store_url', `https://${shop}`)
          .maybeSingle();

        if (storeError || !storeData) {
          console.error('[Subscription Webhook] Store not found:', shop, storeError);
          return;
        }

        const oldTier = storeData.current_tier;
        const oldStatus = storeData.subscription_status;

        // Update subscription in shopify_stores
        // Clear subscription ID if cancelled/expired
        const subscriptionId = (newStatus === 'CANCELLED' || newStatus === 'EXPIRED')
          ? null
          : subscription.admin_graphql_api_id;

        const { error: updateError } = await supabase
          .from('shopify_stores')
          .update({
            current_tier: newTier,
            subscription_status: newStatus,
            shopify_subscription_id: subscriptionId,
            billing_interval: billingInterval,
            last_verified_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', storeData.id);

        if (updateError) {
          console.error('[Subscription Webhook] Failed to update store:', updateError);
          throw updateError;
        }

        // Determine event type for history
        let eventType = 'updated';
        if (oldStatus !== newStatus && newStatus === 'CANCELLED') {
          eventType = 'cancelled';
        } else if (oldStatus !== newStatus && newStatus === 'ACTIVE') {
          eventType = 'activated';
        } else if (oldTier !== newTier) {
          eventType = 'tier_changed';
        }

        // Record in subscription history
        await supabase
          .from('subscription_history')
          .insert({
            store_id: storeData.id,
            shopify_subscription_id: subscription.admin_graphql_api_id,
            old_tier: oldTier,
            new_tier: newTier,
            old_status: oldStatus,
            new_status: newStatus,
            event_type: eventType,
            currency_code: subscription.currency,
            billing_interval: billingInterval,
            metadata: {
              subscription_name: subscription.name,
              subscription_status: subscription.status,
              updated_at: subscription.updated_at,
              capped_amount: subscription.capped_amount,
              billing_interval: billingInterval,
            },
          });

        console.log('[Subscription Webhook] ✅ Subscription updated successfully:', {
          store_id: storeData.id,
          old_tier: oldTier,
          new_tier: newTier,
          old_status: oldStatus,
          new_status: newStatus,
          event_type: eventType,
        });

        // Send notification to user if tier changed or subscription cancelled
        if (storeData.user_id && (eventType === 'tier_changed' || eventType === 'cancelled')) {
          const notificationTitle = eventType === 'cancelled'
            ? 'Subscription Cancelled'
            : eventType === 'tier_changed'
            ? 'Plan Changed'
            : 'Subscription Updated';

          const notificationMessage = eventType === 'cancelled'
            ? 'Your Revoa subscription has been cancelled. You can reactivate it anytime from Shopify admin.'
            : eventType === 'tier_changed'
            ? `Your plan has been ${oldTier === newTier ? 'updated' : oldTier < newTier ? 'upgraded' : 'downgraded'} to ${newTier.charAt(0).toUpperCase() + newTier.slice(1)}.`
            : 'Your subscription has been updated.';

          await supabase
            .from('notifications')
            .insert({
              user_id: storeData.user_id,
              type: eventType === 'cancelled' ? 'subscription_cancelled' : 'subscription_updated',
              title: notificationTitle,
              message: notificationMessage,
              metadata: {
                old_tier: oldTier,
                new_tier: newTier,
                old_status: oldStatus,
                new_status: newStatus,
                event_type: eventType,
              },
            });

          // Send email notification
          try {
            await fetch(`${supabaseUrl}/functions/v1/send-subscription-notification`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${supabaseKey}`,
              },
              body: JSON.stringify({
                userId: storeData.user_id,
                type: eventType === 'cancelled' ? 'subscription-cancelled' : 'subscription-updated',
                data: {
                  oldTier,
                  newTier,
                  oldStatus,
                  newStatus,
                },
              }),
            });
          } catch (emailError) {
            console.error('[Subscription Webhook] Error sending email notification:', emailError);
          }
        }
      } catch (bgError) {
        console.error('[Subscription Webhook] Background processing error:', bgError);
      }
    })();

    if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime.waitUntil) {
      EdgeRuntime.waitUntil(backgroundProcessing);
    }

    return responsePromise;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Subscription Webhook] Error:', errorMessage);

    return new Response(
      JSON.stringify({
        error: errorMessage,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});
