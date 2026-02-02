import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface BreakdownInsight {
  impressions: string;
  clicks: string;
  spend: string;
  reach?: string;
  cpc?: string;
  cpm?: string;
  ctr?: string;
  actions?: Array<{ action_type: string; value: string }>;
  date_start: string;
  date_stop: string;
}

interface DemographicBreakdown extends BreakdownInsight {
  age: string;
  gender: string;
}

interface PlacementBreakdown extends BreakdownInsight {
  publisher_platform: string;
  platform_position: string;
  device_platform: string;
}

interface GeographicBreakdown extends BreakdownInsight {
  region?: string;
  dma?: string;
  country?: string;
}

interface HourlyBreakdown extends BreakdownInsight {
  hourly_stats_aggregated_by_advertiser_time_zone?: string;
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

    const url = new URL(req.url);
    const accountId = url.searchParams.get('accountId');
    const startDate = url.searchParams.get('startDate') || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const endDate = url.searchParams.get('endDate') || new Date().toISOString().split('T')[0];

    console.log('[breakdown-sync] ===== BREAKDOWN SYNC START =====');
    console.log('[breakdown-sync] Account ID:', accountId);
    console.log('[breakdown-sync] Date range:', startDate, 'to', endDate);

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
        JSON.stringify({ success: false, error: 'Ad account not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: tokenData, error: tokenError } = await supabase
      .from('facebook_tokens')
      .select('*')
      .eq('ad_account_id', accountId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (tokenError || !tokenData || new Date(tokenData.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid or expired access token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const accessToken = tokenData.access_token;
    let demographicsCount = 0;
    let placementsCount = 0;
    let geographicCount = 0;
    let hourlyCount = 0;

    const { data: ads, error: adsError } = await supabase
      .from('ads')
      .select('id, platform_ad_id, name, ad_account_id')
      .eq('ad_account_id', account.id)
      .eq('platform', 'facebook');

    if (adsError || !ads || ads.length === 0) {
      console.log('[breakdown-sync] No ads found. Run main sync first.');
      return new Response(
        JSON.stringify({ success: false, error: 'No ads found. Please run main sync first.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[breakdown-sync] Processing', ads.length, 'ads for breakdown data');

    for (const ad of ads) {
      console.log('[breakdown-sync] === Processing ad:', ad.name, '===');

      const baseUrl = `https://graph.facebook.com/v21.0/${ad.platform_ad_id}/insights`;
      const baseParams = `time_range={"since":"${startDate}","until":"${endDate}"}&time_increment=1&access_token=${accessToken}`;

      console.log('[breakdown-sync] 1/4: Fetching DEMOGRAPHIC breakdowns...');
      const demographicUrl = `${baseUrl}?fields=impressions,clicks,spend,reach,cpc,cpm,ctr,actions,date_start,age,gender&breakdowns=age,gender&${baseParams}`;

      try {
        const demoResponse = await fetch(demographicUrl);
        const demoData = await demoResponse.json();

        if (demoResponse.ok && demoData.data && demoData.data.length > 0) {
          console.log('[breakdown-sync]   Found', demoData.data.length, 'demographic records');

          for (const insight of demoData.data as DemographicBreakdown[]) {
            const conversions = insight.actions?.find((a) => a.action_type === 'purchase')?.value || '0';
            const conversionValue = insight.actions?.find((a) => a.action_type === 'purchase')?.value || '0';

            const impressions = parseInt(insight.impressions || '0');
            const clicks = parseInt(insight.clicks || '0');
            const spend = parseFloat(insight.spend || '0');
            const conversionsNum = parseInt(conversions);
            const revenue = parseFloat(conversionValue) * 10;

            const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
            const cpc = clicks > 0 ? spend / clicks : 0;
            const cpa = conversionsNum > 0 ? spend / conversionsNum : 0;
            const roas = spend > 0 ? revenue / spend : 0;

            const { error } = await supabase.from('ad_insights_demographics').upsert({
              user_id: user.id,
              ad_id: ad.id,
              platform_ad_id: ad.platform_ad_id,
              platform: 'facebook',
              date: insight.date_start,
              age_range: insight.age,
              gender: insight.gender,
              impressions,
              clicks,
              spend,
              conversions: conversionsNum,
              revenue,
              profit: 0,
              ctr: parseFloat(ctr.toFixed(4)),
              cpc: parseFloat(cpc.toFixed(2)),
              cpa: parseFloat(cpa.toFixed(2)),
              roas: parseFloat(roas.toFixed(2)),
              updated_at: new Date().toISOString()
            }, { onConflict: 'ad_id,date,age_range,gender' });

            if (!error) demographicsCount++;
          }
        }
      } catch (error) {
        console.error('[breakdown-sync] Error fetching demographics:', error);
      }

      console.log('[breakdown-sync] 2/4: Fetching PLACEMENT breakdowns...');
      const placementUrl = `${baseUrl}?fields=impressions,clicks,spend,reach,cpc,cpm,ctr,actions,date_start,publisher_platform,platform_position,device_platform&breakdowns=publisher_platform,platform_position,device_platform&${baseParams}`;

      try {
        const placeResponse = await fetch(placementUrl);
        const placeData = await placeResponse.json();

        if (placeResponse.ok && placeData.data && placeData.data.length > 0) {
          console.log('[breakdown-sync]   Found', placeData.data.length, 'placement records');

          for (const insight of placeData.data as PlacementBreakdown[]) {
            const conversions = insight.actions?.find((a) => a.action_type === 'purchase')?.value || '0';
            const conversionValue = insight.actions?.find((a) => a.action_type === 'purchase')?.value || '0';

            const impressions = parseInt(insight.impressions || '0');
            const clicks = parseInt(insight.clicks || '0');
            const spend = parseFloat(insight.spend || '0');
            const conversionsNum = parseInt(conversions);
            const revenue = parseFloat(conversionValue) * 10;

            const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
            const cpc = clicks > 0 ? spend / clicks : 0;
            const cpa = conversionsNum > 0 ? spend / conversionsNum : 0;
            const roas = spend > 0 ? revenue / spend : 0;

            const { error } = await supabase.from('ad_insights_placements').upsert({
              user_id: user.id,
              ad_id: ad.id,
              platform_ad_id: ad.platform_ad_id,
              platform: 'facebook',
              date: insight.date_start,
              placement_type: insight.platform_position || 'unknown',
              device_type: insight.device_platform || 'unknown',
              publisher_platform: insight.publisher_platform || 'unknown',
              impressions,
              clicks,
              spend,
              conversions: conversionsNum,
              revenue,
              profit: 0,
              ctr: parseFloat(ctr.toFixed(4)),
              cpc: parseFloat(cpc.toFixed(2)),
              cpa: parseFloat(cpa.toFixed(2)),
              roas: parseFloat(roas.toFixed(2)),
              engagement_rate: 0,
              video_views: 0,
              updated_at: new Date().toISOString()
            }, { onConflict: 'ad_id,date,placement_type,device_type,publisher_platform' });

            if (!error) placementsCount++;
          }
        }
      } catch (error) {
        console.error('[breakdown-sync] Error fetching placements:', error);
      }

      console.log('[breakdown-sync] 3/4: Fetching GEOGRAPHIC breakdowns...');
      const geoUrl = `${baseUrl}?fields=impressions,clicks,spend,reach,cpc,cpm,ctr,actions,date_start,region,dma,country&breakdowns=region,dma,country&${baseParams}`;

      try {
        const geoResponse = await fetch(geoUrl);
        const geoData = await geoResponse.json();

        if (geoResponse.ok && geoData.data && geoData.data.length > 0) {
          console.log('[breakdown-sync]   Found', geoData.data.length, 'geographic records');

          for (const insight of geoData.data as GeographicBreakdown[]) {
            const conversions = insight.actions?.find((a) => a.action_type === 'purchase')?.value || '0';
            const conversionValue = insight.actions?.find((a) => a.action_type === 'purchase')?.value || '0';

            const impressions = parseInt(insight.impressions || '0');
            const clicks = parseInt(insight.clicks || '0');
            const spend = parseFloat(insight.spend || '0');
            const conversionsNum = parseInt(conversions);
            const revenue = parseFloat(conversionValue) * 10;

            const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
            const cpc = clicks > 0 ? spend / clicks : 0;
            const cpa = conversionsNum > 0 ? spend / conversionsNum : 0;
            const roas = spend > 0 ? revenue / spend : 0;

            const { error } = await supabase.from('ad_insights_geographic').upsert({
              user_id: user.id,
              ad_id: ad.id,
              platform_ad_id: ad.platform_ad_id,
              platform: 'facebook',
              date: insight.date_start,
              country_code: insight.country || 'XX',
              country_name: insight.country || 'Unknown',
              region: insight.region || null,
              city: insight.dma || null,
              impressions,
              clicks,
              spend,
              conversions: conversionsNum,
              revenue,
              profit: 0,
              ctr: parseFloat(ctr.toFixed(4)),
              cpc: parseFloat(cpc.toFixed(2)),
              cpa: parseFloat(cpa.toFixed(2)),
              roas: parseFloat(roas.toFixed(2)),
              updated_at: new Date().toISOString()
            }, { onConflict: 'ad_id,date,country_code,region,city' });

            if (!error) geographicCount++;
          }
        }
      } catch (error) {
        console.error('[breakdown-sync] Error fetching geographic:', error);
      }

      console.log('[breakdown-sync] 4/4: Fetching HOURLY breakdowns...');
      const hourlyUrl = `${baseUrl}?fields=impressions,clicks,spend,reach,cpc,cpm,ctr,actions,date_start,hourly_stats_aggregated_by_advertiser_time_zone&breakdowns=hourly_stats_aggregated_by_advertiser_time_zone&${baseParams}`;

      try {
        const hourlyResponse = await fetch(hourlyUrl);
        const hourlyData = await hourlyResponse.json();

        if (hourlyResponse.ok && hourlyData.data && hourlyData.data.length > 0) {
          console.log('[breakdown-sync]   Found', hourlyData.data.length, 'hourly records');

          for (const insight of hourlyData.data as HourlyBreakdown[]) {
            const conversions = insight.actions?.find((a) => a.action_type === 'purchase')?.value || '0';
            const conversionValue = insight.actions?.find((a) => a.action_type === 'purchase')?.value || '0';
            const hourlyStats = insight.hourly_stats_aggregated_by_advertiser_time_zone;

            if (hourlyStats) {
              const match = hourlyStats.match(/(\d{4}-\d{2}-\d{2}):(\d{2})/);
              if (match) {
                const [, date, hour] = match;

                const impressions = parseInt(insight.impressions || '0');
                const clicks = parseInt(insight.clicks || '0');
                const spend = parseFloat(insight.spend || '0');
                const conversionsNum = parseInt(conversions);
                const revenue = parseFloat(conversionValue) * 10;

                const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
                const cpc = clicks > 0 ? spend / clicks : 0;
                const cpa = conversionsNum > 0 ? spend / conversionsNum : 0;
                const roas = spend > 0 ? revenue / spend : 0;

                const dateObj = new Date(date);
                const dayOfWeek = dateObj.getDay(); // 0-6 (Sunday-Saturday)

                const { error } = await supabase.from('ad_insights_temporal').upsert({
                  user_id: user.id,
                  ad_id: ad.id,
                  platform_ad_id: ad.platform_ad_id,
                  platform: 'facebook',
                  date,
                  hour_of_day: parseInt(hour),
                  day_of_week: dayOfWeek,
                  impressions,
                  clicks,
                  spend,
                  conversions: conversionsNum,
                  revenue,
                  profit: 0,
                  ctr: parseFloat(ctr.toFixed(4)),
                  cpc: parseFloat(cpc.toFixed(2)),
                  cpa: parseFloat(cpa.toFixed(2)),
                  roas: parseFloat(roas.toFixed(2)),
                  updated_at: new Date().toISOString()
                }, { onConflict: 'ad_id,date,hour_of_day' });

                if (!error) hourlyCount++;
              }
            }
          }
        }
      } catch (error) {
        console.error('[breakdown-sync] Error fetching hourly:', error);
      }

      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log('[breakdown-sync] Successfully synced:', {
      demographics: demographicsCount,
      placements: placementsCount,
      geographic: geographicCount,
      hourly: hourlyCount,
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: `Synced ${demographicsCount} demographic, ${placementsCount} placement, ${geographicCount} geographic, and ${hourlyCount} hourly insights`,
        data: {
          demographics: demographicsCount,
          placements: placementsCount,
          geographic: geographicCount,
          hourly: hourlyCount,
        },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[breakdown-sync] Unexpected error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'An unexpected error occurred',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
