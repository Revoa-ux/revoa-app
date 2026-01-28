import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
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

    const { adAccountId, chunkType, entityOffset, entityLimit, startDate, endDate, jobId, chunkId } = await req.json();

    console.log('[chunk-sync] Processing chunk:', {
      chunkType,
      entityOffset,
      entityLimit,
      startDate,
      endDate,
      adAccountId,
    });

    if (!adAccountId || !chunkType) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required parameters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get ad account
    const { data: account, error: accountError } = await supabase
      .from('ad_accounts')
      .select('*, user_profiles!inner(id)')
      .eq('platform_account_id', adAccountId)
      .maybeSingle();

    if (accountError || !account) {
      return new Response(
        JSON.stringify({ success: false, error: 'Ad account not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get access token
    const { data: tokenData, error: tokenError } = await supabase
      .from('facebook_tokens')
      .select('*')
      .eq('ad_account_id', adAccountId)
      .maybeSingle();

    if (tokenError || !tokenData) {
      return new Response(
        JSON.stringify({ success: false, error: 'Access token not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (new Date(tokenData.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ success: false, error: 'Access token expired' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const accessToken = tokenData.access_token;

    // Helper functions
    const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    const fetchPage = async (url: string, retryCount = 0): Promise<any> => {
      try {
        const response = await fetch(url);
        const data = await response.json();

        if (response.status === 400 && data.error?.message?.includes('limit reached')) {
          if (retryCount < 2) {
            const backoffTime = (retryCount + 1) * 3000;
            console.log(`[chunk-sync] Rate limited, waiting ${backoffTime}ms...`);
            await sleep(backoffTime);
            return fetchPage(url, retryCount + 1);
          }
          console.error('[chunk-sync] Rate limit exceeded');
          return { data: [], paging: null };
        }

        if (!response.ok || data.error) {
          console.error('[chunk-sync] API error:', data.error);
          return { data: [], paging: null };
        }

        return data;
      } catch (error) {
        console.error('[chunk-sync] Fetch error:', error);
        return { data: [], paging: null };
      }
    };

    const fetchAllPages = async (initialUrl: string): Promise<any[]> => {
      const allResults = [];
      let nextUrl: string | null = initialUrl;
      let pageCount = 0;

      while (nextUrl && pageCount < 1000) {
        const result = await fetchPage(nextUrl);
        allResults.push(...result.data);
        nextUrl = result.paging?.next || null;
        pageCount++;

        if (nextUrl) {
          await sleep(600); // Rate limiting
        }
      }

      return allResults;
    };

    const batchUpsert = async (table: string, records: any[], conflictKeys: string) => {
      if (records.length === 0) return [];

      const batchSize = 200;
      const results = [];

      for (let i = 0; i < records.length; i += batchSize) {
        const batch = records.slice(i, i + batchSize);
        const { data, error } = await supabase
          .from(table)
          .upsert(batch, { onConflict: conflictKeys })
          .select();

        if (error) {
          console.error(`[chunk-sync] Error upserting to ${table}:`, error);
        } else {
          results.push(...(data || []));
        }
      }

      return results;
    };

    let result: any = {};

    // Execute chunk based on type
    switch (chunkType) {
      case 'structure': {
        console.log('[chunk-sync] Fetching campaign/ad set/ad structure...');

        // Fetch all campaigns
        const campaignsUrl = `https://graph.facebook.com/v21.0/${adAccountId}/campaigns?fields=id,name,status,objective&limit=500&access_token=${accessToken}`;
        const campaigns = await fetchAllPages(campaignsUrl);

        // Save campaigns
        const campaignRecords = campaigns.map(c => ({
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
        const campaignMap = new Map(dbCampaigns.map(c => [c.platform_campaign_id, c]));

        // Fetch all ad sets
        const allAdSets = [];
        for (const campaign of campaigns) {
          const url = `https://graph.facebook.com/v21.0/${campaign.id}/adsets?fields=id,name,status,daily_budget,lifetime_budget&limit=500&access_token=${accessToken}`;
          const adSets = await fetchAllPages(url);
          allAdSets.push(...adSets.map(as => ({ ...as, campaign_id: campaign.id })));
          await sleep(600);
        }

        // Save ad sets
        const adSetRecords = allAdSets
          .map(as => {
            const dbCampaign = campaignMap.get(as.campaign_id);
            if (!dbCampaign) return null;

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
        const adSetMap = new Map(dbAdSets.map(as => [as.platform_adset_id, as]));

        // Fetch all ads with creative link data
        const allAds = [];
        for (const adSet of allAdSets) {
          const url = `https://graph.facebook.com/v21.0/${adSet.id}/ads?fields=id,name,status,creative{id,name,title,body,image_url,thumbnail_url,video_id,object_story_spec,effective_object_story_id}&limit=500&access_token=${accessToken}`;
          const ads = await fetchAllPages(url);
          allAds.push(...ads.map(ad => ({ ...ad, adset_id: adSet.id })));
          await sleep(600);
        }

        // Extract destination URL from creative object
        const extractDestinationUrl = (creative: any): string | null => {
          if (!creative) return null;

          // Try object_story_spec.link_data.link first (most common)
          if (creative.object_story_spec?.link_data?.link) {
            return creative.object_story_spec.link_data.link;
          }
          // Try object_story_spec.video_data.call_to_action.value.link
          if (creative.object_story_spec?.video_data?.call_to_action?.value?.link) {
            return creative.object_story_spec.video_data.call_to_action.value.link;
          }
          // Try object_story_spec.template_data.link
          if (creative.object_story_spec?.template_data?.link) {
            return creative.object_story_spec.template_data.link;
          }
          return null;
        };

        // Save ads with destination URLs
        const adRecords = allAds
          .map(ad => {
            const dbAdSet = adSetMap.get(ad.adset_id);
            if (!dbAdSet) return null;

            const creativeType = ad.creative?.video_id ? 'video' : 'image';
            const thumbnailUrl = ad.creative?.image_url || ad.creative?.thumbnail_url || null;
            const destinationUrl = extractDestinationUrl(ad.creative);

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
              creative_data: ad.creative || {},
              destination_url: destinationUrl,
            };
          })
          .filter(Boolean);

        await batchUpsert('ads', adRecords, 'ad_set_id,platform_ad_id');

        result = {
          entitiesProcessed: campaigns.length + allAdSets.length + allAds.length,
          campaigns: campaigns.length,
          adSets: allAdSets.length,
          ads: allAds.length,
        };
        break;
      }

      case 'campaign_metrics': {
        console.log('[chunk-sync] Fetching campaign metrics...');

        // Get campaigns with offset/limit
        const { data: campaigns } = await supabase
          .from('ad_campaigns')
          .select('id, platform_campaign_id')
          .eq('ad_account_id', account.id)
          .range(entityOffset || 0, (entityOffset || 0) + (entityLimit || 50) - 1);

        const metrics = [];

        for (const campaign of campaigns || []) {
          const url = `https://graph.facebook.com/v21.0/${campaign.platform_campaign_id}/insights?fields=impressions,clicks,spend,reach,cpc,cpm,ctr,actions,date_start&time_range={"since":"${startDate}","until":"${endDate}"}&time_increment=1&access_token=${accessToken}`;
          const result = await fetchPage(url);

          if (result.data.length > 0) {
            for (const insight of result.data) {
              const conversions = insight.actions?.find((a: any) => a.action_type === 'purchase')?.value || 0;
              const conversionValue = insight.actions?.find((a: any) => a.action_type === 'purchase')?.value || 0;

              metrics.push({
                entity_id: campaign.id,
                entity_type: 'campaign',
                date: insight.date_start,
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
              });
            }
          }

          await sleep(600);
        }

        await batchUpsert('ad_metrics', metrics, 'entity_type,entity_id,date');

        result = {
          entitiesProcessed: campaigns?.length || 0,
          metricsSynced: metrics.length,
        };
        break;
      }

      case 'adset_metrics': {
        console.log('[chunk-sync] Fetching ad set metrics...');

        // Get ad sets with offset/limit
        const { data: adSets } = await supabase
          .from('ad_sets')
          .select('id, platform_adset_id, ad_campaigns!inner(ad_account_id)')
          .eq('ad_campaigns.ad_account_id', account.id)
          .range(entityOffset || 0, (entityOffset || 0) + (entityLimit || 50) - 1);

        const metrics = [];

        for (const adSet of adSets || []) {
          const url = `https://graph.facebook.com/v21.0/${adSet.platform_adset_id}/insights?fields=impressions,clicks,spend,reach,cpc,cpm,ctr,actions,date_start&time_range={"since":"${startDate}","until":"${endDate}"}&time_increment=1&access_token=${accessToken}`;
          const result = await fetchPage(url);

          if (result.data.length > 0) {
            for (const insight of result.data) {
              const conversions = insight.actions?.find((a: any) => a.action_type === 'purchase')?.value || 0;
              const conversionValue = insight.actions?.find((a: any) => a.action_type === 'purchase')?.value || 0;

              metrics.push({
                entity_id: adSet.id,
                entity_type: 'adset',
                date: insight.date_start,
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
              });
            }
          }

          await sleep(600);
        }

        await batchUpsert('ad_metrics', metrics, 'entity_type,entity_id,date');

        result = {
          entitiesProcessed: adSets?.length || 0,
          metricsSynced: metrics.length,
        };
        break;
      }

      case 'ad_metrics': {
        console.log('[chunk-sync] Fetching ad metrics...');

        // Get ads with offset/limit
        const { data: ads } = await supabase
          .from('ads')
          .select('id, platform_ad_id')
          .eq('ad_account_id', account.id)
          .range(entityOffset || 0, (entityOffset || 0) + (entityLimit || 100) - 1);

        const metrics = [];

        for (const ad of ads || []) {
          const url = `https://graph.facebook.com/v21.0/${ad.platform_ad_id}/insights?fields=impressions,clicks,spend,reach,cpc,cpm,ctr,actions,date_start&time_range={"since":"${startDate}","until":"${endDate}"}&time_increment=1&access_token=${accessToken}`;
          const result = await fetchPage(url);

          if (result.data.length > 0) {
            for (const insight of result.data) {
              const conversions = insight.actions?.find((a: any) => a.action_type === 'purchase')?.value || 0;
              const conversionValue = insight.actions?.find((a: any) => a.action_type === 'purchase')?.value || 0;

              metrics.push({
                entity_id: ad.id,
                entity_type: 'ad',
                date: insight.date_start,
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
              });
            }
          }

          await sleep(600);
        }

        await batchUpsert('ad_metrics', metrics, 'entity_type,entity_id,date');

        result = {
          entitiesProcessed: ads?.length || 0,
          metricsSynced: metrics.length,
        };
        break;
      }

      default:
        return new Response(
          JSON.stringify({ success: false, error: `Unknown chunk type: ${chunkType}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    console.log('[chunk-sync] Chunk completed:', result);

    return new Response(
      JSON.stringify({
        success: true,
        chunkType,
        ...result,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[chunk-sync] Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
