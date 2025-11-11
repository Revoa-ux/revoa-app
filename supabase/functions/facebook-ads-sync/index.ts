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
    const startDate = url.searchParams.get('startDate') || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const endDate = url.searchParams.get('endDate') || new Date().toISOString().split('T')[0];

    console.log('[facebook-ads-sync] ===== SYNC REQUEST START =====');
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

    const campaignsUrl = `https://graph.facebook.com/v18.0/${accountId}/campaigns?fields=id,name,status,objective,created_time,updated_time&limit=100&access_token=${accessToken}`;
    console.log('[facebook-ads-sync] Fetching campaigns from:', campaignsUrl.replace(accessToken, '[REDACTED]'));

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

    // If no campaigns, try to get account-level insights anyway
    if (!campaignsData.data || campaignsData.data.length === 0) {
      console.log('[facebook-ads-sync] No campaigns found, fetching account-level insights');

      const accountInsightsUrl = `https://graph.facebook.com/v18.0/${accountId}/insights?fields=impressions,clicks,spend,reach,cpc,cpm,ctr,actions,account_name&time_range={"since":"${startDate}","until":"${endDate}"}&access_token=${accessToken}`;
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
        const insights = accountInsightsData.data[0];
        const conversions = insights.actions?.find((a: any) => a.action_type === 'purchase')?.value || 0;
        const conversionValue = insights.actions?.find((a: any) => a.action_type === 'purchase')?.value || 0;

        console.log('[facebook-ads-sync] Inserting account-level metrics:', {
          date: endDate,
          spend: insights.spend,
          impressions: insights.impressions,
          clicks: insights.clicks,
        });

        // Create a synthetic campaign for account-level data
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
          }, { onConflict: 'platform_campaign_id' })
          .select()
          .single();

        if (!syntheticError && syntheticCampaign) {
          const { error: metricError } = await supabase.from('ad_metrics').upsert(
            {
              entity_id: syntheticCampaign.id,
              entity_type: 'campaign',
              date: endDate,
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
            { onConflict: 'entity_id,date' }
          );

          if (!metricError) {
            campaignsCount++;
            metricsCount++;
            console.log('[facebook-ads-sync] Successfully saved account-level metrics');
          } else {
            console.error('[facebook-ads-sync] Error saving account-level metrics:', metricError);
          }
        }
      }
    }

    if (campaignsData.data && campaignsData.data.length > 0) {
      for (const campaign of campaignsData.data) {
        const { error: campaignError } = await supabase.from('ad_campaigns').upsert(
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
          { onConflict: 'platform_campaign_id' }
        );

        if (!campaignError) {
          campaignsCount++;

          const { data: dbCampaign } = await supabase
            .from('ad_campaigns')
            .select('id')
            .eq('platform_campaign_id', campaign.id)
            .maybeSingle();

          if (dbCampaign) {
            const adSetsUrl = `https://graph.facebook.com/v18.0/${campaign.id}/adsets?fields=id,name,status,created_time,updated_time,daily_budget,lifetime_budget&access_token=${accessToken}`;
            const adSetsResponse = await fetch(adSetsUrl);
            const adSetsData = await adSetsResponse.json();

            if (adSetsResponse.ok && adSetsData.data) {
              for (const adSet of adSetsData.data) {
                const { error: adSetError } = await supabase.from('ad_sets').upsert(
                  {
                    platform_adset_id: adSet.id,
                    name: adSet.name,
                    status: adSet.status?.toLowerCase() || 'unknown',
                    campaign_id: dbCampaign.id,
                    platform: 'facebook',
                    daily_budget: adSet.daily_budget ? parseFloat(adSet.daily_budget) / 100 : null,
                    lifetime_budget: adSet.lifetime_budget ? parseFloat(adSet.lifetime_budget) / 100 : null,
                  },
                  { onConflict: 'platform_adset_id' }
                );

                if (!adSetError) {
                  adSetsCount++;

                  const { data: dbAdSet } = await supabase
                    .from('ad_sets')
                    .select('id')
                    .eq('platform_adset_id', adSet.id)
                    .maybeSingle();

                  if (dbAdSet) {
                    const adsUrl = `https://graph.facebook.com/v18.0/${adSet.id}/ads?fields=id,name,status,created_time,updated_time,creative{id,name,thumbnail_url}&access_token=${accessToken}`;
                    const adsResponse = await fetch(adsUrl);
                    const adsData = await adsResponse.json();

                    if (adsResponse.ok && adsData.data) {
                      for (const ad of adsData.data) {
                        const { error: adError } = await supabase.from('ads').upsert(
                          {
                            platform_ad_id: ad.id,
                            name: ad.name,
                            status: ad.status?.toLowerCase() || 'unknown',
                            ad_set_id: dbAdSet.id,
                            platform: 'facebook',
                            creative_id: ad.creative?.id || null,
                            creative_name: ad.creative?.name || null,
                            creative_thumbnail_url: ad.creative?.thumbnail_url || null,
                          },
                          { onConflict: 'platform_ad_id' }
                        );

                        if (!adError) {
                          adsCount++;
                        }
                      }

                      const insightsUrl = `https://graph.facebook.com/v18.0/${adSet.id}/insights?fields=impressions,clicks,spend,reach,cpc,cpm,ctr,actions&time_range={"since":"${startDate}","until":"${endDate}"}&access_token=${accessToken}`;
                      const insightsResponse = await fetch(insightsUrl);
                      const insightsData = await insightsResponse.json();

                      if (insightsResponse.ok && insightsData.data && insightsData.data.length > 0) {
                        const insights = insightsData.data[0];
                        const conversions = insights.actions?.find((a: any) => a.action_type === 'purchase')?.value || 0;
                        const conversionValue = insights.actions?.find((a: any) => a.action_type === 'purchase')?.value || 0;

                        const { error: metricError } = await supabase.from('ad_metrics').upsert(
                          {
                            entity_id: dbAdSet.id,
                            entity_type: 'adset',
                            date: endDate,
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
                          { onConflict: 'entity_id,date' }
                        );

                        if (!metricError) {
                          metricsCount++;
                        } else {
                          console.error('[facebook-ads-sync] Error inserting adset metrics:', metricError);
                        }
                      }
                    }
                  }
                }
              }
            }

            const campaignInsightsUrl = `https://graph.facebook.com/v18.0/${campaign.id}/insights?fields=impressions,clicks,spend,reach,cpc,cpm,ctr,actions&time_range={"since":"${startDate}","until":"${endDate}"}&access_token=${accessToken}`;
            const campaignInsightsResponse = await fetch(campaignInsightsUrl);
            const campaignInsightsData = await campaignInsightsResponse.json();

            if (campaignInsightsResponse.ok && campaignInsightsData.data && campaignInsightsData.data.length > 0) {
              const insights = campaignInsightsData.data[0];
              const conversions = insights.actions?.find((a: any) => a.action_type === 'purchase')?.value || 0;
              const conversionValue = insights.actions?.find((a: any) => a.action_type === 'purchase')?.value || 0;

              const { error: metricError } = await supabase.from('ad_metrics').upsert(
                {
                  entity_id: dbCampaign.id,
                  entity_type: 'campaign',
                  date: endDate,
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
                { onConflict: 'entity_id,date' }
              );

              if (!metricError) {
                metricsCount++;
              } else {
                console.error('[facebook-ads-sync] Error inserting campaign metrics:', metricError);
              }
            }
          }
        }
      }
    }

    await supabase
      .from('ad_accounts')
      .update({ last_synced_at: new Date().toISOString() })
      .eq('id', account.id);

    console.log('[facebook-ads-sync] Successfully synced:', { campaigns: campaignsCount, adSets: adSetsCount, ads: adsCount, metrics: metricsCount });

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully synced ${campaignsCount} campaigns, ${adSetsCount} ad sets, ${adsCount} ads, and ${metricsCount} metrics from ${startDate} to ${endDate}`,
        data: {
          campaigns: campaignsCount,
          adSets: adSetsCount,
          ads: adsCount,
          metrics: metricsCount,
          dateRange: { startDate, endDate },
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Facebook Ads sync error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
