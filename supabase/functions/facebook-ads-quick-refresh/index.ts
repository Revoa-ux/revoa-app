import { createClient } from 'npm:@supabase/supabase-js@2.39.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface RequestBody {
  adAccountId: string;
  datePreset?: string;
  storeId?: string;
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

    const { adAccountId, datePreset = 'last_28d', storeId }: RequestBody = await req.json();

    console.log('[quick-refresh] Starting quick refresh for account:', adAccountId);

    const { data: tokenData, error: tokenError } = await supabase
      .from('facebook_tokens')
      .select('access_token')
      .eq('user_id', user.id)
      .maybeSingle();

    if (tokenError || !tokenData) {
      throw new Error('Facebook not connected');
    }

    const accessToken = tokenData.access_token;

    const { data: adAccount } = await supabase
      .from('ad_accounts')
      .select('id')
      .eq('platform_account_id', adAccountId)
      .eq('platform', 'facebook')
      .maybeSingle();

    if (!adAccount) {
      throw new Error('Ad account not found');
    }

    const dbAccountId = adAccount.id;

    console.log('[quick-refresh] Fetching existing items from database...');

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

    const { data: existingAdSets } = await supabase
      .from('ad_sets')
      .select('id, platform_adset_id, ad_campaign_id')
      .in('ad_campaign_id', existingCampaigns.map(c => c.id));

    if (!existingAdSets || existingAdSets.length === 0) {
      console.log('[quick-refresh] No ad sets found - needs full sync');
      return new Response(
        JSON.stringify({
          success: false,
          needsFullSync: true,
          message: 'No ad sets found in database'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: existingAds } = await supabase
      .from('ads')
      .select('id, platform_ad_id, ad_set_id')
      .in('ad_set_id', existingAdSets.map(as => as.id));

    console.log(`[quick-refresh] Found ${existingCampaigns.length} campaigns, ${existingAdSets.length} ad sets, ${existingAds?.length || 0} ads`);

    // For very large datasets (>1000 ads), quick refresh is too slow - use full sync instead
    const totalAds = existingAds?.length || 0;
    if (totalAds > 1000) {
      console.log(`[quick-refresh] Dataset too large (${totalAds} ads) - recommending full sync`);
      return new Response(
        JSON.stringify({
          success: false,
          needsFullSync: true,
          message: `Dataset too large for quick refresh (${totalAds} ads). Please use full sync.`
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[quick-refresh] Checking for new items...');

    const campaignsUrl = `https://graph.facebook.com/v21.0/${adAccountId}/campaigns?fields=id&limit=1000&access_token=${accessToken}`;
    const campaignsResponse = await fetch(campaignsUrl);
    const campaignsData = await campaignsResponse.json();

    const apiCampaignIds = new Set(campaignsData.data?.map((c: any) => c.id) || []);
    const dbCampaignIds = new Set(existingCampaigns?.map(c => c.platform_campaign_id) || []);
    const newCampaignIds = [...apiCampaignIds].filter(id => !dbCampaignIds.has(id));

    if (newCampaignIds.length > 0) {
      console.log(`[quick-refresh] Found ${newCampaignIds.length} new campaigns`);
      return new Response(
        JSON.stringify({
          success: false,
          needsFullSync: true,
          message: `Found ${newCampaignIds.length} new campaigns`
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const adSetsUrl = `https://graph.facebook.com/v21.0/${adAccountId}/adsets?fields=id&limit=1000&access_token=${accessToken}`;
    const adSetsResponse = await fetch(adSetsUrl);
    const adSetsData = await adSetsResponse.json();

    const apiAdSetIds = new Set(adSetsData.data?.map((as: any) => as.id) || []);
    const dbAdSetIds = new Set(existingAdSets?.map(as => as.platform_adset_id) || []);
    const newAdSetIds = [...apiAdSetIds].filter(id => !dbAdSetIds.has(id));

    if (newAdSetIds.length > 0) {
      console.log(`[quick-refresh] Found ${newAdSetIds.length} new ad sets`);
      return new Response(
        JSON.stringify({
          success: false,
          needsFullSync: true,
          message: `Found ${newAdSetIds.length} new ad sets`
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const adsUrl = `https://graph.facebook.com/v21.0/${adAccountId}/ads?fields=id&limit=1000&access_token=${accessToken}`;
    const adsResponse = await fetch(adsUrl);
    const adsData = await adsResponse.json();

    const apiAdIds = new Set(adsData.data?.map((a: any) => a.id) || []);
    const dbAdIds = new Set(existingAds?.map(a => a.platform_ad_id) || []);
    const newAdIds = [...apiAdIds].filter(id => !dbAdIds.has(id));

    if (newAdIds.length > 0) {
      console.log(`[quick-refresh] Found ${newAdIds.length} new ads`);
      return new Response(
        JSON.stringify({
          success: false,
          needsFullSync: true,
          message: `Found ${newAdIds.length} new ads`
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[quick-refresh] No new items detected, proceeding with metrics update...');

    console.log('[quick-refresh] Fetching fresh metrics...');

    const metricsFields = 'impressions,clicks,spend,actions,action_values,cost_per_action_type';
    const batchSize = 50;

    const fetchMetricsBatch = async (ids: string[], level: string) => {
      const results = [];
      for (let i = 0; i < ids.length; i += batchSize) {
        const batch = ids.slice(i, i + batchSize);
        const idsParam = batch.join(',');
        const url = `https://graph.facebook.com/v21.0/?ids=${idsParam}&fields=insights.date_preset(${datePreset}){${metricsFields}}&access_token=${accessToken}`;

        const response = await fetch(url);
        const data = await response.json();

        for (const [id, value] of Object.entries(data)) {
          const insights = (value as any)?.insights?.data?.[0];
          if (insights) {
            results.push({ id, insights });
          }
        }
      }
      return results;
    };

    const campaignIds = existingCampaigns?.map(c => c.platform_campaign_id) || [];
    const campaignMetrics = await fetchMetricsBatch(campaignIds, 'campaign');

    const adSetIds = existingAdSets?.map(as => as.platform_adset_id) || [];
    const adSetMetrics = await fetchMetricsBatch(adSetIds, 'adset');

    const adIds = existingAds?.map(a => a.platform_ad_id) || [];
    const adMetrics = await fetchMetricsBatch(adIds, 'ad');

    console.log(`[quick-refresh] Fetched ${campaignMetrics.length} campaign metrics, ${adSetMetrics.length} ad set metrics, ${adMetrics.length} ad metrics`);

    console.log('[quick-refresh] Updating metrics...');

    const extractMetrics = (insights: any) => {
      const purchases = insights.actions?.find((a: any) => a.action_type === 'purchase')?.value || '0';
      const purchaseValue = insights.action_values?.find((a: any) => a.action_type === 'purchase')?.value || '0';
      const costPerPurchase = insights.cost_per_action_type?.find((a: any) => a.action_type === 'purchase')?.value || '0';

      return {
        impressions: parseInt(insights.impressions || '0'),
        clicks: parseInt(insights.clicks || '0'),
        spend: parseFloat(insights.spend || '0'),
        purchases: parseInt(purchases),
        revenue: parseFloat(purchaseValue),
        cpc: insights.clicks ? parseFloat(insights.spend) / parseInt(insights.clicks) : 0,
        cpm: insights.impressions ? (parseFloat(insights.spend) / parseInt(insights.impressions)) * 1000 : 0,
        ctr: insights.impressions ? (parseInt(insights.clicks) / parseInt(insights.impressions)) * 100 : 0,
        roas: parseFloat(insights.spend) > 0 ? parseFloat(purchaseValue) / parseFloat(insights.spend) : 0,
        cpa: parseFloat(costPerPurchase),
      };
    };

    const campaignIdMap = new Map(existingCampaigns?.map(c => [c.platform_campaign_id, c.id]));
    const adSetIdMap = new Map(existingAdSets?.map(as => [as.platform_adset_id, as.id]));
    const adIdMap = new Map(existingAds?.map(a => [a.platform_ad_id, a.id]));

    const today = new Date().toISOString().split('T')[0];

    const allMetricsRecords: any[] = [];

    for (const { id, insights } of campaignMetrics) {
      const dbId = campaignIdMap.get(id);
      if (dbId) {
        const metrics = extractMetrics(insights);
        await supabase
          .from('ad_campaigns')
          .update(metrics)
          .eq('id', dbId);

        allMetricsRecords.push({
          entity_id: dbId,
          entity_type: 'campaign',
          date: today,
          impressions: metrics.impressions,
          clicks: metrics.clicks,
          spend: metrics.spend,
          conversions: metrics.purchases,
          conversion_value: metrics.revenue,
          reach: 0,
          cpc: metrics.cpc,
          cpm: metrics.cpm,
          ctr: metrics.ctr,
          roas: metrics.roas,
        });
      }
    }

    for (const { id, insights } of adSetMetrics) {
      const dbId = adSetIdMap.get(id);
      if (dbId) {
        const metrics = extractMetrics(insights);
        await supabase
          .from('ad_sets')
          .update(metrics)
          .eq('id', dbId);

        allMetricsRecords.push({
          entity_id: dbId,
          entity_type: 'adset',
          date: today,
          impressions: metrics.impressions,
          clicks: metrics.clicks,
          spend: metrics.spend,
          conversions: metrics.purchases,
          conversion_value: metrics.revenue,
          reach: 0,
          cpc: metrics.cpc,
          cpm: metrics.cpm,
          ctr: metrics.ctr,
          roas: metrics.roas,
        });
      }
    }

    for (const { id, insights } of adMetrics) {
      const dbId = adIdMap.get(id);
      if (dbId) {
        const metrics = extractMetrics(insights);
        await supabase
          .from('ads')
          .update(metrics)
          .eq('id', dbId);

        allMetricsRecords.push({
          entity_id: dbId,
          entity_type: 'ad',
          date: today,
          impressions: metrics.impressions,
          clicks: metrics.clicks,
          spend: metrics.spend,
          conversions: metrics.purchases,
          conversion_value: metrics.revenue,
          reach: 0,
          cpc: metrics.cpc,
          cpm: metrics.cpm,
          ctr: metrics.ctr,
          roas: metrics.roas,
        });
      }
    }

    if (allMetricsRecords.length > 0) {
      console.log(`[quick-refresh] Upserting ${allMetricsRecords.length} records to ad_metrics table...`);
      const upsertBatchSize = 200;
      for (let i = 0; i < allMetricsRecords.length; i += upsertBatchSize) {
        const batch = allMetricsRecords.slice(i, i + upsertBatchSize);
        const { error: metricsError } = await supabase
          .from('ad_metrics')
          .upsert(batch, { onConflict: 'entity_type,entity_id,date' });
        if (metricsError) {
          console.error('[quick-refresh] Error upserting ad_metrics:', metricsError);
        }
      }
    }

    await supabase
      .from('ad_accounts')
      .update({ last_synced_at: new Date().toISOString() })
      .eq('id', dbAccountId);

    console.log('[quick-refresh] Quick refresh completed successfully');

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