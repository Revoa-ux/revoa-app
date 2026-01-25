import { createClient } from 'npm:@supabase/supabase-js@2.39.7';
import { shopifyGraphQL, MUTATIONS } from '../_shared/shopify-graphql.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https:",
};

const SHOPIFY_API_VERSION = '2026-01';

interface WebhookConfig {
  topic: string;
  address: string;
}

/**
 * Register webhooks using GraphQL Admin API (compliant with Shopify requirements)
 */
async function registerWebhooks(shop: string, accessToken: string): Promise<void> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  if (!supabaseUrl) {
    throw new Error('SUPABASE_URL not configured');
  }

  const webhooks: WebhookConfig[] = [
    // Order webhooks
    { topic: 'ORDERS_CREATE', address: `${supabaseUrl}/functions/v1/shopify-order-webhook` },
    { topic: 'ORDERS_PAID', address: `${supabaseUrl}/functions/v1/shopify-order-webhook` },
    { topic: 'ORDERS_FULFILLED', address: `${supabaseUrl}/functions/v1/shopify-order-webhook` },
    { topic: 'ORDERS_CANCELLED', address: `${supabaseUrl}/functions/v1/shopify-order-webhook` },
    // Uninstall webhook
    { topic: 'APP_UNINSTALLED', address: `${supabaseUrl}/functions/v1/shopify-uninstall-webhook` },
    // GDPR compliance webhooks
    { topic: 'CUSTOMERS_DATA_REQUEST', address: `${supabaseUrl}/functions/v1/data-deletion-callback` },
    { topic: 'CUSTOMERS_REDACT', address: `${supabaseUrl}/functions/v1/data-deletion-callback` },
    { topic: 'SHOP_REDACT', address: `${supabaseUrl}/functions/v1/data-deletion-callback` }
  ];

  console.log(`[Webhooks GraphQL] Registering ${webhooks.length} webhooks for shop: ${shop}`);

  for (const webhook of webhooks) {
    try {
      const result = await shopifyGraphQL(shop, accessToken, MUTATIONS.WEBHOOK_SUBSCRIPTION_CREATE, {
        topic: webhook.topic,
        webhookSubscription: {
          callbackUrl: webhook.address,
          format: 'JSON'
        }
      });

      if (result.webhookSubscriptionCreate?.userErrors?.length > 0) {
        const errors = result.webhookSubscriptionCreate.userErrors;
        console.error(`[Webhooks GraphQL] Failed to register ${webhook.topic}:`, errors);
      } else {
        const subscriptionId = result.webhookSubscriptionCreate?.webhookSubscription?.id;
        console.log(`[Webhooks GraphQL] ✓ Registered ${webhook.topic} (ID: ${subscriptionId})`);
      }
    } catch (error) {
      console.error(`[Webhooks GraphQL] Error registering ${webhook.topic}:`, error);
      // Continue with other webhooks
    }
  }

  console.log('[Webhooks GraphQL] Webhook registration complete');
}

