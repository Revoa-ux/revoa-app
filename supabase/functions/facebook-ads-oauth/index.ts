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

    console.log('[Facebook OAuth] Request received:', {
      hasCode: !!code,
      hasState: !!state,
      action,
      fullUrl: req.url.substring(0, 200)
    });

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Handle OAuth callback from Facebook - code exists but state might be missing due to Facebook issue
    if (code) {
      // If code exists but state is missing, this is likely a Facebook redirect issue
      if (!state) {
        console.error('[Facebook OAuth] Code received but state is missing - Facebook callback issue');
        const redirectUrl = `${Deno.env.get('FRONTEND_URL') || 'https://members.revoa.app'}/facebook-oauth-callback.html?error=${encodeURIComponent('OAuth state parameter missing. Please try connecting again.')}`;
        return new Response(null, {
          status: 302,
          headers: { ...corsHeaders, 'Location': redirectUrl },
        });
      }
    }

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
        const tokenUrl = 'https://graph.facebook.com/v21.0/oauth/access_token';
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

        const longLivedTokenUrl = 'https://graph.facebook.com/v21.0/oauth/access_token';
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

        console.log('[Facebook OAuth] Fetching ad accounts from Facebook API...');
        const adAccountsUrl = `https://graph.facebook.com/v21.0/me/adaccounts?fields=id,name,account_status,currency,timezone_name&access_token=${accessToken}`;
        const adAccountsResponse = await fetch(adAccountsUrl);
        const adAccountsData = await adAccountsResponse.json();

        console.log('[Facebook OAuth] Ad accounts response status:', adAccountsResponse.status);
        console.log('[Facebook OAuth] Ad accounts response:', JSON.stringify(adAccountsData, null, 2));

        let accounts = [];

        if (adAccountsResponse.ok && adAccountsData.data && adAccountsData.data.length > 0) {
          accounts = adAccountsData.data;
          console.log('[Facebook OAuth] Found', accounts.length, 'ad accounts');
        } else {
          console.error('[Facebook OAuth] ⚠️  NO AD ACCOUNTS FOUND!');
          console.error('[Facebook OAuth] Response status:', adAccountsResponse.status);
          console.error('[Facebook OAuth] Response data:', JSON.stringify(adAccountsData, null, 2));

          // Check if there's an error from Facebook
          if (adAccountsData.error) {
            console.error('[Facebook OAuth] Facebook API error:', adAccountsData.error.message);
            console.error('[Facebook OAuth] Error type:', adAccountsData.error.type);
            console.error('[Facebook OAuth] Error code:', adAccountsData.error.code);

            const errorMsg = `Facebook API Error: ${adAccountsData.error.message}. Please ensure you have access to at least one Facebook Ad Account and have granted the necessary permissions.`;
            const redirectUrl = `${Deno.env.get('FRONTEND_URL') || 'https://members.revoa.app'}/facebook-oauth-callback.html?error=${encodeURIComponent(errorMsg)}`;
            return new Response(null, {
              status: 302,
              headers: { ...corsHeaders, 'Location': redirectUrl },
            });
          }

          // No accounts but no error - user likely doesn't have any ad accounts
          const errorMsg = 'No Facebook Ad Accounts found. Please create a Facebook Ad Account first or ensure you have been granted access to at least one ad account.';
          const redirectUrl = `${Deno.env.get('FRONTEND_URL') || 'https://members.revoa.app'}/facebook-oauth-callback.html?error=${encodeURIComponent(errorMsg)}`;
          return new Response(null, {
            status: 302,
            headers: { ...corsHeaders, 'Location': redirectUrl },
          });
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
        'ads_management',
        'business_management',
        'read_insights',
      ].join(',');

      const oauthUrl =
        `https://www.facebook.com/v21.0/dialog/oauth?` +
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

        const savedAccounts = [];
        const errors = [];

        for (const account of accounts) {
          try {
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

            console.log(`[Facebook OAuth] Saving ad account ${account.id}:`, JSON.stringify(accountData));

            const { data: upsertedAccount, error: accountError } = await supabase
              .from('ad_accounts')
              .upsert(accountData, { onConflict: 'user_id,platform,platform_account_id' })
              .select()
              .single();

            if (accountError) {
              console.error(`[Facebook OAuth] Error upserting ad account ${account.id}:`, accountError);
              console.error('[Facebook OAuth] Account data that failed:', JSON.stringify(accountData));
              errors.push({ account: account.id, error: accountError.message });
              continue; // Skip to next account
            }

            console.log(`[Facebook OAuth] Successfully saved ad account:`, upsertedAccount?.id);
            savedAccounts.push(upsertedAccount);

            // Save token separately
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
              console.error(`[Facebook OAuth] Error upserting token for ${account.id}:`, tokenError);
              errors.push({ account: account.id, error: `Token save failed: ${tokenError.message}` });
            }
          } catch (err) {
            console.error(`[Facebook OAuth] Exception saving account ${account.id}:`, err);
            errors.push({ account: account.id, error: err instanceof Error ? err.message : 'Unknown error' });
          }
        }

        console.log(`[Facebook OAuth] Saved ${savedAccounts.length} accounts, ${errors.length} errors`);

        return new Response(
          JSON.stringify({
            success: savedAccounts.length > 0,
            message: `Saved ${savedAccounts.length} accounts`,
            accountsSaved: savedAccounts.length,
            errors: errors.length > 0 ? errors : undefined
          }),
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
