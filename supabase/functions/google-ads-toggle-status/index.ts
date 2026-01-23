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

    console.log(`[google-toggle-status] Toggling ${entityType} ${entityId} to ${newStatus}`);

    // Get the ad account and access token
    const { data: adAccounts } = await supabase
      .from('ad_accounts')
      .select('*, integration_connections(*)')
      .eq('user_id', userId)
      .eq('platform', 'google')
      .single();

    if (!adAccounts?.integration_connections?.access_token) {
      return new Response(
        JSON.stringify({ success: false, message: 'No access token found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const accessToken = adAccounts.integration_connections.access_token;
    const customerId = adAccounts.platform_account_id;

    // Map our status to Google Ads status
    const googleStatus = newStatus === 'ACTIVE' ? 'ENABLED' : 'PAUSED';

    // Map entity types to Google Ads resource names
    const resourceType = entityType === 'campaign' ? 'campaigns' :
                        entityType === 'adset' ? 'adGroups' :
                        'ads';

    // Construct the resource name
    const resourceName = `customers/${customerId}/${resourceType}/${entityId}`;

    // Prepare the update operation
    const updateMask = 'status';
    const operation = {
      updateMask: updateMask,
      [resourceType.slice(0, -1)]: {
        resourceName: resourceName,
        status: googleStatus
      }
    };

    // Call Google Ads API
    const googleAdsUrl = `https://googleads.googleapis.com/v18/customers/${customerId}/${resourceType}:mutate`;

    const response = await fetch(googleAdsUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'developer-token': Deno.env.get('GOOGLE_ADS_DEVELOPER_TOKEN')!,
      },
      body: JSON.stringify({
        operations: [operation]
      })
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('[google-toggle-status] Google Ads error:', error);
      return new Response(
        JSON.stringify({
          success: false,
          message: error.error?.message || 'Failed to update status'
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

    console.log(`[google-toggle-status] Successfully toggled ${entityType} ${entityId} to ${newStatus}`);

    return new Response(
      JSON.stringify({ success: true, status: newStatus }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[google-toggle-status] Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
