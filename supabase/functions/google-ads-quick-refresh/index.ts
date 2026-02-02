import { createClient } from 'npm:@supabase/supabase-js@2.39.7';
import { checkSubscription, createSubscriptionRequiredResponse } from '../_shared/subscription-check.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

const API_DELAY_MS = 100;
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const googleClientId = Deno.env.get('GOOGLE_ADS_CLIENT_ID');
    const googleClientSecret = Deno.env.get('GOOGLE_ADS_CLIENT_SECRET');
    const googleDeveloperToken = Deno.env.get('GOOGLE_ADS_DEVELOPER_TOKEN');
    const supabase = createClient(supabaseUrl, supabaseKey);

    if (!googleClientId || !googleClientSecret || !googleDeveloperToken) {
      return new Response(
        JSON.stringify({ success: false, error: 'Google Ads is not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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

    console.log('[google-quick-refresh] Starting quick refresh for account:', adAccountId);

    const { data: account } = await supabase
      .from('ad_accounts')
      .select('*')
      .eq('platform_account_id', adAccountId)
      .eq('user_id', user.id)
      .eq('platform', 'google')
      .maybeSingle();

    if (!account) {
      throw new Error('Ad account not found');
    }

    let accessToken = account.access_token;
    const refreshToken = account.refresh_token;

    if (account.token_expires_at && new Date(account.token_expires_at) < new Date()) {
      if (!refreshToken) {
        throw new Error('Access token expired and no refresh token available');
      }

      console.log('[google-quick-refresh] Token expired, refreshing...');
      const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: googleClientId,
          client_secret: googleClientSecret,
          refresh_token: refreshToken,
          grant_type: 'refresh_token',
        }),
      });

      const refreshData = await refreshResponse.json();
      if (!refreshResponse.ok || !refreshData.access_token) {
        throw new Error('Failed to refresh access token');
      }

      accessToken = refreshData.access_token;
      const newExpiresAt = new Date(Date.now() + (refreshData.expires_in * 1000)).toISOString();

      await supabase.from('ad_accounts')
        .update({ access_token: accessToken, token_expires_at: newExpiresAt })
        .eq('id', account.id);
    }

    const customerId = adAccountId.replace(/-/g, '');

    const makeGoogleAdsRequest = async (query: string) => {
      const url = `https://googleads.googleapis.com/v18/customers/${customerId}/googleAds:searchStream`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'developer-token': googleDeveloperToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
      });

      const data = await response.json();
      if (!response.ok) {
        console.error('[google-quick-refresh] API error:', data);
        return [];
      }

      const results: any[] = [];
      if (Array.isArray(data)) {
        for (const batch of data) {
          if (batch.results) {
            results.push(...batch.results);
          }
        }
      }
      return results;
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

    console.log(`[google-quick-refresh] Existing: ${existingCampaigns?.length || 0} campaigns, ${existingAdSets?.length || 0} ad sets, ${existingAds?.length || 0} ads`);

    const campaignStatusQuery = `
      SELECT campaign.id, campaign.status
      FROM campaign
      WHERE campaign.status != 'REMOVED'
    `;
    const campaignResults = await makeGoogleAdsRequest(campaignStatusQuery);

    const campaignStatusMap = new Map<string, string>();
    for (const r of campaignResults) {
      campaignStatusMap.set(r.campaign.id, r.campaign.status);
    }

    await sleep(API_DELAY_MS);

    const adGroupStatusQuery = `
      SELECT ad_group.id, ad_group.status
      FROM ad_group
      WHERE ad_group.status != 'REMOVED'
    `;
    const adGroupResults = await makeGoogleAdsRequest(adGroupStatusQuery);

    const adGroupStatusMap = new Map<string, string>();
    for (const r of adGroupResults) {
      adGroupStatusMap.set(r.adGroup.id, r.adGroup.status);
    }

    await sleep(API_DELAY_MS);

    const adStatusQuery = `
      SELECT ad_group_ad.ad.id, ad_group_ad.status
      FROM ad_group_ad
      WHERE ad_group_ad.status != 'REMOVED'
    `;
    const adResults = await makeGoogleAdsRequest(adStatusQuery);

    const adStatusMap = new Map<string, string>();
    for (const r of adResults) {
      adStatusMap.set(r.adGroupAd.ad.id, r.adGroupAd.status);
    }

    await sleep(API_DELAY_MS);

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const startDate = sevenDaysAgo.toISOString().split('T')[0];

    const metricsQuery = `
      SELECT
        segments.date,
        campaign.id,
        ad_group.id,
        ad_group_ad.ad.id,
        metrics.impressions,
        metrics.clicks,
        metrics.cost_micros,
        metrics.conversions,
        metrics.conversions_value
      FROM ad_group_ad
      WHERE segments.date BETWEEN '${startDate}' AND '${todayStr}'
      AND ad_group_ad.status != 'REMOVED'
    `;
    const metricsResults = await makeGoogleAdsRequest(metricsQuery);

    console.log(`[google-quick-refresh] Fetched ${metricsResults.length} metric records`);

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

    const campaignAggregates = new Map<string, any>();
    const adSetAggregates = new Map<string, any>();
    const adAggregates = new Map<string, any>();

    for (const r of metricsResults) {
      const spend = r.metrics?.costMicros ? parseInt(r.metrics.costMicros) / 1000000 : 0;
      const impressions = parseInt(r.metrics?.impressions || '0');
      const clicks = parseInt(r.metrics?.clicks || '0');
      const conversions = parseFloat(r.metrics?.conversions || '0');
      const conversionValue = parseFloat(r.metrics?.conversionsValue || '0');

      const campaignId = r.campaign?.id;
      const adGroupId = r.adGroup?.id;
      const adId = r.adGroupAd?.ad?.id;

      if (campaignId) {
        const dbId = campaignIdMap.get(campaignId);
        if (dbId) {
          if (!campaignAggregates.has(dbId)) {
            campaignAggregates.set(dbId, { impressions: 0, clicks: 0, spend: 0, purchases: 0, revenue: 0 });
          }
          const agg = campaignAggregates.get(dbId);
          agg.impressions += impressions;
          agg.clicks += clicks;
          agg.spend += spend;
          agg.purchases += conversions;
          agg.revenue += conversionValue;
        }
      }

      if (adGroupId) {
        const dbId = adSetIdMap.get(adGroupId);
        if (dbId) {
          if (!adSetAggregates.has(dbId)) {
            adSetAggregates.set(dbId, { impressions: 0, clicks: 0, spend: 0, purchases: 0, revenue: 0 });
          }
          const agg = adSetAggregates.get(dbId);
          agg.impressions += impressions;
          agg.clicks += clicks;
          agg.spend += spend;
          agg.purchases += conversions;
          agg.revenue += conversionValue;
        }
      }

      if (adId) {
        const dbId = adIdMap.get(adId);
        if (dbId) {
          if (!adAggregates.has(dbId)) {
            adAggregates.set(dbId, { impressions: 0, clicks: 0, spend: 0, purchases: 0, revenue: 0 });
          }
          const agg = adAggregates.get(dbId);
          agg.impressions += impressions;
          agg.clicks += clicks;
          agg.spend += spend;
          agg.purchases += conversions;
          agg.revenue += conversionValue;
        }
      }
    }

    const calculateDerivedMetrics = (agg: any) => ({
      ...agg,
      cpc: agg.clicks > 0 ? agg.spend / agg.clicks : 0,
      cpm: agg.impressions > 0 ? (agg.spend / agg.impressions) * 1000 : 0,
      ctr: agg.impressions > 0 ? (agg.clicks / agg.impressions) * 100 : 0,
      roas: agg.spend > 0 ? agg.revenue / agg.spend : 0,
    });

    for (const [dbId, agg] of campaignAggregates) {
      await supabase.from('ad_campaigns').update(calculateDerivedMetrics(agg)).eq('id', dbId);
    }

    for (const [dbId, agg] of adSetAggregates) {
      await supabase.from('ad_sets').update(calculateDerivedMetrics(agg)).eq('id', dbId);
    }

    for (const [dbId, agg] of adAggregates) {
      await supabase.from('ads').update(calculateDerivedMetrics(agg)).eq('id', dbId);
    }

    await supabase
      .from('ad_accounts')
      .update({
        last_synced_at: new Date().toISOString(),
        last_quick_refresh_at: new Date().toISOString()
      })
      .eq('id', account.id);

    console.log('[google-quick-refresh] Completed successfully');

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
    console.error('[google-quick-refresh] Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
