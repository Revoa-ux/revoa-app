import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import * as crypto from 'crypto';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const verifyShopifyWebhook = (body: string, hmacHeader: string, secret: string): boolean => {
  const hash = crypto
    .createHmac('sha256', secret)
    .update(body, 'utf8')
    .digest('base64');

  // Use timing-safe comparison to prevent timing attacks
  return crypto.timingSafeEqual(
    Buffer.from(hash, 'utf8'),
    Buffer.from(hmacHeader, 'utf8')
  );
};

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  const shopifyHmac = event.headers['x-shopify-hmac-sha256'];
  const shopifyTopic = event.headers['x-shopify-topic'];
  const shopifyDomain = event.headers['x-shopify-shop-domain'];

  if (!shopifyHmac || !shopifyTopic || !shopifyDomain) {
    console.error('[Webhook] Missing required Shopify headers');
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Missing required headers' }),
    };
  }

  // IMPORTANT: Use SHOPIFY_CLIENT_SECRET for webhook HMAC verification
  // Shopify uses the same Client Secret for both OAuth and webhook verification
  const clientSecret = process.env.SHOPIFY_CLIENT_SECRET;
  if (!clientSecret) {
    console.error('[Webhook] SHOPIFY_CLIENT_SECRET environment variable is not configured');
    console.error('[Webhook] This variable must be set in Netlify dashboard under Site settings > Environment variables');
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Server configuration error: SHOPIFY_CLIENT_SECRET not set' }),
    };
  }

  console.log('[Webhook] Using SHOPIFY_CLIENT_SECRET for HMAC verification');

  const body = event.body || '';
  const isValid = verifyShopifyWebhook(body, shopifyHmac, clientSecret);

  if (!isValid) {
    console.error('[Webhook] Invalid HMAC signature for topic:', shopifyTopic);
    console.error('[Webhook] Shop:', shopifyDomain);
    console.error('[Webhook] Body length:', body.length);
    console.error('[Webhook] Verify that SHOPIFY_CLIENT_SECRET matches your Shopify app\'s Client Secret');
    return {
      statusCode: 401,
      body: JSON.stringify({ error: 'Invalid HMAC signature' }),
    };
  }

  console.log(`[Webhook] Received ${shopifyTopic} for ${shopifyDomain}`);

  try {
    switch (shopifyTopic) {
      case 'app/uninstalled': {
        console.log(`[Webhook] Processing app uninstall for ${shopifyDomain}`);

        const { error } = await supabase
          .from('shopify_installations')
          .update({
            status: 'uninstalled',
            uninstalled_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('store_url', shopifyDomain)
          .eq('status', 'installed');

        if (error) {
          console.error('[Webhook] Error updating installation status:', error);
          return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Failed to update installation status' }),
          };
        }

        console.log(`[Webhook] Successfully marked ${shopifyDomain} as uninstalled`);
        break;
      }

      case 'orders/create':
      case 'orders/paid':
      case 'orders/fulfilled':
      case 'orders/cancelled': {
        console.log(`[Webhook] Received ${shopifyTopic} - no handler implemented yet`);
        break;
      }

      default:
        console.log(`[Webhook] Unknown topic: ${shopifyTopic}`);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true }),
    };
  } catch (error) {
    console.error('[Webhook] Error processing webhook:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};
