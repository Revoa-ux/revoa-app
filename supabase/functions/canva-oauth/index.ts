import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const canvaClientId = Deno.env.get("CANVA_CLIENT_ID")!;
    const canvaClientSecret = Deno.env.get("CANVA_CLIENT_SECRET")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { code, redirect_uri } = await req.json();

    if (!code || !redirect_uri) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing code or redirect_uri" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("Exchanging code for tokens...");

    const tokenResponse = await fetch("https://api.canva.com/rest/v1/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code: code,
        redirect_uri: redirect_uri,
        client_id: canvaClientId,
        client_secret: canvaClientSecret,
      }).toString(),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error("Canva token exchange error:", errorText);
      return new Response(
        JSON.stringify({
          success: false,
          error: `Canva API error: ${tokenResponse.status} - ${errorText}`
        }),
        {
          status: tokenResponse.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const tokenData: TokenResponse = await tokenResponse.json();

    const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();

    const { error: deleteError } = await supabase
      .from("canva_tokens")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");

    if (deleteError) {
      console.warn("Error deleting old tokens:", deleteError);
    }

    const { error: insertError } = await supabase
      .from("canva_tokens")
      .insert({
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        token_type: tokenData.token_type,
        expires_at: expiresAt,
        scope: tokenData.scope,
      });

    if (insertError) {
      console.error("Error inserting tokens:", insertError);
      return new Response(
        JSON.stringify({
          success: false,
          error: `Database error: ${insertError.message}`
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("Canva tokens saved successfully");

    return new Response(
      JSON.stringify({
        success: true,
        message: "Canva OAuth completed successfully"
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in canva-oauth function:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});