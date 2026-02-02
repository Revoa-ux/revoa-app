import { createClient } from 'npm:@supabase/supabase-js@2';
import { checkSubscription, createSubscriptionRequiredResponse } from '../_shared/subscription-check.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface ActionRequest {
  adAccountId: string;
  action: string;
  entityType: 'campaign' | 'ad_group' | 'ad' | 'keyword';
  entityId: string;
  platformEntityId: string;
  params?: Record<string, any>;
}

interface GoogleAdsApiError {
  error?: {
    code: number;
    message: string;
    status: string;
    details?: any[];
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

    const body: ActionRequest = await req.json();
    const { adAccountId, action, entityType, entityId, platformEntityId, params } = body;

    console.log('[google-ads-actions] Executing action:', { action, entityType, platformEntityId });

    if (!adAccountId || !action || !entityType || !platformEntityId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required parameters' }),
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
          JSON.stringify({ success: false, error: 'Access token expired. Please reconnect.' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

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
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to refresh access token. Please reconnect.' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      accessToken = refreshData.access_token;
      const newExpiresAt = new Date(Date.now() + (refreshData.expires_in * 1000)).toISOString();

      await supabase.from('ad_accounts')
        .update({ access_token: accessToken, token_expires_at: newExpiresAt })
        .eq('id', account.id);
    }

    const customerId = adAccountId.replace(/-/g, '');

    const makeGoogleAdsRequest = async (endpoint: string, method: string, requestBody: any) => {
      const url = `https://googleads.googleapis.com/v18/${endpoint}`;

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'developer-token': googleDeveloperToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorData = data as GoogleAdsApiError;
        throw new Error(errorData.error?.message || `API error: ${response.statusText}`);
      }

      return data;
    };

    let result: any;
    let oldValue: string | null = null;
    let newValue: string | null = null;
    let fieldChanged: string | null = null;

    switch (action) {
      case 'pause_campaign': {
        const resourceName = `customers/${customerId}/campaigns/${platformEntityId}`;
        result = await makeGoogleAdsRequest(
          `customers/${customerId}/campaigns:mutate`,
          'POST',
          {
            operations: [{
              updateMask: 'status',
              update: {
                resourceName,
                status: 'PAUSED'
              }
            }]
          }
        );
        oldValue = 'ENABLED';
        newValue = 'PAUSED';
        fieldChanged = 'status';

        await supabase.from('ad_campaigns')
          .update({ status: 'PAUSED' })
          .eq('id', entityId);
        break;
      }

      case 'resume_campaign': {
        const resourceName = `customers/${customerId}/campaigns/${platformEntityId}`;
        result = await makeGoogleAdsRequest(
          `customers/${customerId}/campaigns:mutate`,
          'POST',
          {
            operations: [{
              updateMask: 'status',
              update: {
                resourceName,
                status: 'ENABLED'
              }
            }]
          }
        );
        oldValue = 'PAUSED';
        newValue = 'ENABLED';
        fieldChanged = 'status';

        await supabase.from('ad_campaigns')
          .update({ status: 'ENABLED' })
          .eq('id', entityId);
        break;
      }

      case 'pause_ad_group': {
        const resourceName = `customers/${customerId}/adGroups/${platformEntityId}`;
        result = await makeGoogleAdsRequest(
          `customers/${customerId}/adGroups:mutate`,
          'POST',
          {
            operations: [{
              updateMask: 'status',
              update: {
                resourceName,
                status: 'PAUSED'
              }
            }]
          }
        );
        oldValue = 'ENABLED';
        newValue = 'PAUSED';
        fieldChanged = 'status';

        await supabase.from('ad_sets')
          .update({ status: 'PAUSED' })
          .eq('id', entityId);
        break;
      }

      case 'resume_ad_group': {
        const resourceName = `customers/${customerId}/adGroups/${platformEntityId}`;
        result = await makeGoogleAdsRequest(
          `customers/${customerId}/adGroups:mutate`,
          'POST',
          {
            operations: [{
              updateMask: 'status',
              update: {
                resourceName,
                status: 'ENABLED'
              }
            }]
          }
        );
        oldValue = 'PAUSED';
        newValue = 'ENABLED';
        fieldChanged = 'status';

        await supabase.from('ad_sets')
          .update({ status: 'ENABLED' })
          .eq('id', entityId);
        break;
      }

      case 'pause_ad': {
        const resourceName = `customers/${customerId}/adGroupAds/${platformEntityId}`;
        result = await makeGoogleAdsRequest(
          `customers/${customerId}/adGroupAds:mutate`,
          'POST',
          {
            operations: [{
              updateMask: 'status',
              update: {
                resourceName,
                status: 'PAUSED'
              }
            }]
          }
        );
        oldValue = 'ENABLED';
        newValue = 'PAUSED';
        fieldChanged = 'status';

        await supabase.from('ads')
          .update({ status: 'PAUSED' })
          .eq('id', entityId);
        break;
      }

      case 'resume_ad': {
        const resourceName = `customers/${customerId}/adGroupAds/${platformEntityId}`;
        result = await makeGoogleAdsRequest(
          `customers/${customerId}/adGroupAds:mutate`,
          'POST',
          {
            operations: [{
              updateMask: 'status',
              update: {
                resourceName,
                status: 'ENABLED'
              }
            }]
          }
        );
        oldValue = 'PAUSED';
        newValue = 'ENABLED';
        fieldChanged = 'status';

        await supabase.from('ads')
          .update({ status: 'ENABLED' })
          .eq('id', entityId);
        break;
      }

      case 'adjust_campaign_budget': {
        const { budgetId, newBudgetMicros, oldBudgetMicros } = params || {};
        if (!budgetId || !newBudgetMicros) {
          throw new Error('Missing budget parameters');
        }

        const resourceName = `customers/${customerId}/campaignBudgets/${budgetId}`;
        result = await makeGoogleAdsRequest(
          `customers/${customerId}/campaignBudgets:mutate`,
          'POST',
          {
            operations: [{
              updateMask: 'amountMicros',
              update: {
                resourceName,
                amountMicros: newBudgetMicros.toString()
              }
            }]
          }
        );
        oldValue = oldBudgetMicros ? (parseInt(oldBudgetMicros) / 1000000).toString() : null;
        newValue = (parseInt(newBudgetMicros) / 1000000).toString();
        fieldChanged = 'daily_budget';

        await supabase.from('ad_campaigns')
          .update({ daily_budget: parseInt(newBudgetMicros) / 1000000 })
          .eq('id', entityId);
        break;
      }

      case 'adjust_ad_group_bid': {
        const { newCpcBidMicros, oldCpcBidMicros } = params || {};
        if (!newCpcBidMicros) {
          throw new Error('Missing bid parameters');
        }

        const resourceName = `customers/${customerId}/adGroups/${platformEntityId}`;
        result = await makeGoogleAdsRequest(
          `customers/${customerId}/adGroups:mutate`,
          'POST',
          {
            operations: [{
              updateMask: 'cpcBidMicros',
              update: {
                resourceName,
                cpcBidMicros: newCpcBidMicros.toString()
              }
            }]
          }
        );
        oldValue = oldCpcBidMicros ? (parseInt(oldCpcBidMicros) / 1000000).toString() : null;
        newValue = (parseInt(newCpcBidMicros) / 1000000).toString();
        fieldChanged = 'cpc_bid';

        await supabase.from('ad_sets')
          .update({ cpc_bid_micros: parseInt(newCpcBidMicros) })
          .eq('id', entityId);
        break;
      }

      case 'adjust_keyword_bid': {
        const { adGroupId, newCpcBidMicros, oldCpcBidMicros } = params || {};
        if (!adGroupId || !newCpcBidMicros) {
          throw new Error('Missing keyword bid parameters');
        }

        const resourceName = `customers/${customerId}/adGroupCriteria/${adGroupId}~${platformEntityId}`;
        result = await makeGoogleAdsRequest(
          `customers/${customerId}/adGroupCriteria:mutate`,
          'POST',
          {
            operations: [{
              updateMask: 'cpcBidMicros',
              update: {
                resourceName,
                cpcBidMicros: newCpcBidMicros.toString()
              }
            }]
          }
        );
        oldValue = oldCpcBidMicros ? (parseInt(oldCpcBidMicros) / 1000000).toString() : null;
        newValue = (parseInt(newCpcBidMicros) / 1000000).toString();
        fieldChanged = 'keyword_bid';

        await supabase.from('google_ads_keywords')
          .update({ cpc_bid_micros: parseInt(newCpcBidMicros) })
          .eq('id', entityId);
        break;
      }

      case 'adjust_device_bid': {
        const { device, newBidModifier, oldBidModifier, criterionId } = params || {};
        if (device === undefined || newBidModifier === undefined) {
          throw new Error('Missing device bid parameters');
        }

        const bidModifierValue = 1 + (newBidModifier / 100);

        if (criterionId) {
          const resourceName = `customers/${customerId}/campaignCriteria/${platformEntityId}~${criterionId}`;
          result = await makeGoogleAdsRequest(
            `customers/${customerId}/campaignCriteria:mutate`,
            'POST',
            {
              operations: [{
                updateMask: 'bidModifier',
                update: {
                  resourceName,
                  bidModifier: bidModifierValue
                }
              }]
            }
          );
        } else {
          result = await makeGoogleAdsRequest(
            `customers/${customerId}/campaignCriteria:mutate`,
            'POST',
            {
              operations: [{
                create: {
                  campaign: `customers/${customerId}/campaigns/${platformEntityId}`,
                  device: { type: device },
                  bidModifier: bidModifierValue
                }
              }]
            }
          );
        }

        oldValue = oldBidModifier?.toString() || '0';
        newValue = newBidModifier.toString();
        fieldChanged = `device_bid_${device.toLowerCase()}`;

        await supabase.from('google_ads_bid_adjustments')
          .upsert({
            user_id: user.id,
            ad_account_id: account.id,
            entity_type: 'campaign',
            entity_id: entityId,
            adjustment_type: 'device',
            criterion_id: criterionId || device,
            criterion_name: device,
            criterion_type: device,
            bid_modifier: newBidModifier,
          }, { onConflict: 'entity_type,entity_id,adjustment_type,criterion_id' });

        await supabase.from('google_ads_bid_adjustment_history').insert({
          user_id: user.id,
          ad_account_id: account.id,
          entity_type: 'campaign',
          entity_id: entityId,
          adjustment_type: 'device',
          criterion_id: criterionId || device,
          criterion_name: device,
          old_bid_modifier: oldBidModifier || 0,
          new_bid_modifier: newBidModifier,
          action_source: params?.actionSource || 'manual',
          automation_rule_id: params?.automationRuleId || null,
        });
        break;
      }

      case 'adjust_location_bid': {
        const { locationId, newBidModifier, oldBidModifier, criterionId } = params || {};
        if (!locationId || newBidModifier === undefined) {
          throw new Error('Missing location bid parameters');
        }

        const bidModifierValue = 1 + (newBidModifier / 100);

        const resourceName = `customers/${customerId}/campaignCriteria/${platformEntityId}~${criterionId}`;
        result = await makeGoogleAdsRequest(
          `customers/${customerId}/campaignCriteria:mutate`,
          'POST',
          {
            operations: [{
              updateMask: 'bidModifier',
              update: {
                resourceName,
                bidModifier: bidModifierValue
              }
            }]
          }
        );

        oldValue = oldBidModifier?.toString() || '0';
        newValue = newBidModifier.toString();
        fieldChanged = 'location_bid';

        await supabase.from('google_ads_locations')
          .update({ bid_modifier: newBidModifier })
          .eq('id', locationId);

        await supabase.from('google_ads_bid_adjustment_history').insert({
          user_id: user.id,
          ad_account_id: account.id,
          entity_type: 'campaign',
          entity_id: entityId,
          adjustment_type: 'location',
          criterion_id: criterionId,
          old_bid_modifier: oldBidModifier || 0,
          new_bid_modifier: newBidModifier,
          action_source: params?.actionSource || 'manual',
          automation_rule_id: params?.automationRuleId || null,
        });
        break;
      }

      case 'adjust_audience_bid': {
        const { audienceId, adGroupPlatformId, newBidModifier, oldBidModifier, criterionId } = params || {};
        if (!audienceId || newBidModifier === undefined) {
          throw new Error('Missing audience bid parameters');
        }

        const bidModifierValue = 1 + (newBidModifier / 100);

        const resourceName = `customers/${customerId}/adGroupCriteria/${adGroupPlatformId}~${criterionId}`;
        result = await makeGoogleAdsRequest(
          `customers/${customerId}/adGroupCriteria:mutate`,
          'POST',
          {
            operations: [{
              updateMask: 'bidModifier',
              update: {
                resourceName,
                bidModifier: bidModifierValue
              }
            }]
          }
        );

        oldValue = oldBidModifier?.toString() || '0';
        newValue = newBidModifier.toString();
        fieldChanged = 'audience_bid';

        await supabase.from('google_ads_audiences')
          .update({ bid_modifier: newBidModifier })
          .eq('id', audienceId);

        await supabase.from('google_ads_bid_adjustment_history').insert({
          user_id: user.id,
          ad_account_id: account.id,
          entity_type: 'ad_group',
          entity_id: entityId,
          adjustment_type: 'audience',
          criterion_id: criterionId,
          old_bid_modifier: oldBidModifier || 0,
          new_bid_modifier: newBidModifier,
          action_source: params?.actionSource || 'manual',
          automation_rule_id: params?.automationRuleId || null,
        });
        break;
      }

      case 'adjust_ad_schedule_bid': {
        const { scheduleId, newBidModifier, oldBidModifier, criterionId } = params || {};
        if (!scheduleId || newBidModifier === undefined) {
          throw new Error('Missing ad schedule bid parameters');
        }

        const bidModifierValue = 1 + (newBidModifier / 100);

        const resourceName = `customers/${customerId}/campaignCriteria/${platformEntityId}~${criterionId}`;
        result = await makeGoogleAdsRequest(
          `customers/${customerId}/campaignCriteria:mutate`,
          'POST',
          {
            operations: [{
              updateMask: 'bidModifier',
              update: {
                resourceName,
                bidModifier: bidModifierValue
              }
            }]
          }
        );

        oldValue = oldBidModifier?.toString() || '0';
        newValue = newBidModifier.toString();
        fieldChanged = 'ad_schedule_bid';

        await supabase.from('google_ads_ad_schedules')
          .update({ bid_modifier: newBidModifier })
          .eq('id', scheduleId);

        await supabase.from('google_ads_bid_adjustment_history').insert({
          user_id: user.id,
          ad_account_id: account.id,
          entity_type: 'campaign',
          entity_id: entityId,
          adjustment_type: 'ad_schedule',
          criterion_id: criterionId,
          old_bid_modifier: oldBidModifier || 0,
          new_bid_modifier: newBidModifier,
          action_source: params?.actionSource || 'manual',
          automation_rule_id: params?.automationRuleId || null,
        });
        break;
      }

      case 'add_negative_keyword': {
        const { adGroupPlatformId, keywordText, matchType } = params || {};
        if (!adGroupPlatformId || !keywordText) {
          throw new Error('Missing negative keyword parameters');
        }

        result = await makeGoogleAdsRequest(
          `customers/${customerId}/adGroupCriteria:mutate`,
          'POST',
          {
            operations: [{
              create: {
                adGroup: `customers/${customerId}/adGroups/${adGroupPlatformId}`,
                keyword: {
                  text: keywordText,
                  matchType: matchType || 'EXACT'
                },
                negative: true
              }
            }]
          }
        );

        newValue = keywordText;
        fieldChanged = 'negative_keyword';
        break;
      }

      case 'exclude_placement': {
        const { placementUrl, placementType } = params || {};
        if (!placementUrl) {
          throw new Error('Missing placement parameters');
        }

        const criterionType = placementType === 'YOUTUBE_CHANNEL' ? 'youtubeChannel' :
                             placementType === 'YOUTUBE_VIDEO' ? 'youtubeVideo' :
                             placementType === 'MOBILE_APP' ? 'mobileApplication' : 'placement';

        result = await makeGoogleAdsRequest(
          `customers/${customerId}/campaignCriteria:mutate`,
          'POST',
          {
            operations: [{
              create: {
                campaign: `customers/${customerId}/campaigns/${platformEntityId}`,
                [criterionType]: criterionType === 'placement' ? { url: placementUrl } : { channelId: placementUrl },
                negative: true
              }
            }]
          }
        );

        newValue = placementUrl;
        fieldChanged = 'excluded_placement';

        await supabase.from('google_ads_placements').insert({
          user_id: user.id,
          ad_account_id: account.id,
          entity_type: 'campaign',
          entity_id: entityId,
          placement_url: placementUrl,
          placement_type: placementType || 'WEBSITE',
          is_excluded: true,
          status: 'ENABLED',
        });
        break;
      }

      case 'change_bidding_strategy': {
        const { strategyType, targetCpa, targetRoas } = params || {};
        if (!strategyType) {
          throw new Error('Missing bidding strategy parameters');
        }

        const resourceName = `customers/${customerId}/campaigns/${platformEntityId}`;
        const updateFields: Record<string, any> = {};
        let updateMask = '';

        switch (strategyType) {
          case 'TARGET_CPA':
            updateFields.targetCpa = { targetCpaMicros: Math.round((targetCpa || 10) * 1000000).toString() };
            updateMask = 'targetCpa';
            break;
          case 'TARGET_ROAS':
            updateFields.targetRoas = { targetRoas: (targetRoas || 2).toString() };
            updateMask = 'targetRoas';
            break;
          case 'MAXIMIZE_CONVERSIONS':
            updateFields.maximizeConversions = {};
            updateMask = 'maximizeConversions';
            break;
          case 'MAXIMIZE_CONVERSION_VALUE':
            updateFields.maximizeConversionValue = {};
            updateMask = 'maximizeConversionValue';
            break;
          case 'MANUAL_CPC':
            updateFields.manualCpc = { enhancedCpcEnabled: params?.enhancedCpc || false };
            updateMask = 'manualCpc';
            break;
        }

        result = await makeGoogleAdsRequest(
          `customers/${customerId}/campaigns:mutate`,
          'POST',
          {
            operations: [{
              updateMask,
              update: {
                resourceName,
                ...updateFields
              }
            }]
          }
        );

        newValue = strategyType;
        fieldChanged = 'bidding_strategy';

        await supabase.from('ad_campaigns')
          .update({
            bidding_strategy_type: strategyType,
            target_cpa: targetCpa || null,
            target_roas: targetRoas || null,
          })
          .eq('id', entityId);
        break;
      }

      default:
        return new Response(
          JSON.stringify({ success: false, error: `Unknown action: ${action}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    console.log('[google-ads-actions] Action completed successfully:', { action, result });

    return new Response(
      JSON.stringify({
        success: true,
        action,
        entityType,
        entityId,
        oldValue,
        newValue,
        fieldChanged,
        apiResponse: result,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[google-ads-actions] Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'An unexpected error occurred',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
