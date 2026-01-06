import { createClient } from 'npm:@supabase/supabase-js@2';

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

    const body = await req.json();
    const { adAccountId, chunkType, entityOffset, entityLimit, jobId, chunkId } = body;
    let { startDate, endDate } = body;

    console.log('[facebook-ads-sync] Starting sync:', {
      adAccountId,
      chunkType,
      entityOffset,
      entityLimit,
      startDate,
      endDate,
      jobId
    });

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

    // Smart date range selection based on sync history
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    let isInitialSync = false;

    if (!endDate) {
      endDate = yesterdayStr;
    }

    if (!startDate) {
      if (account.last_synced_at) {
        const lastSyncDate = new Date(account.last_synced_at);
        const lastSyncDateStr = lastSyncDate.toISOString().split('T')[0];

        // Check if we're already up to date (last sync was yesterday or today)
        if (lastSyncDateStr >= yesterdayStr) {
          console.log(`[sync] Already up to date - last synced: ${lastSyncDateStr}, yesterday: ${yesterdayStr}`);

          // Still update last_synced_at to show we checked
          await supabase
            .from('ad_accounts')
            .update({ last_synced_at: new Date().toISOString() })
            .eq('id', account.id);

          return new Response(
            JSON.stringify({
              success: true,
              message: 'Data already up to date',
              data: { campaigns: 0, adSets: 0, ads: 0, metrics: 0 }
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Incremental sync: Start from day after last sync
        const nextDay = new Date(lastSyncDate);
        nextDay.setDate(nextDay.getDate() + 1);
        startDate = nextDay.toISOString().split('T')[0];

        // Ensure startDate doesn't exceed endDate
        if (startDate > endDate) {
          startDate = endDate;
        }

        console.log(`[sync] Incremental sync from ${startDate} to ${endDate} (last synced: ${account.last_synced_at})`);
      } else {
        // Initial sync: Get last 90 days of data (reasonable window)
        const ninetyDaysAgo = new Date(today);
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
        startDate = ninetyDaysAgo.toISOString().split('T')[0];
        isInitialSync = true;
        console.log(`[sync] Initial sync - fetching last 90 days (${startDate} to ${endDate})`);
      }
    }

    const batchUpsert = async (table: string, records: any[], conflictKeys?: string) => {
      if (records.length === 0) return [];
      const batchSize = 200;
      const results = [];

      for (let i = 0; i < records.length; i += batchSize) {
        const batch = records.slice(i, i + batchSize);
        const opts = conflictKeys ? { onConflict: conflictKeys } : {};
        const { data, error } = await supabase.from(table).upsert(batch, opts).select();
        if (error) {
          console.error(`[sync] Error upserting batch ${i}-${i+batch.length} to ${table}:`, error);
          console.error(`[sync] Failed records:`, JSON.stringify(batch.slice(0, 2)));
        } else {
          console.log(`[sync] Successfully upserted ${data?.length || 0} records to ${table} (batch ${i}-${i+batch.length})`);
          results.push(...(data || []));
        }
      }

      console.log(`[sync] Total ${table} records upserted: ${results.length} of ${records.length} attempted`);
      return results;
    };

    const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
    const syncStartTime = Date.now();
    const MAX_SYNC_TIME = 240000;

    const fetchPage = async (url: string, retryCount = 0): Promise<any> => {

      try {
        const response = await fetch(url);
        const data = await response.json();

        if (response.status === 400 && data.error?.message?.includes('limit reached')) {
          if (retryCount < 2) {
            const backoffTime = (retryCount + 1) * 3000;
            console.log(`[sync] Rate limited, waiting ${Math.round(backoffTime/1000)}s before retry ${retryCount + 1}/2...`);
            await sleep(backoffTime);
            return fetchPage(url, retryCount + 1);
          } else {
            console.error('[sync] Rate limit exceeded after 2 retries, skipping this request...');
            return { data: [], paging: null };
          }
        }

        if (!response.ok || data.error) {
          console.error('[sync] API error:', {
            status: response.status,
            statusText: response.statusText,
            error: data.error,
            url: url.substring(0, 100) + '...'
          });
          return { data: [], paging: null };
        }
        return data;
      } catch (error) {
        console.error('[sync] Fetch error:', error);
        return { data: [], paging: null };
      }
    };

    const fetchAllPagesForUrl = async (initialUrl: string): Promise<any[]> => {
      const allResults = [];
      let nextUrl: string | null = initialUrl;
      let pageCount = 0;
      const maxPages = 1000;

      while (nextUrl && pageCount < maxPages) {
        const result = await fetchPage(nextUrl);
        allResults.push(...result.data);
        nextUrl = result.paging?.next || null;
        pageCount++;
      }

      return allResults;
    };

    console.log('[sync] 1/5 Fetching campaigns...');
    const campaignsUrl = `https://graph.facebook.com/v21.0/${adAccountId}/campaigns?fields=id,name,status,objective&limit=500&access_token=${accessToken}`;
    const allCampaigns = [];
    let campaignPages = [campaignsUrl];

    while (campaignPages.length > 0) {
      const results = await Promise.all(campaignPages.map(fetchPage));
      campaignPages = [];
      results.forEach(result => {
        allCampaigns.push(...result.data);
        if (result.paging?.next) campaignPages.push(result.paging.next);
      });
    }

    console.log(`[sync] Found ${allCampaigns.length} campaigns`);
    if (allCampaigns.length > 0) {
      console.log('[sync] Sample campaigns:', allCampaigns.slice(0, 3).map(c => ({ id: c.id, name: c.name, status: c.status })));
    }

    if (allCampaigns.length === 0) {
      console.log('[sync] No campaigns found');
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No campaigns to sync',
          data: { campaigns: 0, adSets: 0, ads: 0, metrics: 0 },
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[sync] 2/5 Saving campaigns...');
    const campaignRecords = allCampaigns.map(c => ({
      platform_campaign_id: c.id,
      name: c.name,
      status: c.status?.toUpperCase() || 'UNKNOWN',
      ad_account_id: account.id,
      platform: 'facebook',
      objective: c.objective,
      daily_budget: null,
      lifetime_budget: null,
    }));

    const dbCampaigns = await batchUpsert('ad_campaigns', campaignRecords, 'ad_account_id,platform_campaign_id');
    console.log(`[sync] Saved ${dbCampaigns.length} campaigns to DB`);
    const campaignMap = new Map(dbCampaigns.map(c => [c.platform_campaign_id, c]));
    console.log(`[sync] Campaign map has ${campaignMap.size} entries`);

    console.log('[sync] 3/5 Fetching ad sets...');
    const allAdSets = [];
    let campaignsWithAdSets = 0;
    let campaignsWithoutAdSets = 0;

    for (let i = 0; i < allCampaigns.length; i++) {
      const campaign = allCampaigns[i];
      const url = `https://graph.facebook.com/v21.0/${campaign.id}/adsets?fields=id,name,status,daily_budget,lifetime_budget&limit=500&access_token=${accessToken}`;
      const adSets = await fetchAllPagesForUrl(url);

      if (adSets.length > 0) {
        campaignsWithAdSets++;
      } else {
        campaignsWithoutAdSets++;
      }

      const mappedAdSets = adSets.map((adSet: any) => ({
        ...adSet,
        campaign_id: campaign.id,
      }));
      allAdSets.push(...mappedAdSets);

      if (i < allCampaigns.length - 1) {
        await sleep(600);
      }

      if ((i + 1) % 10 === 0 || i === allCampaigns.length - 1) {
        console.log(`[sync] Progress: ${i + 1}/${allCampaigns.length} campaigns | ${allAdSets.length} ad sets | ${campaignsWithAdSets} w/ ad sets, ${campaignsWithoutAdSets} empty`);
      }
    }

    console.log(`[sync] Found ${allAdSets.length} total ad sets`);

    if (allAdSets.length === 0 && allCampaigns.length > 0) {
      console.log('[sync] WARNING: 0 ad sets found! Checking first campaign manually...');
      const testCampaign = allCampaigns[0];
      const testUrl = `https://graph.facebook.com/v21.0/${testCampaign.id}/adsets?fields=id,name,status&limit=10&access_token=${accessToken}`;
      const testResult = await fetchPage(testUrl);
      console.log('[sync] Test campaign ad sets result:', {
        campaignId: testCampaign.id,
        campaignName: testCampaign.name,
        adSetsFound: testResult.data?.length || 0,
        hasError: !!testResult.error,
        error: testResult.error
      });

      const testUrl2 = `https://graph.facebook.com/v21.0/${testCampaign.id}/adsets?fields=id,name,status,effective_status&limit=10&access_token=${accessToken}`;
      const testResult2 = await fetchPage(testUrl2);
      console.log('[sync] Test with effective_status:', {
        adSetsFound: testResult2.data?.length || 0,
        sampleAdSet: testResult2.data?.[0]
      });
    }

    console.log('[sync] 4/5 Saving ad sets...');
    const adSetRecords = [];
    let filteredCount = 0;

    for (const as of allAdSets) {
      const dbCampaign = campaignMap.get(as.campaign_id);
      if (!dbCampaign) {
        filteredCount++;
        console.error(`[sync] No DB campaign found for platform campaign ID: ${as.campaign_id}, ad set: ${as.name}`);
        continue;
      }
      adSetRecords.push({
        platform_adset_id: as.id,
        name: as.name,
        status: as.status?.toUpperCase() || 'UNKNOWN',
        ad_campaign_id: dbCampaign.id,
        campaign_id: dbCampaign.id,
        platform: 'facebook',
        daily_budget: as.daily_budget ? parseFloat(as.daily_budget) / 100 : null,
        lifetime_budget: as.lifetime_budget ? parseFloat(as.lifetime_budget) / 100 : null,
      });
    }

    console.log(`[sync] Ad sets: ${adSetRecords.length} valid, ${filteredCount} filtered (no matching campaign)`);

    const dbAdSets = await batchUpsert('ad_sets', adSetRecords, 'ad_campaign_id,platform_adset_id');
    const adSetMap = new Map(dbAdSets.map(as => [as.platform_adset_id, as]));

    console.log('[sync] 5/5 Fetching and saving ads...');
    const allAds = [];

    for (let i = 0; i < allAdSets.length; i++) {
      const adSet = allAdSets[i];
      const url = `https://graph.facebook.com/v21.0/${adSet.id}/ads?fields=id,name,status,creative{id,name,title,body,image_url,thumbnail_url,image_hash,video_id,call_to_action_type,object_story_spec,effective_object_story_id}&limit=500&access_token=${accessToken}`;
      const ads = await fetchAllPagesForUrl(url);

      const mappedAds = ads.map((ad: any) => ({
        ...ad,
        adset_id: adSet.id,
      }));
      allAds.push(...mappedAds);

      if (i < allAdSets.length - 1) {
        await sleep(600);
      }

      if ((i + 1) % 20 === 0 || i === allAdSets.length - 1) {
        console.log(`[sync] Progress: ${i + 1}/${allAdSets.length} ad sets processed, ${allAds.length} ads found`);
      }
    }

    console.log(`[sync] Found ${allAds.length} total ads`);

    const adRecords = allAds
      .map(ad => {
        const dbAdSet = adSetMap.get(ad.adset_id);
        if (!dbAdSet) return null;

        const creativeData: any = {};
        if (ad.creative) {
          if (ad.creative.title) creativeData.title = ad.creative.title;
          if (ad.creative.body) creativeData.body = ad.creative.body;
          if (ad.creative.thumbnail_url) creativeData.thumbnail_url = ad.creative.thumbnail_url;
          if (ad.creative.image_url) creativeData.image_url = ad.creative.image_url;
          if (ad.creative.video_id) creativeData.video_id = ad.creative.video_id;
          if (ad.creative.call_to_action_type) creativeData.call_to_action = ad.creative.call_to_action_type;
          if (ad.creative.image_hash) creativeData.image_hash = ad.creative.image_hash;

          if (ad.creative.object_story_spec) {
            const spec = ad.creative.object_story_spec;
            if (spec.link_data?.picture) creativeData.image_url = creativeData.image_url || spec.link_data.picture;
            if (spec.link_data?.image_url) creativeData.image_url = creativeData.image_url || spec.link_data.image_url;
            if (spec.video_data?.image_url) creativeData.image_url = creativeData.image_url || spec.video_data.image_url;
            if (spec.video_data?.video_id) creativeData.video_id = creativeData.video_id || spec.video_data.video_id;
            if (spec.photo_data?.url) creativeData.image_url = creativeData.image_url || spec.photo_data.url;
            if (spec.photo_data?.image_url) creativeData.image_url = creativeData.image_url || spec.photo_data.image_url;
          }

          if (ad.creative.effective_object_story_id && !creativeData.image_url) {
            creativeData.effective_object_story_id = ad.creative.effective_object_story_id;
          }
        }

        const creativeType = ad.creative?.video_id || creativeData.video_id ? 'video' : 'image';

        const thumbnailUrl =
          creativeData.image_url ||
          ad.creative?.image_url ||
          ad.creative?.thumbnail_url ||
          creativeData.thumbnail_url ||
          null;

        return {
          platform_ad_id: ad.id,
          name: ad.name,
          status: ad.status?.toUpperCase() || 'UNKNOWN',
          ad_set_id: dbAdSet.id,
          ad_account_id: account.id,
          platform: 'facebook',
          creative_id: ad.creative?.id || null,
          creative_name: ad.creative?.name || null,
          creative_thumbnail_url: thumbnailUrl,
          creative_type: creativeType,
          creative_data: creativeData,
        };
      })
      .filter(Boolean);

    const dbAds = await batchUpsert('ads', adRecords, 'ad_set_id,platform_ad_id');

    console.log('[sync] Fetching metrics for all levels...');
    const allMetrics: any[] = [];

    const parseInsight = (insight: any, entityId: string, entityType: string) => {
      const conversions = insight.actions?.find((a: any) => a.action_type === 'purchase')?.value || 0;
      const conversionValue = insight.actions?.find((a: any) => a.action_type === 'purchase')?.value || 0;

      return {
        entity_id: entityId,
        entity_type: entityType,
        date: insight.date_start || endDate,
        impressions: parseInt(insight.impressions || '0'),
        clicks: parseInt(insight.clicks || '0'),
        spend: parseFloat(insight.spend || '0'),
        reach: parseInt(insight.reach || '0'),
        conversions: parseInt(conversions),
        conversion_value: parseFloat(conversionValue) * 10,
        cpc: parseFloat(insight.cpc || '0'),
        cpm: parseFloat(insight.cpm || '0'),
        ctr: parseFloat(insight.ctr || '0'),
        roas: parseFloat(insight.spend || '0') > 0 ? (parseFloat(conversionValue) * 10) / parseFloat(insight.spend || '1') : 0,
      };
    };

    const elapsedTime = Date.now() - syncStartTime;
    if (elapsedTime > MAX_SYNC_TIME) {
      console.log(`[sync] Approaching timeout (${Math.round(elapsedTime/1000)}s), skipping metrics fetch`);
      await supabase
        .from('ad_accounts')
        .update({ last_synced_at: new Date().toISOString() })
        .eq('id', account.id);

      return new Response(
        JSON.stringify({
          success: true,
          message: `Partial sync completed: ${dbCampaigns.length} campaigns, ${dbAdSets.length} ad sets, ${dbAds.length} ads. Metrics skipped due to time limit.`,
          data: {
            campaigns: dbCampaigns.length,
            campaignsWithAdSets,
            campaignsWithoutAdSets,
            adSets: dbAdSets.length,
            ads: dbAds.length,
            metrics: 0,
          },
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[sync] Fetching campaign metrics...');

    if (allCampaigns.length > 0) {
      const testCampaign = allCampaigns[0];
      const testUrl = `https://graph.facebook.com/v21.0/${testCampaign.id}/insights?fields=impressions,clicks,spend&time_range={"since":"${startDate}","until":"${endDate}"}&access_token=${accessToken}`;
      console.log(`[sync] Testing insights API with campaign: ${testCampaign.name}`);
      const testResponse = await fetch(testUrl);
      const testData = await testResponse.json();
      console.log(`[sync] Test insights response:`, {
        ok: testResponse.ok,
        status: testResponse.status,
        hasError: !!testData.error,
        error: testData.error,
        dataLength: testData.data?.length || 0,
        sampleData: testData.data?.[0]
      });
    }

    let successfulInsightCalls = 0;
    let failedInsightCalls = 0;
    let skippedInactiveCampaigns = 0;

    const campaignsToSync = isInitialSync
      ? allCampaigns.filter(c => c.status === 'ACTIVE' || c.status === 'PAUSED')
      : allCampaigns;

    if (isInitialSync && campaignsToSync.length < allCampaigns.length) {
      skippedInactiveCampaigns = allCampaigns.length - campaignsToSync.length;
      console.log(`[sync] Initial sync: Syncing metrics for ${campaignsToSync.length} active/paused campaigns, skipping ${skippedInactiveCampaigns} archived`);
    }

    for (let i = 0; i < campaignsToSync.length; i++) {
      const campaign = campaignsToSync[i];
      const dbCampaign = campaignMap.get(campaign.id);
      if (!dbCampaign) continue;

      const url = `https://graph.facebook.com/v21.0/${campaign.id}/insights?fields=impressions,clicks,spend,reach,cpc,cpm,ctr,actions,date_start&time_range={"since":"${startDate}","until":"${endDate}"}&time_increment=1&access_token=${accessToken}`;
      const result = await fetchPage(url);

      if (result.data.length > 0) {
        successfulInsightCalls++;
        const insights = result.data.map((insight: any) => parseInsight(insight, dbCampaign.id, 'campaign'));
        allMetrics.push(...insights);
      } else {
        failedInsightCalls++;
      }

      if (i < campaignsToSync.length - 1) {
        await sleep(600);
      }

      if ((i + 1) % 50 === 0 || i === campaignsToSync.length - 1) {
        console.log(`[sync] Campaign metrics progress: ${i + 1}/${campaignsToSync.length} (${allMetrics.length} metrics, ${failedInsightCalls} with no data)`);
      }
    }
    console.log(`[sync] Campaign metrics: ${allMetrics.length} (${successfulInsightCalls} successful API calls, ${failedInsightCalls} returned 0 data, ${skippedInactiveCampaigns} inactive skipped)`);

    console.log('[sync] Fetching ad set metrics...');
    const adSetMetricsStart = allMetrics.length;

    const adSetsToSync = isInitialSync
      ? allAdSets.filter(as => as.status === 'ACTIVE' || as.status === 'PAUSED')
      : allAdSets;

    if (isInitialSync && adSetsToSync.length < allAdSets.length) {
      console.log(`[sync] Initial sync: Syncing metrics for ${adSetsToSync.length} active/paused ad sets, skipping ${allAdSets.length - adSetsToSync.length} inactive`);
    }

    for (let i = 0; i < adSetsToSync.length; i++) {
      const adSet = adSetsToSync[i];
      const dbAdSet = adSetMap.get(adSet.id);
      if (!dbAdSet) continue;

      const url = `https://graph.facebook.com/v21.0/${adSet.id}/insights?fields=impressions,clicks,spend,reach,cpc,cpm,ctr,actions,date_start&time_range={"since":"${startDate}","until":"${endDate}"}&time_increment=1&access_token=${accessToken}`;
      const result = await fetchPage(url);

      if (result.data.length > 0) {
        const insights = result.data.map((insight: any) => parseInsight(insight, dbAdSet.id, 'adset'));
        allMetrics.push(...insights);
      }

      if (i < adSetsToSync.length - 1) {
        await sleep(600);
      }

      if ((i + 1) % 50 === 0 || i === adSetsToSync.length - 1) {
        console.log(`[sync] Ad set metrics progress: ${i + 1}/${adSetsToSync.length} (${allMetrics.length - adSetMetricsStart} new metrics)`);
      }
    }
    console.log(`[sync] Ad set metrics: ${allMetrics.length - adSetMetricsStart}`);

    console.log('[sync] Fetching ad metrics...');
    const adMetricsStart = allMetrics.length;
    const adMap = new Map(dbAds.map(ad => [ad.platform_ad_id, ad]));

    const adsToSync = isInitialSync
      ? allAds.filter(a => a.status === 'ACTIVE' || a.status === 'PAUSED')
      : allAds;

    if (isInitialSync && adsToSync.length < allAds.length) {
      console.log(`[sync] Initial sync: Syncing metrics for ${adsToSync.length} active/paused ads, skipping ${allAds.length - adsToSync.length} inactive`);
    }

    for (let i = 0; i < adsToSync.length; i++) {
      const ad = adsToSync[i];
      const dbAd = adMap.get(ad.id);
      if (!dbAd) continue;

      const url = `https://graph.facebook.com/v21.0/${ad.id}/insights?fields=impressions,clicks,spend,reach,cpc,cpm,ctr,actions,date_start&time_range={"since":"${startDate}","until":"${endDate}"}&time_increment=1&access_token=${accessToken}`;
      const result = await fetchPage(url);

      if (result.data.length > 0) {
        const insights = result.data.map((insight: any) => parseInsight(insight, dbAd.id, 'ad'));
        allMetrics.push(...insights);
      }

      if (i < adsToSync.length - 1) {
        await sleep(600);
      }

      if ((i + 1) % 100 === 0 || i === adsToSync.length - 1) {
        console.log(`[sync] Ad metrics progress: ${i + 1}/${adsToSync.length} (${allMetrics.length - adMetricsStart} new metrics)`);
      }
    }
    console.log(`[sync] Ad metrics: ${allMetrics.length - adMetricsStart}`);
    console.log(`[sync] Total metrics to save: ${allMetrics.length}`);

    await batchUpsert('ad_metrics', allMetrics, 'entity_type,entity_id,date');

    await supabase
      .from('ad_accounts')
      .update({ last_synced_at: new Date().toISOString() })
      .eq('id', account.id);

    console.log('[sync] Complete!', {
      campaigns: dbCampaigns.length,
      campaignsWithAdSets,
      campaignsWithoutAdSets,
      adSets: dbAdSets.length,
      ads: dbAds.length,
      metrics: allMetrics.length,
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: `Synced ${dbCampaigns.length} campaigns (${campaignsWithAdSets} with ad sets, ${campaignsWithoutAdSets} empty), ${dbAdSets.length} ad sets, ${dbAds.length} ads, ${allMetrics.length} metrics`,
        data: {
          campaigns: dbCampaigns.length,
          campaignsWithAdSets,
          campaignsWithoutAdSets,
          adSets: dbAdSets.length,
          ads: dbAds.length,
          metrics: allMetrics.length,
        },
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