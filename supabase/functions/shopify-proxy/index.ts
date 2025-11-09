import { createClient } from 'npm:@supabase/supabase-js@2.39.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

const SHOPIFY_API_VERSION = '2025-01';

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
    console.error('[OAuth] Missing Shopify credentials');
    throw new Error('Server configuration error');
  }

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

  // Save installation to database
  console.log('[OAuth] Saving installation to database');
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

  console.log('[OAuth] OAuth completion successful');
  return { success: true, shop };
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
      const contentType = req.headers.get('Content-Type') || '';
      if (contentType.includes('application/json')) {
        const bodyText = await req.text();
        let body;
        try {
          body = JSON.parse(bodyText);
        } catch {
          body = {};
        }

        if (body.action === 'complete-oauth') {
          console.log('[Shopify Proxy] Handling OAuth completion (no auth required)');
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

    // Get user's Shopify installation
    console.log('[Shopify Proxy] Fetching installation for user:', user.id);
    const { data: installation, error: installError } = await supabase
      .from('shopify_installations')
      .select('store_url, access_token')
      .eq('user_id', user.id)
      .eq('status', 'installed')
      .maybeSingle();

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