async function handleOAuthCompletion(req: Request, supabase: any) {
  const body = await req.json();
  const { shop, code, state } = body;

  console.log('[OAuth] Completing OAuth for shop:', shop);

  if (!shop || !code || !state) {
    throw new Error('Missing required OAuth parameters');
  }

  // Retrieve user_id from oauth_sessions table using state parameter
  console.log('[OAuth] Looking up OAuth session for state:', state);
  const { data: oauthSession, error: sessionError } = await supabase
    .from('oauth_sessions')
    .select('user_id, shop_domain, expires_at')
    .eq('state', state)
    .eq('shop_domain', shop)
    .maybeSingle();

  if (sessionError || !oauthSession) {
    console.error('[OAuth] OAuth session not found or error:', sessionError);
    throw new Error('Invalid or expired OAuth session. Please try again.');
  }

  // Check if session has expired (5 minutes)
  const expiresAt = new Date(oauthSession.expires_at);
  if (expiresAt < new Date()) {
    console.error('[OAuth] OAuth session expired');
    throw new Error('OAuth session expired. Please try again.');
  }

  const userId = oauthSession.user_id;
  console.log('[OAuth] Found user_id from session:', userId);

  const clientId = Deno.env.get('SHOPIFY_CLIENT_ID');
  const clientSecret = Deno.env.get('SHOPIFY_CLIENT_SECRET');

  if (!clientId || !clientSecret) {
    console.error('[OAuth] Missing required Shopify environment variables');
    console.error('[OAuth] SHOPIFY_CLIENT_ID and SHOPIFY_CLIENT_SECRET must be configured');
    throw new Error('Server configuration error: Missing Shopify credentials');
  }

  console.log('[OAuth] Using SHOPIFY_CLIENT_SECRET for token exchange');

  // Exchange code for access token
  console.log('[OAuth] Exchanging code for access token');
  const tokenResponse = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
    }),
  });

  if (!tokenResponse.ok) {
    const error = await tokenResponse.text();
    console.error('[OAuth] Token exchange failed:', error);
    throw new Error(`Failed to exchange token: ${error}`);
  }

  const { access_token, scope } = await tokenResponse.json();
  console.log('[OAuth] Access token obtained successfully');

  // Register webhooks after getting access token
  console.log('[OAuth] Registering webhooks with Shopify');
  await registerWebhooks(shop, access_token);

  // Save installation to both tables for backwards compatibility
  console.log('[OAuth] Saving installation to database');

  // Save to new stores table
  const { error: storeError } = await supabase
    .from('stores')
    .upsert({
      user_id: userId,
      platform: 'shopify',
      store_url: shop,
      access_token,
      scopes: scope.split(','),
      status: 'active',
      connected_at: new Date().toISOString(),
      last_synced_at: new Date().toISOString(),
    }, {
      onConflict: 'user_id,store_url'
    });

  if (storeError) {
    console.error('[OAuth] Error saving to stores table:', storeError);
  }

  // Also save to shopify_installations for backwards compatibility
  const { error: installError } = await supabase
    .from('shopify_installations')
    .upsert({
      user_id: userId,
      store_url: shop,
      access_token,
      scopes: scope.split(','),
      status: 'installed',
      installed_at: new Date().toISOString(),
      last_auth_at: new Date().toISOString(),
      uninstalled_at: null,
      metadata: {
        install_count: 1,
        last_install: new Date().toISOString(),
      },
    }, {
      onConflict: 'store_url'
    });

  if (installError) {
    console.error('[OAuth] Error saving installation:', installError);
    throw new Error(`Failed to save installation: ${installError.message}`);
  }

  // Mark OAuth session as completed
  console.log('[OAuth] Marking OAuth session as completed');
  await supabase
    .from('oauth_sessions')
    .update({
      completed_at: new Date().toISOString(),
      error: null
    })
    .eq('state', state);

  // Trigger automatic order sync in the background
  console.log('[OAuth] Triggering automatic order sync...');
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (supabaseUrl && serviceRoleKey) {
    // Fire and forget - don't wait for sync to complete
    fetch(`${supabaseUrl}/functions/v1/sync-shopify-orders`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        storeUrl: shop,
        accessToken: access_token,
      }),
    }).then(res => {
      if (res.ok) {
        console.log('[OAuth] ✅ Order sync triggered successfully');
      } else {
        console.warn('[OAuth] ⚠️ Order sync trigger failed, but OAuth completed');
      }
    }).catch(err => {
      console.warn('[OAuth] ⚠️ Order sync trigger error (non-fatal):', err.message);
    });
  }

  console.log('[OAuth] OAuth completion successful');
  return { success: true, shop, access_token, scope };
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseKey) {
      console.error('[Shopify Proxy] Missing Supabase environment variables');
      throw new Error('Server configuration error');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check if this is an OAuth completion request (doesn't require auth)
    if (req.method === 'POST') {
      console.log('[Shopify Proxy] POST request received');
      const contentType = req.headers.get('Content-Type') || '';
      console.log('[Shopify Proxy] Content-Type:', contentType);

      if (contentType.includes('application/json')) {
        const bodyText = await req.text();
        console.log('[Shopify Proxy] Body text received, length:', bodyText.length);
        let body;
        try {
          body = JSON.parse(bodyText);
          console.log('[Shopify Proxy] Body parsed, keys:', Object.keys(body));
          console.log('[Shopify Proxy] Body.action:', body.action);
        } catch (e) {
          console.error('[Shopify Proxy] Failed to parse body:', e);
          body = {};
        }

        if (body.action === 'complete-oauth') {
          console.log('[Shopify Proxy] ✓ Handling OAuth completion (no auth required)');
          const result = await handleOAuthCompletion(
            new Request(req.url, {
              method: req.method,
              headers: req.headers,
              body: bodyText,
            }),
            supabase
          );
          return new Response(JSON.stringify(result), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        console.log('[Shopify Proxy] Not OAuth completion, continuing with normal auth flow');
        // If not OAuth completion, we need to reconstruct the request with the body
        // for the rest of the function to use
        req = new Request(req.url, {
          method: req.method,
          headers: req.headers,
          body: bodyText,
        });
      }
    }

    // For non-OAuth requests, require authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('[Shopify Proxy] Missing authorization header');
      throw new Error('Missing authorization header');
    }

    // Extract JWT token
    const token = authHeader.replace('Bearer ', '');

    // Get the authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError) {
      console.error('[Shopify Proxy] User auth error:', JSON.stringify(userError));
      throw new Error(`Unauthorized: ${userError.message}`);
    }
    if (!user) {
      console.error('[Shopify Proxy] No user found');
      throw new Error('Unauthorized: No user found');
    }

    console.log('[Shopify Proxy] Request from user:', user.id);

    // Get user's Shopify store (try new stores table first, fallback to shopify_installations)
    console.log('[Shopify Proxy] Fetching store for user:', user.id);
    let installation = null;
    let installError = null;

    // Try new stores table first
    const { data: storeData, error: storeError } = await supabase
      .from('stores')
      .select('store_url, access_token')
      .eq('user_id', user.id)
      .eq('platform', 'shopify')
      .eq('status', 'active')
      .maybeSingle();

    if (storeData) {
      installation = storeData;
    } else if (!storeError || storeError.code === 'PGRST116') {
      // If no data in stores table, fallback to shopify_installations
      console.log('[Shopify Proxy] No store found in stores table, trying shopify_installations');
      const { data: installData, error: legacyError } = await supabase
        .from('shopify_installations')
        .select('store_url, access_token')
        .eq('user_id', user.id)
        .eq('status', 'installed')
        .is('uninstalled_at', null)
        .order('installed_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      installation = installData;
      installError = legacyError;
    } else {
      installError = storeError;
    }

    if (installError) {
      console.error('[Shopify Proxy] Error fetching installation:', JSON.stringify(installError));
      throw new Error(`Failed to fetch Shopify installation: ${installError.message}`);
    }

    if (!installation) {
      console.log('[Shopify Proxy] No installation found for user:', user.id);
      return new Response(
        JSON.stringify({ error: 'No Shopify store connected' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('[Shopify Proxy] Found installation for shop:', installation.store_url);

    // Get the endpoint from query params
    const url = new URL(req.url);
    const endpoint = url.searchParams.get('endpoint');
    if (!endpoint) {
      console.error('[Shopify Proxy] Missing endpoint parameter');
      throw new Error('Missing endpoint parameter');
    }

    console.log('[Shopify Proxy] Fetching:', endpoint, 'with method:', req.method);

    // Get request body if present
    let body: string | undefined;
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      body = await req.text();
      console.log('[Shopify Proxy] Request body:', body);
    }

    // Make request to Shopify
    const shopifyUrl = `https://${installation.store_url}/admin/api/${SHOPIFY_API_VERSION}${endpoint}`;
    console.log('[Shopify Proxy] Shopify URL:', shopifyUrl);

    // For GraphQL requests, we need to send the body as-is
    const shopifyResponse = await fetch(shopifyUrl, {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': installation.access_token,
      },
      body: body,
    });

    if (!shopifyResponse.ok) {
      const errorText = await shopifyResponse.text();
      console.error('[Shopify Proxy] Shopify API error:', {
        status: shopifyResponse.status,
        statusText: shopifyResponse.statusText,
        body: errorText,
      });
      throw new Error(`Shopify API error: ${shopifyResponse.status} ${errorText}`);
    }

    const data = await shopifyResponse.json();
    console.log('[Shopify Proxy] Success:', endpoint, 'returned', Object.keys(data).length, 'keys');

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : '';
    console.error('[Shopify Proxy] Error:', errorMessage);
    console.error('[Shopify Proxy] Stack:', errorStack);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});