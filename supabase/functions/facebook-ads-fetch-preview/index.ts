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

    const authHeader = req.headers.get('Authorization');

    if (!authHeader) {
      console.error('[fetch-preview] No Authorization header provided');
      throw new Error('Unauthorized: No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    console.log('[fetch-preview] Validating user token...');

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError) {
      console.error('[fetch-preview] Auth error:', authError);
      throw new Error(`Unauthorized: ${authError.message}`);
    }

    if (!user) {
      console.error('[fetch-preview] No user found for token');
      throw new Error('Unauthorized: Invalid token');
    }

    console.log('[fetch-preview] Authenticated user:', user.id);

    const { platform_ad_id } = await req.json();

    console.log(`[fetch-preview] Fetching preview for ad ${platform_ad_id}`);

    if (!platform_ad_id) {
      throw new Error('platform_ad_id is required');
    }

    // Get the ad - use maybeSingle to handle no results gracefully
    const { data: ads, error: adError } = await supabaseClient
      .from('ads')
      .select('*')
      .eq('platform_ad_id', platform_ad_id)
      .eq('platform', 'facebook');

    if (adError) {
      console.error('[fetch-preview] Error querying ads:', adError);
      throw new Error(`Database error: ${adError.message}`);
    }

    if (!ads || ads.length === 0) {
      console.error('[fetch-preview] No ads found with platform_ad_id:', platform_ad_id);
      throw new Error(`No ad found with ID: ${platform_ad_id}`);
    }

    // If multiple ads found (shouldn't happen but handle it), use the first one
    if (ads.length > 1) {
      console.warn('[fetch-preview] Multiple ads found with same platform_ad_id, using first one:', {
        platform_ad_id,
        count: ads.length
      });
    }

    const ad = ads[0];

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
    console.log('[fetch-preview] Looking for token with:', {
      user_id: user.id,
      ad_account_id: adAccount.platform_account_id
    });

    const { data: fbToken, error: tokenError } = await supabaseClient
      .from('facebook_tokens')
      .select('access_token')
      .eq('user_id', user.id)
      .eq('ad_account_id', adAccount.platform_account_id)
      .maybeSingle();

    if (tokenError) {
      console.error('[fetch-preview] Token query error:', tokenError);
      throw new Error(`Facebook token error: ${tokenError.message}`);
    }

    if (!fbToken) {
      console.error('[fetch-preview] No token found for ad account:', adAccount.platform_account_id);
      throw new Error('Facebook account not connected');
    }

    console.log('[fetch-preview] Found Facebook token');

    // Fetch ad creative directly (better approach)
    const creativeUrl = `https://graph.facebook.com/v21.0/${ad.platform_ad_id}?fields=creative{thumbnail_url,image_url,image_hash,object_story_spec}&access_token=${fbToken.access_token}`;
    console.log('[fetch-preview] Fetching ad creative...');

    const creativeResponse = await fetch(creativeUrl);
    const creativeData = await creativeResponse.json();

    console.log('[fetch-preview] Creative API response:', JSON.stringify(creativeData));

    if (creativeData.error) {
      console.error('[fetch-preview] Facebook API error:', creativeData.error);
      throw new Error(`Facebook API error: ${creativeData.error.message}`);
    }

    let imageUrl = null;

    // Try to get image from creative data
    if (creativeData.creative) {
      const creative = creativeData.creative;
      console.log('[fetch-preview] Creative object:', JSON.stringify(creative));

      // Try different image sources
      imageUrl = creative.thumbnail_url || creative.image_url;

      if (imageUrl) {
        console.log('[fetch-preview] Found image URL from creative:', imageUrl.substring(0, 100));
      } else if (creative.object_story_spec) {
        // Try to extract from object story spec
        const spec = creative.object_story_spec;
        if (spec.link_data?.picture) {
          imageUrl = spec.link_data.picture;
          console.log('[fetch-preview] Found image URL from object_story_spec:', imageUrl.substring(0, 100));
        }
      }
    }

    // Fallback: Try preview API if no image found
    if (!imageUrl) {
      console.log('[fetch-preview] Trying preview API as fallback...');
      const previewUrl = `https://graph.facebook.com/v21.0/${ad.platform_ad_id}/previews?ad_format=DESKTOP_FEED_STANDARD&access_token=${fbToken.access_token}`;
      const previewResponse = await fetch(previewUrl);
      const previewData = await previewResponse.json();

      console.log('[fetch-preview] Preview API response keys:', previewData.data?.[0] ? Object.keys(previewData.data[0]) : 'no data');

      if (previewData.data && previewData.data[0]) {
        const preview = previewData.data[0];

        // Try to extract image URL from preview HTML
        if (preview.body) {
          const imgMatch = preview.body.match(/<img[^>]+src=["']([^"']+)["']/);
          if (imgMatch) {
            imageUrl = imgMatch[1];
            console.log('[fetch-preview] Extracted image URL from HTML:', imageUrl.substring(0, 100));
          }
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
        creative_data: creativeData.creative || null
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