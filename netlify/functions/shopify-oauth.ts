import type { Handler } from "@netlify/functions";
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import fetch from "node-fetch";
import crypto from "crypto";

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

    // Save tokenData.access_token securely for future API calls
    // Delete any existing record with matching user_id and store_url
    const { error: deleteError } = await supabase
    .from("shopify_installations")
    .delete()
    .eq("user_id", oauthSession.user_id)
    .eq("store_url", shop);

    if (deleteError) { 
      const errorText = `Error deleting existing installation: ${deleteError ?? 'Unknown error'}`;
      console.error(errorText);
      await updateErrorByState(supabase, state, errorText);
    }

    // Now insert the new installation record
    console.log('[OAuth] Inserting shopify_installation for user:', oauthSession.user_id);
    console.log('[OAuth] Store URL:', shop);
    const { data: insertData, error: installError } = await supabase
    .from("shopify_installations")
    .insert({
      user_id: oauthSession.user_id,
      store_url: shop,
      access_token,
      scopes: scope.split(","),
      status: "installed",
      uninstalled_at: null, // Explicitly set to NULL
      installed_at: new Date().toISOString(),
      last_auth_at: new Date().toISOString(),
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

    // Register webhooks
    try {
      const webhookUrl = `https://members.revoa.app/.netlify/functions/shopify-webhook`;
      const webhookResponse = await fetch(`https://${shop}/admin/api/2025-07/webhooks.json`, {
        method: 'POST',
        headers: {
          'X-Shopify-Access-Token': access_token,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          webhook: {
            topic: 'app/uninstalled',
            address: webhookUrl,
            format: 'json',
          },
        }),
      });

      if (!webhookResponse.ok) {
        const errorText = await webhookResponse.text();
        console.error('[OAuth] Failed to register webhook:', errorText);
      } else {
        console.log('[OAuth] Successfully registered app/uninstalled webhook');
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

    // Return HTML that closes the popup and notifies the parent window
    console.log('[OAuth] ========== SHOPIFY OAUTH COMPLETE ==========');
    console.log('[OAuth] User ID:', oauthSession.user_id);
    console.log('[OAuth] Store:', shop);
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