import { createClient } from 'npm:@supabase/supabase-js@2.39.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

const SHOPIFY_API_VERSION = '2025-01';

interface ShopifyInstallation {
  shop: string;
  access_token: string;
  user_id: string;
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
    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    // Extract JWT token
    const token = authHeader.replace('Bearer ', '');

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    });

    // Get the authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    console.log('[Shopify Proxy] Request from user:', user.id);

    // Get user's Shopify installation
    const { data: installation, error: installError } = await supabase
      .from('shopify_installations')
      .select('shop, access_token')
      .eq('user_id', user.id)
      .eq('status', 'installed')
      .maybeSingle();

    if (installError) {
      console.error('[Shopify Proxy] Error fetching installation:', installError);
      throw new Error('Failed to fetch Shopify installation');
    }

    if (!installation) {
      return new Response(
        JSON.stringify({ error: 'No Shopify store connected' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Get the endpoint from query params
    const url = new URL(req.url);
    const endpoint = url.searchParams.get('endpoint');
    if (!endpoint) {
      throw new Error('Missing endpoint parameter');
    }

    console.log('[Shopify Proxy] Fetching:', endpoint);

    // Make request to Shopify
    const shopifyUrl = `https://${installation.shop}/admin/api/${SHOPIFY_API_VERSION}${endpoint}`;
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
    console.log('[Shopify Proxy] Success:', endpoint);

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[Shopify Proxy] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
