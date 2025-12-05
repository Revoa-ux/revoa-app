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

    const { userId, platform, entityType, entityId, nameSuffix = 'Copy' } = await req.json();

    if (!userId || !platform || !entityType || !entityId) {
      return new Response(
        JSON.stringify({ success: false, message: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[duplicate-entity] Duplicating ${entityType} ${entityId} on ${platform}`);

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

    // Only handle Facebook Ads
    if (platform !== 'facebook') {
      return new Response(
        JSON.stringify({ success: false, message: 'This function only handles Facebook Ads' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Facebook API endpoint for copying
    const copyEndpoint = entityType === 'campaign'
      ? 'campaigns'
      : entityType === 'adset'
      ? 'adsets'
      : 'ads';

    // Get the original entity details to create a copy
    const getUrl = `https://graph.facebook.com/v21.0/${entityId}?access_token=${accessToken}&fields=name,status`;
    const getResponse = await fetch(getUrl);

    if (!getResponse.ok) {
      const error = await getResponse.json();
      console.error('[duplicate-entity] Facebook error fetching entity:', error);
      return new Response(
        JSON.stringify({ success: false, message: 'Failed to fetch entity details' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const originalEntity = await getResponse.json();
    const newName = `${originalEntity.name} - ${nameSuffix}`;

    // Use Facebook's copy endpoint
    const copyUrl = `https://graph.facebook.com/v21.0/${entityId}/copies?access_token=${accessToken}`;

    const copyPayload: Record<string, any> = {
      status_option: 'PAUSED', // Always create as paused for safety
    };

    // Add rename for campaigns and ad sets
    if (entityType === 'campaign' || entityType === 'adset') {
      copyPayload.deep_copy = true;
      copyPayload.rename_options = {
        rename_suffix: ` - ${nameSuffix}`
      };
    }

    const copyResponse = await fetch(copyUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(copyPayload)
    });

    if (!copyResponse.ok) {
      const error = await copyResponse.json();
      console.error('[duplicate-entity] Facebook error copying:', error);
      return new Response(
        JSON.stringify({ success: false, message: error.error?.message || 'Failed to duplicate entity' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result = await copyResponse.json();
    const newEntityId = result.copied_campaign_id || result.copied_adset_id || result.copied_ad_id || result.id;

    console.log(`[duplicate-entity] Successfully duplicated ${entityType} ${entityId} to ${newEntityId}`);

    // Trigger a sync to update local database with new entity
    // This will be picked up by the next Facebook sync
    console.log('[duplicate-entity] New entity created, will be synced on next Facebook Ads sync');

    return new Response(
      JSON.stringify({
        success: true,
        newEntityId,
        newName,
        message: `Successfully created copy of ${originalEntity.name}`
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[duplicate-entity] Error:', error);
    return new Response(
      JSON.stringify({ success: false, message: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
