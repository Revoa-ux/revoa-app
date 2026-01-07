/**
 * Sync Paused Entities Safety Net
 *
 * This function runs periodically (recommended: weekly via cron) to catch any
 * status transitions that might have been missed. It ensures complete data
 * integrity by syncing all entities that transitioned to PAUSED/DELETED
 * but haven't had their final sync completed.
 *
 * This is the "safety net" that catches edge cases and ensures bulletproof
 * data collection even if something went wrong during the normal sync.
 */

import { createClient } from 'npm:@supabase/supabase-js@2';
import {
  processAllPendingFinalSyncs,
  MetricData,
} from '../_shared/atomic-status-handler.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('[safety-net] Starting periodic safety net sync for paused entities');

    // Get all ad accounts that have pending final syncs
    const { data: pendingLogs, error: logsError } = await supabase
      .from('ad_status_change_log')
      .select('ad_account_id, user_id, platform')
      .eq('final_sync_completed', false)
      .in('old_status', ['ACTIVE', 'active'])
      .in('new_status', ['PAUSED', 'paused', 'DELETED', 'deleted']);

    if (logsError) {
      console.error('[safety-net] Error fetching pending logs:', logsError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to fetch pending logs' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!pendingLogs || pendingLogs.length === 0) {
      console.log('[safety-net] No pending final syncs found');
      return new Response(
        JSON.stringify({ success: true, message: 'No pending final syncs', accountsProcessed: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get unique ad accounts
    const uniqueAccounts = Array.from(
      new Set(pendingLogs.map(log => JSON.stringify({
        ad_account_id: log.ad_account_id,
        user_id: log.user_id,
        platform: log.platform
      })))
    ).map(str => JSON.parse(str));

    console.log(`[safety-net] Found ${uniqueAccounts.length} accounts with pending final syncs`);

    const results = {
      accountsProcessed: 0,
      totalEntities: 0,
      totalMetrics: 0,
      errors: [] as string[],
    };

    // Process each account
    for (const accountInfo of uniqueAccounts) {
      console.log(`[safety-net] Processing account ${accountInfo.ad_account_id} (platform: ${accountInfo.platform})`);

      try {
        // Get the ad account details
        const { data: account, error: accountError } = await supabase
          .from('ad_accounts')
          .select('*')
          .eq('id', accountInfo.ad_account_id)
          .maybeSingle();

        if (accountError || !account) {
          console.error(`[safety-net] Could not find account ${accountInfo.ad_account_id}`);
          results.errors.push(`Account ${accountInfo.ad_account_id}: not found`);
          continue;
        }

        // Get access token based on platform
        let accessToken: string | null = null;

        if (accountInfo.platform === 'facebook') {
          const { data: tokenData, error: tokenError } = await supabase
            .from('facebook_tokens')
            .select('access_token, expires_at')
            .eq('ad_account_id', account.platform_account_id)
            .eq('user_id', accountInfo.user_id)
            .maybeSingle();

          if (tokenError || !tokenData) {
            console.error(`[safety-net] No token found for account ${account.platform_account_id}`);
            results.errors.push(`Account ${account.name}: no access token`);
            continue;
          }

          if (new Date(tokenData.expires_at) < new Date()) {
            console.error(`[safety-net] Token expired for account ${account.name}`);
            results.errors.push(`Account ${account.name}: token expired`);
            continue;
          }

          accessToken = tokenData.access_token;
        }
        // Add other platforms here (TikTok, Google Ads, etc.)

        if (!accessToken) {
          console.error(`[safety-net] No access token available for platform ${accountInfo.platform}`);
          results.errors.push(`Account ${account.name}: no token for platform ${accountInfo.platform}`);
          continue;
        }

        // Create fetch metrics function for this platform
        const fetchMetricsForEntity = async (
          platformEntityId: string,
          startDate: string,
          endDate: string
        ): Promise<MetricData[]> => {
          if (accountInfo.platform === 'facebook') {
            const insightsFields = 'impressions,clicks,spend,reach,cpc,cpm,ctr,actions,action_values,date_start';
            const timeRange = `{"since":"${startDate}","until":"${endDate}"}`;
            const insightsUrl = `https://graph.facebook.com/v21.0/${platformEntityId}/insights?fields=${insightsFields}&time_range=${timeRange}&time_increment=1&limit=500&access_token=${accessToken}`;

            try {
              const response = await fetch(insightsUrl);
              const data = await response.json();

              if (data.error) {
                console.error(`[safety-net] API error for ${platformEntityId}:`, data.error.message);
                return [];
              }

              const insights = data.data || [];

              return insights.map((insight: any) => {
                const purchaseAction = insight.actions?.find((a: any) => a.action_type === 'purchase');
                const conversions = parseInt(purchaseAction?.value || '0');
                const purchaseValue = insight.action_values?.find((a: any) => a.action_type === 'purchase');
                const conversionValue = parseFloat(purchaseValue?.value || '0');
                const spend = parseFloat(insight.spend || '0');

                return {
                  entity_id: platformEntityId,
                  entity_type: 'unknown', // Will be mapped by handler
                  date: insight.date_start,
                  impressions: parseInt(insight.impressions || '0'),
                  clicks: parseInt(insight.clicks || '0'),
                  spend,
                  reach: parseInt(insight.reach || '0'),
                  conversions,
                  conversion_value: conversionValue,
                  cpc: parseFloat(insight.cpc || '0'),
                  cpm: parseFloat(insight.cpm || '0'),
                  ctr: parseFloat(insight.ctr || '0'),
                  roas: spend > 0 ? conversionValue / spend : 0,
                };
              });
            } catch (error) {
              console.error(`[safety-net] Fetch error for ${platformEntityId}:`, error);
              return [];
            }
          }

          return [];
        };

        // Calculate date range: from 7 days ago to today
        const today = new Date();
        const sevenDaysAgo = new Date(today);
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const dateRange = {
          start: sevenDaysAgo.toISOString().split('T')[0],
          end: today.toISOString().split('T')[0],
        };

        // Process pending final syncs for this account
        const syncResult = await processAllPendingFinalSyncs(
          supabase,
          account.id,
          fetchMetricsForEntity,
          dateRange
        );

        results.accountsProcessed++;
        results.totalEntities += syncResult.entitiesProcessed;
        results.totalMetrics += syncResult.metricsCollected;

        if (syncResult.errors.length > 0) {
          results.errors.push(
            `Account ${account.name}: ${syncResult.errors.join('; ')}`
          );
        }

        console.log(
          `[safety-net] Account ${account.name}: ` +
          `${syncResult.entitiesProcessed} entities, ${syncResult.metricsCollected} metrics`
        );

      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error(`[safety-net] Error processing account ${accountInfo.ad_account_id}:`, errorMsg);
        results.errors.push(`Account ${accountInfo.ad_account_id}: ${errorMsg}`);
      }
    }

    console.log('[safety-net] Safety net sync complete:', results);

    return new Response(
      JSON.stringify({
        success: results.errors.length === 0,
        message: `Processed ${results.accountsProcessed} accounts, ${results.totalEntities} entities, ${results.totalMetrics} metrics`,
        ...results,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[safety-net] Unexpected error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'An unexpected error occurred',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
