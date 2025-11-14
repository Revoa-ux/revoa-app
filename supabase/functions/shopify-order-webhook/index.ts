import { createClient } from 'npm:@supabase/supabase-js@2.39.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Shopify-Hmac-Sha256, X-Shopify-Shop-Domain, X-Shopify-API-Version, X-Shopify-Webhook-Id, X-Shopify-Topic',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
};

async function verifyWebhookHmac(body: string, hmac: string, secret: string): Promise<boolean> {
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
    encoder.encode(body)
  );

  const calculatedHmac = btoa(String.fromCharCode(...new Uint8Array(signature)));

  return calculatedHmac === hmac;
}

/**
 * Parse UTM parameters from a URL
 */
function parseUTMFromURL(url: string): Record<string, string> {
  if (!url) return {};

  try {
    const urlObj = new URL(url);
    const params = urlObj.searchParams;

    const utmParams: Record<string, string> = {};
    if (params.get('utm_source')) utmParams.utm_source = params.get('utm_source')!;
    if (params.get('utm_medium')) utmParams.utm_medium = params.get('utm_medium')!;
    if (params.get('utm_campaign')) utmParams.utm_campaign = params.get('utm_campaign')!;
    if (params.get('utm_term')) utmParams.utm_term = params.get('utm_term')!;
    if (params.get('utm_content')) utmParams.utm_content = params.get('utm_content')!;

    return utmParams;
  } catch (error) {
    console.warn('[Order Webhook] Failed to parse URL:', url, error);
    return {};
  }
}

/**
 * Parse click IDs from a URL
 */
