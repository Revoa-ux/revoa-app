import { createClient } from 'npm:@supabase/supabase-js@2.39.7';
import { checkSubscription, createSubscriptionRequiredResponse } from '../_shared/subscription-check.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

const API_DELAY_MS = 100;
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

interface TikTokApiResponse {
  code: number;
  message: string;
  data?: any;
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
      throw new Error('Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { isActive, status, pricingUrl } = await checkSubscription(supabase, user.id);
    if (!isActive) {
      return createSubscriptionRequiredResponse(status, pricingUrl, corsHeaders);
    }

    const { adAccountId } = await req.json();

    console.log('[tiktok-quick-refresh] Starting quick refresh for account:', adAccountId);

    const { data: account } = await supabase
      .from('ad_accounts')
      .select('*')
      .eq('platform_account_id', adAccountId)
      .eq('user_id', user.id)
      .eq('platform', 'tiktok')
      .maybeSingle();

    if (!account) {
      throw new Error('Ad account not found');
    }

    const accessToken = account.access_token;

    if (account.token_expires_at && new Date(account.token_expires_at) < new Date()) {
      throw new Error('Access token expired. Please reconnect your TikTok account.');
    }

    const advertiserId = adAccountId;

    const makeTikTokRequest = async (
      endpoint: string,
      params: Record<string, any>
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

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: { 'Access-Token': accessToken },
      });

      const data: TikTokApiResponse = await response.json();

      if (data.code !== 0) {
        console.error('[tiktok-quick-refresh] API error:', data.message);
        return { list: [] };
      }

