import { createClient } from 'npm:@supabase/supabase-js@2.39.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabaseClient.auth.getUser(token);

    if (!user) {
      throw new Error('Unauthorized');
    }

    const { platform_ad_id } = await req.json();

    console.log(`[fetch-preview] Fetching preview for ad ${platform_ad_id}`);

    if (!platform_ad_id) {
      throw new Error('platform_ad_id is required');
    }

    // Get the ad
    const { data: ad, error: adError } = await supabaseClient
      .from('ads')
      .select('*')
      .eq('platform_ad_id', platform_ad_id)
      .eq('platform', 'facebook')
      .single();

    if (adError || !ad) {
      console.error('[fetch-preview] Ad not found:', adError);
      throw new Error(`Ad not found: ${adError?.message || 'Unknown error'}`);
    }

    // Get the ad account
    const { data: adAccount, error: accountError } = await supabaseClient
      .from('ad_accounts')
      .select('*')
      .eq('id', ad.ad_account_id)
      .single();

    if (accountError || !adAccount) {
      console.error('[fetch-preview] Ad account not found:', accountError);
      throw new Error('Ad account not found');
    }

    // Verify user has access to this ad account
    if (adAccount.user_id !== user.id) {
      throw new Error('Unauthorized');
    }

    // Get Facebook access token
    const { data: fbToken, error: tokenError } = await supabaseClient
      .from('facebook_tokens')
      .select('access_token')
      .eq('user_id', user.id)
      .eq('account_id', adAccount.platform_account_id)
      .single();

    if (tokenError || !fbToken) {
      console.error('[fetch-preview] Token not found:', tokenError);
      throw new Error('Facebook account not connected');
    }

    // Fetch ad preview using Facebook's Ad Previews API
    const previewUrl = `https://graph.facebook.com/v21.0/${ad.platform_ad_id}/previews?ad_format=DESKTOP_FEED_STANDARD&access_token=${fbToken.access_token}`;
    const response = await fetch(previewUrl);
    const data = await response.json();

    console.log('[fetch-preview] Facebook API response:', JSON.stringify(data).substring(0, 500));

    if (data.error) {
      console.error('[fetch-preview] Facebook API error:', data.error);
      throw new Error(`Facebook API error: ${data.error.message}`);
    }

    let imageUrl = null;

    if (data.data && data.data[0]) {
      const preview = data.data[0];

      // Try to extract image URL from preview HTML
      if (preview.body) {
        const imgMatch = preview.body.match(/<img[^>]+src="([^">]+)"/);
        if (imgMatch) {
          imageUrl = imgMatch[1];
          console.log('[fetch-preview] Extracted image URL:', imageUrl.substring(0, 100));
        } else {
          console.log('[fetch-preview] No image tag found in preview body');
        }
      } else {
        console.log('[fetch-preview] No preview body found');
      }
    } else {
      console.log('[fetch-preview] No preview data found');
    }

    // If we got an image URL, update the ad record
    if (imageUrl) {
      await supabaseClient
        .from('ads')
        .update({
          creative_thumbnail_url: imageUrl,
          creative_data: {
            ...ad.creative_data,
            preview_url: imageUrl,
            preview_fetched_at: new Date().toISOString()
          }
        })
        .eq('id', ad.id);

      console.log(`[fetch-preview] Successfully fetched and saved preview for ad ${ad.platform_ad_id}`);
    } else {
      console.log(`[fetch-preview] No preview image found for ad ${ad.platform_ad_id}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        image_url: imageUrl,
        preview_data: data.data?.[0] || null
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error: any) {
    console.error('[fetch-preview] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
