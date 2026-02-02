import { createClient } from 'npm:@supabase/supabase-js@2';
import { checkSubscription, createSubscriptionRequiredResponse } from '../_shared/subscription-check.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface TikTokApiResponse {
  code: number;
  message: string;
  data?: any;
  request_id?: string;
}

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

    console.log('[tiktok-sync] Starting sync:', { adAccountId, startDate, endDate });

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
      .eq('platform', 'tiktok')
      .maybeSingle();

    if (accountError || !account) {
      return new Response(
        JSON.stringify({ success: false, error: 'Ad account not found or not accessible' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const accessToken = account.access_token;

    if (account.token_expires_at && new Date(account.token_expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ success: false, error: 'Access token expired. Please reconnect your TikTok account.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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
        console.log(`[tiktok-sync] Incremental sync from ${startDate} to ${endDate}`);
      } else {
        const thirtyDaysAgo = new Date(today);
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        startDate = thirtyDaysAgo.toISOString().split('T')[0];
        console.log(`[tiktok-sync] Initial sync - fetching last 30 days (${startDate} to ${endDate})`);
      }
    }

    const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
    const apiErrors: string[] = [];
    const advertiserId = adAccountId;

    const makeTikTokRequest = async (
      endpoint: string,
      params: Record<string, any>,
      context: string
    ): Promise<any> => {
      const url = new URL(`https://business-api.tiktok.com/open_api/v1.3/${endpoint}`);

      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (typeof value === 'object') {
            url.searchParams.set(key, JSON.stringify(value));
          } else {
            url.searchParams.set(key, String(value));
          }
        }
      });

      try {
        const response = await fetch(url.toString(), {
          method: 'GET',
          headers: {
            'Access-Token': accessToken,
          },
        });

        const data: TikTokApiResponse = await response.json();

        if (data.code !== 0) {
          const errorMsg = `[${context}] API error: ${data.message} (code: ${data.code})`;
          console.error('[tiktok-sync]', errorMsg);
          apiErrors.push(errorMsg);
          return { list: [] };
        }

        return data.data || { list: [] };
      } catch (error) {
        const errorMsg = `[${context}] Fetch error: ${error instanceof Error ? error.message : String(error)}`;
        console.error('[tiktok-sync]', errorMsg);
        apiErrors.push(errorMsg);
        return { list: [] };
      }
    };

    const fetchAllPages = async (
      endpoint: string,
      baseParams: Record<string, any>,
      context: string
    ): Promise<any[]> => {
      const allResults: any[] = [];
      let page = 1;
      const pageSize = 100;

      while (true) {
        const params = {
          ...baseParams,
          page,
          page_size: pageSize,
        };

        const data = await makeTikTokRequest(endpoint, params, context);
        const list = data.list || [];

        if (list.length === 0) break;

        allResults.push(...list);

        if (list.length < pageSize) break;

        page++;
        await sleep(100);
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
          console.error(`[tiktok-sync] Error upserting to ${table}:`, error.message);
        } else {
          results.push(...(data || []));
        }
      }
      return results;
    };

    console.log('[tiktok-sync] Step 1/4: Fetching campaigns...');
    const campaigns = await fetchAllPages(
      'campaign/get/',
      {
        advertiser_id: advertiserId,
        fields: ['campaign_id', 'campaign_name', 'operation_status', 'objective_type', 'budget', 'budget_mode'],
      },
      'campaigns'
    );
    console.log(`[tiktok-sync] Found ${campaigns.length} campaigns`);

    if (campaigns.length === 0) {
      await supabase.from('ad_accounts').update({ last_synced_at: new Date().toISOString() }).eq('id', account.id);
      return new Response(
        JSON.stringify({
          success: apiErrors.length === 0,
          message: apiErrors.length > 0 ? 'Sync completed with errors' : 'No campaigns found',
          data: { campaigns: 0, adSets: 0, ads: 0, metrics: 0 },
          errors: apiErrors.length > 0 ? apiErrors : undefined
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const mapTikTokStatus = (status: string): string => {
      const statusMap: Record<string, string> = {
        'ENABLE': 'ACTIVE',
        'DISABLE': 'PAUSED',
        'DELETE': 'REMOVED',
        'ADVERTISER_AUDIT_DENY': 'REJECTED',
        'ADVERTISER_AUDIT': 'PENDING_REVIEW',
      };
      return statusMap[status] || status;
    };

    const campaignRecords = campaigns.map(c => ({
      platform_campaign_id: c.campaign_id,
      name: c.campaign_name,
      status: mapTikTokStatus(c.operation_status),
      ad_account_id: account.id,
      platform: 'tiktok',
      objective: c.objective_type,
      daily_budget: c.budget_mode === 'BUDGET_MODE_DAY' ? parseFloat(c.budget || '0') : null,
      lifetime_budget: c.budget_mode === 'BUDGET_MODE_TOTAL' ? parseFloat(c.budget || '0') : null,
    }));

    const dbCampaigns = await batchUpsert('ad_campaigns', campaignRecords, 'ad_account_id,platform_campaign_id');
    console.log(`[tiktok-sync] Upserted ${dbCampaigns.length} campaigns`);
    const campaignMap = new Map(dbCampaigns.map(c => [c.platform_campaign_id, c]));

    await sleep(200);

    console.log('[tiktok-sync] Step 2/4: Fetching ad groups...');
    const adGroups = await fetchAllPages(
      'adgroup/get/',
      {
        advertiser_id: advertiserId,
        fields: ['adgroup_id', 'adgroup_name', 'operation_status', 'campaign_id', 'budget', 'budget_mode', 'bid_type', 'optimization_goal'],
      },
      'adgroups'
    );
    console.log(`[tiktok-sync] Found ${adGroups.length} ad groups`);

    const adGroupRecords = adGroups
      .map(ag => {
        const dbCampaign = campaignMap.get(ag.campaign_id);
        if (!dbCampaign) return null;

        return {
          platform_adset_id: ag.adgroup_id,
          name: ag.adgroup_name,
          status: mapTikTokStatus(ag.operation_status),
          ad_campaign_id: dbCampaign.id,
          campaign_id: dbCampaign.id,
          platform: 'tiktok',
          daily_budget: ag.budget_mode === 'BUDGET_MODE_DAY' ? parseFloat(ag.budget || '0') : null,
          lifetime_budget: ag.budget_mode === 'BUDGET_MODE_TOTAL' ? parseFloat(ag.budget || '0') : null,
          bid_strategy: ag.bid_type,
          optimization_goal: ag.optimization_goal,
        };
      })
      .filter(Boolean);

    const dbAdGroups = await batchUpsert('ad_sets', adGroupRecords, 'ad_campaign_id,platform_adset_id');
    console.log(`[tiktok-sync] Upserted ${dbAdGroups.length} ad groups`);
    const adGroupMap = new Map(dbAdGroups.map(ag => [ag.platform_adset_id, ag]));

    await sleep(200);

    console.log('[tiktok-sync] Step 3/4: Fetching ads...');
    const ads = await fetchAllPages(
      'ad/get/',
      {
        advertiser_id: advertiserId,
        fields: ['ad_id', 'ad_name', 'operation_status', 'adgroup_id', 'creative_type', 'image_ids', 'video_id'],
      },
      'ads'
    );
    console.log(`[tiktok-sync] Found ${ads.length} ads`);

    const adRecords = ads
      .map(ad => {
        const dbAdGroup = adGroupMap.get(ad.adgroup_id);
        if (!dbAdGroup) return null;

        return {
          platform_ad_id: ad.ad_id,
          name: ad.ad_name || `Ad ${ad.ad_id}`,
          status: mapTikTokStatus(ad.operation_status),
          ad_set_id: dbAdGroup.id,
          ad_account_id: account.id,
          platform: 'tiktok',
          creative_type: ad.creative_type,
        };
      })
      .filter(Boolean);

    const dbAds = await batchUpsert('ads', adRecords, 'ad_set_id,platform_ad_id');
    console.log(`[tiktok-sync] Upserted ${dbAds.length} ads`);
    const adMap = new Map(dbAds.map(a => [a.platform_ad_id, a]));

    await sleep(200);

    console.log('[tiktok-sync] Step 4/4: Fetching metrics...');

    const campaignIds = campaigns.map(c => c.campaign_id);

    const reportData = await makeTikTokRequest(
      'report/integrated/get/',
      {
        advertiser_id: advertiserId,
        report_type: 'BASIC',
        data_level: 'AUCTION_AD',
        dimensions: ['ad_id', 'stat_time_day'],
        metrics: [
          'spend', 'impressions', 'clicks', 'conversion', 'total_purchase_value',
          'cpc', 'cpm', 'ctr', 'reach'
        ],
        start_date: startDate,
        end_date: endDate,
        page_size: 1000,
        filters: [{
          field_name: 'campaign_id',
          filter_type: 'IN',
          filter_value: JSON.stringify(campaignIds),
        }],
      },
      'metrics'
    );

    const metricsResults = reportData.list || [];
    console.log(`[tiktok-sync] Found ${metricsResults.length} metric records`);

    const allMetrics: any[] = [];
    const campaignMetricsMap = new Map<string, Map<string, any>>();
    const adGroupMetricsMap = new Map<string, Map<string, any>>();

    for (const r of metricsResults) {
      const date = r.dimensions?.stat_time_day;
      const adId = r.dimensions?.ad_id;
      if (!date || !adId) continue;

      const dbAd = adMap.get(adId);
      if (!dbAd) continue;

      const spend = parseFloat(r.metrics?.spend || '0');
      const impressions = parseInt(r.metrics?.impressions || '0');
      const clicks = parseInt(r.metrics?.clicks || '0');
      const conversions = parseFloat(r.metrics?.conversion || '0');
      const conversionValue = parseFloat(r.metrics?.total_purchase_value || '0');
      const cpc = parseFloat(r.metrics?.cpc || '0');
      const cpm = parseFloat(r.metrics?.cpm || '0');
      const ctr = parseFloat(r.metrics?.ctr || '0') * 100;
      const reach = parseInt(r.metrics?.reach || '0');

      const baseMetric = {
        date,
        impressions,
        clicks,
        spend,
        conversions,
        conversion_value: conversionValue,
        cpc,
        cpm,
        ctr,
        roas: spend > 0 ? conversionValue / spend : 0,
        reach,
      };

      allMetrics.push({ ...baseMetric, entity_id: dbAd.id, entity_type: 'ad' });

      const adSetId = dbAd.ad_set_id;
      if (adSetId) {
        if (!adGroupMetricsMap.has(adSetId)) {
          adGroupMetricsMap.set(adSetId, new Map());
        }
        const dateMap = adGroupMetricsMap.get(adSetId)!;
        if (!dateMap.has(date)) {
          dateMap.set(date, { ...baseMetric, impressions: 0, clicks: 0, spend: 0, conversions: 0, conversion_value: 0, reach: 0 });
        }
        const existing = dateMap.get(date)!;
        existing.impressions += impressions;
        existing.clicks += clicks;
        existing.spend += spend;
        existing.conversions += conversions;
        existing.conversion_value += conversionValue;
        existing.reach += reach;
      }
    }

    for (const [adSetId, dateMap] of adGroupMetricsMap) {
      const dbAdGroup = [...adGroupMap.values()].find(ag => ag.id === adSetId);
      if (!dbAdGroup) continue;

      for (const [date, metrics] of dateMap) {
        const { impressions, clicks, spend, conversions, conversion_value, reach } = metrics;
        allMetrics.push({
          entity_id: adSetId,
          entity_type: 'adset',
          date,
          impressions,
          clicks,
          spend,
          conversions,
          conversion_value,
          cpc: clicks > 0 ? spend / clicks : 0,
          cpm: impressions > 0 ? (spend / impressions) * 1000 : 0,
          ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
          roas: spend > 0 ? conversion_value / spend : 0,
          reach,
        });

        const campaignId = dbAdGroup.ad_campaign_id;
        if (campaignId) {
          if (!campaignMetricsMap.has(campaignId)) {
            campaignMetricsMap.set(campaignId, new Map());
          }
          const campaignDateMap = campaignMetricsMap.get(campaignId)!;
          if (!campaignDateMap.has(date)) {
            campaignDateMap.set(date, { impressions: 0, clicks: 0, spend: 0, conversions: 0, conversion_value: 0, reach: 0 });
          }
          const existing = campaignDateMap.get(date)!;
          existing.impressions += impressions;
          existing.clicks += clicks;
          existing.spend += spend;
          existing.conversions += conversions;
          existing.conversion_value += conversion_value;
          existing.reach += reach;
        }
      }
    }

    for (const [campaignId, dateMap] of campaignMetricsMap) {
      for (const [date, metrics] of dateMap) {
        const { impressions, clicks, spend, conversions, conversion_value, reach } = metrics;
        allMetrics.push({
          entity_id: campaignId,
          entity_type: 'campaign',
          date,
          impressions,
          clicks,
          spend,
          conversions,
          conversion_value,
          cpc: clicks > 0 ? spend / clicks : 0,
          cpm: impressions > 0 ? (spend / impressions) * 1000 : 0,
          ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
          roas: spend > 0 ? conversion_value / spend : 0,
          reach,
        });
      }
    }

    console.log(`[tiktok-sync] Total metrics to save: ${allMetrics.length}`);
    await batchUpsert('ad_metrics', allMetrics, 'entity_type,entity_id,date');

    await supabase.from('ad_accounts').update({ last_synced_at: new Date().toISOString() }).eq('id', account.id);

    console.log('[tiktok-sync] Complete!', {
      campaigns: dbCampaigns.length,
      adSets: dbAdGroups.length,
      ads: dbAds.length,
      metrics: allMetrics.length,
    });

    return new Response(
      JSON.stringify({
        success: apiErrors.length === 0,
        message: apiErrors.length > 0
          ? `Sync completed with errors: ${dbCampaigns.length} campaigns, ${dbAdGroups.length} ad groups, ${dbAds.length} ads`
          : `Synced ${dbCampaigns.length} campaigns, ${dbAdGroups.length} ad groups, ${dbAds.length} ads, ${allMetrics.length} metrics`,
        data: {
          campaigns: dbCampaigns.length,
          adSets: dbAdGroups.length,
          ads: dbAds.length,
          metrics: allMetrics.length,
        },
        errors: apiErrors.length > 0 ? apiErrors : undefined,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[tiktok-sync] Unexpected error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'An unexpected error occurred',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
