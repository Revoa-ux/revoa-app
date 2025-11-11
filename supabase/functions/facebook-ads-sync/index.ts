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
    const startDate = url.searchParams.get('startDate') || new Date(Date.now() - 1095 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const endDate = url.searchParams.get('endDate') || new Date().toISOString().split('T')[0];

    console.log('[facebook-ads-sync] ===== SYNC REQUEST START ===== (v2.0)');
    console.log('[facebook-ads-sync] Account ID:', accountId);
    console.log('[facebook-ads-sync] Date range:', startDate, 'to', endDate);
    console.log('[facebook-ads-sync] User ID:', user.id);

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

    console.log('[facebook-ads-sync] Ad account query result:', { account: account?.id, error: accountError?.message });

    if (accountError || !account) {
      console.error('[facebook-ads-sync] Ad account not found!');
      console.error('[facebook-ads-sync] Searched for platform_account_id:', accountId);
      console.error('[facebook-ads-sync] User ID:', user.id);
      console.error('[facebook-ads-sync] Error:', accountError);
      return new Response(
        JSON.stringify({ success: false, error: 'Ad account not found or not accessible' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[facebook-ads-sync] Found ad account:', { id: account.id, name: account.account_name });

    const { data: tokenData, error: tokenError } = await supabase
      .from('facebook_tokens')
      .select('*')
      .eq('ad_account_id', accountId)
      .eq('user_id', user.id)
      .maybeSingle();

    console.log('[facebook-ads-sync] Token query result:', { found: !!tokenData, error: tokenError?.message });

    if (tokenError || !tokenData) {
      console.error('[facebook-ads-sync] Access token not found!');
      console.error('[facebook-ads-sync] Searched for ad_account_id:', accountId);
      console.error('[facebook-ads-sync] Error:', tokenError);
      return new Response(
        JSON.stringify({ success: false, error: 'Access token not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[facebook-ads-sync] Token expires at:', tokenData.expires_at);

    if (new Date(tokenData.expires_at) < new Date()) {
      console.error('[facebook-ads-sync] Token expired!');
      return new Response(
        JSON.stringify({ success: false, error: 'Access token expired. Please reconnect your Facebook account.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[facebook-ads-sync] Token is valid, proceeding with sync...');

    const accessToken = tokenData.access_token;
    let campaignsCount = 0;
    let adSetsCount = 0;
    let adsCount = 0;
    let metricsCount = 0;

    const campaignsUrl = `https://graph.facebook.com/v21.0/${accountId}/campaigns?fields=id,name,status,objective,created_time,updated_time&limit=100&access_token=${accessToken}`;
    console.log('[facebook-ads-sync] Fetching campaigns from:', campaignsUrl.replace(accessToken, '[REDACTED]'));
    console.log('[facebook-ads-sync] Account ID being queried:', accountId);

    const campaignsResponse = await fetch(campaignsUrl);
    const campaignsData = await campaignsResponse.json();

    console.log('[facebook-ads-sync] Campaigns response status:', campaignsResponse.status);
    console.log('[facebook-ads-sync] Campaigns response headers:', Object.fromEntries(campaignsResponse.headers.entries()));
    console.log('[facebook-ads-sync] Campaigns data:', JSON.stringify(campaignsData, null, 2));

    if (!campaignsResponse.ok || campaignsData.error) {
      console.error('[facebook-ads-sync] Error fetching campaigns:', campaignsData.error);
      console.error('[facebook-ads-sync] Full error details:', JSON.stringify(campaignsData, null, 2));
      return new Response(
        JSON.stringify({
          success: false,
          error: campaignsData.error?.message || 'Failed to fetch campaigns',
          errorDetails: campaignsData.error,
          accountId,
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[facebook-ads-sync] Number of campaigns found:', campaignsData.data?.length || 0);
    console.log('[facebook-ads-sync] Has paging?', campaignsData.paging ? 'yes' : 'no');

    if (campaignsData.data?.length > 0) {
      console.log('[facebook-ads-sync] Campaign IDs:', campaignsData.data.map((c: any) => c.id));
      console.log('[facebook-ads-sync] Campaign names:', campaignsData.data.map((c: any) => c.name));
    }

    if (!campaignsData.data || campaignsData.data.length === 0) {
      console.log('[facebook-ads-sync] No campaigns found, fetching account-level insights');

      const accountInsightsUrl = `https://graph.facebook.com/v21.0/${accountId}/insights?fields=impressions,clicks,spend,reach,cpc,cpm,ctr,actions,account_name,date_start,date_stop&time_range={"since":"${startDate}","until":"${endDate}"}&time_increment=1&access_token=${accessToken}`;
      console.log('[facebook-ads-sync] Fetching account insights for date range:', startDate, 'to', endDate);
      const accountInsightsResponse = await fetch(accountInsightsUrl);
      const accountInsightsData = await accountInsightsResponse.json();

      console.log('[facebook-ads-sync] Account insights response status:', accountInsightsResponse.status);
      console.log('[facebook-ads-sync] Account insights response:', JSON.stringify(accountInsightsData, null, 2));

      if (accountInsightsData.error) {
        console.error('[facebook-ads-sync] Error fetching account insights:', accountInsightsData.error);
        console.error('[facebook-ads-sync] This might mean:');
        console.error('[facebook-ads-sync]   - No ad spend in this date range');
        console.error('[facebook-ads-sync]   - Missing permissions for insights');
        console.error('[facebook-ads-sync]   - Account has no historical data');
      }

      if (accountInsightsResponse.ok && accountInsightsData.data && accountInsightsData.data.length > 0) {
        console.log('[facebook-ads-sync] Processing', accountInsightsData.data.length, 'daily records from account insights');

        const { data: syntheticCampaign, error: syntheticError } = await supabase
          .from('ad_campaigns')
          .upsert({
            platform_campaign_id: `${accountId}_account_total`,
            name: 'Account Total',
            status: 'active',
            ad_account_id: account.id,
            platform: 'facebook',
            objective: 'account_overview',
            daily_budget: null,
            lifetime_budget: null,
          }, { onConflict: 'ad_account_id,platform_campaign_id' })
          .select()
          .single();

        if (!syntheticError && syntheticCampaign) {
          for (const insights of accountInsightsData.data) {
            const conversions = insights.actions?.find((a: any) => a.action_type === 'purchase')?.value || 0;
            const conversionValue = insights.actions?.find((a: any) => a.action_type === 'purchase')?.value || 0;
            const metricDate = insights.date_start || endDate;

            console.log('[facebook-ads-sync] Inserting account-level metrics for date:', metricDate, {
              spend: insights.spend,
              impressions: insights.impressions,
              clicks: insights.clicks,
            });

            const { error: metricError } = await supabase.from('ad_metrics').upsert(
              {
                entity_id: syntheticCampaign.id,
                entity_type: 'campaign',
                date: metricDate,
                impressions: parseInt(insights.impressions || '0'),
                clicks: parseInt(insights.clicks || '0'),
                spend: parseFloat(insights.spend || '0'),
                reach: parseInt(insights.reach || '0'),
                conversions: parseInt(conversions),
                conversion_value: parseFloat(conversionValue) * 10,
                cpc: parseFloat(insights.cpc || '0'),
                cpm: parseFloat(insights.cpm || '0'),
                ctr: parseFloat(insights.ctr || '0'),
                roas: parseFloat(insights.spend || '0') > 0 ? (parseFloat(conversionValue) * 10) / parseFloat(insights.spend || '1') : 0,
              },
              { onConflict: 'entity_type,entity_id,date' }
            );

            if (!metricError) {
              metricsCount++;
            } else {
              console.error('[facebook-ads-sync] Error saving account-level metrics for', metricDate, ':', metricError);
            }
          }
          campaignsCount++;
          console.log('[facebook-ads-sync] Successfully saved account-level metrics for', metricsCount, 'days');
        }
      }
    }

    if (campaignsData.data && campaignsData.data.length > 0) {
      for (const campaign of campaignsData.data) {
        const { data: dbCampaign, error: campaignError } = await supabase.from('ad_campaigns').upsert(
          {
            platform_campaign_id: campaign.id,
            name: campaign.name,
            status: campaign.status?.toLowerCase() || 'unknown',
            ad_account_id: account.id,
            platform: 'facebook',
            objective: campaign.objective,
            daily_budget: null,
            lifetime_budget: null,
          },
          { onConflict: 'ad_account_id,platform_campaign_id' }
        )
        .select()
        .single();

        if (campaignError || !dbCampaign) {
          console.error('[facebook-ads-sync] Error upserting campaign:', campaign.id, campaign.name);
          console.error('[facebook-ads-sync] Campaign error details:', JSON.stringify(campaignError, null, 2));
          continue;
        }

        campaignsCount++;
        console.log('[facebook-ads-sync] Campaign saved with ID:', dbCampaign.id);

        // First, fetch campaign-level insights
        const campaignInsightsUrl = `https://graph.facebook.com/v21.0/${campaign.id}/insights?fields=impressions,clicks,spend,reach,cpc,cpm,ctr,actions,date_start,date_stop&time_range={"since":"${startDate}","until":"${endDate}"}&time_increment=1&access_token=${accessToken}`;
        console.log('[facebook-ads-sync] Fetching campaign insights for:', campaign.name);
        const campaignInsightsResponse = await fetch(campaignInsightsUrl);
        const campaignInsightsData = await campaignInsightsResponse.json();

        console.log('[facebook-ads-sync] Campaign insights response status:', campaignInsightsResponse.status);
        console.log('[facebook-ads-sync] Campaign insights response data:', JSON.stringify(campaignInsightsData, null, 2));

        if (campaignInsightsResponse.ok && campaignInsightsData.data && campaignInsightsData.data.length > 0) {
          console.log('[facebook-ads-sync] Found', campaignInsightsData.data.length, 'daily records for campaign:', campaign.name);
          for (const insights of campaignInsightsData.data) {
            const conversions = insights.actions?.find((a: any) => a.action_type === 'purchase')?.value || 0;
            const conversionValue = insights.actions?.find((a: any) => a.action_type === 'purchase')?.value || 0;
            const metricDate = insights.date_start || endDate;

            console.log('[facebook-ads-sync] Saving campaign metrics for date:', metricDate, {
              spend: insights.spend,
              impressions: insights.impressions,
              clicks: insights.clicks,
            });

            const { error: metricError } = await supabase.from('ad_metrics').upsert(
              {
                entity_id: dbCampaign.id,
                entity_type: 'campaign',
                date: metricDate,
                impressions: parseInt(insights.impressions || '0'),
                clicks: parseInt(insights.clicks || '0'),
                spend: parseFloat(insights.spend || '0'),
                reach: parseInt(insights.reach || '0'),
                conversions: parseInt(conversions),
                conversion_value: parseFloat(conversionValue) * 10,
                cpc: parseFloat(insights.cpc || '0'),
                cpm: parseFloat(insights.cpm || '0'),
                ctr: parseFloat(insights.ctr || '0'),
                roas: parseFloat(insights.spend || '0') > 0 ? (parseFloat(conversionValue) * 10) / parseFloat(insights.spend || '1') : 0,
              },
              { onConflict: 'entity_type,entity_id,date' }
            );

            if (!metricError) {
              metricsCount++;
            } else {
              console.error('[facebook-ads-sync] Error saving campaign metrics for', metricDate, ':', metricError);
            }
          }
        } else {
          console.log('[facebook-ads-sync] No insights data for campaign:', campaign.name);
          if (campaignInsightsData.error) {
            console.error('[facebook-ads-sync] Campaign insights error:', campaignInsightsData.error);
          }
        }

        // Then fetch ad sets
        const adSetsUrl = `https://graph.facebook.com/v21.0/${campaign.id}/adsets?fields=id,name,status,created_time,updated_time,daily_budget,lifetime_budget&access_token=${accessToken}`;
        const adSetsResponse = await fetch(adSetsUrl);
        const adSetsData = await adSetsResponse.json();

        if (adSetsResponse.ok && adSetsData.data) {
          for (const adSet of adSetsData.data) {
            const { data: dbAdSet, error: adSetError } = await supabase.from('ad_sets').upsert(
              {
                platform_adset_id: adSet.id,
                name: adSet.name,
                status: adSet.status?.toLowerCase() || 'unknown',
                ad_campaign_id: dbCampaign.id,
                campaign_id: dbCampaign.id,
                platform: 'facebook',
                daily_budget: adSet.daily_budget ? parseFloat(adSet.daily_budget) / 100 : null,
                lifetime_budget: adSet.lifetime_budget ? parseFloat(adSet.lifetime_budget) / 100 : null,
              },
              { onConflict: 'ad_campaign_id,platform_adset_id' }
            )
            .select()
            .single();

            if (adSetError || !dbAdSet) {
              console.error('[facebook-ads-sync] Error upserting ad set:', adSet.id, adSet.name);
              console.error('[facebook-ads-sync] Ad set error details:', JSON.stringify(adSetError, null, 2));
              continue;
            }

            adSetsCount++;

            const adsUrl = `https://graph.facebook.com/v21.0/${adSet.id}/ads?fields=id,name,status,created_time,updated_time,creative{id,name,thumbnail_url,title,body,image_url,video_id,call_to_action_type,object_story_spec}&access_token=${accessToken}`;
            const adsResponse = await fetch(adsUrl);
            const adsData = await adsResponse.json();

            if (adsResponse.ok && adsData.data) {
              for (const ad of adsData.data) {
                const creativeData: any = {};
                if (ad.creative) {
                  if (ad.creative.title) creativeData.title = ad.creative.title;
                  if (ad.creative.body) creativeData.body = ad.creative.body;
                  if (ad.creative.image_url) creativeData.image_url = ad.creative.image_url;
                  if (ad.creative.video_id) {
                    creativeData.video_id = ad.creative.video_id;

                    // Fetch video details to get the source URL
                    try {
                      const videoUrl = `https://graph.facebook.com/v21.0/${ad.creative.video_id}?fields=source,picture&access_token=${accessToken}`;
                      const videoResponse = await fetch(videoUrl);
                      const videoData = await videoResponse.json();

                      if (videoResponse.ok && videoData.source) {
                        creativeData.video_url = videoData.source;
                      }
                      if (videoData.picture) {
                        creativeData.video_thumbnail = videoData.picture;
                      }
                    } catch (videoError) {
                      console.error('[facebook-ads-sync] Error fetching video source:', videoError);
                    }
                  }
                  if (ad.creative.call_to_action_type) creativeData.call_to_action = ad.creative.call_to_action_type;
                  if (ad.creative.thumbnail_url) creativeData.thumbnail_url = ad.creative.thumbnail_url;
                }

                const { error: adError } = await supabase.from('ads').upsert(
                  {
                    platform_ad_id: ad.id,
                    name: ad.name,
                    status: ad.status?.toLowerCase() || 'unknown',
                    ad_set_id: dbAdSet.id,
                    ad_account_id: account.id,
                    platform: 'facebook',
                    creative_id: ad.creative?.id || null,
                    creative_name: ad.creative?.name || null,
                    creative_thumbnail_url: ad.creative?.thumbnail_url || null,
                    creative_type: ad.creative?.video_id ? 'video' : 'image',
                    creative_data: creativeData,
                  },
                  { onConflict: 'ad_set_id,platform_ad_id' }
                );

                if (adError) {
                  console.error('[facebook-ads-sync] Error upserting ad:', ad.id, ad.name);
                  console.error('[facebook-ads-sync] Ad error details:', JSON.stringify(adError, null, 2));
                  continue;
                }

                adsCount++;
              }

              const insightsUrl = `https://graph.facebook.com/v21.0/${adSet.id}/insights?fields=impressions,clicks,spend,reach,cpc,cpm,ctr,actions,date_start,date_stop&time_range={"since":"${startDate}","until":"${endDate}"}&time_increment=1&access_token=${accessToken}`;
              const insightsResponse = await fetch(insightsUrl);
              const insightsData = await insightsResponse.json();

              if (insightsResponse.ok && insightsData.data && insightsData.data.length > 0) {
                for (const insights of insightsData.data) {
                  const conversions = insights.actions?.find((a: any) => a.action_type === 'purchase')?.value || 0;
                  const conversionValue = insights.actions?.find((a: any) => a.action_type === 'purchase')?.value || 0;
                  const metricDate = insights.date_start || endDate;

                  const { error: metricError } = await supabase.from('ad_metrics').upsert(
                    {
                      entity_id: dbAdSet.id,
                      entity_type: 'adset',
                      date: metricDate,
                      impressions: parseInt(insights.impressions || '0'),
                      clicks: parseInt(insights.clicks || '0'),
                      spend: parseFloat(insights.spend || '0'),
                      reach: parseInt(insights.reach || '0'),
                      conversions: parseInt(conversions),
                      conversion_value: parseFloat(conversionValue) * 10,
                      cpc: parseFloat(insights.cpc || '0'),
                      cpm: parseFloat(insights.cpm || '0'),
                      ctr: parseFloat(insights.ctr || '0'),
                      roas: parseFloat(insights.spend || '0') > 0 ? (parseFloat(conversionValue) * 10) / parseFloat(insights.spend || '1') : 0,
                    },
                    { onConflict: 'entity_type,entity_id,date' }
                  );

                  if (!metricError) {
                    metricsCount++;
                  } else {
                    console.error('[facebook-ads-sync] Error saving metrics for ad set:', adSet.id, 'date:', metricDate);
                    console.error('[facebook-ads-sync] Metric error:', metricError);
                  }
                }
              }
            }
          }
        }
      }
    }

    console.log('[facebook-ads-sync] Successfully synced:', {
      campaigns: campaignsCount,
      adSets: adSetsCount,
      ads: adsCount,
      metrics: metricsCount,
    });

    await supabase
      .from('ad_accounts')
      .update({ last_synced_at: new Date().toISOString() })
      .eq('id', account.id);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully synced ${campaignsCount} campaigns, ${adSetsCount} ad sets, ${adsCount} ads, and ${metricsCount} metrics from ${startDate} to ${endDate}`,
        data: {
          campaigns: campaignsCount,
          adSets: adSetsCount,
          ads: adsCount,
          metrics: metricsCount,
        },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[facebook-ads-sync] Unexpected error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'An unexpected error occurred',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});