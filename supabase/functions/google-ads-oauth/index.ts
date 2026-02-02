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
    const googleClientId = Deno.env.get('GOOGLE_ADS_CLIENT_ID');
    const googleClientSecret = Deno.env.get('GOOGLE_ADS_CLIENT_SECRET');
    const googleDeveloperToken = Deno.env.get('GOOGLE_ADS_DEVELOPER_TOKEN');

    if (!googleClientId || !googleClientSecret || !googleDeveloperToken) {
      console.error('Missing Google Ads credentials');
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Google Ads OAuth is not configured. Please contact support.',
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const url = new URL(req.url);
    let action = url.searchParams.get('action');

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Handle process-callback action (POST with code and state)
    if (action === 'process-callback' && req.method === 'POST') {
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
      const { code, state } = body;

      if (!code || !state) {
        return new Response(
          JSON.stringify({ success: false, error: 'Missing code or state' }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
      try {
        const { data: session, error: sessionError } = await supabase
          .from('oauth_sessions')
          .select('*')
          .eq('state', state)
          .maybeSingle();

        if (sessionError || !session) {
          console.error('Invalid session:', sessionError);
          return new Response(
            JSON.stringify({ success: false, error: 'Invalid or expired OAuth session' }),
            {
              status: 401,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        }

        if (new Date(session.expires_at) < new Date()) {
          return new Response(
            JSON.stringify({ success: false, error: 'Session expired' }),
            {
              status: 401,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        }

        const redirectUri = `${Deno.env.get('FRONTEND_URL') || 'https://members.revoa.app'}/oauth/google-ads`;
        const tokenUrl = 'https://oauth2.googleapis.com/token';

        console.log('[Google Ads OAuth] Token exchange details:');
        console.log('  - Redirect URI:', redirectUri);
        console.log('  - Supabase URL:', supabaseUrl);
        console.log('  - Authorization code received:', code.substring(0, 20) + '...');

        const tokenResponse = await fetch(tokenUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            code,
            client_id: googleClientId,
            client_secret: googleClientSecret,
            redirect_uri: redirectUri,
            grant_type: 'authorization_code',
          }),
        });

        console.log('[Google Ads OAuth] Token response status:', tokenResponse.status);
        console.log('[Google Ads OAuth] Token response content-type:', tokenResponse.headers.get('content-type'));

        // Check if response is JSON before parsing
        const contentType = tokenResponse.headers.get('content-type');
        let tokenData: any;

        if (contentType && contentType.includes('application/json')) {
          tokenData = await tokenResponse.json();
        } else {
          // Response is not JSON (likely HTML error page)
          const textResponse = await tokenResponse.text();
          console.error('[Google Ads OAuth] ❌ Non-JSON response from Google (likely HTML error page):');
          console.error('[Google Ads OAuth] Response preview:', textResponse.substring(0, 500));

          const errorMsg = 'OAuth configuration error. The redirect URI may not match Google Cloud Console settings.';
          return new Response(
            JSON.stringify({ success: false, error: errorMsg }),
            {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        }

        if (!tokenResponse.ok || !tokenData.access_token) {
          console.error('[Google Ads OAuth] Token exchange failed');
          console.error('[Google Ads OAuth] Error response:', JSON.stringify(tokenData, null, 2));
          console.error('[Google Ads OAuth] Expected redirect_uri:', redirectUri);
          console.error('[Google Ads OAuth] Please verify this EXACT URL is in Google Cloud Console authorized redirect URIs');

          const errorMsg = tokenData.error_description || tokenData.error || 'token_exchange_failed';
          return new Response(
            JSON.stringify({ success: false, error: errorMsg }),
            {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        }

        console.log('[Google Ads OAuth] ✓ Token exchange successful');

        console.log('[Google Ads OAuth] Fetching accessible customers...');
        console.log('[Google Ads OAuth] Developer token (first 10 chars):', googleDeveloperToken.substring(0, 10) + '...');

        const customersUrl = 'https://googleads.googleapis.com/v19/customers:listAccessibleCustomers';
        const customersResponse = await fetch(customersUrl, {
          headers: {
            'Authorization': `Bearer ${tokenData.access_token}`,
            'developer-token': googleDeveloperToken,
          },
        });

        console.log('[Google Ads OAuth] Request headers sent:', {
          'Authorization': 'Bearer [REDACTED]',
          'developer-token': googleDeveloperToken.substring(0, 10) + '...'
        });

        console.log('[Google Ads OAuth] Customers API response status:', customersResponse.status);
        console.log('[Google Ads OAuth] Customers API response content-type:', customersResponse.headers.get('content-type'));

        // Check if response is JSON before parsing
        const customersContentType = customersResponse.headers.get('content-type');
        let customersData: any;

        if (customersContentType && customersContentType.includes('application/json')) {
          customersData = await customersResponse.json();
          console.log('[Google Ads OAuth] Customers response:', JSON.stringify(customersData, null, 2));

          if (!customersResponse.ok) {
            console.error('[Google Ads OAuth] API error response:', JSON.stringify(customersData, null, 2));
            const errorDetails = customersData.error?.message || customersData.error?.status || JSON.stringify(customersData);
            return new Response(
              JSON.stringify({
                success: false,
                error: `Google Ads API error: ${errorDetails}`,
                details: customersData
              }),
              {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              }
            );
          }
        } else {
          const textResponse = await customersResponse.text();
          console.error('[Google Ads OAuth] Non-JSON response from Google Ads API:');
          console.error('[Google Ads OAuth] Status:', customersResponse.status);
          console.error('[Google Ads OAuth] Response preview:', textResponse.substring(0, 1000));

          return new Response(
            JSON.stringify({
              success: false,
              error: `Google Ads API returned status ${customersResponse.status}. Check that the Google Ads API is enabled in your Google Cloud project and your Developer Token has the correct access level.`,
              httpStatus: customersResponse.status,
              responsePreview: textResponse.substring(0, 500)
            }),
            {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        }

        let accounts = [];

        if (customersResponse.ok && customersData.resourceNames && customersData.resourceNames.length > 0) {
          // Extract customer IDs from resource names (format: customers/1234567890)
          accounts = customersData.resourceNames.map((resourceName: string) => {
            const customerId = resourceName.replace('customers/', '');
            return {
              id: customerId,
              name: `Google Ads Account ${customerId}`,
            };
          });
          console.log('[Google Ads OAuth] Found', accounts.length, 'ad accounts');
        } else {
          console.error('[Google Ads OAuth] ⚠️  NO AD ACCOUNTS FOUND!');
          console.error('[Google Ads OAuth] Response:', JSON.stringify(customersData, null, 2));

          const errorMsg = 'No Google Ads accounts found. Please ensure you have access to at least one Google Ads account.';
          return new Response(
            JSON.stringify({ success: false, error: errorMsg }),
            {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        }

        const expiresAt = new Date(Date.now() + (tokenData.expires_in * 1000)).toISOString();

        console.log('[Google Ads OAuth] ✓ Successfully processed OAuth callback');

        return new Response(
          JSON.stringify({
            success: true,
            accounts,
            accessToken: tokenData.access_token,
            refreshToken: tokenData.refresh_token,
            expiresAt,
          }),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      } catch (error) {
        console.error('OAuth callback error:', error);
        return new Response(
          JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : 'OAuth processing error'
          }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
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
        shop_domain: 'google-ads',
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

      const redirectUri = `${Deno.env.get('FRONTEND_URL') || 'https://members.revoa.app'}/oauth/google-ads`;
      const scope = 'https://www.googleapis.com/auth/adwords';

      console.log('[Google Ads OAuth] Generated OAuth URL with redirect_uri:', redirectUri);

      const oauthUrl =
        `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${googleClientId}` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&response_type=code` +
        `&scope=${encodeURIComponent(scope)}` +
        `&state=${state}` +
        `&access_type=offline` +
        `&prompt=consent`;

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
        console.log('[Google Ads OAuth] save-accounts received body:', JSON.stringify(body, null, 2));

        const { accounts, accessToken, refreshToken, userId, expiresAt, shopifyStoreId } = body;

        console.log('[Google Ads OAuth] Parsed values:', {
          accountsCount: Array.isArray(accounts) ? accounts.length : 'NOT AN ARRAY',
          hasAccessToken: !!accessToken,
          hasRefreshToken: !!refreshToken,
          userId,
          expiresAt,
          shopifyStoreId
        });

        if (!accounts || !Array.isArray(accounts)) {
          return new Response(
            JSON.stringify({ success: false, error: 'accounts must be an array' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        if (!accessToken || !userId || !expiresAt) {
          return new Response(
            JSON.stringify({ success: false, error: `Missing required parameters: accessToken=${!!accessToken}, userId=${!!userId}, expiresAt=${!!expiresAt}` }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const savedAccounts = [];
        const errors = [];

        for (const account of accounts) {
          try {
            console.log(`[Google Ads OAuth] Processing account:`, account);

            const accountData: any = {
              platform_account_id: String(account.id),
              account_name: account.name || `Google Ads Account ${account.id}`,
              platform: 'google',
              status: 'active',
              user_id: userId,
              access_token: accessToken,
              refresh_token: refreshToken || null,
              token_expires_at: expiresAt,
              metadata: {}
            };

            if (shopifyStoreId) {
              accountData.shopify_store_id = shopifyStoreId;
            }

            console.log(`[Google Ads OAuth] Upserting account data:`, JSON.stringify(accountData, null, 2));

            const { data: upsertedAccount, error: accountError } = await supabase
              .from('ad_accounts')
              .upsert(accountData, { onConflict: 'user_id,platform,platform_account_id' })
              .select()
              .single();

            if (accountError) {
              console.error(`[Google Ads OAuth] Error upserting ad account ${account.id}:`, JSON.stringify(accountError, null, 2));
              errors.push({ account: account.id, error: accountError.message, details: accountError });
              continue;
            }

            console.log(`[Google Ads OAuth] Successfully saved ad account:`, upsertedAccount?.id);
            savedAccounts.push(upsertedAccount);
          } catch (err) {
            console.error(`[Google Ads OAuth] Exception saving account ${account.id}:`, err);
            errors.push({ account: account.id, error: err instanceof Error ? err.message : 'Unknown error' });
          }
        }

        console.log(`[Google Ads OAuth] Final result: Saved ${savedAccounts.length} accounts, ${errors.length} errors`);
        if (errors.length > 0) {
          console.log('[Google Ads OAuth] Errors:', JSON.stringify(errors, null, 2));
        }

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
        console.error('[Google Ads OAuth] Error in save-accounts:', error);
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

      const { data: updateData, error: updateError } = await supabase
        .from('ad_accounts')
        .update({
          status: 'disconnected',
          access_token: null,
          refresh_token: null
        })
        .eq('platform_account_id', accountId)
        .eq('user_id', user.id)
        .select();

      if (updateError) {
        console.error('Error updating ad_accounts:', updateError);
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to disconnect account: ' + updateError.message }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      if (!updateData || updateData.length === 0) {
        console.error('No account found to disconnect:', accountId);
        return new Response(
          JSON.stringify({ success: false, error: 'Account not found or already disconnected' }),
          {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      console.log('Successfully disconnected Google Ads account:', accountId);

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
    console.error('Google Ads OAuth error:', error);
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
