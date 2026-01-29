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

    const { userId, entityType, entityId, customerId, newName } = await req.json();

    // Check subscription status
    const { isActive, status, pricingUrl } = await checkSubscription(supabase, userId);
    if (!isActive) {
      return createSubscriptionRequiredResponse(status, pricingUrl, corsHeaders);
    }

    if (!userId || !entityType || !entityId || !customerId || !newName) {
      return new Response(
        JSON.stringify({ success: false, message: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[google-ads-update-name] Updating ${entityType} ${entityId} name to "${newName}"`);

    // Get the ad account and access token
    const { data: adAccounts } = await supabase
      .from('ad_accounts')
      .select('*, integration_connections(*)')
      .eq('user_id', userId)
      .eq('platform', 'google')
      .single();

    if (!adAccounts?.integration_connections?.access_token) {
      return new Response(
        JSON.stringify({ success: false, message: 'No Google Ads access token found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const accessToken = adAccounts.integration_connections.access_token;
    const developerToken = Deno.env.get('GOOGLE_ADS_DEVELOPER_TOKEN');

    if (!developerToken) {
      return new Response(
        JSON.stringify({ success: false, message: 'Google Ads Developer Token not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Determine resource type and mutation
    let resourceType: string;
    let updateMask: string;

    if (entityType === 'campaign') {
      resourceType = 'campaigns';
      updateMask = 'name';
    } else if (entityType === 'ad_group' || entityType === 'adset' || entityType === 'ad_set') {
      resourceType = 'adGroups';
      updateMask = 'name';
    } else if (entityType === 'ad') {
      // For ads, we need to update the ad's name field
      resourceType = 'ads';
      updateMask = 'name';
    } else {
      return new Response(
        JSON.stringify({ success: false, message: 'Unsupported entity type for name update' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Google Ads API mutation request
    const mutation = {
      operations: [{
        updateMask,
        update: {
          resourceName: `customers/${customerId}/${resourceType}/${entityId}`,
          name: newName
        }
      }]
    };

    const url = `https://googleads.googleapis.com/v16/customers/${customerId}/${resourceType}:mutate`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'developer-token': developerToken,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(mutation)
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('[google-ads-update-name] Google Ads error:', error);
      return new Response(
        JSON.stringify({ success: false, message: error.error?.message || 'Failed to update name' }),
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
      console.error('[google-ads-update-name] Database update error:', updateError);
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Name updated successfully', newName }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[google-ads-update-name] Error:', error);
    return new Response(
      JSON.stringify({ success: false, message: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
