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

    const { ad_id, platform_ad_id } = await req.json();

    console.log(`[fetch-preview] Fetching preview for ad ${platform_ad_id || ad_id}`);

    // Get the ad and its account
    const { data: ad, error: adError } = await supabaseClient
      .from('ads')
      .select(`
        *,
        ad_account:ad_accounts!inner(
          id,
          platform_account_id,
          user_id
        )
      `)
      .or(`id.eq.${ad_id},platform_ad_id.eq.${platform_ad_id}`)
      .eq('platform', 'facebook')
      .single();

    if (adError || !ad) {
      throw new Error('Ad not found');
    }

    // Verify user has access to this ad account
    if (ad.ad_account.user_id !== user.id) {
      throw new Error('Unauthorized');
    }

    // Get Facebook access token
    const { data: fbToken, error: tokenError } = await supabaseClient
      .from('facebook_tokens')
      .select('access_token')
      .eq('user_id', user.id)
      .eq('account_id', ad.ad_account.platform_account_id)
      .single();

    if (tokenError || !fbToken) {
      throw new Error('Facebook account not connected');
    }

    // Fetch ad preview using Facebook's Ad Previews API
    const previewUrl = `https://graph.facebook.com/v21.0/${ad.platform_ad_id}/previews?ad_format=DESKTOP_FEED_STANDARD&access_token=${fbToken.access_token}`;
    const response = await fetch(previewUrl);
    const data = await response.json();

    let imageUrl = null;

    if (data.data && data.data[0]) {
      const preview = data.data[0];

      // Try to extract image URL from preview HTML
      if (preview.body) {
        const imgMatch = preview.body.match(/<img[^>]+src="([^">]+)"/);
        if (imgMatch) {
          imageUrl = imgMatch[1];
        }
      }
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
