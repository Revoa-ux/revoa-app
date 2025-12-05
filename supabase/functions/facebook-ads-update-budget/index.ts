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

    const { userId, platform, entityType, entityId, newBudget, budgetType = 'daily' } = await req.json();

    if (!userId || !platform || !entityType || !entityId || newBudget === undefined) {
      return new Response(
        JSON.stringify({ success: false, message: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[update-budget] Updating ${entityType} ${entityId} budget to $${newBudget} on ${platform}`);

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

    // Convert budget to cents (Facebook uses integer cents)
    const budgetInCents = Math.round(newBudget * 100);

    // Determine budget field based on entity type and budget type
    let budgetField: string;
    if (entityType === 'campaign') {
      budgetField = budgetType === 'daily' ? 'daily_budget' : 'lifetime_budget';
    } else if (entityType === 'adset') {
      budgetField = budgetType === 'daily' ? 'daily_budget' : 'lifetime_budget';
    } else {
      return new Response(
        JSON.stringify({ success: false, message: 'Budget updates only supported for campaigns and ad sets' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const url = `https://graph.facebook.com/v21.0/${entityId}?access_token=${accessToken}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [budgetField]: budgetInCents })
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('[update-budget] Facebook error:', error);
      return new Response(
        JSON.stringify({ success: false, message: error.error?.message || 'Failed to update budget' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update local database
    const tableName = entityType === 'campaign' ? 'ad_campaigns' : 'ad_sets';
    const idColumn = entityType === 'campaign' ? 'platform_campaign_id' : 'platform_ad_set_id';
    const budgetColumn = budgetType === 'daily' ? 'daily_budget' : 'lifetime_budget';

    await supabase
      .from(tableName)
      .update({ [budgetColumn]: newBudget, updated_at: new Date().toISOString() })
      .eq(idColumn, entityId);

    console.log(`[update-budget] Successfully updated ${entityType} ${entityId} budget to $${newBudget}`);

    return new Response(
      JSON.stringify({
        success: true,
        budget: newBudget,
        budgetType,
        message: `Budget updated to $${newBudget}/${budgetType}`
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[update-budget] Error:', error);
    return new Response(
      JSON.stringify({ success: false, message: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
