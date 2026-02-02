import { createClient } from 'npm:@supabase/supabase-js@2';
import { checkSubscription, createSubscriptionRequiredResponse } from '../_shared/subscription-check.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface GoogleAdsApiError {
  error?: {
    code: number;
    message: string;
    status: string;
  };
}

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

    console.log('[google-sync] Starting sync:', { adAccountId, startDate, endDate });

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
      .eq('platform', 'google')
      .maybeSingle();

    if (accountError || !account) {
      return new Response(
        JSON.stringify({ success: false, error: 'Ad account not found or not accessible' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let accessToken = account.access_token;
    const refreshToken = account.refresh_token;

    if (account.token_expires_at && new Date(account.token_expires_at) < new Date()) {
      if (!refreshToken) {
        return new Response(
          JSON.stringify({ success: false, error: 'Access token expired and no refresh token available. Please reconnect.' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('[google-sync] Token expired, refreshing...');
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
        console.error('[google-sync] Token refresh failed:', refreshData);
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to refresh access token. Please reconnect your Google Ads account.' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      accessToken = refreshData.access_token;
      const newExpiresAt = new Date(Date.now() + (refreshData.expires_in * 1000)).toISOString();

      await supabase.from('ad_accounts')
        .update({ access_token: accessToken, token_expires_at: newExpiresAt })
        .eq('id', account.id);

      console.log('[google-sync] Token refreshed successfully');
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
        console.log(`[google-sync] Incremental sync from ${startDate} to ${endDate}`);
      } else {
        const ninetyDaysAgo = new Date(today);
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
        startDate = ninetyDaysAgo.toISOString().split('T')[0];
        console.log(`[google-sync] Initial sync - fetching last 90 days (${startDate} to ${endDate})`);
      }
    }

    const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
    const apiErrors: string[] = [];

    const customerId = adAccountId.replace(/-/g, '');

    const makeGoogleAdsRequest = async (query: string, context: string) => {
      const url = `https://googleads.googleapis.com/v19/customers/${customerId}/googleAds:searchStream`;
      console.log(`[google-sync] Making API request for ${context} to customer ${customerId}`);

      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'developer-token': googleDeveloperToken,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ query }),
        });

        console.log(`[google-sync] ${context} API response status: ${response.status}`);
        console.log(`[google-sync] ${context} Content-Type: ${response.headers.get('content-type')}`);

        const contentType = response.headers.get('content-type') || '';
        if (!contentType.includes('application/json')) {
          const textResponse = await response.text();
          console.error(`[google-sync] ${context} Non-JSON response (HTML)`);
          console.error(`[google-sync] Response preview: ${textResponse.substring(0, 500)}`);
          const errorMsg = `[${context}] Invalid token - please reconnect your Google Ads account`;
          apiErrors.push(errorMsg);
          return [];
        }

        const data = await response.json();

        if (!response.ok) {
          const errorData = data as GoogleAdsApiError;
          const errorMsg = `[${context}] API error (${response.status}): ${errorData.error?.message || response.statusText}`;
          console.error('[google-sync]', errorMsg);
          console.error('[google-sync] Full error response:', JSON.stringify(data, null, 2));
          apiErrors.push(errorMsg);
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

        console.log(`[google-sync] ${context} returned ${results.length} results`);

        return results;
      } catch (error) {
        const errorMsg = `[${context}] Fetch error: ${error instanceof Error ? error.message : String(error)}`;
        console.error('[google-sync]', errorMsg);
        apiErrors.push(errorMsg);
        return [];
      }
    };

    const batchUpsert = async (table: string, records: any[], conflictKeys: string) => {
      if (records.length === 0) return [];
      const batchSize = 500;
      const results: any[] = [];

      for (let i = 0; i < records.length; i += batchSize) {
        const batch = records.slice(i, i + batchSize);
        const { data, error } = await supabase.from(table).upsert(batch, { onConflict: conflictKeys }).select();
        if (error) {
          console.error(`[google-sync] Error upserting to ${table}:`, error.message);
        } else {
          results.push(...(data || []));
        }
      }
      return results;
    };

    console.log('[google-sync] Step 1/4: Fetching campaigns...');
    const campaignsQuery = `
      SELECT
        campaign.id,
        campaign.name,
        campaign.status,
        campaign.advertising_channel_type,
        campaign_budget.amount_micros
      FROM campaign
      WHERE campaign.status != 'REMOVED'
    `;

    const campaignResults = await makeGoogleAdsRequest(campaignsQuery, 'campaigns');
    console.log(`[google-sync] Found ${campaignResults.length} campaigns`);

    if (campaignResults.length === 0) {
      console.log(`[google-sync] No campaigns found for account ${adAccountId}. This account may be a Manager account (MCC) without direct campaigns.`);
      if (apiErrors.length > 0) {
        console.error(`[google-sync] API errors encountered:`, apiErrors);
      }
      await supabase.from('ad_accounts').update({ last_synced_at: new Date().toISOString() }).eq('id', account.id);

      let message = `No campaigns found in account ${adAccountId}.`;
      if (apiErrors.length > 0) {
        message = `API Error: ${apiErrors[0]}`;
      } else {
        message += ' This may be a Manager account (MCC) - campaigns are in linked client accounts.';
      }

      return new Response(
        JSON.stringify({
          success: apiErrors.length === 0,
          message,
          data: { campaigns: 0, adSets: 0, ads: 0, metrics: 0 },
          accountId: adAccountId,
          errors: apiErrors.length > 0 ? apiErrors : undefined
        }),
        { status: apiErrors.length > 0 ? 400 : 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const campaignRecords = campaignResults.map(r => ({
      platform_campaign_id: r.campaign.id,
      name: r.campaign.name,
      status: r.campaign.status,
      ad_account_id: account.id,
      platform: 'google',
      objective: r.campaign.advertisingChannelType || null,
      daily_budget: r.campaignBudget?.amountMicros ? parseInt(r.campaignBudget.amountMicros) / 1000000 : null,
    }));

    const dbCampaigns = await batchUpsert('ad_campaigns', campaignRecords, 'ad_account_id,platform_campaign_id');
    console.log(`[google-sync] Upserted ${dbCampaigns.length} campaigns`);
    const campaignMap = new Map(dbCampaigns.map(c => [c.platform_campaign_id, c]));

    await sleep(200);

    console.log('[google-sync] Step 2/4: Fetching ad groups...');
    const adGroupsQuery = `
      SELECT
        ad_group.id,
        ad_group.name,
        ad_group.status,
        ad_group.campaign
      FROM ad_group
      WHERE ad_group.status != 'REMOVED'
    `;

    const adGroupResults = await makeGoogleAdsRequest(adGroupsQuery, 'ad_groups');
    console.log(`[google-sync] Found ${adGroupResults.length} ad groups`);

    const adGroupRecords = adGroupResults
      .map(r => {
        const campaignId = r.adGroup.campaign.replace('customers/' + customerId + '/campaigns/', '');
        const dbCampaign = campaignMap.get(campaignId);
        if (!dbCampaign) return null;

        return {
          platform_adset_id: r.adGroup.id,
          name: r.adGroup.name,
          status: r.adGroup.status,
          ad_campaign_id: dbCampaign.id,
          campaign_id: dbCampaign.id,
          platform: 'google',
        };
      })
      .filter(Boolean);

    const dbAdGroups = await batchUpsert('ad_sets', adGroupRecords, 'ad_campaign_id,platform_adset_id');
    console.log(`[google-sync] Upserted ${dbAdGroups.length} ad groups`);
    const adGroupMap = new Map(dbAdGroups.map(ag => [ag.platform_adset_id, ag]));

    await sleep(200);

    console.log('[google-sync] Step 3/4: Fetching ads...');
    const adsQuery = `
      SELECT
        ad_group_ad.ad.id,
        ad_group_ad.ad.name,
        ad_group_ad.status,
        ad_group_ad.ad_group,
        ad_group_ad.ad.type
      FROM ad_group_ad
      WHERE ad_group_ad.status != 'REMOVED'
    `;

    const adResults = await makeGoogleAdsRequest(adsQuery, 'ads');
    console.log(`[google-sync] Found ${adResults.length} ads`);

    const adRecords = adResults
      .map(r => {
        const adGroupId = r.adGroupAd.adGroup.replace('customers/' + customerId + '/adGroups/', '');
        const dbAdGroup = adGroupMap.get(adGroupId);
        if (!dbAdGroup) return null;

        return {
          platform_ad_id: r.adGroupAd.ad.id,
          name: r.adGroupAd.ad.name || `Ad ${r.adGroupAd.ad.id}`,
          status: r.adGroupAd.status,
          ad_set_id: dbAdGroup.id,
          ad_account_id: account.id,
          platform: 'google',
          creative_type: r.adGroupAd.ad.type || null,
        };
      })
      .filter(Boolean);

    const dbAds = await batchUpsert('ads', adRecords, 'ad_set_id,platform_ad_id');
    console.log(`[google-sync] Upserted ${dbAds.length} ads`);
    const adMap = new Map(dbAds.map(a => [a.platform_ad_id, a]));

    await sleep(200);

    console.log('[google-sync] Step 4/4: Fetching metrics...');

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
        metrics.conversions_value,
        metrics.ctr,
        metrics.average_cpc,
        metrics.average_cpm
      FROM ad_group_ad
      WHERE segments.date BETWEEN '${startDate}' AND '${endDate}'
      AND ad_group_ad.status != 'REMOVED'
    `;

    const metricsResults = await makeGoogleAdsRequest(metricsQuery, 'metrics');
    console.log(`[google-sync] Found ${metricsResults.length} metric records`);

    const allMetrics: any[] = [];
    const processedCampaignDates = new Set<string>();
    const processedAdGroupDates = new Set<string>();

    for (const r of metricsResults) {
      const date = r.segments?.date;
      if (!date) continue;

      const campaignId = r.campaign?.id;
      const adGroupId = r.adGroup?.id;
      const adId = r.adGroupAd?.ad?.id;

      const spend = r.metrics?.costMicros ? parseInt(r.metrics.costMicros) / 1000000 : 0;
      const impressions = parseInt(r.metrics?.impressions || '0');
      const clicks = parseInt(r.metrics?.clicks || '0');
      const conversions = parseFloat(r.metrics?.conversions || '0');
      const conversionValue = parseFloat(r.metrics?.conversionsValue || '0');
      const ctr = parseFloat(r.metrics?.ctr || '0') * 100;
      const cpc = r.metrics?.averageCpc ? parseInt(r.metrics.averageCpc) / 1000000 : 0;
      const cpm = r.metrics?.averageCpm ? parseInt(r.metrics.averageCpm) / 1000000 : 0;

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
        reach: 0,
      };

      const dbCampaign = campaignMap.get(campaignId);
      if (dbCampaign) {
        const campaignDateKey = `${dbCampaign.id}-${date}`;
        if (!processedCampaignDates.has(campaignDateKey)) {
          processedCampaignDates.add(campaignDateKey);
          allMetrics.push({ ...baseMetric, entity_id: dbCampaign.id, entity_type: 'campaign' });
        }
      }

      const dbAdGroup = adGroupMap.get(adGroupId);
      if (dbAdGroup) {
        const adGroupDateKey = `${dbAdGroup.id}-${date}`;
        if (!processedAdGroupDates.has(adGroupDateKey)) {
          processedAdGroupDates.add(adGroupDateKey);
          allMetrics.push({ ...baseMetric, entity_id: dbAdGroup.id, entity_type: 'adset' });
        }
      }

      const dbAd = adMap.get(adId);
      if (dbAd) {
        allMetrics.push({ ...baseMetric, entity_id: dbAd.id, entity_type: 'ad' });
      }
    }

    console.log(`[google-sync] Total metrics to save: ${allMetrics.length}`);
    await batchUpsert('ad_metrics', allMetrics, 'entity_type,entity_id,date');

    await supabase.from('ad_accounts').update({ last_synced_at: new Date().toISOString() }).eq('id', account.id);

    console.log('[google-sync] Complete!', {
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
    console.error('[google-sync] Unexpected error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'An unexpected error occurred',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
