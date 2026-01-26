import { createClient } from 'npm:@supabase/supabase-js@2.39.7';
import { checkSubscription, createSubscriptionRequiredResponse } from '../_shared/subscription-check.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface RequestBody {
  adAccountId: string;
  datePreset?: string;
  storeId?: string;
  forceFullCheck?: boolean;
}

const QUICK_REFRESH_COOLDOWN_MS = 30 * 1000;
const EXISTENCE_CHECK_INTERVAL_MS = 60 * 60 * 1000;
const API_DELAY_MS = 200;

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Check subscription status
    const { isActive, status, pricingUrl } = await checkSubscription(supabase, user.id);
    if (!isActive) {
      return createSubscriptionRequiredResponse(status, pricingUrl, corsHeaders);
    }

    const { adAccountId, datePreset = 'last_28d', forceFullCheck = false }: RequestBody = await req.json();

    console.log('[quick-refresh] Request for account:', adAccountId);

    let accessToken: string | null = null;

    const { data: tokenData } = await supabase
      .from('facebook_tokens')
      .select('access_token')
      .eq('user_id', user.id)
      .maybeSingle();

    if (tokenData?.access_token) {
      accessToken = tokenData.access_token;
    } else {
      const { data: adAccountData } = await supabase
        .from('ad_accounts')
        .select('access_token')
        .eq('user_id', user.id)
        .eq('platform', 'facebook')
        .not('access_token', 'is', null)
        .limit(1)
        .maybeSingle();

      if (adAccountData?.access_token) {
        accessToken = adAccountData.access_token;
      }
    }

    if (!accessToken) {
      throw new Error('Facebook not connected');
    }

    const { data: adAccount } = await supabase
      .from('ad_accounts')
      .select('id, last_synced_at, last_quick_refresh_at, last_existence_check_at')
      .eq('platform_account_id', adAccountId)
      .eq('platform', 'facebook')
      .maybeSingle();

    if (!adAccount) {
      throw new Error('Ad account not found');
    }

    const dbAccountId = adAccount.id;
    const now = Date.now();

    const lastQuickRefresh = adAccount.last_quick_refresh_at
      ? new Date(adAccount.last_quick_refresh_at).getTime()
      : 0;
    const lastExistenceCheck = adAccount.last_existence_check_at
      ? new Date(adAccount.last_existence_check_at).getTime()
      : 0;

    if (!forceFullCheck && (now - lastQuickRefresh) < QUICK_REFRESH_COOLDOWN_MS) {
      const waitTime = Math.ceil((QUICK_REFRESH_COOLDOWN_MS - (now - lastQuickRefresh)) / 1000);
      console.log(`[quick-refresh] Rate limited - refreshed ${Math.ceil((now - lastQuickRefresh)/1000)}s ago`);
      return new Response(
        JSON.stringify({
          success: true,
          rateLimited: true,
          message: `Recently refreshed. Please wait ${waitTime}s.`,
          stats: { campaigns: 0, adSets: 0, ads: 0 }
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: existingCampaigns } = await supabase
      .from('ad_campaigns')
      .select('id, platform_campaign_id')
      .eq('ad_account_id', dbAccountId);

    if (!existingCampaigns || existingCampaigns.length === 0) {
      console.log('[quick-refresh] No campaigns found - needs full sync');
      return new Response(
        JSON.stringify({
          success: false,
          needsFullSync: true,
          message: 'No campaigns found in database'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if we have sufficient historical metrics data (at least 7 days)
    const campaignDbIds = existingCampaigns.map(c => c.id);
    const { data: metricsDateRange } = await supabase
      .from('ad_metrics')
      .select('date')
      .in('entity_id', campaignDbIds)
      .order('date', { ascending: true })
      .limit(1);

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    if (metricsDateRange && metricsDateRange.length > 0) {
      const earliestDate = new Date(metricsDateRange[0].date);
      const daysSinceEarliest = Math.floor((today.getTime() - earliestDate.getTime()) / (1000 * 60 * 60 * 24));

      console.log(`[quick-refresh] Historical data check - earliest: ${metricsDateRange[0].date}, days: ${daysSinceEarliest}`);

      if (daysSinceEarliest < 7) {
        console.log('[quick-refresh] Insufficient historical data - needs full sync');
        return new Response(
          JSON.stringify({
            success: false,
            needsFullSync: true,
            message: `Only ${daysSinceEarliest} days of data available - triggering full sync for historical data`
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else {
      // No metrics at all - needs full sync
      console.log('[quick-refresh] No metrics data found - needs full sync');
      return new Response(
        JSON.stringify({
          success: false,
          needsFullSync: true,
          message: 'No metrics data found - triggering full sync'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: existingAdSets } = await supabase
      .from('ad_sets')
      .select('id, platform_adset_id, ad_campaign_id')
      .in('ad_campaign_id', existingCampaigns.map(c => c.id));

    const { data: existingAds } = await supabase
      .from('ads')
      .select('id, platform_ad_id, ad_set_id')
      .in('ad_set_id', existingAdSets?.map(as => as.id) || []);

    console.log(`[quick-refresh] DB has ${existingCampaigns.length} campaigns, ${existingAdSets?.length || 0} ad sets, ${existingAds?.length || 0} ads`);

    const shouldCheckExistence = forceFullCheck || (now - lastExistenceCheck) > EXISTENCE_CHECK_INTERVAL_MS;

    if (shouldCheckExistence) {
      console.log('[quick-refresh] Checking for new items (hourly check)...');

      await sleep(API_DELAY_MS);
      const campaignsUrl = `https://graph.facebook.com/v21.0/${adAccountId}/campaigns?fields=id&limit=500&access_token=${accessToken}`;
      const campaignsResponse = await fetch(campaignsUrl);
      const campaignsData = await campaignsResponse.json();

      if (campaignsData.error) {
        console.error('[quick-refresh] Facebook API error:', campaignsData.error);
        throw new Error(campaignsData.error.message || 'Facebook API error');
      }

      const apiCampaignCount = campaignsData.data?.length || 0;
      const dbCampaignCount = existingCampaigns?.length || 0;

      if (apiCampaignCount > dbCampaignCount) {
        console.log(`[quick-refresh] Found new campaigns (API: ${apiCampaignCount}, DB: ${dbCampaignCount})`);
        return new Response(
          JSON.stringify({
            success: false,
            needsFullSync: true,
            message: `Found ${apiCampaignCount - dbCampaignCount} new campaigns`
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      await supabase
        .from('ad_accounts')
        .update({ last_existence_check_at: new Date().toISOString() })
        .eq('id', dbAccountId);

      console.log('[quick-refresh] No new items detected');
    } else {
      console.log('[quick-refresh] Skipping existence check (checked recently)');
    }

    const totalAds = existingAds?.length || 0;
    if (totalAds > 500) {
      console.log(`[quick-refresh] Dataset large (${totalAds} ads) - updating summary only`);

      await sleep(API_DELAY_MS);
      const accountInsightsUrl = `https://graph.facebook.com/v21.0/${adAccountId}/insights?fields=impressions,clicks,spend,actions,action_values&date_preset=${datePreset}&access_token=${accessToken}`;
      const accountResponse = await fetch(accountInsightsUrl);
      const accountData = await accountResponse.json();

      if (accountData.data?.[0]) {
        const insights = accountData.data[0];
        const purchases = insights.actions?.find((a: any) => a.action_type === 'purchase')?.value || '0';
        const purchaseValue = insights.action_values?.find((a: any) => a.action_type === 'purchase')?.value || '0';

        await supabase
          .from('ad_accounts')
          .update({
            impressions: parseInt(insights.impressions || '0'),
            clicks: parseInt(insights.clicks || '0'),
            spend: parseFloat(insights.spend || '0'),
            purchases: parseInt(purchases),
            revenue: parseFloat(purchaseValue),
            last_synced_at: new Date().toISOString(),
            last_quick_refresh_at: new Date().toISOString()
          })
          .eq('id', dbAccountId);
      }

      return new Response(
        JSON.stringify({
          success: true,
          stats: { campaigns: 0, adSets: 0, ads: 0, accountOnly: true }
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[quick-refresh] Fetching metrics and status in batches...');

    const metricsFields = 'impressions,clicks,spend,actions,action_values,cost_per_action_type';
    const batchSize = 50;

    const fetchMetricsBatch = async (ids: string[]) => {
      const results = [];
      for (let i = 0; i < ids.length; i += batchSize) {
        const batch = ids.slice(i, i + batchSize);
        const idsParam = batch.join(',');

        await sleep(API_DELAY_MS);
        // Fetch daily breakdown data with time_increment=1 (not aggregated)
        const url = `https://graph.facebook.com/v21.0/?ids=${idsParam}&fields=status,effective_status,insights.date_preset(${datePreset}).time_increment(1){${metricsFields}}&access_token=${accessToken}`;

        const response = await fetch(url);
        const data = await response.json();

        if (data.error) {
          console.error('[quick-refresh] Batch error:', data.error);
          continue;
        }

        for (const [id, value] of Object.entries(data)) {
          const entityData = value as any;
          const insightsData = entityData?.insights?.data || [];
          const status = entityData?.effective_status || entityData?.status;

          // Push each daily data point (not just the first one)
          for (const dailyInsight of insightsData) {
            results.push({ id, insights: dailyInsight, status, date: dailyInsight.date_start });
          }
        }
      }
      return results;
    };

    const extractMetrics = (insights: any) => {
      const purchases = insights.actions?.find((a: any) => a.action_type === 'purchase')?.value || '0';
      const purchaseValue = insights.action_values?.find((a: any) => a.action_type === 'purchase')?.value || '0';
      const costPerPurchase = insights.cost_per_action_type?.find((a: any) => a.action_type === 'purchase')?.value || '0';
      const impressions = parseInt(insights.impressions || '0');
      const clicks = parseInt(insights.clicks || '0');
      const spend = parseFloat(insights.spend || '0');

      return {
        impressions,
        clicks,
        spend,
        purchases: parseInt(purchases),
        revenue: parseFloat(purchaseValue),
        cpc: clicks > 0 ? spend / clicks : 0,
        cpm: impressions > 0 ? (spend / impressions) * 1000 : 0,
        ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
        roas: spend > 0 ? parseFloat(purchaseValue) / spend : 0,
        cpa: parseFloat(costPerPurchase),
      };
    };

    const campaignIds = existingCampaigns?.map(c => c.platform_campaign_id) || [];
    const campaignMetrics = await fetchMetricsBatch(campaignIds);

    const adSetIds = existingAdSets?.map(as => as.platform_adset_id) || [];
    const adSetMetrics = await fetchMetricsBatch(adSetIds);

    const adIds = existingAds?.map(a => a.platform_ad_id) || [];
    const adMetrics = await fetchMetricsBatch(adIds);

    console.log(`[quick-refresh] Fetched ${campaignMetrics.length} campaign, ${adSetMetrics.length} ad set, ${adMetrics.length} ad metrics`);

    const campaignIdMap = new Map(existingCampaigns?.map(c => [c.platform_campaign_id, c.id]));
    const adSetIdMap = new Map(existingAdSets?.map(as => [as.platform_adset_id, as.id]));
    const adIdMap = new Map(existingAds?.map(a => [a.platform_ad_id, a.id]));

    const allMetricsRecords: any[] = [];
    const latestMetricsByEntity = new Map<string, any>();

    // Store daily metrics records and track latest for entity updates
    for (const { id, insights, status, date } of campaignMetrics) {
      const dbId = campaignIdMap.get(id);
      if (dbId && insights && date) {
        const metrics = extractMetrics(insights);

        // Add daily metric record
        allMetricsRecords.push({
          entity_id: dbId, entity_type: 'campaign', date,
          ...metrics, conversions: metrics.purchases, conversion_value: metrics.revenue, reach: 0
        });

        // Track latest metric for entity update (compare dates)
        const existing = latestMetricsByEntity.get(`campaign_${dbId}`);
        if (!existing || date > existing.date) {
          latestMetricsByEntity.set(`campaign_${dbId}`, { dbId, metrics, status, date, table: 'ad_campaigns' });
        }
      }
    }

    for (const { id, insights, status, date } of adSetMetrics) {
      const dbId = adSetIdMap.get(id);
      if (dbId && insights && date) {
        const metrics = extractMetrics(insights);

        allMetricsRecords.push({
          entity_id: dbId, entity_type: 'adset', date,
          ...metrics, conversions: metrics.purchases, conversion_value: metrics.revenue, reach: 0
        });

        const existing = latestMetricsByEntity.get(`adset_${dbId}`);
        if (!existing || date > existing.date) {
          latestMetricsByEntity.set(`adset_${dbId}`, { dbId, metrics, status, date, table: 'ad_sets' });
        }
      }
    }

    for (const { id, insights, status, date } of adMetrics) {
      const dbId = adIdMap.get(id);
      if (dbId && insights && date) {
        const metrics = extractMetrics(insights);

        allMetricsRecords.push({
          entity_id: dbId, entity_type: 'ad', date,
          ...metrics, conversions: metrics.purchases, conversion_value: metrics.revenue, reach: 0
        });

        const existing = latestMetricsByEntity.get(`ad_${dbId}`);
        if (!existing || date > existing.date) {
          latestMetricsByEntity.set(`ad_${dbId}`, { dbId, metrics, status, date, table: 'ads' });
        }
      }
    }

    // Update entities with their latest metrics
    console.log(`[quick-refresh] Updating ${latestMetricsByEntity.size} entities with latest metrics`);
    for (const [, { dbId, metrics, status, table }] of latestMetricsByEntity) {
      const updateData: any = { ...metrics };
      if (status) updateData.status = status.toUpperCase();
      await supabase.from(table).update(updateData).eq('id', dbId);
    }

    if (allMetricsRecords.length > 0) {
      const upsertBatchSize = 200;
      for (let i = 0; i < allMetricsRecords.length; i += upsertBatchSize) {
        const batch = allMetricsRecords.slice(i, i + upsertBatchSize);
        await supabase.from('ad_metrics').upsert(batch, { onConflict: 'entity_type,entity_id,date' });
      }
    }

    await supabase
      .from('ad_accounts')
      .update({
        last_synced_at: new Date().toISOString(),
        last_quick_refresh_at: new Date().toISOString()
      })
      .eq('id', dbAccountId);

    console.log('[quick-refresh] Completed successfully');

    return new Response(
      JSON.stringify({
        success: true,
        stats: {
          campaigns: campaignMetrics.length,
          adSets: adSetMetrics.length,
          ads: adMetrics.length,
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[quick-refresh] Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});