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

    const url = new URL(req.url);
    const accountId = url.searchParams.get('accountId');
    const startDate = url.searchParams.get('startDate') || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const endDate = url.searchParams.get('endDate') || new Date().toISOString().split('T')[0];

    console.log('[facebook-ads-sync] Starting full sync for account:', accountId);

    if (!accountId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing accountId parameter' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: account, error: accountError } = await supabase
      .from('ad_accounts')
      .select('*')
      .eq('platform_account_id', accountId)
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
      .eq('ad_account_id', accountId)
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
          console.error(`[sync] Failed records:`, JSON.stringify(batch.slice(0, 2))); // Log first 2 records
        } else {
          console.log(`[sync] Successfully upserted ${data?.length || 0} records to ${table} (batch ${i}-${i+batch.length})`);
          results.push(...(data || []));
        }
      }

      console.log(`[sync] Total ${table} records upserted: ${results.length} of ${records.length} attempted`);
      return results;
    };

    const fetchPage = async (url: string) => {
      try {
        const response = await fetch(url);
        const data = await response.json();
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
    const campaignsUrl = `https://graph.facebook.com/v21.0/${accountId}/campaigns?fields=id,name,status,objective&limit=500&access_token=${accessToken}`;
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
    const CAMPAIGN_BATCH_SIZE = 10;
    let campaignsWithAdSets = 0;
    let campaignsWithoutAdSets = 0;

    for (let i = 0; i < allCampaigns.length; i += CAMPAIGN_BATCH_SIZE) {
      const batch = allCampaigns.slice(i, i + CAMPAIGN_BATCH_SIZE);
      const adSetResults = await Promise.all(
        batch.map(async (campaign) => {
          const url = `https://graph.facebook.com/v21.0/${campaign.id}/adsets?fields=id,name,status,daily_budget,lifetime_budget&limit=500&access_token=${accessToken}`;
          const adSets = await fetchAllPagesForUrl(url);

          // Track campaign stats
          if (adSets.length > 0) {
            campaignsWithAdSets++;
          } else {
            campaignsWithoutAdSets++;
          }

          // DEBUG: Log if a campaign has no ad sets (first 5 batches only)
          if (adSets.length === 0 && i < 50) {
            console.log(`[sync] Campaign "${campaign.name}" (${campaign.status}) has 0 ad sets`);
          } else if (adSets.length > 0 && i < 50) {
            console.log(`[sync] Campaign "${campaign.name}" (${campaign.status}) has ${adSets.length} ad sets`);
          }

          return adSets.map((adSet: any) => ({
            ...adSet,
            campaign_id: campaign.id,
          }));
        })
      );
      adSetResults.forEach(adSets => allAdSets.push(...adSets));

      if ((i + CAMPAIGN_BATCH_SIZE) % 50 === 0 || i + CAMPAIGN_BATCH_SIZE >= allCampaigns.length) {
        console.log(`[sync] Progress: ${Math.min(i + CAMPAIGN_BATCH_SIZE, allCampaigns.length)}/${allCampaigns.length} campaigns | ${allAdSets.length} ad sets | ${campaignsWithAdSets} campaigns w/ ad sets, ${campaignsWithoutAdSets} empty`);
      }
    }

    console.log(`[sync] Found ${allAdSets.length} total ad sets`);

    // DEBUG: If we have 0 ad sets, check the first campaign manually
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

      // Also test with effective_status filter to see active ad sets
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
    const ADSET_BATCH_SIZE = 10;

    for (let i = 0; i < allAdSets.length; i += ADSET_BATCH_SIZE) {
      const batch = allAdSets.slice(i, i + ADSET_BATCH_SIZE);
      const adResults = await Promise.all(
        batch.map(async (adSet) => {
          const url = `https://graph.facebook.com/v21.0/${adSet.id}/ads?fields=id,name,status,creative{id,name,title,body,image_url,thumbnail_url,image_hash,video_id,call_to_action_type,object_story_spec,effective_object_story_id}&limit=500&access_token=${accessToken}`;
          const ads = await fetchAllPagesForUrl(url);

          return ads.map((ad: any) => ({
            ...ad,
            adset_id: adSet.id,
          }));
        })
      );
      adResults.forEach(ads => allAds.push(...ads));
      console.log(`[sync] Progress: ${Math.min(i + ADSET_BATCH_SIZE, allAdSets.length)}/${allAdSets.length} ad sets processed, ${allAds.length} ads found`);
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

    console.log('[sync] Fetching campaign metrics...');

    // DEBUG: Test a single insights call first
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

    for (let i = 0; i < allCampaigns.length; i += CAMPAIGN_BATCH_SIZE) {
      const batch = allCampaigns.slice(i, i + CAMPAIGN_BATCH_SIZE);
      const insightResults = await Promise.all(
        batch.map(async (campaign) => {
          const dbCampaign = campaignMap.get(campaign.id);
          if (!dbCampaign) return [];

          const url = `https://graph.facebook.com/v21.0/${campaign.id}/insights?fields=impressions,clicks,spend,reach,cpc,cpm,ctr,actions,date_start&time_range={"since":"${startDate}","until":"${endDate}"}&time_increment=1&access_token=${accessToken}`;
          const result = await fetchPage(url);

          if (result.data.length > 0) {
            successfulInsightCalls++;
          } else {
            failedInsightCalls++;
            // Log first few failures for debugging
            if (failedInsightCalls <= 3) {
              console.log(`[sync] Campaign ${campaign.name} (${campaign.id}) returned 0 insights`);
            }
          }

          return result.data.map((insight: any) => parseInsight(insight, dbCampaign.id, 'campaign'));
        })
      );
      insightResults.forEach(insights => allMetrics.push(...insights));
    }
    console.log(`[sync] Campaign metrics: ${allMetrics.length} (${successfulInsightCalls} successful API calls, ${failedInsightCalls} returned 0 data)`);

    console.log('[sync] Fetching ad set metrics...');
    const adSetMetricsStart = allMetrics.length;
    for (let i = 0; i < allAdSets.length; i += ADSET_BATCH_SIZE) {
      const batch = allAdSets.slice(i, i + ADSET_BATCH_SIZE);
      const insightResults = await Promise.all(
        batch.map(async (adSet) => {
          const dbAdSet = adSetMap.get(adSet.id);
          if (!dbAdSet) return [];

          const url = `https://graph.facebook.com/v21.0/${adSet.id}/insights?fields=impressions,clicks,spend,reach,cpc,cpm,ctr,actions,date_start&time_range={"since":"${startDate}","until":"${endDate}"}&time_increment=1&access_token=${accessToken}`;
          const result = await fetchPage(url);

          return result.data.map((insight: any) => parseInsight(insight, dbAdSet.id, 'adset'));
        })
      );
      insightResults.forEach(insights => allMetrics.push(...insights));

      if ((i + ADSET_BATCH_SIZE) % 50 === 0 || i + ADSET_BATCH_SIZE >= allAdSets.length) {
        console.log(`[sync] Ad set metrics progress: ${Math.min(i + ADSET_BATCH_SIZE, allAdSets.length)}/${allAdSets.length}`);
      }
    }
    console.log(`[sync] Ad set metrics: ${allMetrics.length - adSetMetricsStart}`);

    console.log('[sync] Fetching ad metrics...');
    const adMetricsStart = allMetrics.length;
    const adMap = new Map(dbAds.map(ad => [ad.platform_ad_id, ad]));

    for (let i = 0; i < allAds.length; i += ADSET_BATCH_SIZE) {
      const batch = allAds.slice(i, i + ADSET_BATCH_SIZE);
      const insightResults = await Promise.all(
        batch.map(async (ad) => {
          const dbAd = adMap.get(ad.id);
          if (!dbAd) return [];

          const url = `https://graph.facebook.com/v21.0/${ad.id}/insights?fields=impressions,clicks,spend,reach,cpc,cpm,ctr,actions,date_start&time_range={"since":"${startDate}","until":"${endDate}"}&time_increment=1&access_token=${accessToken}`;
          const result = await fetchPage(url);

          return result.data.map((insight: any) => parseInsight(insight, dbAd.id, 'ad'));
        })
      );
      insightResults.forEach(insights => allMetrics.push(...insights));

      if ((i + ADSET_BATCH_SIZE) % 100 === 0 || i + ADSET_BATCH_SIZE >= allAds.length) {
        console.log(`[sync] Ad metrics progress: ${Math.min(i + ADSET_BATCH_SIZE, allAds.length)}/${allAds.length}`);
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