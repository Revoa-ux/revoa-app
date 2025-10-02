import type { Handler } from "@netlify/functions";
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import fetch from "node-fetch";
import crypto from "crypto";

const client_id = process.env.VITE_SHOPIFY_CLIENT_ID as string;
const client_secret = process.env.VITE_SHOPIFY_CLIENT_SECRET as string;
const supabaseUrl = process.env.VITE_SUPABASE_URL as string;
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_KEY as string;

const supabase = createClient(supabaseUrl, supabaseServiceKey || '');

export const handler: Handler = async (event) => {
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
      const errorText = "Failed to authenticate: OAuth state mismatch";
      console.log(errorText);
      await updateErrorByState(supabase, state, errorText);
      return {
        statusCode: 401,
        body: JSON.stringify("Failed to authenticate: OAuth state mismatch."),
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
        body: JSON.stringify("Failed to authenticate: shop mismatch."),
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
      const errorStr = await response.text();      
      const errorText = `Failed to get access token: ${errorStr ?? 'Unknown error'}`;
      console.error(errorText);
      await updateErrorByState(supabase, state, errorText);
      return {
        statusCode: 500,
        headers: {
          "Content-Type": "text/html",
        },
        body: errorText,
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
        body: JSON.stringify("Failed to save Shopify installation."),
      };
    }                

    await updateErrorByState(supabase, state, "");
    return {
      statusCode: 200,
      body: JSON.stringify("App successfully installed!"),
    };
  } catch (err: unknown) {    
      const errorText = `Error during token exchange: ${String(err) ?? 'Unknown error'}`;
      console.error(errorText);
      await updateErrorByState(supabase, state, errorText);
    return {
      statusCode: 500,
      body: JSON.stringify(`Internal server error: ${String(err)}`),
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