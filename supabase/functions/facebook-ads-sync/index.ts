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
      if (account.last_synced_at) {
        const lastSyncDate = new Date(account.last_synced_at);
        const lastSyncDateStr = lastSyncDate.toISOString().split('T')[0];
        startDate = lastSyncDateStr === todayStr ? todayStr : lastSyncDateStr;
        console.log(`[sync] Incremental sync from ${startDate} to ${endDate}`);
      } else {
        const ninetyDaysAgo = new Date(today);
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
        startDate = ninetyDaysAgo.toISOString().split('T')[0];
        console.log(`[sync] Initial sync - fetching last 90 days (${startDate} to ${endDate})`);
      }
    }

    const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    const fetchWithRetry = async (url: string, retryCount = 0): Promise<any> => {
      try {
        const response = await fetch(url);
        const data = await response.json();

        if (response.status === 400 && data.error?.message?.includes('limit reached')) {
          if (retryCount < 3) {
            const backoffTime = Math.pow(2, retryCount) * 1000;
            console.log(`[sync] Rate limited, waiting ${backoffTime}ms...`);
            await sleep(backoffTime);
            return fetchWithRetry(url, retryCount + 1);
          }
          console.error('[sync] Rate limit exceeded after retries');
          return { data: [], paging: null };
        }

        if (!response.ok || data.error) {
          console.error('[sync] API error:', data.error?.message || response.statusText);
          return { data: [], paging: null };
        }
        return data;
      } catch (error) {
        console.error('[sync] Fetch error:', error);
        return { data: [], paging: null };
      }
    };

    const fetchAllPages = async (initialUrl: string, maxPages = 100): Promise<any[]> => {
      const allResults: any[] = [];
      let nextUrl: string | null = initialUrl;
      let pageCount = 0;

      while (nextUrl && pageCount < maxPages) {
        const result = await fetchWithRetry(nextUrl);
        if (result.data) {
          allResults.push(...result.data);
        }
        nextUrl = result.paging?.next || null;
        pageCount++;
        if (nextUrl) await sleep(100);
      }

      return allResults;
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

    console.log('[sync] Step 1/4: Fetching campaigns...');
    const campaignsUrl = `https://graph.facebook.com/v21.0/${adAccountId}/campaigns?fields=id,name,status,objective&limit=500&access_token=${accessToken}`;
    const allCampaigns = await fetchAllPages(campaignsUrl);
    console.log(`[sync] Found ${allCampaigns.length} campaigns`);

    if (allCampaigns.length === 0) {
      await supabase.from('ad_accounts').update({ last_synced_at: new Date().toISOString() }).eq('id', account.id);
      return new Response(
        JSON.stringify({ success: true, message: 'No campaigns found', data: { campaigns: 0, adSets: 0, ads: 0, metrics: 0 } }),
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
    const allAdSets = await fetchAllPages(adSetsUrl);
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
    const adsUrl = `https://graph.facebook.com/v21.0/${adAccountId}/ads?fields=id,name,status,adset_id,creative{id,name,title,body,image_url,thumbnail_url,video_id,object_story_spec}&limit=500&access_token=${accessToken}`;
    const allAds = await fetchAllPages(adsUrl);
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

        const creativeData: any = {};
        if (ad.creative) {
          if (ad.creative.title) creativeData.title = ad.creative.title;
          if (ad.creative.body) creativeData.body = ad.creative.body;
          if (ad.creative.thumbnail_url) creativeData.thumbnail_url = ad.creative.thumbnail_url;
          if (ad.creative.image_url) creativeData.image_url = ad.creative.image_url;
          if (ad.creative.video_id) creativeData.video_id = ad.creative.video_id;
          if (ad.creative.object_story_spec) {
            const spec = ad.creative.object_story_spec;
            creativeData.image_url = creativeData.image_url || spec.link_data?.picture || spec.link_data?.image_url || spec.video_data?.image_url || spec.photo_data?.url;
            creativeData.video_id = creativeData.video_id || spec.video_data?.video_id;
          }
        }

        return {
          platform_ad_id: ad.id,
          name: ad.name,
          status: ad.status?.toUpperCase() || 'UNKNOWN',
          ad_set_id: dbAdSet.id,
          ad_account_id: account.id,
          platform: 'facebook',
          creative_id: ad.creative?.id || null,
          creative_name: ad.creative?.name || null,
          creative_thumbnail_url: creativeData.image_url || ad.creative?.image_url || ad.creative?.thumbnail_url || null,
          creative_type: ad.creative?.video_id || creativeData.video_id ? 'video' : 'image',
          creative_data: creativeData,
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
    const campaignInsights = await fetchAllPages(campaignInsightsUrl);
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
    const adSetInsights = await fetchAllPages(adSetInsightsUrl);
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
    const adInsights = await fetchAllPages(adInsightsUrl);
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
        success: true,
        message: `Synced ${dbCampaigns.length} campaigns, ${dbAdSets.length} ad sets, ${dbAds.length} ads, ${allMetrics.length} metrics`,
        data: {
          campaigns: dbCampaigns.length,
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
