import { createClient } from 'npm:@supabase/supabase-js@2';
import {
  processAllPendingFinalSyncs,
  MetricData,
} from '../_shared/atomic-status-handler.ts';
import { checkSubscription, createSubscriptionRequiredResponse } from '../_shared/subscription-check.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
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

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check subscription status
    const { isActive, status, pricingUrl } = await checkSubscription(supabase, user.id);
    if (!isActive) {
      return createSubscriptionRequiredResponse(status, pricingUrl, corsHeaders);
    }

    const body = await req.json();
    const { adAccountId } = body;
    let { startDate, endDate } = body;

    console.log('[sync] Starting optimized sync:', { adAccountId, startDate, endDate });

    if (!adAccountId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing adAccountId parameter' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: account, error: accountError } = await supabase
      .from('ad_accounts')
      .select('*')
      .eq('platform_account_id', adAccountId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (accountError || !account) {
      return new Response(
        JSON.stringify({ success: false, error: 'Ad account not found or not accessible' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: tokenData, error: tokenError } = await supabase
      .from('facebook_tokens')
      .select('*')
      .eq('ad_account_id', adAccountId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (tokenError || !tokenData) {
      return new Response(
        JSON.stringify({ success: false, error: 'Access token not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (new Date(tokenData.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ success: false, error: 'Access token expired. Please reconnect your Facebook account.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const accessToken = tokenData.access_token;

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    if (!endDate) {
      endDate = todayStr;
    }

    if (!startDate) {
      const { data: campaignIds } = await supabase
        .from('ad_campaigns')
        .select('id')
        .eq('ad_account_id', account.id);

      let hasEnoughHistoricalData = false;
      let earliestMetricDate: string | null = null;

      if (campaignIds && campaignIds.length > 0) {
        const ids = campaignIds.map(c => c.id);

        const { data: metricsInfo } = await supabase
          .from('ad_metrics')
          .select('date')
          .in('entity_id', ids)
          .order('date', { ascending: true })
          .limit(1);

        if (metricsInfo && metricsInfo.length > 0) {
          earliestMetricDate = metricsInfo[0].date;
          const earliestDate = new Date(earliestMetricDate);
          const daysSinceEarliest = Math.floor((today.getTime() - earliestDate.getTime()) / (1000 * 60 * 60 * 24));
          hasEnoughHistoricalData = daysSinceEarliest >= 7;
          console.log(`[sync] Earliest metric date: ${earliestMetricDate}, days since: ${daysSinceEarliest}, has enough data: ${hasEnoughHistoricalData}`);
        } else {
          console.log(`[sync] No existing metrics found for ${ids.length} campaigns`);
        }
      }

      if (account.last_synced_at && hasEnoughHistoricalData && earliestMetricDate) {
        const lastSyncDate = new Date(account.last_synced_at);
        const lastSyncDateStr = lastSyncDate.toISOString().split('T')[0];
        startDate = lastSyncDateStr === todayStr ? todayStr : lastSyncDateStr;
        console.log(`[sync] Incremental sync from ${startDate} to ${endDate}`);
      } else {
        const ninetyDaysAgo = new Date(today);
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
        startDate = ninetyDaysAgo.toISOString().split('T')[0];
        if (account.last_synced_at && !hasEnoughHistoricalData) {
          console.log(`[sync] Insufficient historical data (earliest: ${earliestMetricDate || 'none'}) - forcing full 90-day sync (${startDate} to ${endDate})`);
        } else {
          console.log(`[sync] Initial sync - fetching last 90 days (${startDate} to ${endDate})`);
        }
      }
    }

    const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
    const apiErrors: string[] = [];

    const parseInsightForMetrics = (insight: any, entityId: string, entityType: string): MetricData => {
      const purchaseAction = insight.actions?.find((a: any) => a.action_type === 'purchase');
      const conversions = parseInt(purchaseAction?.value || '0');
      const purchaseValue = insight.action_values?.find((a: any) => a.action_type === 'purchase');
      const conversionValue = parseFloat(purchaseValue?.value || '0');
      const spend = parseFloat(insight.spend || '0');

      return {
        entity_id: entityId,
        entity_type: entityType,
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
    };

    const fetchWithRetry = async (url: string, retryCount = 0, context = 'unknown'): Promise<any> => {
      try {
        const response = await fetch(url);
        const data = await response.json();

        if (data.error) {
          const errorMsg = data.error.message || JSON.stringify(data.error);
          if (errorMsg.includes('limit reached') || errorMsg.includes('reduce the amount')) {
            if (retryCount < 3) {
              const backoffTime = Math.pow(2, retryCount) * 2000;
              console.log(`[sync] Rate limited or data too large, waiting ${backoffTime}ms... (attempt ${retryCount + 1})`);
              await sleep(backoffTime);
              const reducedUrl = url.replace(/limit=\d+/, `limit=${Math.max(25, 100 - retryCount * 25)}`);
              return fetchWithRetry(reducedUrl, retryCount + 1, context);
            }
            const err = `[${context}] Rate limit exceeded after retries: ${errorMsg}`;
            console.error('[sync]', err);
            apiErrors.push(err);
            return { data: [], paging: null };
          }
          const err = `[${context}] API error: ${errorMsg}`;
          console.error('[sync]', err);
          apiErrors.push(err);
          return { data: [], paging: null };
        }

        if (!response.ok) {
          const err = `[${context}] HTTP error: ${response.status} ${response.statusText}`;
          console.error('[sync]', err);
          apiErrors.push(err);
          return { data: [], paging: null };
        }
        return data;
      } catch (error) {
        const err = `[${context}] Fetch error: ${error instanceof Error ? error.message : String(error)}`;
        console.error('[sync]', err);
        apiErrors.push(err);
        return { data: [], paging: null };
      }
    };

    const fetchAllPages = async (initialUrl: string, context: string, maxPages = 100): Promise<any[]> => {
      const allResults: any[] = [];
      let nextUrl: string | null = initialUrl;
      let pageCount = 0;

      while (nextUrl && pageCount < maxPages) {
        const result = await fetchWithRetry(nextUrl, 0, context);
        if (result.data) {
          allResults.push(...result.data);
        }
        nextUrl = result.paging?.next || null;
        pageCount++;
        if (nextUrl) await sleep(100);
      }

      return allResults;
    };

    const fetchMetricsForEntity = async (
      platformEntityId: string,
      startDate: string,
      endDate: string
    ): Promise<MetricData[]> => {
      const insightsFields = 'impressions,clicks,spend,reach,cpc,cpm,ctr,actions,action_values,date_start';
      const timeRange = `{"since":"${startDate}","until":"${endDate}"}`;
      const insightsUrl = `https://graph.facebook.com/v21.0/${platformEntityId}/insights?fields=${insightsFields}&time_range=${timeRange}&time_increment=1&limit=500&access_token=${accessToken}`;

      const insights = await fetchAllPages(insightsUrl, `final-sync-${platformEntityId}`);

      return insights.map(insight => parseInsightForMetrics(insight, platformEntityId, 'unknown'));
    };

    const batchUpsert = async (table: string, records: any[], conflictKeys: string) => {
      if (records.length === 0) return [];
      const batchSize = 500;
      const results: any[] = [];

      for (let i = 0; i < records.length; i += batchSize) {
        const batch = records.slice(i, i + batchSize);
        const { data, error } = await supabase.from(table).upsert(batch, { onConflict: conflictKeys }).select();
        if (error) {
          console.error(`[sync] Error upserting to ${table}:`, error.message);
        } else {
          results.push(...(data || []));
        }
      }
      return results;
    };

    console.log('[sync] Step 0/4: Checking for entities needing final sync...');
    try {
      const finalSyncResult = await processAllPendingFinalSyncs(
        supabase,
        account.id,
        fetchMetricsForEntity,
        { start: startDate, end: endDate }
      );

      if (finalSyncResult.entitiesProcessed > 0) {
        console.log(
          `[sync] Final sync complete: ${finalSyncResult.entitiesProcessed} entities, ` +
          `${finalSyncResult.metricsCollected} metrics collected`
        );

        if (finalSyncResult.errors.length > 0) {
          console.log('[sync] Final sync had errors:', finalSyncResult.errors);
          apiErrors.push(...finalSyncResult.errors.map(e => `Final sync error: ${e}`));
        }
      }
    } catch (error) {
      console.error('[sync] Error during final sync processing:', error);
      apiErrors.push(`Final sync failed: ${error instanceof Error ? error.message : String(error)}`);
    }

    console.log('[sync] Step 1/4: Fetching campaigns...');
    const campaignsUrl = `https://graph.facebook.com/v21.0/${adAccountId}/campaigns?fields=id,name,status,objective,daily_budget,lifetime_budget&limit=500&access_token=${accessToken}`;
    const allCampaigns = await fetchAllPages(campaignsUrl, 'campaigns');
    console.log(`[sync] Found ${allCampaigns.length} campaigns`);

    if (allCampaigns.length === 0) {
      await supabase.from('ad_accounts').update({ last_synced_at: new Date().toISOString() }).eq('id', account.id);
      return new Response(
        JSON.stringify({
          success: apiErrors.length === 0,
          message: apiErrors.length > 0 ? 'Sync failed with errors' : 'No campaigns found',
          data: { campaigns: 0, adSets: 0, ads: 0, metrics: 0 },
          errors: apiErrors.length > 0 ? apiErrors : undefined
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const campaignRecords = allCampaigns.map(c => ({
      platform_campaign_id: c.id,
      name: c.name,
      status: c.status?.toUpperCase() || 'UNKNOWN',
      ad_account_id: account.id,
      platform: 'facebook',
      objective: c.objective,
      daily_budget: c.daily_budget ? parseFloat(c.daily_budget) / 100 : null,
      lifetime_budget: c.lifetime_budget ? parseFloat(c.lifetime_budget) / 100 : null,
    }));
    const dbCampaigns = await batchUpsert('ad_campaigns', campaignRecords, 'ad_account_id,platform_campaign_id');
    console.log(`[sync] Upserted ${dbCampaigns.length} campaigns to DB`);
    if (dbCampaigns.length > 0) {
      console.log('[sync] Sample DB campaign:', JSON.stringify(dbCampaigns[0]));
    }
    const campaignMap = new Map(dbCampaigns.map(c => [c.platform_campaign_id, c]));
    console.log(`[sync] Campaign map has ${campaignMap.size} entries`);

    console.log('[sync] Step 2/4: Fetching ad sets...');
    const adSetsUrl = `https://graph.facebook.com/v21.0/${adAccountId}/adsets?fields=id,name,status,campaign_id,daily_budget,lifetime_budget&limit=500&access_token=${accessToken}`;
    const allAdSets = await fetchAllPages(adSetsUrl, 'adsets');
    console.log(`[sync] Found ${allAdSets.length} ad sets`);
    if (allAdSets.length > 0) {
      console.log('[sync] Sample ad set:', JSON.stringify(allAdSets[0]));
    }

    const getCampaignId = (as: any): string => {
      if (typeof as.campaign_id === 'string') return as.campaign_id;
      if (as.campaign_id?.id) return as.campaign_id.id;
      if (as.campaign?.id) return as.campaign.id;
      return '';
    };

    const adSetRecords = allAdSets
      .map(as => {
        const campaignId = getCampaignId(as);
        const dbCampaign = campaignMap.get(campaignId);
        if (!dbCampaign) {
          console.log(`[sync] No campaign found for ad set ${as.id}, campaign_id: ${campaignId}`);
          return null;
        }
        return {
          platform_adset_id: as.id,
          name: as.name,
          status: as.status?.toUpperCase() || 'UNKNOWN',
          ad_campaign_id: dbCampaign.id,
          campaign_id: dbCampaign.id,
          platform: 'facebook',
          daily_budget: as.daily_budget ? parseFloat(as.daily_budget) / 100 : null,
          lifetime_budget: as.lifetime_budget ? parseFloat(as.lifetime_budget) / 100 : null,
        };
      })
      .filter(Boolean);
    const dbAdSets = await batchUpsert('ad_sets', adSetRecords, 'ad_campaign_id,platform_adset_id');
    console.log(`[sync] Upserted ${dbAdSets.length} ad sets to DB`);
    if (dbAdSets.length > 0) {
      console.log('[sync] Sample DB ad set:', JSON.stringify(dbAdSets[0]));
    }
    const adSetMap = new Map(dbAdSets.map(as => [as.platform_adset_id, as]));
    console.log(`[sync] Ad set map has ${adSetMap.size} entries, sample keys: ${Array.from(adSetMap.keys()).slice(0, 3).join(', ')}`);

    console.log('[sync] Step 3/4: Fetching ads...');
    const adsUrl = `https://graph.facebook.com/v21.0/${adAccountId}/ads?fields=id,name,status,adset_id,creative.limit(1){id,thumbnail_url}&limit=100&access_token=${accessToken}`;
    const allAds = await fetchAllPages(adsUrl, 'ads');
    console.log(`[sync] Found ${allAds.length} ads from API`);
    if (allAds.length > 0) {
      console.log('[sync] Sample ad:', JSON.stringify(allAds[0]));
    }

    const getAdSetId = (ad: any): string => {
      if (typeof ad.adset_id === 'string') return ad.adset_id;
      if (ad.adset_id?.id) return ad.adset_id.id;
      if (ad.adset?.id) return ad.adset.id;
      return '';
    };

    let adsMatchedCount = 0;
    let adsUnmatchedCount = 0;
    const adRecords = allAds
      .map(ad => {
        const adSetId = getAdSetId(ad);
        const dbAdSet = adSetMap.get(adSetId);
        if (!dbAdSet) {
          adsUnmatchedCount++;
          if (adsUnmatchedCount <= 3) {
            console.log(`[sync] No ad set found for ad ${ad.id}, adset_id: ${adSetId}, available keys sample: ${Array.from(adSetMap.keys()).slice(0, 5).join(', ')}`);
          }
          return null;
        }
        adsMatchedCount++;

        return {
          platform_ad_id: ad.id,
          name: ad.name,
          status: ad.status?.toUpperCase() || 'UNKNOWN',
          ad_set_id: dbAdSet.id,
          ad_account_id: account.id,
          platform: 'facebook',
          creative_id: ad.creative?.id || null,
          creative_thumbnail_url: ad.creative?.thumbnail_url || null,
        };
      })
      .filter(Boolean);
    console.log(`[sync] Ads matched: ${adsMatchedCount}, unmatched: ${adsUnmatchedCount}`);
    const dbAds = await batchUpsert('ads', adRecords, 'ad_set_id,platform_ad_id');
    const adMap = new Map(dbAds.map(a => [a.platform_ad_id, a]));
    console.log(`[sync] Saved ${dbAds.length} ads, ad map has ${adMap.size} entries`);

    console.log('[sync] Step 4/4: Fetching metrics using account-level insights...');
    const allMetrics: any[] = [];

    const parseInsight = (insight: any, entityId: string, entityType: string) => {
      const purchaseAction = insight.actions?.find((a: any) => a.action_type === 'purchase');
      const conversions = parseInt(purchaseAction?.value || '0');
      const purchaseValue = insight.action_values?.find((a: any) => a.action_type === 'purchase');
      const conversionValue = parseFloat(purchaseValue?.value || '0');
      const spend = parseFloat(insight.spend || '0');

      return {
        entity_id: entityId,
        entity_type: entityType,
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
    };

    const insightsFields = 'campaign_id,adset_id,ad_id,impressions,clicks,spend,reach,cpc,cpm,ctr,actions,action_values,date_start';
    const timeRange = `{"since":"${startDate}","until":"${endDate}"}`;

    const campaignInsightsUrl = `https://graph.facebook.com/v21.0/${adAccountId}/insights?fields=${insightsFields}&level=campaign&time_range=${timeRange}&time_increment=1&limit=500&access_token=${accessToken}`;
    console.log('[sync] Fetching campaign-level insights...');
    const campaignInsights = await fetchAllPages(campaignInsightsUrl, 'campaign_insights');
    console.log(`[sync] Got ${campaignInsights.length} campaign insight records`);
    if (campaignInsights.length > 0) {
      console.log('[sync] Sample campaign insight:', JSON.stringify(campaignInsights[0]));
    }

    let campaignMetricsMatched = 0;
    for (const insight of campaignInsights) {
      const dbCampaign = campaignMap.get(insight.campaign_id);
      if (dbCampaign && insight.date_start) {
        allMetrics.push(parseInsight(insight, dbCampaign.id, 'campaign'));
        campaignMetricsMatched++;
      }
    }
    console.log(`[sync] Campaign metrics matched: ${campaignMetricsMatched}`);

    await sleep(200);

    const adSetInsightsUrl = `https://graph.facebook.com/v21.0/${adAccountId}/insights?fields=${insightsFields}&level=adset&time_range=${timeRange}&time_increment=1&limit=500&access_token=${accessToken}`;
    console.log('[sync] Fetching adset-level insights...');
    const adSetInsights = await fetchAllPages(adSetInsightsUrl, 'adset_insights');
    console.log(`[sync] Got ${adSetInsights.length} adset insight records`);

    let adSetMetricsMatched = 0;
    for (const insight of adSetInsights) {
      const dbAdSet = adSetMap.get(insight.adset_id);
      if (dbAdSet && insight.date_start) {
        allMetrics.push(parseInsight(insight, dbAdSet.id, 'adset'));
        adSetMetricsMatched++;
      }
    }
    console.log(`[sync] Ad set metrics matched: ${adSetMetricsMatched}`);

    await sleep(200);

    const adInsightsUrl = `https://graph.facebook.com/v21.0/${adAccountId}/insights?fields=${insightsFields}&level=ad&time_range=${timeRange}&time_increment=1&limit=500&access_token=${accessToken}`;
    console.log('[sync] Fetching ad-level insights...');
    const adInsights = await fetchAllPages(adInsightsUrl, 'ad_insights');
    console.log(`[sync] Got ${adInsights.length} ad insight records`);

    let adMetricsMatched = 0;
    for (const insight of adInsights) {
      const dbAd = adMap.get(insight.ad_id);
      if (dbAd && insight.date_start) {
        allMetrics.push(parseInsight(insight, dbAd.id, 'ad'));
        adMetricsMatched++;
      }
    }
    console.log(`[sync] Ad metrics matched: ${adMetricsMatched}`);

    console.log(`[sync] Total metrics to save: ${allMetrics.length}`);
    await batchUpsert('ad_metrics', allMetrics, 'entity_type,entity_id,date');

    await supabase.from('ad_accounts').update({ last_synced_at: new Date().toISOString() }).eq('id', account.id);

    console.log('[sync] Complete!', {
      campaigns: dbCampaigns.length,
      adSets: dbAdSets.length,
      ads: dbAds.length,
      metrics: allMetrics.length,
    });

    return new Response(
      JSON.stringify({
        success: apiErrors.length === 0,
        message: apiErrors.length > 0
          ? `Sync completed with errors: ${dbCampaigns.length} campaigns, ${dbAdSets.length} ad sets, ${dbAds.length} ads`
          : `Synced ${dbCampaigns.length} campaigns, ${dbAdSets.length} ad sets, ${dbAds.length} ads, ${allMetrics.length} metrics`,
        data: {
          campaigns: dbCampaigns.length,
          adSets: dbAdSets.length,
          ads: dbAds.length,
          metrics: allMetrics.length,
        },
        errors: apiErrors.length > 0 ? apiErrors : undefined,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[sync] Unexpected error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'An unexpected error occurred',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});