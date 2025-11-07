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

    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const action = url.searchParams.get('action');

    const supabase = createClient(supabaseUrl, supabaseKey);

    if (code && state && !action) {
      try {
        const { data: session, error: sessionError } = await supabase
          .from('oauth_sessions')
          .select('*')
          .eq('state', state)
          .maybeSingle();

        if (sessionError || !session) {
          console.error('Invalid session:', sessionError);
          return new Response(
            `<!DOCTYPE html>
            <html>
              <head><title>OAuth Error</title></head>
              <body>
                <h1>Authentication Error</h1>
                <p>Invalid or expired session. Please try again.</p>
                <script>
                  setTimeout(() => {
                    window.location.href = '${Deno.env.get('FRONTEND_URL') || 'https://members.revoa.app'}/settings';
                  }, 3000);
                </script>
              </body>
            </html>`,
            {
              status: 200,
              headers: { ...corsHeaders, 'Content-Type': 'text/html' },
            }
          );
        }

        if (new Date(session.expires_at) < new Date()) {
          return new Response(
            `<!DOCTYPE html>
            <html>
              <head><title>OAuth Error</title></head>
              <body>
                <h1>Session Expired</h1>
                <p>Your session has expired. Please try again.</p>
                <script>
                  setTimeout(() => {
                    window.location.href = '${Deno.env.get('FRONTEND_URL') || 'https://members.revoa.app'}/settings';
                  }, 3000);
                </script>
              </body>
            </html>`,
            {
              status: 200,
              headers: { ...corsHeaders, 'Content-Type': 'text/html' },
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
            `<!DOCTYPE html>
            <html>
              <head><title>OAuth Error</title></head>
              <body>
                <h1>Authentication Failed</h1>
                <p>Failed to exchange authorization code. Please try again.</p>
                <script>
                  setTimeout(() => {
                    window.location.href = '${Deno.env.get('FRONTEND_URL') || 'https://members.revoa.app'}/settings';
                  }, 3000);
                </script>
              </body>
            </html>`,
            {
              status: 200,
              headers: { ...corsHeaders, 'Content-Type': 'text/html' },
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
            `<!DOCTYPE html>
            <html>
              <head><title>OAuth Error</title></head>
              <body>
                <h1>Failed to Load Ad Accounts</h1>
                <p>Could not fetch your Facebook ad accounts. Please ensure you have ad accounts set up.</p>
                <script>
                  setTimeout(() => {
                    window.location.href = '${Deno.env.get('FRONTEND_URL') || 'https://members.revoa.app'}/settings';
                  }, 3000);
                </script>
              </body>
            </html>`,
            {
              status: 200,
              headers: { ...corsHeaders, 'Content-Type': 'text/html' },
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
          `<!DOCTYPE html>
          <html>
            <head><title>Success</title></head>
            <body>
              <h1>Successfully Connected!</h1>
              <p>Connected ${adAccountsData.data.length} Facebook ad account(s). Redirecting...</p>
              <script>
                setTimeout(() => {
                  window.location.href = '${Deno.env.get('FRONTEND_URL') || 'https://members.revoa.app'}/settings?facebook_connected=true';
                }, 2000);
              </script>
            </body>
          </html>`,
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'text/html' },
          }
        );
      } catch (error) {
        console.error('OAuth callback error:', error);
        return new Response(
          `<!DOCTYPE html>
          <html>
            <head><title>OAuth Error</title></head>
            <body>
              <h1>An Error Occurred</h1>
              <p>Something went wrong during authentication. Please try again.</p>
              <script>
                setTimeout(() => {
                  window.location.href = '${Deno.env.get('FRONTEND_URL') || 'https://members.revoa.app'}/settings';
                }, 3000);
              </script>
            </body>
          </html>`,
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'text/html' },
          }
        );
      }
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing authorization header' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const token = authHeader.replace('Bearer ', '');

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
        'public_profile',
        'email',
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
