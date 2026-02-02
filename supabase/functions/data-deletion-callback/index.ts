import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'npm:@supabase/supabase-js@2.39.7';

// HMAC verification function
async function verifyShopifyWebhook(
  body: string,
  hmacHeader: string,
  secret: string
): Promise<boolean> {
  try {
    if (!hmacHeader || hmacHeader.trim() === '') {
      console.error('[HMAC] Empty or missing HMAC header');
      return false;
    }
    if (!secret || secret.trim() === '') {
      console.error('[HMAC] Empty or missing secret');
      return false;
    }
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const signature = await crypto.subtle.sign(
      'HMAC',
      key,
      encoder.encode(body || '')
    );
    const signatureArray = new Uint8Array(signature);
    const calculatedHmac = btoa(String.fromCharCode(...signatureArray));

    // Timing-safe comparison
    const bufferA = encoder.encode(calculatedHmac);
    const bufferB = encoder.encode(hmacHeader);
    if (bufferA.length !== bufferB.length) {
      return false;
    }
    let result = 0;
    for (let i = 0; i < bufferA.length; i++) {
      result |= bufferA[i] ^ bufferB[i];
    }
    return result === 0;
  } catch (error) {
    console.error('[HMAC] Verification error:', error);
    return false;
  }
}

function getWebhookSecret(): string {
  // Try webhook-specific secret first, then fall back to API secret
  const secret = Deno.env.get('SHOPIFY_WEBHOOK_SECRET') || Deno.env.get('SHOPIFY_API_SECRET') || Deno.env.get('SHOPIFY_CLIENT_SECRET');
  if (!secret) {
    throw new Error('Missing required environment variable: SHOPIFY_WEBHOOK_SECRET or SHOPIFY_API_SECRET');
  }
  console.log('[HMAC] Using secret from:', Deno.env.get('SHOPIFY_WEBHOOK_SECRET') ? 'SHOPIFY_WEBHOOK_SECRET' : (Deno.env.get('SHOPIFY_API_SECRET') ? 'SHOPIFY_API_SECRET' : 'SHOPIFY_CLIENT_SECRET'));
  return secret;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey, X-Shopify-Hmac-Sha256, X-Shopify-Shop-Domain, X-Shopify-Topic",
};

interface DataDeletionRequest {
  user_id?: string;
  signed_request?: string;
  shop_id?: string | number;
  shop_domain?: string;
  orders_requested?: number[];
  orders_to_redact?: number[];
  customer?: {
    id: string | number;
    email: string;
    phone?: string;
  };
  data_request?: {
    id: number;
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

      if (!hmac) {
        console.error('[Data Deletion] Missing HMAC header');
        return new Response(
          JSON.stringify({
            error: "Unauthorized",
            message: "Missing HMAC signature",
            timestamp: new Date().toISOString(),
          }),
          {
            status: 401,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      let secret: string;
      try {
        secret = getWebhookSecret();
      } catch (error) {
        console.error('[Data Deletion] Error getting webhook secret:', error);
        throw new Error('Server configuration error: Webhook secret not configured');
      }

      console.log('[Data Deletion] Using webhook secret for HMAC verification');

      const isValid = await verifyShopifyWebhook(rawBody, hmac, secret);

      // CRITICAL: Shopify requires 401 for ALL invalid HMACs (including test webhooks)
      // This is part of their automated compliance testing
      if (!isValid) {
        console.error('[Data Deletion] ❌ HMAC verification FAILED');
        console.log('[HMAC] Verification details: { bodyLength:', rawBody.length, ', hmacHeaderLength:', hmac.length, ', calcPreview: ...', '}');
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

      const body: DataDeletionRequest = JSON.parse(rawBody);

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

      const shopDomain = body.shop_domain || shop;
      const shopId = body.shop_id;

      if (!shopDomain) {
        console.error('[Data Deletion] Missing shop_domain in payload');
        return new Response(
          JSON.stringify({
            error: "shop_domain is required",
            message: "Missing shop_domain in webhook payload"
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      console.log('[Data Deletion] Processing for shop:', shopDomain, 'Shop ID:', shopId);

      // Find the user_id associated with this shop
      const { data: installation, error: installError } = await supabase
        .from('shopify_installations')
        .select('user_id')
        .eq('store_url', shopDomain)
        .maybeSingle();

      if (installError) {
        console.error('[Data Deletion] Error finding installation:', installError);
        return new Response(
          JSON.stringify({
            error: "Failed to find installation",
            message: "Could not locate shop installation"
          }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      if (!installation) {
        console.log('[Data Deletion] No installation found for shop:', shopDomain);
        // Return success even if no data exists (idempotent)
        return new Response(
          JSON.stringify({
            message: "No data found for shop",
            shop_domain: shopDomain
          }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      const userId = installation.user_id;
      console.log('[Data Deletion] Found user_id:', userId, 'for shop:', shopDomain);

      const confirmationCode = `${Date.now()}-${userId}-${shopId}`;

      // Log the deletion request
      const { error: logError } = await supabase
        .from('data_deletion_requests')
        .insert({
          user_id: userId,
          confirmation_code: confirmationCode,
          requested_at: new Date().toISOString(),
          status: 'pending'
        });

      if (logError) {
        console.error('[Data Deletion] Error logging deletion request:', logError);
      }

      // Handle different webhook topics
      if (topic === 'shop/redact') {
        console.log('[Data Deletion] shop/redact - Deleting ALL data for shop:', shopDomain);

        // Delete all shop-related data
        // 1. Delete shopify installations
        await supabase
          .from('shopify_installations')
          .delete()
          .eq('store_url', shopDomain);

        // 2. Delete from stores table
        await supabase
          .from('stores')
          .delete()
          .eq('store_url', shopDomain)
          .eq('platform', 'shopify');

        // 3. Delete shopify orders
        await supabase
          .from('shopify_orders')
          .delete()
          .eq('user_id', userId);

        // 4. If user has no other stores, delete user profile
        const { data: otherStores } = await supabase
          .from('shopify_installations')
          .select('id')
          .eq('user_id', userId)
          .limit(1);

        if (!otherStores || otherStores.length === 0) {
          console.log('[Data Deletion] No other stores found, deleting user profile');
          await supabase
            .from('user_profiles')
            .delete()
            .eq('id', userId);
        }

      } else if (topic === 'customers/redact') {
        console.log('[Data Deletion] customers/redact - Redacting customer data');

        const customerId = body.customer?.id;
        const customerEmail = body.customer?.email;
        const ordersToRedact = body.orders_to_redact || [];

        console.log('[Data Deletion] Customer ID:', customerId, 'Email:', customerEmail, 'Orders:', ordersToRedact.length);

        // Redact customer information from orders
        for (const orderId of ordersToRedact) {
          await supabase
            .from('shopify_orders')
            .update({
              customer_email: '[REDACTED]',
              updated_at: new Date().toISOString()
            })
            .eq('shopify_order_id', orderId.toString())
            .eq('user_id', userId);
        }

      } else if (topic === 'customers/data_request') {
        console.log('[Data Deletion] customers/data_request - Data request received');

        // This is just a request to provide data, not delete it
        // Log it but don't delete anything
        const customerId = body.customer?.id;
        const ordersRequested = body.orders_requested || [];

        console.log('[Data Deletion] Data request for customer:', customerId, 'Orders:', ordersRequested.length);
        console.log('[Data Deletion] Note: App stores minimal customer data. Respond to merchant directly if needed.');
      }

      // Mark deletion request as completed
      await supabase
        .from('data_deletion_requests')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('confirmation_code', confirmationCode);

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