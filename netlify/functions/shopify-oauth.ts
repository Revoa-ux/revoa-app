import type { Handler } from "@netlify/functions";
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import fetch from "node-fetch";
import crypto from "crypto";
import { getShopOwnerEmail } from '../../src/lib/shopify/getShopOwnerEmail';
import { createShopifyAccount } from '../../src/lib/auth/createShopifyAccount';

// IMPORTANT: Use server-side environment variables only (no VITE_ prefix)
// VITE_ variables are exposed to the frontend and should never contain secrets
const client_id = process.env.SHOPIFY_CLIENT_ID as string;
const client_secret = process.env.SHOPIFY_CLIENT_SECRET as string;
const supabaseUrl = process.env.SUPABASE_URL as string;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

if (!client_id || !client_secret) {
  throw new Error('Missing required Shopify environment variables: SHOPIFY_CLIENT_ID and SHOPIFY_CLIENT_SECRET must be set');
}

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing required Supabase environment variables: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

function getErrorHTML(title: string, message: string): string {
  const appUrl = process.env.VITE_APP_URL || 'https://members.revoa.app';
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      background: #f9fafb;
    }
    .container {
      text-align: center;
      padding: 2rem;
      max-width: 400px;
    }
    .error-icon {
      width: 64px;
      height: 64px;
      margin: 0 auto 1rem;
      border-radius: 50%;
      background: #ef4444;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .x-mark {
      width: 32px;
      height: 32px;
      stroke: white;
      stroke-width: 3;
      fill: none;
    }
    h1 {
      color: #111827;
      font-size: 1.5rem;
      margin: 0 0 0.5rem;
    }
    p {
      color: #6b7280;
      margin: 0 0 1.5rem;
    }
    button {
      background: #111827;
      color: white;
      border: none;
      padding: 0.75rem 1.5rem;
      border-radius: 0.5rem;
      font-size: 1rem;
      cursor: pointer;
      transition: background 0.2s;
    }
    button:hover {
      background: #374151;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="error-icon">
      <svg class="x-mark" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
      </svg>
    </div>
    <h1>${title}</h1>
    <p>${message}</p>
    <button onclick="handleClose()">Close Window</button>
  </div>
  <script>
    function handleClose() {
      if (window.opener) {
        window.opener.postMessage({ type: 'shopify:error', error: '${message}' }, '*');
        setTimeout(() => window.close(), 500);
      } else {
        window.location.href = '${appUrl}/onboarding/store';
      }
    }
    // Auto-close after 5 seconds
    setTimeout(handleClose, 5000);
  </script>
</body>
</html>
  `;
}

export const handler: Handler = async (event) => {
  const params = event.queryStringParameters;

  const code = params?.code;
  const shop = params?.shop;
  const hmac = params?.hmac;
  const state = params?.state;

  if (!code || !shop || !state || !hmac) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'text/html' },
      body: getErrorHTML('Missing required parameters', 'Please try connecting your store again.'),
    };
  }
  
  try {    

    // Now fetch from the oauth_sessions table
    const { data: oauthSession, error: oauthError } = await supabase
      .from("oauth_sessions")
      .select("*")
      .eq("state", state)
      .maybeSingle();

    //Verify the state variable with the one previously generated
    if (oauthError || !oauthSession) {
      const errorText = "Failed to authenticate: OAuth state mismatch";
      console.log(errorText);
      await updateErrorByState(supabase, state, errorText);
      return {
        statusCode: 401,
        headers: { 'Content-Type': 'text/html' },
        body: getErrorHTML('Authentication Failed', 'OAuth state mismatch. Please try again.'),
      };
    }

    console.log(`OAuth session: ${oauthSession.shop_domain} ${oauthSession.user_id}`);

    // Verify the shop
    if (!oauthSession?.shop_domain || oauthSession.shop_domain !== shop) {
      const errorText = "Failed to authenticate: shop mismatch";
      console.log(errorText);
      await updateErrorByState(supabase, state, errorText);
      return {
        statusCode: 401,
        headers: { 'Content-Type': 'text/html' },
        body: getErrorHTML('Authentication Failed', 'Shop mismatch. Please try again.'),
      };
    }

    //Verify the HMAC
    const validHmac = verifyShopifyHmac(params, client_secret);
    if (!validHmac) {
      const errorText = "Failed to authenticate: invalid HMAC";
      console.log(errorText);
      await updateErrorByState(supabase, state, errorText);
      return {
        statusCode: 401,
        headers: { 'Content-Type': 'text/html' },
        body: getErrorHTML('Authentication Failed', 'Invalid HMAC. Please try again.'),
      };
    }    

    const response = await fetch(`https://${shop}/admin/oauth/access_token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_id,
        client_secret,
        code,
      }),
    });

    if (!response.ok) {
      const errorStr = await response.text();      
      const errorText = `Failed to get access token: ${errorStr ?? 'Unknown error'}`;
      console.error(errorText);
      await updateErrorByState(supabase, state, errorText);
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'text/html' },
        body: getErrorHTML('Token Exchange Failed', errorStr || 'Could not get access token from Shopify.'),
      };
    }

    const { access_token, scope } = await response.json();

    // Check if this is Journey C: User signed up on members site, then installed from App Store
    // We check for pending_app_store_installs record by state token
    let isPendingInstall = false;
    let isReturningUser = false;

    const { data: pendingInstall } = await supabase
      .from('pending_app_store_installs')
      .select('*')
      .eq('state_token', state)
      .maybeSingle();

    if (pendingInstall) {
      // Check if expired
      const now = new Date();
      const expiresAt = new Date(pendingInstall.expires_at);

      if (now <= expiresAt) {
        isPendingInstall = true;
        console.log('[OAuth] Journey C: Pending install found for user:', pendingInstall.user_id);
      } else {
        console.log('[OAuth] Journey C: Pending install expired, falling back to Journey A');
      }
    }

    // Check if this is an App Store installation (no user_id) or settings page installation (has user_id)
    const isAppStoreInstall = !oauthSession.user_id;
    let userId = oauthSession.user_id;
    let sessionToken: string | null = null;
    let shopOwnerEmail: string | null = null;

    // Journey C: Link to existing account from pending install
    if (isPendingInstall && pendingInstall) {
      console.log('[OAuth] Journey C: Linking to existing account');
      userId = pendingInstall.user_id;
      isReturningUser = true;

      // Generate session token for existing user
      const { data: { session: newSession }, error: sessionError } = await supabase.auth.admin.generateLink({
        type: 'magiclink',
        email: (await supabase.auth.admin.getUserById(userId)).data.user?.email || '',
      });

      if (!sessionError && newSession) {
        sessionToken = newSession.access_token;
      }

      // Mark pending install as completed
      await supabase
        .from('pending_app_store_installs')
        .update({ completed_at: new Date().toISOString() })
        .eq('state_token', state);

      console.log('[OAuth] Journey C: Pending install completed');
    }
    // Journey A: Direct App Store install (create new account)
    else if (isAppStoreInstall) {
      console.log('[OAuth] Journey A: App Store installation detected - creating account');

      try {
        // Fetch shop owner email from Shopify
        shopOwnerEmail = await getShopOwnerEmail(access_token, shop);
        console.log('[OAuth] Shop owner email:', shopOwnerEmail);

        // Create or retrieve account
        const accountResult = await createShopifyAccount(
          shopOwnerEmail,
          shop,
          supabaseUrl,
          supabaseServiceKey
        );

        userId = accountResult.userId;
        sessionToken = accountResult.sessionToken;

        console.log('[OAuth] Account created/retrieved:', {
          userId: accountResult.userId,
          email: accountResult.email,
          isNew: accountResult.isNewAccount,
        });

        // Trigger welcome email asynchronously (non-blocking)
        if (accountResult.isNewAccount) {
          const shopName = shop.replace('.myshopify.com', '');
          fetch(`${supabaseUrl}/functions/v1/send-shopify-welcome`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseServiceKey}`,
            },
            body: JSON.stringify({
              email: shopOwnerEmail,
              shopName: shopName,
            }),
          }).catch(error => {
            console.error('[OAuth] Failed to send welcome email (non-blocking):', error);
          });
        }

      } catch (error: any) {
        if (error.message === 'EMAIL_ALREADY_EXISTS') {
          const errorText = 'This email is already associated with another Shopify store';
          console.error('[OAuth]', errorText);
          await updateErrorByState(supabase, state, errorText);
          return {
            statusCode: 400,
            headers: { 'Content-Type': 'text/html' },
            body: getErrorHTML('Account Already Exists', 'This email is already associated with another Shopify store. Each store needs a separate account.'),
          };
        }

        const errorText = `Failed to create account: ${error.message}`;
        console.error('[OAuth]', errorText);
        await updateErrorByState(supabase, state, errorText);
        return {
          statusCode: 500,
          headers: { 'Content-Type': 'text/html' },
          body: getErrorHTML('Account Creation Failed', 'Could not create your account. Please try again or contact support.'),
        };
      }
    }

    // Save tokenData.access_token securely for future API calls
    // Delete any existing record with matching user_id and store_url
    const { error: deleteError } = await supabase
    .from("shopify_installations")
    .delete()
    .eq("user_id", userId)
    .eq("store_url", shop);

    if (deleteError) {
      const errorText = `Error deleting existing installation: ${deleteError ?? 'Unknown error'}`;
      console.error(errorText);
      await updateErrorByState(supabase, state, errorText);
    }

    // Now insert the new installation record
    console.log('[OAuth] Inserting shopify_installation for user:', userId);
    console.log('[OAuth] Store URL:', shop);
    const { data: insertData, error: installError } = await supabase
    .from("shopify_installations")
    .insert({
      user_id: userId,
      store_url: shop,
      access_token,
      scopes: scope.split(","),
      status: "installed",
      uninstalled_at: null, // Explicitly set to NULL
      installed_at: new Date().toISOString(),
      last_auth_at: new Date().toISOString(),
      shop_owner_email: shopOwnerEmail,
      installation_source: isAppStoreInstall ? 'app_store' : 'settings_page',
      metadata: {
        install_count: 1,
        last_install: new Date().toISOString(),
      },
    })
    .select();

    if (installError) {
      const errorText = `Error saving Shopify installation: ${installError ?? 'Unknown error'}`;
      console.error(errorText);
      await updateErrorByState(supabase, state, errorText);
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'text/html' },
        body: getErrorHTML('Installation Failed', 'Could not save your Shopify installation. Please try again.'),
      };
    }

    console.log('[OAuth] ✓ Installation record created successfully');
    console.log('[OAuth] Installation data:', insertData);

    // Register webhooks using GraphQL (compliant with Shopify App Store requirements)
    try {
      const webhookUrl = `https://members.revoa.app/.netlify/functions/shopify-webhook`;
      const graphqlMutation = `
        mutation webhookSubscriptionCreate($topic: WebhookSubscriptionTopic!, $webhookSubscription: WebhookSubscriptionInput!) {
          webhookSubscriptionCreate(topic: $topic, webhookSubscription: $webhookSubscription) {
            webhookSubscription {
              id
              topic
            }
            userErrors {
              field
              message
            }
          }
        }
      `;

      const webhookResponse = await fetch(`https://${shop}/admin/api/2025-07/graphql.json`, {
        method: 'POST',
        headers: {
          'X-Shopify-Access-Token': access_token,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: graphqlMutation,
          variables: {
            topic: 'APP_UNINSTALLED',
            webhookSubscription: {
              callbackUrl: webhookUrl,
              format: 'JSON'
            }
          }
        }),
      });

      if (!webhookResponse.ok) {
        const errorText = await webhookResponse.text();
        console.error('[OAuth GraphQL] Failed to register webhook:', errorText);
      } else {
        const result = await webhookResponse.json();
        if (result.data?.webhookSubscriptionCreate?.userErrors?.length > 0) {
          console.error('[OAuth GraphQL] Webhook registration errors:', result.data.webhookSubscriptionCreate.userErrors);
        } else {
          console.log('[OAuth GraphQL] Successfully registered app/uninstalled webhook');
        }
      }
    } catch (webhookError) {
      console.error('[OAuth] Error registering webhook:', webhookError);
    }

    // Mark the OAuth session as completed
    console.log('[OAuth] Marking OAuth session as completed');
    const completedAt = new Date().toISOString();
    const { error: sessionUpdateError } = await supabase
      .from("oauth_sessions")
      .update({
        error: "",
        completed_at: completedAt
      })
      .eq("state", state);

    if (sessionUpdateError) {
      console.error('[OAuth] ✗ Failed to update OAuth session:', sessionUpdateError);
    } else {
      console.log('[OAuth] ✓ OAuth session marked as completed at:', completedAt);
    }

    // Return HTML based on installation type
    console.log('[OAuth] ========== SHOPIFY OAUTH COMPLETE ==========');
    console.log('[OAuth] User ID:', userId);
    console.log('[OAuth] Store:', shop);
    console.log('[OAuth] Journey:', isPendingInstall ? 'C (Members site first)' : isAppStoreInstall ? 'A (App Store first)' : 'B (Settings page)');

    // For App Store installations or Journey C (pending installs), redirect to welcome page
    if ((isAppStoreInstall || isPendingInstall) && sessionToken) {
      const appUrl = process.env.VITE_APP_URL || 'https://members.revoa.app';
      let welcomeUrl = `${appUrl}/welcome?token=${sessionToken}&source=shopify_app_store&shop=${encodeURIComponent(shop)}`;

      // Add returning_user flag for Journey C
      if (isReturningUser) {
        welcomeUrl += '&returning_user=true';
      }

      console.log('[OAuth] Redirecting to welcome page:', welcomeUrl);

      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'text/html',
        },
        body: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Setting Up Your Account</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      background: #f9fafb;
    }
    .container {
      text-align: center;
      padding: 2rem;
    }
    .spinner {
      width: 64px;
      height: 64px;
      margin: 0 auto 1rem;
      border: 4px solid #f3f4f6;
      border-top: 4px solid #10b981;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    h1 {
      color: #111827;
      font-size: 1.5rem;
      margin: 0 0 0.5rem;
    }
    p {
      color: #6b7280;
      margin: 0;
    }
  </style>
  <script>
    // Redirect after 1 second
    setTimeout(() => {
      window.location.href = '${welcomeUrl}';
    }, 1000);
  </script>
