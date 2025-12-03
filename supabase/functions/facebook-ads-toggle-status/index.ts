import { createClient } from 'npm:@supabase/supabase-js@2.39.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { userId, platform, entityType, entityId, newStatus } = await req.json();

    if (!userId || !platform || !entityType || !entityId || !newStatus) {
      return new Response(
        JSON.stringify({ success: false, message: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[toggle-status] Toggling ${entityType} ${entityId} to ${newStatus} on ${platform}`);

    // Get the ad account and access token
    const { data: adAccounts } = await supabase
      .from('ad_accounts')
      .select('*, integration_connections(*)')
      .eq('user_id', userId)
      .eq('platform', platform)
      .single();

    if (!adAccounts?.integration_connections?.access_token) {
      return new Response(
        JSON.stringify({ success: false, message: 'No access token found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const accessToken = adAccounts.integration_connections.access_token;

    // Handle Facebook Ads
    if (platform === 'facebook') {
      const fbStatus = newStatus === 'ACTIVE' ? 'ACTIVE' : 'PAUSED';
      const url = `https://graph.facebook.com/v21.0/${entityId}?access_token=${accessToken}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: fbStatus })
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('[toggle-status] Facebook error:', error);
        return new Response(
          JSON.stringify({ success: false, message: error.error?.message || 'Failed to update status' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Update local database
      const tableName = entityType === 'campaign' ? 'ad_campaigns' : entityType === 'adset' ? 'ad_sets' : 'ads';
      const idColumn = entityType === 'campaign' ? 'platform_campaign_id' : entityType === 'adset' ? 'platform_adset_id' : 'platform_ad_id';

      await supabase
        .from(tableName)
        .update({ status: fbStatus, updated_at: new Date().toISOString() })
        .eq(idColumn, entityId)
        .eq('user_id', userId);

      console.log(`[toggle-status] Successfully toggled ${entityType} ${entityId} to ${fbStatus}`);

      return new Response(
        JSON.stringify({ success: true, status: fbStatus }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle Google Ads
    if (platform === 'google') {
      // TODO: Implement Google Ads status toggle
      return new Response(
        JSON.stringify({ success: false, message: 'Google Ads toggle not yet implemented' }),
        { status: 501, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle TikTok Ads
    if (platform === 'tiktok') {
      // TODO: Implement TikTok Ads status toggle
      return new Response(
        JSON.stringify({ success: false, message: 'TikTok Ads toggle not yet implemented' }),
        { status: 501, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, message: 'Unsupported platform' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[toggle-status] Error:', error);
    return new Response(
      JSON.stringify({ success: false, message: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
