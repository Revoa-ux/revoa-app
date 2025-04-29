import type { Handler } from "@netlify/functions";
import { createClient } from '@supabase/supabase-js';
import fetch from "node-fetch";
import crypto from "crypto";

const client_id = process.env.VITE_SHOPIFY_CLIENT_ID as string;
const client_secret = process.env.VITE_SHOPIFY_CLIENT_SECRET as string;
const supabaseUrl = process.env.VITE_SUPABASE_URL as string;
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_KEY as string;

const supabase = createClient(supabaseUrl, supabaseServiceKey || '');

export const handler: Handler = async (event, _context) => {
  const params = event.queryStringParameters;

  const code = params?.code;
  const shop = params?.shop;
  const hmac = params?.hmac;
  const state = params?.state;

  if (!code || !shop || !state || !hmac) {
    return {
      statusCode: 400,
      body: JSON.stringify("Missing required query parameters."),
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
      console.log("Failed to authenticate: OAuth state mismatch");
      return {
        statusCode: 401,
        body: JSON.stringify("Failed to authenticate: OAuth state mismatch."),
      };
    }

    console.log(`OAuth session: ${oauthSession.shop_domain} ${oauthSession.user_id}`);

    // Verify the shop
    if (!oauthSession?.shop_domain || oauthSession.shop_domain !== shop) {
      console.log("Failed to authenticate: shop mismatch");
      return {
        statusCode: 401,
        body: JSON.stringify("Failed to authenticate: shop mismatch."),
      };
    }

    //Verify the HMAC
    const validHmac = verifyShopifyHmac(params, client_secret);
    if (!validHmac) {
      console.log("Failed to authenticate: invalid HMAC");
      return {
        statusCode: 401,
        body: JSON.stringify("Failed to authenticate: invalid HMAC."),
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
      const errorText = await response.text();
      console.error("Failed to get access token:", errorText);
      return {
        statusCode: 500,
        headers: {
          "Content-Type": "text/html",
        },
        body: errorText,
      };
    }

    const { access_token, scope } = await response.json();
    console.log(`Token: ${access_token}`)

    // Save tokenData.access_token securely for future API calls
    const { error: installError } = await supabase
      .from("shopify_installations")
      .upsert({
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
      console.error("Error saving Shopify installation:", installError);
      return {
        statusCode: 500,
        body: JSON.stringify("Failed to save Shopify installation."),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify("App successfully installed!"),
    };
  } catch (err: any) {
    console.error("Error during token exchange:", err);
    return {
      statusCode: 500,
      body: JSON.stringify(`Internal server error: ${err}`),
    };
  }
};

const verifyShopifyHmac = (
  queryParams: any,
  shopifyApiSecret: string
): boolean => {
  const { hmac, signature, ...rest } = queryParams;

  if (!hmac) {
    console.warn("Missing HMAC from query parameters");
    return false;
  }

  // Step 1: Sort the parameters alphabetically
  const sortedParams = Object.keys(rest)
    .sort()
    .map((key) => `${key}=${encodeURIComponent(rest[key])}`)
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
