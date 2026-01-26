import { createClient } from 'npm:@supabase/supabase-js@2.39.7';
import { verifyShopifyWebhook, getWebhookSecret } from './_shared/shopify-hmac.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Shopify-Hmac-Sha256, X-Shopify-Shop-Domain, X-Shopify-API-Version, X-Shopify-Webhook-Id',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
};


Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    console.log('[Uninstall Webhook] Received request');

    const shop = req.headers.get('X-Shopify-Shop-Domain');
    const hmac = req.headers.get('X-Shopify-Hmac-Sha256');
    const apiVersion = req.headers.get('X-Shopify-API-Version');
    const webhookId = req.headers.get('X-Shopify-Webhook-Id');

    console.log('[Uninstall Webhook] Headers:', { shop, hasHmac: !!hmac, apiVersion, webhookId });

    if (!shop || !hmac) {
      console.error('[Uninstall Webhook] Missing required headers');
      throw new Error('Missing required headers: shop or HMAC');
    }

    const body = await req.text();
    console.log('[Uninstall Webhook] Body received, length:', body.length);

    let secret: string;
    try {
      secret = getWebhookSecret();
    } catch (error) {
      console.error('[Uninstall Webhook] Error getting webhook secret:', error);
      throw new Error('Server configuration error: Webhook secret not configured');
    }

    console.log('[Uninstall Webhook] Using webhook secret for HMAC verification');

    const isValid = await verifyShopifyWebhook(body, hmac, secret);
    if (!isValid) {
      console.error('[Uninstall Webhook] ❌ Invalid HMAC signature');
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

    console.log('[Uninstall Webhook] ✅ HMAC verified successfully');

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseKey) {
      console.error('[Uninstall Webhook] Missing Supabase credentials');
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
            console.log('[Uninstall Webhook] Duplicate webhook detected, skipping:', webhookId);
            return;
          }

          await supabase.from('webhook_logs').insert({
            webhook_id: webhookId,
            topic: 'app/uninstalled',
            shop_domain: shop,
            processed_at: new Date().toISOString(),
          });
        }

        console.log('[Uninstall Webhook] Marking installation as uninstalled for shop:', shop);

        const { data, error } = await supabase
          .from('shopify_installations')
          .update({
            status: 'uninstalled',
            uninstalled_at: new Date().toISOString(),
            access_token: null,
          })
          .eq('store_url', shop)
          .eq('status', 'installed')
          .select();

        if (error) {
          console.error('[Uninstall Webhook] Database error:', error);
        } else {
          console.log('[Uninstall Webhook] ✅ Success:', data);
        }

        await supabase
          .from('stores')
          .update({
            status: 'inactive',
            access_token: null,
            disconnected_at: new Date().toISOString(),
          })
          .eq('store_url', shop)
          .eq('platform', 'shopify')
          .eq('status', 'active');

        const shopDomainClean = shop.replace('https://', '').replace('http://', '');

        const { data: shopifyStore, error: storeError } = await supabase
          .from('shopify_stores')
          .update({
            subscription_status: 'CANCELLED',
            shopify_subscription_id: null,
            current_tier: null,
            updated_at: new Date().toISOString(),
          })
          .ilike('store_url', `%${shopDomainClean}%`)
          .select('id')
          .maybeSingle();

        console.log('[Uninstall Webhook] shopify_stores update result:', { shopifyStore, storeError, shopDomainClean });

        if (shopifyStore) {
          console.log('[Uninstall Webhook] Reset subscription status for shopify_stores:', shopifyStore.id);

          await supabase.from('subscription_history').insert({
            store_id: shopifyStore.id,
            old_status: 'ACTIVE',
            new_status: 'CANCELLED',
            event_type: 'app_uninstalled',
            metadata: { shop, uninstalled_at: new Date().toISOString() }
          });
        }

        console.log('[Uninstall Webhook] Note: Complete data deletion will occur after 48 hours via shop/redact webhook');
      } catch (bgError) {
        console.error('[Uninstall Webhook] Background processing error:', bgError);
      }
    })();

    if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime.waitUntil) {
      EdgeRuntime.waitUntil(backgroundProcessing);
    }

    return responsePromise;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Uninstall Webhook] Error:', errorMessage);

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