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
    const tiktokAppId = Deno.env.get('TIKTOK_APP_ID');
    const tiktokAppSecret = Deno.env.get('TIKTOK_APP_SECRET');

    if (!tiktokAppId || !tiktokAppSecret) {
      console.error('Missing TikTok Ads credentials');
      return new Response(
        JSON.stringify({
          success: false,
          error: 'TikTok Ads OAuth is not configured. Please contact support.',
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const url = new URL(req.url);
    const auth_code = url.searchParams.get('auth_code');
    const state = url.searchParams.get('state');
    const action = url.searchParams.get('action');

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Handle OAuth callback
    if (auth_code && state) {
      try {
        const { data: session, error: sessionError } = await supabase
          .from('oauth_sessions')
          .select('*')
          .eq('state', state)
          .maybeSingle();

        if (sessionError || !session) {
          console.error('Invalid session:', sessionError);
          const redirectUrl = `${Deno.env.get('FRONTEND_URL') || 'https://members.revoa.app'}/tiktok-oauth-callback.html?error=invalid_session`;
          return new Response(null, {
            status: 302,
            headers: { ...corsHeaders, 'Location': redirectUrl },
          });
        }

        if (new Date(session.expires_at) < new Date()) {
          const redirectUrl = `${Deno.env.get('FRONTEND_URL') || 'https://members.revoa.app'}/tiktok-oauth-callback.html?error=session_expired`;
          return new Response(null, {
            status: 302,
            headers: { ...corsHeaders, 'Location': redirectUrl },
          });
        }

        const tokenUrl = 'https://business-api.tiktok.com/open_api/v1.3/oauth2/access_token/';

        const tokenResponse = await fetch(tokenUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            app_id: tiktokAppId,
            secret: tiktokAppSecret,
            auth_code: auth_code,
          }),
        });

        const tokenData = await tokenResponse.json();

        if (!tokenResponse.ok || tokenData.code !== 0 || !tokenData.data?.access_token) {
          console.error('Token exchange failed:', tokenData);
          const errorMsg = tokenData.message || 'token_exchange_failed';
          const redirectUrl = `${Deno.env.get('FRONTEND_URL') || 'https://members.revoa.app'}/tiktok-oauth-callback.html?error=${encodeURIComponent(errorMsg)}`;
          return new Response(null, {
            status: 302,
            headers: { ...corsHeaders, 'Location': redirectUrl },
          });
        }

        console.log('[TikTok Ads OAuth] Fetching advertiser accounts...');

        const advertiserUrl = new URL('https://business-api.tiktok.com/open_api/v1.3/oauth2/advertiser/get/');
        advertiserUrl.searchParams.append('app_id', tiktokAppId);
        advertiserUrl.searchParams.append('secret', tiktokAppSecret);

        const advertiserResponse = await fetch(advertiserUrl.toString(), {
          method: 'GET',
          headers: {
            'Access-Token': tokenData.data.access_token,
          },
        });

        const advertiserData = await advertiserResponse.json();
        console.log('[TikTok Ads OAuth] Advertiser response:', JSON.stringify(advertiserData, null, 2));

        let accounts = [];

        if (advertiserResponse.ok && advertiserData.code === 0 && advertiserData.data?.list && advertiserData.data.list.length > 0) {
          accounts = advertiserData.data.list.map((advertiser: any) => ({
            id: advertiser.advertiser_id,
            name: advertiser.advertiser_name,
          }));
          console.log('[TikTok Ads OAuth] Found', accounts.length, 'advertiser accounts');
        } else {
          console.error('[TikTok Ads OAuth] ⚠️  NO ADVERTISER ACCOUNTS FOUND!');
          console.error('[TikTok Ads OAuth] Response:', JSON.stringify(advertiserData, null, 2));

          const errorMsg = 'No TikTok Ads advertiser accounts found. Please ensure you have access to at least one TikTok Ads account.';
          const redirectUrl = `${Deno.env.get('FRONTEND_URL') || 'https://members.revoa.app'}/tiktok-oauth-callback.html?error=${encodeURIComponent(errorMsg)}`;
          return new Response(null, {
            status: 302,
            headers: { ...corsHeaders, 'Location': redirectUrl },
          });
        }

        // Handle expires_in - TikTok returns it in seconds, default to 90 days if missing
        const expiresInSeconds = tokenData.data.expires_in || (90 * 24 * 60 * 60); // 90 days default
        const expiresAtTimestamp = Date.now() + (expiresInSeconds * 1000);

        console.log('[TikTok Ads OAuth] Token expires in:', expiresInSeconds, 'seconds');

        // Validate the timestamp is reasonable (between now and 10 years from now)
        const maxExpiry = Date.now() + (10 * 365 * 24 * 60 * 60 * 1000); // 10 years
        const validExpiryTimestamp = Math.min(Math.max(expiresAtTimestamp, Date.now()), maxExpiry);
        const expiresAt = new Date(validExpiryTimestamp).toISOString();

        const { error: updateError } = await supabase
          .from('oauth_sessions')
          .update({
            metadata: {
              accounts: accounts,
              accessToken: tokenData.data.access_token,
              expiresAt: expiresAt,
            }
          })
          .eq('state', state);

        if (updateError) {
          console.error('Error updating OAuth session:', updateError);
        }

        const redirectUrl = `${Deno.env.get('FRONTEND_URL') || 'https://members.revoa.app'}/tiktok-oauth-callback.html?session=${state}`;
        return new Response(null, {
          status: 302,
          headers: { ...corsHeaders, 'Location': redirectUrl },
        });
      } catch (error) {
        console.error('OAuth callback error:', error);
        const redirectUrl = `${Deno.env.get('FRONTEND_URL') || 'https://members.revoa.app'}/tiktok-oauth-callback.html?error=oauth_error`;
        return new Response(null, {
          status: 302,
          headers: { ...corsHeaders, 'Location': redirectUrl },
        });
      }
    }

    // Handle connect action
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
        shop_domain: 'tiktok-ads',
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

      const redirectUri = `${supabaseUrl}/functions/v1/tiktok-ads-oauth`;

      const oauthUrl =
        `https://business-api.tiktok.com/portal/auth?` +
        `app_id=${tiktokAppId}` +
        `&state=${state}` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}`;

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

    // Handle save accounts action
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
              platform: 'tiktok',
              status: 'active',
              user_id: userId,
              access_token: accessToken,
              token_expires_at: expiresAt,
              metadata: {}
            };

            if (shopifyStoreId) {
              accountData.shopify_store_id = shopifyStoreId;
            }

            console.log(`[TikTok Ads OAuth] Saving advertiser account ${account.id}`);

            const { data: upsertedAccount, error: accountError } = await supabase
              .from('ad_accounts')
              .upsert(accountData, { onConflict: 'user_id,platform,platform_account_id' })
              .select()
              .single();

            if (accountError) {
              console.error(`[TikTok Ads OAuth] Error upserting account ${account.id}:`, accountError);
              errors.push({ account: account.id, error: accountError.message });
              continue;
            }

            console.log(`[TikTok Ads OAuth] Successfully saved account:`, upsertedAccount?.id);
            savedAccounts.push(upsertedAccount);
          } catch (err) {
            console.error(`[TikTok Ads OAuth] Exception saving account ${account.id}:`, err);
            errors.push({ account: account.id, error: err instanceof Error ? err.message : 'Unknown error' });
          }
        }

        console.log(`[TikTok Ads OAuth] Saved ${savedAccounts.length} accounts, ${errors.length} errors`);

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

    // Handle disconnect action
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
    console.error('TikTok Ads OAuth error:', error);
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
