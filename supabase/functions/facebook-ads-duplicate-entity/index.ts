import { createClient } from 'npm:@supabase/supabase-js@2.39.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const {
      userId,
      platform,
      entityType,
      entityId,
      nameSuffix = 'Copy',
      // Segment Builder options
      targetingOverrides,
      bidStrategy,
      bidAmount,
      createWideOpen = false,
      pauseSource = false,
      buildType = 'new_campaign',
      selectedSegments = [],
      budget
    } = await req.json();

    if (!userId || !platform || !entityType || !entityId) {
      return new Response(
        JSON.stringify({ success: false, message: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[duplicate-entity] Duplicating ${entityType} ${entityId} on ${platform}`);

    // Get the ad account and access token
    const { data: adAccounts } = await supabase
      .from('ad_accounts')
      .select('*, integration_connections(*)')
      .eq('user_id', userId)
      .eq('platform', platform)
      .single();

    if (!adAccounts?.integration_connections?.access_token) {
      return new Response(
        JSON.stringify({ success: false, message: 'No access token found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const accessToken = adAccounts.integration_connections.access_token;

    // Only handle Facebook Ads
    if (platform !== 'facebook') {
      return new Response(
        JSON.stringify({ success: false, message: 'This function only handles Facebook Ads' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Facebook API endpoint for copying
    const copyEndpoint = entityType === 'campaign'
      ? 'campaigns'
      : entityType === 'adset'
      ? 'adsets'
      : 'ads';

    // Get the original entity details to create a copy
    const getUrl = `https://graph.facebook.com/v21.0/${entityId}?access_token=${accessToken}&fields=name,status`;
    const getResponse = await fetch(getUrl);

    if (!getResponse.ok) {
      const error = await getResponse.json();
      console.error('[duplicate-entity] Facebook error fetching entity:', error);
      return new Response(
        JSON.stringify({ success: false, message: 'Failed to fetch entity details' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const originalEntity = await getResponse.json();
    const newName = `${originalEntity.name} - ${nameSuffix}`;

    // Helper function to transform segments to Facebook targeting spec
    const buildTargetingSpec = (segments: any[], originalCountries: string[] = []) => {
      const targeting: Record<string, any> = {};

      // Always include country targeting from original
      if (originalCountries.length > 0) {
        targeting.geo_locations = { countries: originalCountries };
      }

      for (const segment of segments) {
        if (segment.type === 'demographic') {
          // Parse age range like "25-34"
          const [minAge, maxAge] = segment.data.ageRange.split('-').map((n: string) => parseInt(n));
          if (minAge) targeting.age_min = minAge;
          if (maxAge) targeting.age_max = maxAge;

          // Gender: 1 = male, 2 = female
          if (!targeting.genders) targeting.genders = [];
          targeting.genders.push(segment.data.gender === 'male' ? 1 : 2);
        } else if (segment.type === 'geographic') {
          // Add specific locations
          if (!targeting.geo_locations) targeting.geo_locations = {};
          if (!targeting.geo_locations.regions) targeting.geo_locations.regions = [];

          // Parse location type (e.g., "California, US" -> region)
          targeting.geo_locations.regions.push({
            key: segment.data.location_key || segment.data.location,
            name: segment.data.location
          });
        } else if (segment.type === 'placement') {
          // Handle placements
          if (!targeting.publisher_platforms) targeting.publisher_platforms = [];
          if (!targeting.facebook_positions) targeting.facebook_positions = [];
          if (!targeting.instagram_positions) targeting.instagram_positions = [];

          const platform = segment.data.platform.toLowerCase();
          if (platform === 'facebook') {
            if (!targeting.publisher_platforms.includes('facebook')) {
              targeting.publisher_platforms.push('facebook');
            }
            if (segment.data.placementType === 'feed') {
              targeting.facebook_positions.push('feed');
            } else if (segment.data.placementType === 'story') {
              targeting.facebook_positions.push('story');
            } else if (segment.data.placementType === 'reel') {
              targeting.facebook_positions.push('video_feeds');
            }
          } else if (platform === 'instagram') {
            if (!targeting.publisher_platforms.includes('instagram')) {
              targeting.publisher_platforms.push('instagram');
            }
            if (segment.data.placementType === 'feed') {
              targeting.instagram_positions.push('stream');
            } else if (segment.data.placementType === 'story') {
              targeting.instagram_positions.push('story');
            } else if (segment.data.placementType === 'reel') {
              targeting.instagram_positions.push('reels');
            }
          }
        }
      }

      return targeting;
    };

    // Determine if we're creating segment-based campaigns
    const isSegmentBuild = selectedSegments && selectedSegments.length > 0;
    const createdEntities: string[] = [];

    // Use Facebook's copy endpoint
    const copyUrl = `https://graph.facebook.com/v21.0/${entityId}/copies?access_token=${accessToken}`;

    const copyPayload: Record<string, any> = {
      status_option: 'PAUSED', // Always create as paused for safety
    };

    // Add rename for campaigns and ad sets
    if (entityType === 'campaign' || entityType === 'adset') {
      copyPayload.deep_copy = true;
      copyPayload.rename_options = {
        rename_suffix: ` - ${nameSuffix}`
      };
    }

    // Apply targeting overrides for segment builds
    if (isSegmentBuild && targetingOverrides) {
      copyPayload.targeting = targetingOverrides;
    }

    // Apply bid strategy changes
    if (bidStrategy && bidStrategy !== 'highest_volume') {
      if (bidStrategy === 'cost_per_result_goal' && bidAmount) {
        copyPayload.bid_strategy = 'COST_CAP';
        copyPayload.bid_amount = Math.round(bidAmount * 100); // Convert to cents
      } else if (bidStrategy === 'roas_goal' && bidAmount) {
        copyPayload.bid_strategy = 'MIN_ROAS';
        copyPayload.bid_amount = Math.round(bidAmount * 100); // ROAS as percentage
      }
    }

    // Apply budget changes
    if (budget && entityType !== 'ad') {
      copyPayload.daily_budget = Math.round(budget * 100); // Convert to cents
    }

    // For segment builds from campaigns, create multiple ad sets
    if (isSegmentBuild && entityType === 'campaign') {
      // Create the main campaign copy first
      const campaignResponse = await fetch(copyUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(copyPayload)
      });

      if (!campaignResponse.ok) {
        const error = await campaignResponse.json();
        console.error('[duplicate-entity] Facebook error copying campaign:', error);
        return new Response(
          JSON.stringify({ success: false, message: error.error?.message || 'Failed to duplicate campaign' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const campaignResult = await campaignResponse.json();
      const newCampaignId = campaignResult.copied_campaign_id || campaignResult.id;
      createdEntities.push(newCampaignId);

      console.log(`[duplicate-entity] Created campaign ${newCampaignId}`);

      // Now create ad sets within the new campaign
      // Get ad sets from original campaign to duplicate
      const adsetsUrl = `https://graph.facebook.com/v21.0/${entityId}/adsets?access_token=${accessToken}&fields=id,name&limit=1`;
      const adsetsResponse = await fetch(adsetsUrl);

      if (adsetsResponse.ok) {
        const adsetsData = await adsetsResponse.json();
        const sourceAdSetId = adsetsData.data?.[0]?.id;

        if (sourceAdSetId) {
          // Create targeted ad set(s)
          if (createWideOpen) {
            // Create 1 targeted + 1 wide open
            const targetedPayload = {
              campaign_id: newCampaignId,
              name: `${adsetsData.data[0].name} - Targeted`,
              targeting: targetingOverrides || buildTargetingSpec(selectedSegments, []),
              status: 'PAUSED'
            };

            const targetedUrl = `https://graph.facebook.com/v21.0/${sourceAdSetId}/copies?access_token=${accessToken}`;
            const targetedResponse = await fetch(targetedUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(targetedPayload)
            });

            if (targetedResponse.ok) {
              const targetedResult = await targetedResponse.json();
              createdEntities.push(targetedResult.copied_adset_id || targetedResult.id);
            }

            // Create wide open ad set (country targeting only)
            const wideOpenPayload = {
              campaign_id: newCampaignId,
              name: `${adsetsData.data[0].name} - Wide Open`,
              targeting: { geo_locations: { countries: [] } }, // Will use campaign's country
              status: 'PAUSED'
            };

            const wideOpenResponse = await fetch(targetedUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(wideOpenPayload)
            });

            if (wideOpenResponse.ok) {
              const wideOpenResult = await wideOpenResponse.json();
              createdEntities.push(wideOpenResult.copied_adset_id || wideOpenResult.id);
            }
          } else {
            // Create 2 identical targeted ad sets
            for (let i = 1; i <= 2; i++) {
              const adsetPayload = {
                campaign_id: newCampaignId,
                name: `${adsetsData.data[0].name} - (${i})`,
                targeting: targetingOverrides || buildTargetingSpec(selectedSegments, []),
                status: 'PAUSED'
              };

              const adsetUrl = `https://graph.facebook.com/v21.0/${sourceAdSetId}/copies?access_token=${accessToken}`;
              const adsetResponse = await fetch(adsetUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(adsetPayload)
              });

              if (adsetResponse.ok) {
                const adsetResult = await adsetResponse.json();
                createdEntities.push(adsetResult.copied_adset_id || adsetResult.id);
              }
            }
          }
        }
      }

      // Pause source campaign if requested
      if (pauseSource) {
        const pauseUrl = `https://graph.facebook.com/v21.0/${entityId}?access_token=${accessToken}`;
        await fetch(pauseUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'PAUSED' })
        });
      }

      // Track the build in database
      await supabase.from('segment_builds').insert({
        user_id: userId,
        source_entity_type: 'campaign',
        source_entity_id: entityId,
        source_entity_name: originalEntity.name,
        platform,
        created_campaign_id: newCampaignId,
        created_ad_set_ids: createdEntities.slice(1), // All except campaign
        selected_segments: selectedSegments,
        targeting_applied: targetingOverrides || buildTargetingSpec(selectedSegments, []),
        build_type: 'new_campaign',
        bid_strategy: bidStrategy,
        bid_amount: bidAmount,
        budget_daily: budget,
        created_wide_open: createWideOpen,
        paused_source_entity: pauseSource
      });

      console.log(`[duplicate-entity] Segment build complete. Created ${createdEntities.length} entities`);

      return new Response(
        JSON.stringify({
          success: true,
          newCampaignId,
          createdEntities,
          message: `Successfully created segment-based campaign with ${createdEntities.length - 1} ad sets`
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Standard single entity duplication
    const copyResponse = await fetch(copyUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(copyPayload)
    });

    if (!copyResponse.ok) {
      const error = await copyResponse.json();
      console.error('[duplicate-entity] Facebook error copying:', error);
      return new Response(
        JSON.stringify({ success: false, message: error.error?.message || 'Failed to duplicate entity' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result = await copyResponse.json();
    const newEntityId = result.copied_campaign_id || result.copied_adset_id || result.copied_ad_id || result.id;

    console.log(`[duplicate-entity] Successfully duplicated ${entityType} ${entityId} to ${newEntityId}`);

    // Pause source if requested
    if (pauseSource) {
      const pauseUrl = `https://graph.facebook.com/v21.0/${entityId}?access_token=${accessToken}`;
      await fetch(pauseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'PAUSED' })
      });
    }

    // Track segment build if applicable
    if (isSegmentBuild) {
      await supabase.from('segment_builds').insert({
        user_id: userId,
        source_entity_type: entityType,
        source_entity_id: entityId,
        source_entity_name: originalEntity.name,
        platform,
        created_ad_set_ids: entityType === 'adset' ? [newEntityId] : [],
        selected_segments: selectedSegments,
        targeting_applied: targetingOverrides || buildTargetingSpec(selectedSegments, []),
        build_type: buildType,
        bid_strategy: bidStrategy,
        bid_amount: bidAmount,
        budget_daily: budget,
        created_wide_open: false,
        paused_source_entity: pauseSource
      });
    }

    // Trigger a sync to update local database with new entity
    console.log('[duplicate-entity] New entity created, will be synced on next Facebook Ads sync');

    return new Response(
      JSON.stringify({
        success: true,
        newEntityId,
        newName,
        message: `Successfully created copy of ${originalEntity.name}`
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[duplicate-entity] Error:', error);
    return new Response(
      JSON.stringify({ success: false, message: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
