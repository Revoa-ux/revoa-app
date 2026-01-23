import { createClient } from 'npm:@supabase/supabase-js@2.39.7';
import { checkSubscription, createSubscriptionRequiredResponse } from '../_shared/subscription-check.ts';

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

    // Check subscription status
    const { isActive, status, pricingUrl } = await checkSubscription(supabase, userId);
    if (!isActive) {
      return createSubscriptionRequiredResponse(status, pricingUrl, corsHeaders);
    }

    if (!userId || !platform || !entityType || !entityId || !newStatus) {
      return new Response(
        JSON.stringify({ success: false, message: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[tiktok-toggle-status] Toggling ${entityType} ${entityId} to ${newStatus}`);

    // Get the ad account and access token
    const { data: adAccounts } = await supabase
      .from('ad_accounts')
      .select('*, integration_connections(*)')
      .eq('user_id', userId)
      .eq('platform', 'tiktok')
      .single();

    if (!adAccounts?.integration_connections?.access_token) {
      return new Response(
        JSON.stringify({ success: false, message: 'No access token found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const accessToken = adAccounts.integration_connections.access_token;
    const advertiserId = adAccounts.platform_account_id;

    // Map our status to TikTok status
    const tiktokStatus = newStatus === 'ACTIVE' ? 'ENABLE' : 'DISABLE';

    // TikTok API endpoints
    const endpoint = entityType === 'campaign' ? 'campaign/update/status/' :
                    entityType === 'adset' ? 'adgroup/update/status/' :
                    'ad/update/status/';

    const url = `https://business-api.tiktok.com/open_api/v1.3/${endpoint}`;

    // Prepare the request body
    const idField = entityType === 'campaign' ? 'campaign_ids' :
                   entityType === 'adset' ? 'adgroup_ids' :
                   'ad_ids';

    const requestBody = {
      advertiser_id: advertiserId,
      [idField]: [entityId],
      opt_status: tiktokStatus
    };

    // Call TikTok Ads API
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Access-Token': accessToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('[tiktok-toggle-status] TikTok error:', error);
      return new Response(
        JSON.stringify({
          success: false,
          message: error.message || 'Failed to update status'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result = await response.json();

    // Check if the operation was successful
    if (result.code !== 0) {
      console.error('[tiktok-toggle-status] TikTok API error:', result);
      return new Response(
        JSON.stringify({
          success: false,
          message: result.message || 'Failed to update status'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update local database
    const tableName = entityType === 'campaign' ? 'ad_campaigns' :
                     entityType === 'adset' ? 'ad_sets' :
                     'ads';
    const idColumn = entityType === 'campaign' ? 'platform_campaign_id' :
                    entityType === 'adset' ? 'platform_ad_set_id' :
                    'platform_ad_id';

    await supabase
      .from(tableName)
      .update({
        status: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq(idColumn, entityId);

    console.log(`[tiktok-toggle-status] Successfully toggled ${entityType} ${entityId} to ${newStatus}`);

    return new Response(
      JSON.stringify({ success: true, status: newStatus }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[tiktok-toggle-status] Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
