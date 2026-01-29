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

    const { userId, entityType, entityId, advertiserId, newName } = await req.json();

    // Check subscription status
    const { isActive, status, pricingUrl } = await checkSubscription(supabase, userId);
    if (!isActive) {
      return createSubscriptionRequiredResponse(status, pricingUrl, corsHeaders);
    }

    if (!userId || !entityType || !entityId || !advertiserId || !newName) {
      return new Response(
        JSON.stringify({ success: false, message: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[tiktok-ads-update-name] Updating ${entityType} ${entityId} name to "${newName}"`);

    // Get the ad account and access token
    const { data: adAccounts } = await supabase
      .from('ad_accounts')
      .select('*, integration_connections(*)')
      .eq('user_id', userId)
      .eq('platform', 'tiktok')
      .single();

    if (!adAccounts?.integration_connections?.access_token) {
      return new Response(
        JSON.stringify({ success: false, message: 'No TikTok Ads access token found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const accessToken = adAccounts.integration_connections.access_token;

    // Determine TikTok API endpoint and payload
    let endpoint: string;
    let payload: any;

    if (entityType === 'campaign') {
      endpoint = 'https://business-api.tiktok.com/open_api/v1.3/campaign/update/';
      payload = {
        advertiser_id: advertiserId,
        campaign_id: entityId,
        campaign_name: newName
      };
    } else if (entityType === 'ad_group' || entityType === 'adset' || entityType === 'ad_set') {
      endpoint = 'https://business-api.tiktok.com/open_api/v1.3/adgroup/update/';
      payload = {
        advertiser_id: advertiserId,
        adgroup_id: entityId,
        adgroup_name: newName
      };
    } else if (entityType === 'ad') {
      endpoint = 'https://business-api.tiktok.com/open_api/v1.3/ad/update/';
      payload = {
        advertiser_id: advertiserId,
        ad_id: entityId,
        ad_name: newName
      };
    } else {
      return new Response(
        JSON.stringify({ success: false, message: 'Unsupported entity type for name update' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Access-Token': accessToken,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();

    if (!response.ok || result.code !== 0) {
      console.error('[tiktok-ads-update-name] TikTok error:', result);
      return new Response(
        JSON.stringify({ success: false, message: result.message || 'Failed to update name' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update in local database
    const tableName = entityType === 'campaign' ? 'ad_campaigns' : entityType === 'ad_group' || entityType === 'adset' || entityType === 'ad_set' ? 'ad_sets' : 'ads';
    const platformIdField = entityType === 'campaign' ? 'platform_campaign_id' : entityType === 'ad_group' || entityType === 'adset' || entityType === 'ad_set' ? 'platform_ad_set_id' : 'platform_ad_id';

    const { error: updateError } = await supabase
      .from(tableName)
      .update({ name: newName, updated_at: new Date().toISOString() })
      .eq(platformIdField, entityId);

    if (updateError) {
      console.error('[tiktok-ads-update-name] Database update error:', updateError);
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Name updated successfully', newName }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[tiktok-ads-update-name] Error:', error);
    return new Response(
      JSON.stringify({ success: false, message: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
