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

    if (code && state) {
      try {
        const { data: session, error: sessionError } = await supabase
          .from('oauth_sessions')
          .select('*')
          .eq('state', state)
          .maybeSingle();

        if (sessionError || !session) {
          console.error('Invalid session:', sessionError);
          const redirectUrl = `${Deno.env.get('FRONTEND_URL') || 'https://members.revoa.app'}/facebook-oauth-callback.html?error=invalid_session`;
          return new Response(null, {
            status: 302,
            headers: { ...corsHeaders, 'Location': redirectUrl },
          });
        }

        if (new Date(session.expires_at) < new Date()) {
          const redirectUrl = `${Deno.env.get('FRONTEND_URL') || 'https://members.revoa.app'}/facebook-oauth-callback.html?error=session_expired`;
          return new Response(null, {
            status: 302,
            headers: { ...corsHeaders, 'Location': redirectUrl },
          });
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
          const errorMsg = tokenData.error?.message || tokenData.error_description || 'token_exchange_failed';
          const redirectUrl = `${Deno.env.get('FRONTEND_URL') || 'https://members.revoa.app'}/facebook-oauth-callback.html?error=${encodeURIComponent(errorMsg)}`;
          return new Response(null, {
            status: 302,
            headers: { ...corsHeaders, 'Location': redirectUrl },
          });
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

        let accounts = [];

        if (adAccountsResponse.ok && adAccountsData.data && adAccountsData.data.length > 0) {
          accounts = adAccountsData.data;
        } else {
          console.log('No ad accounts from /me/adaccounts, trying direct access');
          const directAccountId = 'act_1799737293827038';
          const directUrl = `https://graph.facebook.com/v18.0/${directAccountId}?fields=id,name,account_status,currency,timezone_name&access_token=${accessToken}`;
          const directResponse = await fetch(directUrl);
          const directData = await directResponse.json();

          if (directResponse.ok && !directData.error) {
            accounts = [directData];
          } else {
            console.error('Failed to access ad account directly:', directData);
            const errorMsg = directData.error?.message || adAccountsData.error?.message || 'no_ad_accounts_access';
            const redirectUrl = `${Deno.env.get('FRONTEND_URL') || 'https://members.revoa.app'}/facebook-oauth-callback.html?error=${encodeURIComponent(errorMsg)}`;
            return new Response(null, {
              status: 302,
              headers: { ...corsHeaders, 'Location': redirectUrl },
            });
          }
        }

        const { error: updateError } = await supabase
          .from('oauth_sessions')
          .update({
            metadata: {
              accounts: accounts,
              accessToken: accessToken,
              expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
            }
          })
          .eq('state', state);

        if (updateError) {
          console.error('Error updating OAuth session:', updateError);
        }

        const redirectUrl = `${Deno.env.get('FRONTEND_URL') || 'https://members.revoa.app'}/facebook-oauth-callback.html?session=${state}`;
        return new Response(null, {
          status: 302,
          headers: { ...corsHeaders, 'Location': redirectUrl },
        });
      } catch (error) {
        console.error('OAuth callback error:', error);
        const redirectUrl = `${Deno.env.get('FRONTEND_URL') || 'https://members.revoa.app'}/facebook-oauth-callback.html?error=oauth_error`;
        return new Response(null, {
          status: 302,
          headers: { ...corsHeaders, 'Location': redirectUrl },
        });
      }
    }

    if (action === 'connect') {
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
        'ads_read',
        'attribution_read',
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

    if (action === 'save-accounts' && req.method === 'POST') {
      try {
        const body = await req.json();
        const { accounts, accessToken, userId, expiresAt, shopifyStoreId } = body;

        if (!accounts || !accessToken || !userId || !expiresAt) {
          return new Response(
            JSON.stringify({ success: false, error: 'Missing required parameters' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        for (const account of accounts) {
          const accountData: any = {
            platform_account_id: account.id,
            account_name: account.name,
            platform: 'facebook',
            status: account.account_status === 1 ? 'active' : 'inactive',
            user_id: userId,
            access_token: accessToken,
            token_expires_at: expiresAt,
            metadata: {
              currency: account.currency,
              timezone: account.timezone_name,
              account_status: account.account_status
            }
          };

          if (shopifyStoreId) {
            accountData.shopify_store_id = shopifyStoreId;
          }

          const { data: upsertedAccount, error: accountError } = await supabase
            .from('ad_accounts')
            .upsert(accountData, { onConflict: 'platform_account_id' })
            .select()
            .single();

          if (accountError) {
            console.error('Error upserting ad account:', accountError);
            console.error('Account data that failed:', JSON.stringify(accountData));
          } else {
            console.log('Successfully saved ad account:', upsertedAccount?.id);
          }

          const { error: tokenError } = await supabase.from('facebook_tokens').upsert(
            {
              user_id: userId,
              ad_account_id: account.id,
              access_token: accessToken,
              token_type: 'user',
              expires_at: expiresAt,
            },
            { onConflict: 'ad_account_id' }
          );

          if (tokenError) {
            console.error('Error upserting Facebook token:', tokenError);
          }
        }

        return new Response(
          JSON.stringify({ success: true, message: 'Accounts saved successfully' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (error) {
        console.error('Error saving accounts:', error);
        return new Response(
          JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Failed to save accounts' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    if (action === 'disconnect' && req.method === 'DELETE') {
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
