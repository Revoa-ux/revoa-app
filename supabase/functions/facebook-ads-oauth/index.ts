import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface OAuthState {
  userId: string;
  timestamp: number;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const facebookAppId = Deno.env.get('FACEBOOK_APP_ID');
    const facebookAppSecret = Deno.env.get('FACEBOOK_APP_SECRET');

    if (!facebookAppId || !facebookAppSecret) {
      console.error('Missing Facebook credentials');
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Facebook OAuth is not configured. Please contact support.',
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing authorization' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const supabase = createClient(supabaseUrl, supabaseKey);

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const url = new URL(req.url);
    const action = url.searchParams.get('action');

    if (action === 'connect') {
      const state = crypto.randomUUID();
      const stateData: OAuthState = {
        userId: user.id,
        timestamp: Date.now(),
      };

      const { error: sessionError } = await supabase.from('oauth_sessions').insert({
        state,
        shop_domain: 'facebook-ads',
        user_id: user.id,
        expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        metadata: stateData,
      });

      if (sessionError) {
        console.error('Error creating OAuth session:', sessionError);
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to create session' }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      const redirectUri = `${supabaseUrl}/functions/v1/facebook-ads-oauth`;
      const scope = [
        'ads_read',
        'ads_management',
        'read_insights',
        'business_management',
        'pages_read_engagement',
        'pages_manage_ads',
      ].join(',');

      const oauthUrl =
        `https://www.facebook.com/v18.0/dialog/oauth?` +
        `client_id=${facebookAppId}` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&state=${state}` +
        `&scope=${encodeURIComponent(scope)}`;

      return new Response(
        JSON.stringify({
          success: true,
          oauthUrl,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (action === 'callback') {
      const code = url.searchParams.get('code');
      const state = url.searchParams.get('state');

      if (!code || !state) {
        return new Response(
          JSON.stringify({ success: false, error: 'Missing code or state' }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      const { data: session, error: sessionError } = await supabase
        .from('oauth_sessions')
        .select('*')
        .eq('state', state)
        .single();

      if (sessionError || !session) {
        return new Response(
          JSON.stringify({ success: false, error: 'Invalid session' }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      if (new Date(session.expires_at) < new Date()) {
        return new Response(
          JSON.stringify({ success: false, error: 'Session expired' }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      const redirectUri = `${supabaseUrl}/functions/v1/facebook-ads-oauth`;
      const tokenUrl = 'https://graph.facebook.com/v18.0/oauth/access_token';
      const tokenParams = new URLSearchParams({
        client_id: facebookAppId,
        client_secret: facebookAppSecret,
        redirect_uri: redirectUri,
        code,
      });

      const tokenResponse = await fetch(`${tokenUrl}?${tokenParams.toString()}`);
      const tokenData = await tokenResponse.json();

      if (!tokenResponse.ok || !tokenData.access_token) {
        console.error('Token exchange failed:', tokenData);
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to exchange code for token' }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      const longLivedTokenUrl = 'https://graph.facebook.com/v18.0/oauth/access_token';
      const longLivedParams = new URLSearchParams({
        grant_type: 'fb_exchange_token',
        client_id: facebookAppId,
        client_secret: facebookAppSecret,
        fb_exchange_token: tokenData.access_token,
      });

      const longLivedResponse = await fetch(`${longLivedTokenUrl}?${longLivedParams.toString()}`);
      const longLivedData = await longLivedResponse.json();

      const accessToken = longLivedData.access_token || tokenData.access_token;
      const expiresIn = longLivedData.expires_in || tokenData.expires_in || 5184000;

      const adAccountsUrl = `https://graph.facebook.com/v18.0/me/adaccounts?fields=id,name,account_status,currency,timezone_name&access_token=${accessToken}`;
      const adAccountsResponse = await fetch(adAccountsUrl);
      const adAccountsData = await adAccountsResponse.json();

      if (!adAccountsResponse.ok || !adAccountsData.data) {
        console.error('Failed to fetch ad accounts:', adAccountsData);
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to fetch ad accounts' }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      for (const account of adAccountsData.data) {
        const { error: accountError } = await supabase.from('ad_accounts').upsert(
          {
            platform_account_id: account.id,
            name: account.name,
            platform: 'facebook',
            status: account.account_status === 1 ? 'active' : 'inactive',
            currency: account.currency,
            timezone: account.timezone_name,
            user_id: session.user_id,
          },
          { onConflict: 'platform_account_id' }
        );

        if (accountError) {
          console.error('Error upserting ad account:', accountError);
        }

        const { error: tokenError } = await supabase.from('facebook_tokens').upsert(
          {
            user_id: session.user_id,
            ad_account_id: account.id,
            access_token: accessToken,
            token_type: 'user',
            expires_at: new Date(Date.now() + expiresIn * 1000).toISOString(),
          },
          { onConflict: 'ad_account_id' }
        );

        if (tokenError) {
          console.error('Error upserting Facebook token:', tokenError);
        }
      }

      await supabase.from('oauth_sessions').delete().eq('state', state);

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Successfully connected Facebook Ads',
          accountCount: adAccountsData.data.length,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (action === 'disconnect' && req.method === 'DELETE') {
      const body = await req.json();
      const { accountId } = body;

      if (!accountId) {
        return new Response(
          JSON.stringify({ success: false, error: 'Missing accountId' }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      await supabase.from('facebook_tokens').delete().eq('ad_account_id', accountId).eq('user_id', user.id);

      await supabase.from('ad_accounts').update({ status: 'disconnected' }).eq('platform_account_id', accountId).eq(
        'user_id',
        user.id
      );

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Successfully disconnected ad account',
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: 'Invalid action' }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Facebook OAuth error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
