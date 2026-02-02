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

    const { userId, entityType, entityId, newName } = await req.json();

    // Check subscription status
    const { isActive, status, pricingUrl } = await checkSubscription(supabase, userId);
    if (!isActive) {
      return createSubscriptionRequiredResponse(status, pricingUrl, corsHeaders);
    }

    if (!userId || !entityType || !entityId || !newName) {
      return new Response(
        JSON.stringify({ success: false, message: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[update-name] Updating ${entityType} ${entityId} name to "${newName}" on Facebook`);

    // Get the ad account and access token
    const { data: adAccounts } = await supabase
      .from('ad_accounts')
      .select('*, integration_connections(*)')
      .eq('user_id', userId)
      .eq('platform', 'facebook')
      .single();

    if (!adAccounts?.integration_connections?.access_token) {
      return new Response(
        JSON.stringify({ success: false, message: 'No Facebook access token found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const accessToken = adAccounts.integration_connections.access_token;

    // Update name via Facebook Graph API
    const url = `https://graph.facebook.com/v21.0/${entityId}?access_token=${accessToken}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName })
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('[update-name] Facebook error:', error);
      return new Response(
        JSON.stringify({ success: false, message: error.error?.message || 'Failed to update name' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update in local database
    const tableName = entityType === 'campaign' ? 'ad_campaigns' : entityType === 'adset' || entityType === 'ad_set' ? 'ad_sets' : 'ads';
    const { error: updateError } = await supabase
      .from(tableName)
      .update({ name: newName, updated_at: new Date().toISOString() })
      .eq('platform_' + (entityType === 'campaign' ? 'campaign_id' : entityType === 'adset' || entityType === 'ad_set' ? 'ad_set_id' : 'ad_id'), entityId);

    if (updateError) {
      console.error('[update-name] Database update error:', updateError);
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Name updated successfully', newName }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[update-name] Error:', error);
    return new Response(
      JSON.stringify({ success: false, message: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
