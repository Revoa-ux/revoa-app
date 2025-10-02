import { createClient } from 'npm:@supabase/supabase-js@2.39.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

const SHOPIFY_API_VERSION = '2025-01';

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('[Shopify Proxy] Missing authorization header');
      throw new Error('Missing authorization header');
    }

    // Extract JWT token
    const token = authHeader.replace('Bearer ', '');

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('[Shopify Proxy] Missing Supabase environment variables');
      throw new Error('Server configuration error');
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    });

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

    console.log('[Shopify Proxy] Fetching:', endpoint);

    // Make request to Shopify
    const shopifyUrl = `https://${installation.store_url}/admin/api/${SHOPIFY_API_VERSION}${endpoint}`;
    console.log('[Shopify Proxy] Shopify URL:', shopifyUrl);
    
    const shopifyResponse = await fetch(shopifyUrl, {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': installation.access_token,
      },
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
