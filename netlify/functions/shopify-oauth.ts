import type { Handler } from "@netlify/functions";
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import fetch from "node-fetch";
import crypto from "crypto";

const client_id = process.env.VITE_SHOPIFY_CLIENT_ID as string;
const client_secret = process.env.VITE_SHOPIFY_CLIENT_SECRET as string;
const supabaseUrl = process.env.VITE_SUPABASE_URL as string;
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_KEY as string;

const supabase = createClient(supabaseUrl, supabaseServiceKey || '');

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
      .single();

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
    const { error: installError } = await supabase
    .from("shopify_installations")
    .insert({
      user_id: oauthSession.user_id,
      store_url: shop,
      access_token,
      scopes: scope.split(","),
      status: "installed",
      installed_at: new Date().toISOString(),
      last_auth_at: new Date().toISOString(),
      metadata: {
        install_count: 1,
        last_install: new Date().toISOString(),
      },
    });

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

    await updateErrorByState(supabase, state, "");

    // Return HTML that closes the popup and notifies the parent window
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
    // Notify parent window and close
    if (window.opener) {
      window.opener.postMessage({ type: 'shopify:success', shop: '${shop}' }, '*');
      setTimeout(() => window.close(), 2000);
    } else {
      // If not in a popup, redirect to the app
      setTimeout(() => window.location.href = '${process.env.VITE_APP_URL || 'https://members.revoa.app'}/onboarding/ads', 2000);
    }
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