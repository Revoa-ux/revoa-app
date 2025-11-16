import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'npm:@supabase/supabase-js@2.39.7';
import { verifyShopifyWebhook, getWebhookSecret } from '../_shared/shopify-hmac.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey, X-Shopify-Hmac-Sha256, X-Shopify-Shop-Domain, X-Shopify-Topic",
};

interface DataDeletionRequest {
  user_id?: string;
  signed_request?: string;
  shop_id?: string;
  shop_domain?: string;
  orders_requested?: string[];
  customer?: {
    id: string;
    email: string;
    phone?: string;
  };
}


Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (req.method === "POST") {
      const hmac = req.headers.get('X-Shopify-Hmac-Sha256');
      const shop = req.headers.get('X-Shopify-Shop-Domain');
      const topic = req.headers.get('X-Shopify-Topic');
      const webhookId = req.headers.get('X-Shopify-Webhook-Id');

      console.log('[Data Deletion] Headers:', { shop, topic, hasHmac: !!hmac, webhookId });

      const rawBody = await req.text();

      if (hmac) {
        let secret: string;
        try {
          secret = getWebhookSecret();
        } catch (error) {
          console.error('[Data Deletion] Error getting webhook secret:', error);
          throw new Error('Server configuration error: Webhook secret not configured');
        }

        console.log('[Data Deletion] Using webhook secret for HMAC verification');

        const isValid = await verifyShopifyWebhook(rawBody, hmac, secret);
        if (!isValid) {
          console.error('[Data Deletion] ❌ Invalid HMAC signature');
          return new Response(
            JSON.stringify({
              error: "Unauthorized",
              message: "Invalid HMAC signature",
              timestamp: new Date().toISOString(),
            }),
            {
              status: 401,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }

        console.log('[Data Deletion] ✅ HMAC verified successfully');

        if (webhookId) {
          const { data: existingWebhook } = await supabase
            .from('webhook_logs')
            .select('id')
            .eq('webhook_id', webhookId)
            .maybeSingle();

          if (existingWebhook) {
            console.log('[Data Deletion] Duplicate webhook detected, skipping:', webhookId);
            return new Response(
              JSON.stringify({ success: true, message: 'Webhook already processed' }),
              {
                status: 200,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
              }
            );
          }

          await supabase.from('webhook_logs').insert({
            webhook_id: webhookId,
            topic: topic || 'data_deletion',
            shop_domain: shop || 'unknown',
            processed_at: new Date().toISOString(),
          });
        }
      }

      const body: DataDeletionRequest = JSON.parse(rawBody);

      const userId = body.user_id;

      if (!userId) {
        return new Response(
          JSON.stringify({
            error: "user_id is required",
            message: "Please provide a user_id to delete data for"
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      const confirmationCode = `${Date.now()}-${userId}`;

      const { error: logError } = await supabase
        .from('data_deletion_requests')
        .insert({
          user_id: userId,
          confirmation_code: confirmationCode,
          requested_at: new Date().toISOString(),
          status: 'pending'
        });

      if (logError) {
        console.error('Error logging deletion request:', logError);
      }

      const { error: deleteError } = await supabase
        .from('user_profiles')
        .delete()
        .eq('id', userId);

      if (deleteError) {
        console.error('Error deleting user data:', deleteError);

        return new Response(
          JSON.stringify({
            error: "Failed to delete user data",
            confirmation_code: confirmationCode,
            url: `${supabaseUrl}/data-deletion?status_id=${confirmationCode}`
          }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      return new Response(
        JSON.stringify({
          url: `${supabaseUrl}/data-deletion?status_id=${confirmationCode}`,
          confirmation_code: confirmationCode,
          message: "Data deletion request processed successfully"
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (req.method === "GET") {
      const url = new URL(req.url);
      const statusId = url.searchParams.get('status_id');

      if (!statusId) {
        return new Response(
          JSON.stringify({
            error: "status_id is required",
            message: "Please provide a confirmation code to check deletion status"
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      const { data, error } = await supabase
        .from('data_deletion_requests')
        .select('*')
        .eq('confirmation_code', statusId)
        .single();

      if (error || !data) {
        return new Response(
          JSON.stringify({
            error: "Deletion request not found",
            message: "The provided confirmation code is invalid"
          }),
          {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      return new Response(
        JSON.stringify({
          status: data.status,
          requested_at: data.requested_at,
          completed_at: data.completed_at,
          message: data.status === 'completed'
            ? 'Your data has been successfully deleted'
            : 'Your data deletion request is being processed'
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error) {
    console.error('Error in data-deletion-callback:', error);

    return new Response(
      JSON.stringify({
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error occurred"
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