function parseClickIDsFromURL(url: string): Record<string, string> {
  if (!url) return {};

  try {
    const urlObj = new URL(url);
    const params = urlObj.searchParams;

    const clickIDs: Record<string, string> = {};
    if (params.get('fbclid')) clickIDs.fbclid = params.get('fbclid')!;
    if (params.get('gclid')) clickIDs.gclid = params.get('gclid')!;
    if (params.get('ttclid')) clickIDs.ttclid = params.get('ttclid')!;

    return clickIDs;
  } catch (error) {
    console.warn('[Order Webhook] Failed to parse click IDs:', url, error);
    return {};
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    console.log('[Order Webhook] Received request');

    const shop = req.headers.get('X-Shopify-Shop-Domain');
    const hmac = req.headers.get('X-Shopify-Hmac-Sha256');
    const topic = req.headers.get('X-Shopify-Topic');
    const webhookId = req.headers.get('X-Shopify-Webhook-Id');

    console.log('[Order Webhook] Headers:', { shop, topic, hasHmac: !!hmac, webhookId });

    if (!shop || !hmac || !topic) {
      console.error('[Order Webhook] Missing required headers');
      throw new Error('Missing required headers');
    }

    // Only process order-related webhooks
    if (!topic.startsWith('orders/')) {
      console.warn('[Order Webhook] Ignoring non-order topic:', topic);
      return new Response(
        JSON.stringify({ success: true, message: 'Ignored non-order topic' }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const body = await req.text();
    console.log('[Order Webhook] Body received, length:', body.length);

    const secret = Deno.env.get('SHOPIFY_CLIENT_SECRET');
    if (!secret) {
      console.error('[Order Webhook] Missing SHOPIFY_CLIENT_SECRET');
      throw new Error('Server configuration error');
    }

    const isValid = await verifyWebhookHmac(body, hmac, secret);
    if (!isValid) {
      console.error('[Order Webhook] Invalid HMAC signature');
      throw new Error('Invalid HMAC signature');
    }

    console.log('[Order Webhook] HMAC verified successfully');

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseKey) {
      console.error('[Order Webhook] Missing Supabase credentials');
      throw new Error('Server configuration error');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check for duplicate webhook
    if (webhookId) {
      const { data: existingWebhook } = await supabase
        .from('webhook_logs')
        .select('id')
        .eq('webhook_id', webhookId)
        .maybeSingle();

      if (existingWebhook) {
        console.log('[Order Webhook] Duplicate webhook detected, skipping:', webhookId);
        return new Response(
          JSON.stringify({ success: true, message: 'Webhook already processed' }),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      // Log this webhook
      await supabase.from('webhook_logs').insert({
        webhook_id: webhookId,
        topic,
        shop_domain: shop,
        processed_at: new Date().toISOString(),
      });
    }

    // Parse order data
    const orderData = JSON.parse(body);
    console.log('[Order Webhook] Order:', orderData.name || orderData.id);

    // Get user_id from shopify_installations
    const { data: installation } = await supabase
      .from('shopify_installations')
      .select('user_id')
      .eq('store_url', shop)
      .eq('status', 'installed')
      .maybeSingle();

    if (!installation) {
      console.warn('[Order Webhook] No active installation found for shop:', shop);
      return new Response(
        JSON.stringify({ success: true, message: 'Shop not found or uninstalled' }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const userId = installation.user_id;
    console.log('[Order Webhook] Processing for user:', userId);

    // Extract landing_site and referring_site from order
    const landingSite = orderData.landing_site || '';
    const referringSite = orderData.referring_site || '';

    // Parse UTM parameters and click IDs
    const utmParams = parseUTMFromURL(landingSite);
    const clickIDs = parseClickIDsFromURL(landingSite);

    console.log('[Order Webhook] UTM data:', {
      has_utm_source: !!utmParams.utm_source,
      has_utm_term: !!utmParams.utm_term,
      has_fbclid: !!clickIDs.fbclid,
    });

    // Store order in shopify_orders table
    const { data: storedOrder, error: orderError } = await supabase
      .from('shopify_orders')
      .upsert(
        {
          user_id: userId,
          shopify_order_id: orderData.id.toString(),
          order_number: orderData.name || orderData.order_number,
          total_price: parseFloat(orderData.total_price || orderData.current_total_price || '0'),
          currency: orderData.currency || 'USD',
          customer_email: orderData.email || orderData.customer?.email,
          landing_site: landingSite,
          referring_site: referringSite,
          ordered_at: orderData.created_at || new Date().toISOString(),
          ...utmParams,
          ...clickIDs,
        },
        {
          onConflict: 'user_id,shopify_order_id',
          ignoreDuplicates: false,
        }
      )
      .select('id')
      .single();

    if (orderError) {
      console.error('[Order Webhook] Error storing order:', orderError);
      throw new Error(`Failed to store order: ${orderError.message}`);
    }

    console.log('[Order Webhook] Order stored:', storedOrder.id);

    // If we have UTM data, try to match to ads
    if (utmParams.utm_source && utmParams.utm_term) {
      console.log('[Order Webhook] Attempting to match order to ads...');

      // Get ads that match the utm_term
      const { data: matchingAds } = await supabase
        .from('ads')
        .select(`
          id,
          platform_ad_id,
          name,
          ad_sets!inner (
            campaign_id,
            ad_campaigns!inner (
              ad_account_id,
              ad_accounts!inner (
                user_id
              )
            )
          )
        `)
        .eq('ad_sets.ad_campaigns.ad_accounts.user_id', userId);

      if (matchingAds && matchingAds.length > 0) {
        const utmTerm = utmParams.utm_term.toLowerCase().trim();

        // Try exact match on platform_ad_id first
        let matchedAd = matchingAds.find(ad => ad.platform_ad_id === utmParams.utm_term);
        let confidenceScore = matchedAd ? 1.0 : 0;
        let attributionMethod = 'utm_match';

        // Try exact match on ad name
        if (!matchedAd) {
          matchedAd = matchingAds.find(ad => ad.name.toLowerCase().trim() === utmTerm);
          if (matchedAd) {
            confidenceScore = 0.95;
            attributionMethod = 'ad_name_match';
          }
        }

        // Try partial match on ad name
        if (!matchedAd) {
          matchedAd = matchingAds.find(ad => ad.name.toLowerCase().includes(utmTerm));
          if (matchedAd) {
            confidenceScore = 0.8;
            attributionMethod = 'ad_name_match';
          }
        }

        if (matchedAd) {
          console.log('[Order Webhook] Matched to ad:', matchedAd.name);

          const { error: conversionError } = await supabase
            .from('ad_conversions')
            .upsert(
              {
                user_id: userId,
                ad_id: matchedAd.id,
                order_id: storedOrder.id,
                platform: utmParams.utm_source,
                conversion_value: parseFloat(orderData.total_price || orderData.current_total_price || '0'),
                attribution_method: attributionMethod,
                confidence_score: confidenceScore,
                converted_at: orderData.created_at || new Date().toISOString(),
              },
              {
                onConflict: 'order_id,ad_id',
                ignoreDuplicates: true,
              }
            );

          if (conversionError) {
            console.error('[Order Webhook] Error creating conversion:', conversionError);
          } else {
            console.log('[Order Webhook] Conversion recorded');
          }
        } else {
          console.log('[Order Webhook] No matching ad found for utm_term:', utmTerm);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Order processed successfully',
        order_id: storedOrder.id,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Order Webhook] Error:', errorMessage);

    return new Response(
      JSON.stringify({
        error: errorMessage,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});