</head>
<body>
  <div class="container">
    <div class="spinner"></div>
    <h1>Setting Up Your Account</h1>
    <p>Please wait while we complete your installation...</p>
  </div>
</body>
</html>
        `,
      };
    }

    // For settings page installations, close the popup
    console.log('[OAuth] Returning success HTML to close popup');

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'text/html',
      },
      body: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Installation Complete</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      background: #f9fafb;
    }
    .container {
      text-align: center;
      padding: 2rem;
    }
    .success-icon {
      width: 64px;
      height: 64px;
      margin: 0 auto 1rem;
      border-radius: 50%;
      background: #10b981;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .checkmark {
      width: 32px;
      height: 32px;
      stroke: white;
      stroke-width: 3;
      fill: none;
    }
    h1 {
      color: #111827;
      font-size: 1.5rem;
      margin: 0 0 0.5rem;
    }
    p {
      color: #6b7280;
      margin: 0;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="success-icon">
      <svg class="checkmark" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
        <polyline points="20 6 9 17 4 12"></polyline>
      </svg>
    </div>
    <h1>Installation Complete!</h1>
    <p>Your Shopify store has been connected. This window will close automatically.</p>
  </div>
  <script>
    // Always try to notify parent window
    if (window.opener) {
      window.opener.postMessage({ type: 'shopify:success', shop: '${shop}' }, '*');
    }

    // Always try to close the window after a short delay
    setTimeout(() => {
      window.close();

      // If window.close() didn't work (some browsers block it), show a message
      setTimeout(() => {
        document.body.innerHTML = '<div class="container"><div class="success-icon"><svg class="checkmark" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12" stroke="white" stroke-width="3" fill="none"></polyline></svg></div><h1>Installation Complete!</h1><p>Please close this window and return to the main application.</p></div>';
      }, 100);
    }, 1500);
  </script>
</body>
</html>
      `,
    };
  } catch (err: unknown) {    
      const errorText = `Error during token exchange: ${String(err) ?? 'Unknown error'}`;
      console.error(errorText);
      await updateErrorByState(supabase, state, errorText);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'text/html' },
      body: getErrorHTML('Installation Error', 'Something went wrong. Please try again.'),
    };
  }
};

const verifyShopifyHmac = (
  queryParams: Record<string, string | undefined>,
  shopifyApiSecret: string
): boolean => {
  const { hmac, ...rest } = queryParams;

  if (!hmac) {
    console.warn("Missing HMAC from query parameters");
    return false;
  }

  // Step 1: Sort the parameters alphabetically
  const sortedParams = Object.keys(rest)
    .sort()
    .map((key) => `${key}=${encodeURIComponent(rest[key] || '')}`)
    .join("&");

  // Step 2: Create a hash using the secret
  const generatedHash = crypto
    .createHmac("sha256", shopifyApiSecret)
    .update(sortedParams)
    .digest("hex");

  // Step 3: Timing-safe comparison
  return crypto.timingSafeEqual(
    Buffer.from(generatedHash, "utf-8"),
    Buffer.from(hmac, "utf-8")
  );
};

export async function updateErrorByState(
  supabase: SupabaseClient,
  state: string,
  errorText: string | null
): Promise<string> {
  const { error: saveError } = await supabase
    .from("oauth_sessions")
    .update({ error: errorText })
    .eq("state", state); // update by state instead of id

  if (saveError) {
    console.error(`Failed to upsert for state "${state}":`, saveError);
    return saveError.message;
  }
  return "";
}