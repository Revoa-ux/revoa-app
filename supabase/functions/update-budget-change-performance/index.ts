import { createClient } from 'npm:@supabase/supabase-js@2.39.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

/**
 * This function runs periodically to update the performance impact of historical budget changes.
 * It looks for budget changes that are 7+ days old and updates their roas_after and spend_after metrics.
 * This allows the AI to learn which budget scaling decisions actually worked.
 */
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

    // Find budget changes that are 7+ days old but haven't had their performance impact measured yet
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: changes } = await supabase
      .from('campaign_settings_history')
      .select('id, user_id, campaign_id, created_at, performance_impact_days')
      .eq('change_type', 'budget_change')
      .is('roas_after', null)
      .lte('created_at', sevenDaysAgo.toISOString())
      .limit(100);

    if (!changes || changes.length === 0) {
      console.log('[update-budget-performance] No budget changes ready for performance measurement');
      return new Response(
        JSON.stringify({ success: true, message: 'No changes to update', updated: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[update-budget-performance] Found ${changes.length} budget changes to measure`);

    let updatedCount = 0;

    // Update each budget change with current performance metrics
    for (const change of changes) {
      try {
        // Get current campaign performance
        const { data: campaign } = await supabase
          .from('ad_campaigns')
          .select('roas, spend')
          .eq('id', change.campaign_id)
          .single();

        if (campaign) {
          await supabase
            .from('campaign_settings_history')
            .update({
              roas_after: campaign.roas || 0,
              spend_after: campaign.spend || 0
            })
            .eq('id', change.id);

          updatedCount++;
          console.log(`[update-budget-performance] Updated change ${change.id}: ROAS after = ${campaign.roas}`);
        }
      } catch (error) {
        console.error(`[update-budget-performance] Error updating change ${change.id}:`, error);
      }
    }

    console.log(`[update-budget-performance] Successfully updated ${updatedCount} budget changes`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Updated performance metrics for ${updatedCount} budget changes`,
        updated: updatedCount
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[update-budget-performance] Error:', error);
    return new Response(
      JSON.stringify({ success: false, message: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});