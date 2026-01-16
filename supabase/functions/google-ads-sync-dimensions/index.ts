import { createClient } from 'npm:@supabase/supabase-js@2';

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

    const body = await req.json();
    const { adAccountId, dimensions } = body;
    let { startDate, endDate } = body;

    console.log('[google-sync-dimensions] Starting dimensional sync:', { adAccountId, dimensions, startDate, endDate });

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

      console.log('[google-sync-dimensions] Token expired, refreshing...');
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
        console.error('[google-sync-dimensions] Token refresh failed:', refreshData);
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

      console.log('[google-sync-dimensions] Token refreshed successfully');
    }

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    if (!endDate) {
      endDate = todayStr;
    }

    if (!startDate) {
      const thirtyDaysAgo = new Date(today);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      startDate = thirtyDaysAgo.toISOString().split('T')[0];
    }

    const customerId = adAccountId.replace(/-/g, '');
    const apiErrors: string[] = [];

    const makeGoogleAdsRequest = async (query: string, context: string) => {
      const url = `https://googleads.googleapis.com/v18/customers/${customerId}/googleAds:searchStream`;

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

        const data = await response.json();

        if (!response.ok) {
          const errorData = data as GoogleAdsApiError;
          const errorMsg = `[${context}] API error: ${errorData.error?.message || response.statusText}`;
          console.error('[google-sync-dimensions]', errorMsg);
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

        return results;
      } catch (error) {
        const errorMsg = `[${context}] Fetch error: ${error instanceof Error ? error.message : String(error)}`;
        console.error('[google-sync-dimensions]', errorMsg);
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
          console.error(`[google-sync-dimensions] Error upserting to ${table}:`, error.message);
        } else {
          results.push(...(data || []));
        }
      }
      return results;
    };

    const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    const { data: campaigns } = await supabase
      .from('ad_campaigns')
      .select('id, platform_campaign_id')
      .eq('ad_account_id', account.id)
      .eq('platform', 'google');

    const campaignMap = new Map((campaigns || []).map(c => [c.platform_campaign_id, c.id]));

    const { data: adGroups } = await supabase
      .from('ad_sets')
      .select('id, platform_adset_id, ad_campaign_id')
      .in('ad_campaign_id', Array.from(campaignMap.values()));

    const adGroupMap = new Map((adGroups || []).map(ag => [ag.platform_adset_id, ag]));

    const syncResults: Record<string, number> = {};
    const dimensionsToSync = dimensions || ['device', 'demographics', 'locations', 'keywords', 'audiences', 'hourly'];

    if (dimensionsToSync.includes('device')) {
      console.log('[google-sync-dimensions] Syncing device metrics...');

      const deviceQuery = `
        SELECT
          segments.date,
          segments.device,
          campaign.id,
          metrics.impressions,
          metrics.clicks,
          metrics.cost_micros,
          metrics.conversions,
          metrics.conversions_value
        FROM campaign
        WHERE segments.date BETWEEN '${startDate}' AND '${endDate}'
        AND campaign.status != 'REMOVED'
      `;

      const deviceResults = await makeGoogleAdsRequest(deviceQuery, 'device_metrics');
      console.log(`[google-sync-dimensions] Found ${deviceResults.length} device metric records`);

      const deviceMetrics = deviceResults.map(r => {
        const campaignId = campaignMap.get(r.campaign?.id);
        if (!campaignId) return null;

        const spend = r.metrics?.costMicros ? parseInt(r.metrics.costMicros) / 1000000 : 0;
        const impressions = parseInt(r.metrics?.impressions || '0');
        const clicks = parseInt(r.metrics?.clicks || '0');
        const conversions = parseFloat(r.metrics?.conversions || '0');
        const conversionValue = parseFloat(r.metrics?.conversionsValue || '0');

        return {
          user_id: user.id,
          entity_type: 'campaign',
          entity_id: campaignId,
          device: r.segments?.device || 'UNKNOWN',
          date: r.segments?.date,
          impressions,
          clicks,
          spend,
          conversions,
          conversion_value: conversionValue,
          ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
          cpc: clicks > 0 ? spend / clicks : 0,
          roas: spend > 0 ? conversionValue / spend : 0,
        };
      }).filter(Boolean);

      await batchUpsert('google_ads_device_metrics', deviceMetrics, 'entity_type,entity_id,device,date');
      syncResults.device = deviceMetrics.length;
      await sleep(200);
    }

    if (dimensionsToSync.includes('demographics')) {
      console.log('[google-sync-dimensions] Syncing demographic metrics...');

      const ageQuery = `
        SELECT
          segments.date,
          ad_group_criterion.age_range.type,
          campaign.id,
          ad_group.id,
          metrics.impressions,
          metrics.clicks,
          metrics.cost_micros,
          metrics.conversions,
          metrics.conversions_value
        FROM age_range_view
        WHERE segments.date BETWEEN '${startDate}' AND '${endDate}'
      `;

      const ageResults = await makeGoogleAdsRequest(ageQuery, 'age_metrics');
      console.log(`[google-sync-dimensions] Found ${ageResults.length} age metric records`);

      const genderQuery = `
        SELECT
          segments.date,
          ad_group_criterion.gender.type,
          campaign.id,
          ad_group.id,
          metrics.impressions,
          metrics.clicks,
          metrics.cost_micros,
          metrics.conversions,
          metrics.conversions_value
        FROM gender_view
        WHERE segments.date BETWEEN '${startDate}' AND '${endDate}'
      `;

      const genderResults = await makeGoogleAdsRequest(genderQuery, 'gender_metrics');
      console.log(`[google-sync-dimensions] Found ${genderResults.length} gender metric records`);

      const demographicMetrics: any[] = [];

      for (const r of ageResults) {
        const campaignId = campaignMap.get(r.campaign?.id);
        if (!campaignId) continue;

        const spend = r.metrics?.costMicros ? parseInt(r.metrics.costMicros) / 1000000 : 0;
        const impressions = parseInt(r.metrics?.impressions || '0');
        const clicks = parseInt(r.metrics?.clicks || '0');
        const conversions = parseFloat(r.metrics?.conversions || '0');
        const conversionValue = parseFloat(r.metrics?.conversionsValue || '0');

        demographicMetrics.push({
          user_id: user.id,
          entity_type: 'campaign',
          entity_id: campaignId,
          age_range: r.adGroupCriterion?.ageRange?.type || null,
          gender: null,
          date: r.segments?.date,
          impressions,
          clicks,
          spend,
          conversions,
          conversion_value: conversionValue,
          ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
          cpc: clicks > 0 ? spend / clicks : 0,
          roas: spend > 0 ? conversionValue / spend : 0,
        });
      }

      for (const r of genderResults) {
        const campaignId = campaignMap.get(r.campaign?.id);
        if (!campaignId) continue;

        const spend = r.metrics?.costMicros ? parseInt(r.metrics.costMicros) / 1000000 : 0;
        const impressions = parseInt(r.metrics?.impressions || '0');
        const clicks = parseInt(r.metrics?.clicks || '0');
        const conversions = parseFloat(r.metrics?.conversions || '0');
        const conversionValue = parseFloat(r.metrics?.conversionsValue || '0');

        demographicMetrics.push({
          user_id: user.id,
          entity_type: 'campaign',
          entity_id: campaignId,
          age_range: null,
          gender: r.adGroupCriterion?.gender?.type || null,
          date: r.segments?.date,
          impressions,
          clicks,
          spend,
          conversions,
          conversion_value: conversionValue,
          ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
          cpc: clicks > 0 ? spend / clicks : 0,
          roas: spend > 0 ? conversionValue / spend : 0,
        });
      }

      const { error } = await supabase.from('google_ads_demographic_metrics').insert(demographicMetrics);
      if (error) console.error('[google-sync-dimensions] Error inserting demographic metrics:', error.message);
      syncResults.demographics = demographicMetrics.length;
      await sleep(200);
    }

    if (dimensionsToSync.includes('locations')) {
      console.log('[google-sync-dimensions] Syncing location data and metrics...');

      const locationQuery = `
        SELECT
          campaign_criterion.location.geo_target_constant,
          campaign_criterion.criterion_id,
          campaign_criterion.bid_modifier,
          campaign_criterion.negative,
          campaign.id,
          geo_target_constant.name,
          geo_target_constant.target_type
        FROM campaign_criterion
        WHERE campaign_criterion.type = 'LOCATION'
        AND campaign.status != 'REMOVED'
      `;

      const locationResults = await makeGoogleAdsRequest(locationQuery, 'locations');
      console.log(`[google-sync-dimensions] Found ${locationResults.length} location targeting records`);

      const locationRecords = locationResults.map(r => {
        const campaignId = campaignMap.get(r.campaign?.id);
        if (!campaignId) return null;

        const targetType = r.geoTargetConstant?.targetType || 'COUNTRY';
        let locationType = 'COUNTRY';
        if (targetType.includes('City')) locationType = 'CITY';
        else if (targetType.includes('State') || targetType.includes('Region')) locationType = 'REGION';
        else if (targetType.includes('Postal')) locationType = 'POSTAL_CODE';

        return {
          user_id: user.id,
          ad_account_id: account.id,
          campaign_id: campaignId,
          platform_location_id: r.campaignCriterion?.criterionId || r.campaignCriterion?.location?.geoTargetConstant,
          location_name: r.geoTargetConstant?.name || 'Unknown',
          location_type: locationType,
          bid_modifier: r.campaignCriterion?.bidModifier ? (parseFloat(r.campaignCriterion.bidModifier) - 1) * 100 : 0,
          is_excluded: r.campaignCriterion?.negative || false,
          status: 'ENABLED',
        };
      }).filter(Boolean);

      await batchUpsert('google_ads_locations', locationRecords, 'campaign_id,platform_location_id');
      syncResults.locations = locationRecords.length;
      await sleep(200);
    }

    if (dimensionsToSync.includes('keywords')) {
      console.log('[google-sync-dimensions] Syncing keyword data...');

      const keywordQuery = `
        SELECT
          ad_group_criterion.criterion_id,
          ad_group_criterion.keyword.text,
          ad_group_criterion.keyword.match_type,
          ad_group_criterion.status,
          ad_group_criterion.negative,
          ad_group_criterion.cpc_bid_micros,
          ad_group_criterion.quality_info.quality_score,
          ad_group_criterion.quality_info.creative_quality_score,
          ad_group_criterion.quality_info.post_click_quality_score,
          ad_group_criterion.quality_info.search_predicted_ctr,
          ad_group.id,
          campaign.id
        FROM ad_group_criterion
        WHERE ad_group_criterion.type = 'KEYWORD'
        AND ad_group.status != 'REMOVED'
      `;

      const keywordResults = await makeGoogleAdsRequest(keywordQuery, 'keywords');
      console.log(`[google-sync-dimensions] Found ${keywordResults.length} keyword records`);

      const keywordRecords = keywordResults.map(r => {
        const adGroupInfo = adGroupMap.get(r.adGroup?.id);
        if (!adGroupInfo) return null;

        const qualityScoreMap: Record<string, number> = {
          'BELOW_AVERAGE': 1,
          'AVERAGE': 2,
          'ABOVE_AVERAGE': 3,
        };

        return {
          user_id: user.id,
          ad_account_id: account.id,
          ad_group_id: adGroupInfo.id,
          platform_keyword_id: r.adGroupCriterion?.criterionId,
          keyword_text: r.adGroupCriterion?.keyword?.text || '',
          match_type: r.adGroupCriterion?.keyword?.matchType || 'BROAD',
          status: r.adGroupCriterion?.status || 'ENABLED',
          cpc_bid_micros: r.adGroupCriterion?.cpcBidMicros ? parseInt(r.adGroupCriterion.cpcBidMicros) : null,
          quality_score: r.adGroupCriterion?.qualityInfo?.qualityScore || null,
          quality_score_creative: qualityScoreMap[r.adGroupCriterion?.qualityInfo?.creativeQualityScore] || null,
          quality_score_landing_page: qualityScoreMap[r.adGroupCriterion?.qualityInfo?.postClickQualityScore] || null,
          quality_score_expected_ctr: qualityScoreMap[r.adGroupCriterion?.qualityInfo?.searchPredictedCtr] || null,
          is_negative: r.adGroupCriterion?.negative || false,
        };
      }).filter(Boolean);

      await batchUpsert('google_ads_keywords', keywordRecords, 'ad_group_id,platform_keyword_id');
      syncResults.keywords = keywordRecords.length;
      await sleep(200);
    }

    if (dimensionsToSync.includes('audiences')) {
      console.log('[google-sync-dimensions] Syncing audience data...');

      const audienceQuery = `
        SELECT
          ad_group_criterion.criterion_id,
          ad_group_criterion.user_list.user_list,
          ad_group_criterion.bid_modifier,
          ad_group_criterion.negative,
          ad_group_criterion.status,
          ad_group.id,
          campaign.id,
          user_list.name,
          user_list.type
        FROM ad_group_criterion
        WHERE ad_group_criterion.type = 'USER_LIST'
        AND ad_group.status != 'REMOVED'
      `;

      const audienceResults = await makeGoogleAdsRequest(audienceQuery, 'audiences');
      console.log(`[google-sync-dimensions] Found ${audienceResults.length} audience records`);

      const audienceTypeMap: Record<string, string> = {
        'REMARKETING': 'REMARKETING',
        'LOGICAL_USER_LIST': 'COMBINED',
        'SIMILAR': 'SIMILAR',
        'CRM_BASED': 'CUSTOM_AUDIENCE',
        'RULE_BASED': 'CUSTOM_INTENT',
      };

      const audienceRecords = audienceResults.map(r => {
        const adGroupInfo = adGroupMap.get(r.adGroup?.id);
        if (!adGroupInfo) return null;

        return {
          user_id: user.id,
          ad_account_id: account.id,
          entity_type: 'ad_group',
          entity_id: adGroupInfo.id,
          platform_audience_id: r.adGroupCriterion?.criterionId || r.adGroupCriterion?.userList?.userList,
          audience_name: r.userList?.name || 'Unknown Audience',
          audience_type: audienceTypeMap[r.userList?.type] || 'REMARKETING',
          bid_modifier: r.adGroupCriterion?.bidModifier ? (parseFloat(r.adGroupCriterion.bidModifier) - 1) * 100 : 0,
          is_excluded: r.adGroupCriterion?.negative || false,
          status: r.adGroupCriterion?.status || 'ENABLED',
        };
      }).filter(Boolean);

      await batchUpsert('google_ads_audiences', audienceRecords, 'entity_type,entity_id,platform_audience_id');
      syncResults.audiences = audienceRecords.length;
      await sleep(200);
    }

    if (dimensionsToSync.includes('hourly')) {
      console.log('[google-sync-dimensions] Syncing hourly metrics...');

      const hourlyQuery = `
        SELECT
          segments.date,
          segments.hour,
          segments.day_of_week,
          campaign.id,
          metrics.impressions,
          metrics.clicks,
          metrics.cost_micros,
          metrics.conversions,
          metrics.conversions_value
        FROM campaign
        WHERE segments.date BETWEEN '${startDate}' AND '${endDate}'
        AND campaign.status != 'REMOVED'
      `;

      const hourlyResults = await makeGoogleAdsRequest(hourlyQuery, 'hourly_metrics');
      console.log(`[google-sync-dimensions] Found ${hourlyResults.length} hourly metric records`);

      const hourlyMetrics = hourlyResults.map(r => {
        const campaignId = campaignMap.get(r.campaign?.id);
        if (!campaignId) return null;

        const spend = r.metrics?.costMicros ? parseInt(r.metrics.costMicros) / 1000000 : 0;
        const impressions = parseInt(r.metrics?.impressions || '0');
        const clicks = parseInt(r.metrics?.clicks || '0');
        const conversions = parseFloat(r.metrics?.conversions || '0');
        const conversionValue = parseFloat(r.metrics?.conversionsValue || '0');

        return {
          user_id: user.id,
          campaign_id: campaignId,
          date: r.segments?.date,
          hour: parseInt(r.segments?.hour || '0'),
          day_of_week: r.segments?.dayOfWeek || 'MONDAY',
          impressions,
          clicks,
          spend,
          conversions,
          conversion_value: conversionValue,
          ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
          cpc: clicks > 0 ? spend / clicks : 0,
          roas: spend > 0 ? conversionValue / spend : 0,
        };
      }).filter(Boolean);

      await batchUpsert('google_ads_hourly_metrics', hourlyMetrics, 'campaign_id,date,hour');
      syncResults.hourly = hourlyMetrics.length;
      await sleep(200);
    }

    if (dimensionsToSync.includes('bid_adjustments')) {
      console.log('[google-sync-dimensions] Syncing bid adjustments...');

      const deviceBidQuery = `
        SELECT
          campaign_criterion.criterion_id,
          campaign_criterion.device.type,
          campaign_criterion.bid_modifier,
          campaign.id
        FROM campaign_criterion
        WHERE campaign_criterion.type = 'DEVICE'
        AND campaign.status != 'REMOVED'
      `;

      const deviceBidResults = await makeGoogleAdsRequest(deviceBidQuery, 'device_bids');
      console.log(`[google-sync-dimensions] Found ${deviceBidResults.length} device bid adjustments`);

      const bidAdjustments = deviceBidResults.map(r => {
        const campaignId = campaignMap.get(r.campaign?.id);
        if (!campaignId) return null;

        return {
          user_id: user.id,
          ad_account_id: account.id,
          entity_type: 'campaign',
          entity_id: campaignId,
          adjustment_type: 'device',
          criterion_id: r.campaignCriterion?.criterionId,
          criterion_name: r.campaignCriterion?.device?.type || 'UNKNOWN',
          criterion_type: r.campaignCriterion?.device?.type,
          bid_modifier: r.campaignCriterion?.bidModifier ? (parseFloat(r.campaignCriterion.bidModifier) - 1) * 100 : 0,
          is_excluded: false,
        };
      }).filter(Boolean);

      await batchUpsert('google_ads_bid_adjustments', bidAdjustments, 'entity_type,entity_id,adjustment_type,criterion_id');
      syncResults.bid_adjustments = bidAdjustments.length;
    }

    if (dimensionsToSync.includes('ad_schedules')) {
      console.log('[google-sync-dimensions] Syncing ad schedules...');

      const scheduleQuery = `
        SELECT
          campaign_criterion.criterion_id,
          campaign_criterion.ad_schedule.day_of_week,
          campaign_criterion.ad_schedule.start_hour,
          campaign_criterion.ad_schedule.end_hour,
          campaign_criterion.bid_modifier,
          campaign.id
        FROM campaign_criterion
        WHERE campaign_criterion.type = 'AD_SCHEDULE'
        AND campaign.status != 'REMOVED'
      `;

      const scheduleResults = await makeGoogleAdsRequest(scheduleQuery, 'ad_schedules');
      console.log(`[google-sync-dimensions] Found ${scheduleResults.length} ad schedule records`);

      const scheduleRecords = scheduleResults.map(r => {
        const campaignId = campaignMap.get(r.campaign?.id);
        if (!campaignId) return null;

        return {
          user_id: user.id,
          ad_account_id: account.id,
          campaign_id: campaignId,
          platform_schedule_id: r.campaignCriterion?.criterionId,
          day_of_week: r.campaignCriterion?.adSchedule?.dayOfWeek || 'MONDAY',
          start_hour: parseInt(r.campaignCriterion?.adSchedule?.startHour || '0'),
          end_hour: parseInt(r.campaignCriterion?.adSchedule?.endHour || '24'),
          bid_modifier: r.campaignCriterion?.bidModifier ? (parseFloat(r.campaignCriterion.bidModifier) - 1) * 100 : 0,
          is_enabled: true,
        };
      }).filter(Boolean);

      await batchUpsert('google_ads_ad_schedules', scheduleRecords, 'campaign_id,day_of_week,start_hour,end_hour');
      syncResults.ad_schedules = scheduleRecords.length;
    }

    console.log('[google-sync-dimensions] Complete!', syncResults);

    return new Response(
      JSON.stringify({
        success: apiErrors.length === 0,
        message: apiErrors.length > 0
          ? `Sync completed with errors`
          : `Dimensional sync completed`,
        data: syncResults,
        errors: apiErrors.length > 0 ? apiErrors : undefined,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[google-sync-dimensions] Unexpected error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'An unexpected error occurred',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