      return data.data || { list: [] };
    };

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

    const { data: existingCampaigns } = await supabase
      .from('ad_campaigns')
      .select('id, platform_campaign_id')
      .eq('ad_account_id', account.id);

    const { data: existingAdSets } = await supabase
      .from('ad_sets')
      .select('id, platform_adset_id, ad_campaign_id')
      .in('ad_campaign_id', existingCampaigns?.map(c => c.id) || []);

    const { data: existingAds } = await supabase
      .from('ads')
      .select('id, platform_ad_id, ad_set_id')
      .eq('ad_account_id', account.id);

    console.log(`[tiktok-quick-refresh] Existing: ${existingCampaigns?.length || 0} campaigns, ${existingAdSets?.length || 0} ad sets, ${existingAds?.length || 0} ads`);

    const campaignsData = await makeTikTokRequest('campaign/get/', {
      advertiser_id: advertiserId,
      fields: ['campaign_id', 'operation_status'],
      page_size: 1000,
    });

    const campaignStatusMap = new Map<string, string>();
    for (const c of campaignsData.list || []) {
      campaignStatusMap.set(c.campaign_id, mapTikTokStatus(c.operation_status));
    }

    await sleep(API_DELAY_MS);

    const adGroupsData = await makeTikTokRequest('adgroup/get/', {
      advertiser_id: advertiserId,
      fields: ['adgroup_id', 'operation_status'],
      page_size: 1000,
    });

    const adGroupStatusMap = new Map<string, string>();
    for (const ag of adGroupsData.list || []) {
      adGroupStatusMap.set(ag.adgroup_id, mapTikTokStatus(ag.operation_status));
    }

    await sleep(API_DELAY_MS);

    const adsData = await makeTikTokRequest('ad/get/', {
      advertiser_id: advertiserId,
      fields: ['ad_id', 'operation_status'],
      page_size: 1000,
    });

    const adStatusMap = new Map<string, string>();
    for (const ad of adsData.list || []) {
      adStatusMap.set(ad.ad_id, mapTikTokStatus(ad.operation_status));
    }

    await sleep(API_DELAY_MS);

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const startDate = sevenDaysAgo.toISOString().split('T')[0];

    const campaignIds = existingCampaigns?.map(c => c.platform_campaign_id) || [];

    const metricsData = await makeTikTokRequest('report/integrated/get/', {
      advertiser_id: advertiserId,
      report_type: 'BASIC',
      data_level: 'AUCTION_AD',
      dimensions: ['ad_id'],
      metrics: ['spend', 'impressions', 'clicks', 'conversion', 'total_purchase_value', 'cpc', 'cpm', 'ctr', 'reach'],
      start_date: startDate,
      end_date: todayStr,
      page_size: 1000,
      filters: campaignIds.length > 0 ? [{
        field_name: 'campaign_id',
        filter_type: 'IN',
        filter_value: JSON.stringify(campaignIds),
      }] : undefined,
    });

    const metricsResults = metricsData.list || [];
    console.log(`[tiktok-quick-refresh] Fetched ${metricsResults.length} metric records`);

    const campaignIdMap = new Map(existingCampaigns?.map(c => [c.platform_campaign_id, c.id]) || []);
    const adSetIdMap = new Map(existingAdSets?.map(as => [as.platform_adset_id, as.id]) || []);
    const adIdMap = new Map(existingAds?.map(a => [a.platform_ad_id, a.id]) || []);

    let campaignsUpdated = 0;
    let adSetsUpdated = 0;
    let adsUpdated = 0;

    for (const campaign of existingCampaigns || []) {
      const newStatus = campaignStatusMap.get(campaign.platform_campaign_id);
      if (newStatus) {
        await supabase.from('ad_campaigns').update({ status: newStatus }).eq('id', campaign.id);
        campaignsUpdated++;
      }
    }

    for (const adSet of existingAdSets || []) {
      const newStatus = adGroupStatusMap.get(adSet.platform_adset_id);
      if (newStatus) {
        await supabase.from('ad_sets').update({ status: newStatus }).eq('id', adSet.id);
        adSetsUpdated++;
      }
    }

    for (const ad of existingAds || []) {
      const newStatus = adStatusMap.get(ad.platform_ad_id);
      if (newStatus) {
        await supabase.from('ads').update({ status: newStatus }).eq('id', ad.id);
        adsUpdated++;
      }
    }

    const adAggregates = new Map<string, any>();

    for (const r of metricsResults) {
      const adId = r.dimensions?.ad_id;
      if (!adId) continue;

      const dbId = adIdMap.get(adId);
      if (!dbId) continue;

      const spend = parseFloat(r.metrics?.spend || '0');
      const impressions = parseInt(r.metrics?.impressions || '0');
      const clicks = parseInt(r.metrics?.clicks || '0');
      const conversions = parseFloat(r.metrics?.conversion || '0');
      const conversionValue = parseFloat(r.metrics?.total_purchase_value || '0');
      const reach = parseInt(r.metrics?.reach || '0');

      if (!adAggregates.has(dbId)) {
        adAggregates.set(dbId, { impressions: 0, clicks: 0, spend: 0, purchases: 0, revenue: 0, reach: 0 });
      }
      const agg = adAggregates.get(dbId);
      agg.impressions += impressions;
      agg.clicks += clicks;
      agg.spend += spend;
      agg.purchases += conversions;
      agg.revenue += conversionValue;
      agg.reach += reach;
    }

    const calculateDerivedMetrics = (agg: any) => ({
      ...agg,
      cpc: agg.clicks > 0 ? agg.spend / agg.clicks : 0,
      cpm: agg.impressions > 0 ? (agg.spend / agg.impressions) * 1000 : 0,
      ctr: agg.impressions > 0 ? (agg.clicks / agg.impressions) * 100 : 0,
      roas: agg.spend > 0 ? agg.revenue / agg.spend : 0,
    });

    for (const [dbId, agg] of adAggregates) {
      await supabase.from('ads').update(calculateDerivedMetrics(agg)).eq('id', dbId);
    }

    const adSetAggregates = new Map<string, any>();
    for (const ad of existingAds || []) {
      const adMetrics = adAggregates.get(ad.id);
      if (adMetrics && ad.ad_set_id) {
        if (!adSetAggregates.has(ad.ad_set_id)) {
          adSetAggregates.set(ad.ad_set_id, { impressions: 0, clicks: 0, spend: 0, purchases: 0, revenue: 0, reach: 0 });
        }
        const agg = adSetAggregates.get(ad.ad_set_id);
        agg.impressions += adMetrics.impressions;
        agg.clicks += adMetrics.clicks;
        agg.spend += adMetrics.spend;
        agg.purchases += adMetrics.purchases;
        agg.revenue += adMetrics.revenue;
        agg.reach += adMetrics.reach;
      }
    }

    for (const [dbId, agg] of adSetAggregates) {
      await supabase.from('ad_sets').update(calculateDerivedMetrics(agg)).eq('id', dbId);
    }

    const campaignAggregates = new Map<string, any>();
    for (const adSet of existingAdSets || []) {
      const adSetMetrics = adSetAggregates.get(adSet.id);
      if (adSetMetrics && adSet.ad_campaign_id) {
        if (!campaignAggregates.has(adSet.ad_campaign_id)) {
          campaignAggregates.set(adSet.ad_campaign_id, { impressions: 0, clicks: 0, spend: 0, purchases: 0, revenue: 0, reach: 0 });
        }
        const agg = campaignAggregates.get(adSet.ad_campaign_id);
        agg.impressions += adSetMetrics.impressions;
        agg.clicks += adSetMetrics.clicks;
        agg.spend += adSetMetrics.spend;
        agg.purchases += adSetMetrics.purchases;
        agg.revenue += adSetMetrics.revenue;
        agg.reach += adSetMetrics.reach;
      }
    }

    for (const [dbId, agg] of campaignAggregates) {
      await supabase.from('ad_campaigns').update(calculateDerivedMetrics(agg)).eq('id', dbId);
    }

    await supabase
      .from('ad_accounts')
      .update({
        last_synced_at: new Date().toISOString(),
        last_quick_refresh_at: new Date().toISOString()
      })
      .eq('id', account.id);

    console.log('[tiktok-quick-refresh] Completed successfully');

    return new Response(
      JSON.stringify({
        success: true,
        stats: {
          campaigns: campaignsUpdated,
          adSets: adSetsUpdated,
          ads: adsUpdated,
          metricsRecords: metricsResults.length
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[tiktok-quick-refresh] Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
