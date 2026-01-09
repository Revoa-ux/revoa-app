/**
 * Facebook Ads Breakdown Sync Service
 *
 * Fetches detailed breakdown data from Facebook Ads API to power Rex AI's deep intelligence:
 * - Demographics (age, gender)
 * - Placements (device, platform, position)
 * - Geographic (country, region)
 * - Temporal (hourly performance)
 */

import { supabase } from './supabase';

interface BreakdownRow {
  date_start: string;
  date_stop: string;
  impressions: string;
  clicks: string;
  spend: string;
  actions?: Array<{
    action_type: string;
    value: string;
  }>;
  action_values?: Array<{
    action_type: string;
    value: string;
  }>;
  // Breakdown-specific fields
  age?: string;
  gender?: string;
  publisher_platform?: string;
  platform_position?: string;
  device_platform?: string;
  country?: string;
  region?: string;
  hourly_stats_aggregated_by_advertiser_time_zone?: string;
}

interface BreakdownResponse {
  data: BreakdownRow[];
  paging?: {
    cursors: {
      before: string;
      after: string;
    };
    next?: string;
  };
}

export class FacebookBreakdownSyncService {
  private accessToken: string;
  private userId: string;

  constructor(accessToken: string, userId: string) {
    this.accessToken = accessToken;
    this.userId = userId;
  }

  /**
   * Sync all breakdowns for an ad
   */
  async syncAdBreakdowns(platformAdId: string, datePreset: string = 'last_30d'): Promise<void> {
    console.log(`[FB Breakdown Sync] Starting sync for ad ${platformAdId}`);

    try {
      // Run all breakdown syncs in parallel
      await Promise.all([
        this.syncDemographicBreakdown(platformAdId, datePreset),
        this.syncPlacementBreakdown(platformAdId, datePreset),
        this.syncGeographicBreakdown(platformAdId, datePreset),
        this.syncTemporalBreakdown(platformAdId, datePreset)
      ]);

      console.log(`[FB Breakdown Sync] Completed sync for ad ${platformAdId}`);
    } catch (error) {
      console.error(`[FB Breakdown Sync] Error syncing ad ${platformAdId}:`, error);
      throw error;
    }
  }

  /**
   * Sync demographics breakdown (age, gender)
   */
  private async syncDemographicBreakdown(platformAdId: string, datePreset: string): Promise<void> {
    try {
      const url = `https://graph.facebook.com/v18.0/${platformAdId}/insights` +
        `?access_token=${this.accessToken}` +
        `&date_preset=${datePreset}` +
        `&time_increment=1` +
        `&breakdowns=age,gender` +
        `&fields=date_start,date_stop,impressions,clicks,spend,actions,action_values,age,gender` +
        `&level=ad` +
        `&limit=500`;

      const response = await fetch(url);

      if (!response.ok) {
        const error = await response.json();
        console.error(`[FB Demographics] API Error:`, error);
        return; // Gracefully skip if breakdown not available
      }

      const data: BreakdownResponse = await response.json();

      if (!data.data || data.data.length === 0) {
        console.log(`[FB Demographics] No data for ad ${platformAdId}`);
        return;
      }

      // Get our internal ad ID
      const { data: ad } = await supabase
        .from('ads')
        .select('id')
        .eq('platform_ad_id', platformAdId)
        .eq('user_id', this.userId)
        .single();

      if (!ad) {
        console.warn(`[FB Demographics] Ad ${platformAdId} not found in database`);
        return;
      }

      // Process and upsert each row
      for (const row of data.data) {
        const conversions = this.extractActionValue(row.actions, 'purchase') ||
                           this.extractActionValue(row.actions, 'offsite_conversion.fb_pixel_purchase');
        const conversionValue = this.extractActionValue(row.action_values, 'purchase') ||
                               this.extractActionValue(row.action_values, 'offsite_conversion.fb_pixel_purchase');

        const impressions = parseInt(row.impressions) || 0;
        const clicks = parseInt(row.clicks) || 0;
        const spend = parseFloat(row.spend) || 0;
        const conversionsNum = parseInt(conversions) || 0;
        const conversionValueNum = parseFloat(conversionValue) || 0;

        const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
        const cpc = clicks > 0 ? spend / clicks : 0;
        const cpa = conversionsNum > 0 ? spend / conversionsNum : 0;
        const roas = spend > 0 ? conversionValueNum / spend : 0;

        await supabase
          .from('ad_insights_demographics')
          .upsert({
            user_id: this.userId,
            ad_id: ad.id,
            platform_ad_id: platformAdId,
            platform: 'facebook',
            date: row.date_start,
            age_range: row.age || 'unknown',
            gender: row.gender || 'unknown',
            impressions,
            clicks,
            spend,
            conversions: conversionsNum,
            conversion_value: conversionValueNum,
            ctr: parseFloat(ctr.toFixed(4)),
            cpc: parseFloat(cpc.toFixed(2)),
            cpa: parseFloat(cpa.toFixed(2)),
            roas: parseFloat(roas.toFixed(2)),
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'platform_ad_id,date,age_range,gender'
          });
      }

      console.log(`[FB Demographics] Synced ${data.data.length} rows for ad ${platformAdId}`);
    } catch (error) {
      console.error(`[FB Demographics] Error:`, error);
      // Don't throw - allow other breakdowns to continue
    }
  }

  /**
   * Sync placement breakdown
   */
  private async syncPlacementBreakdown(platformAdId: string, datePreset: string): Promise<void> {
    try {
      const url = `https://graph.facebook.com/v18.0/${platformAdId}/insights` +
        `?access_token=${this.accessToken}` +
        `&date_preset=${datePreset}` +
        `&time_increment=1` +
        `&breakdowns=publisher_platform,platform_position,device_platform` +
        `&fields=date_start,date_stop,impressions,clicks,spend,actions,action_values,publisher_platform,platform_position,device_platform` +
        `&level=ad` +
        `&limit=500`;

      const response = await fetch(url);

      if (!response.ok) {
        const error = await response.json();
        console.error(`[FB Placements] API Error:`, error);
        return;
      }

      const data: BreakdownResponse = await response.json();

      if (!data.data || data.data.length === 0) {
        console.log(`[FB Placements] No data for ad ${platformAdId}`);
        return;
      }

      const { data: ad } = await supabase
        .from('ads')
        .select('id')
        .eq('platform_ad_id', platformAdId)
        .eq('user_id', this.userId)
        .single();

      if (!ad) {
        console.warn(`[FB Placements] Ad ${platformAdId} not found in database`);
        return;
      }

      for (const row of data.data) {
        const conversions = this.extractActionValue(row.actions, 'purchase') ||
                           this.extractActionValue(row.actions, 'offsite_conversion.fb_pixel_purchase');
        const conversionValue = this.extractActionValue(row.action_values, 'purchase') ||
                               this.extractActionValue(row.action_values, 'offsite_conversion.fb_pixel_purchase');

        const impressions = parseInt(row.impressions) || 0;
        const clicks = parseInt(row.clicks) || 0;
        const spend = parseFloat(row.spend) || 0;
        const conversionsNum = parseInt(conversions) || 0;
        const conversionValueNum = parseFloat(conversionValue) || 0;

        const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
        const cpc = clicks > 0 ? spend / clicks : 0;
        const cpa = conversionsNum > 0 ? spend / conversionsNum : 0;
        const roas = spend > 0 ? conversionValueNum / spend : 0;

        await supabase
          .from('ad_insights_placements')
          .upsert({
            user_id: this.userId,
            ad_id: ad.id,
            platform_ad_id: platformAdId,
            platform: 'facebook',
            date: row.date_start,
            publisher_platform: row.publisher_platform || 'unknown',
            platform_position: row.platform_position || 'unknown',
            device_platform: row.device_platform || 'unknown',
            impressions,
            clicks,
            spend,
            conversions: conversionsNum,
            conversion_value: conversionValueNum,
            ctr: parseFloat(ctr.toFixed(4)),
            cpc: parseFloat(cpc.toFixed(2)),
            cpa: parseFloat(cpa.toFixed(2)),
            roas: parseFloat(roas.toFixed(2)),
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'platform_ad_id,date,publisher_platform,platform_position,device_platform'
          });
      }

      console.log(`[FB Placements] Synced ${data.data.length} rows for ad ${platformAdId}`);
    } catch (error) {
      console.error(`[FB Placements] Error:`, error);
    }
  }

  /**
   * Sync geographic breakdown
   */
  private async syncGeographicBreakdown(platformAdId: string, datePreset: string): Promise<void> {
    try {
      const url = `https://graph.facebook.com/v18.0/${platformAdId}/insights` +
        `?access_token=${this.accessToken}` +
        `&date_preset=${datePreset}` +
        `&time_increment=1` +
        `&breakdowns=country,region` +
        `&fields=date_start,date_stop,impressions,clicks,spend,actions,action_values,country,region` +
        `&level=ad` +
        `&limit=500`;

      const response = await fetch(url);

      if (!response.ok) {
        const error = await response.json();
        console.error(`[FB Geographic] API Error:`, error);
        return;
      }

      const data: BreakdownResponse = await response.json();

      if (!data.data || data.data.length === 0) {
        console.log(`[FB Geographic] No data for ad ${platformAdId}`);
        return;
      }

      const { data: ad } = await supabase
        .from('ads')
        .select('id')
        .eq('platform_ad_id', platformAdId)
        .eq('user_id', this.userId)
        .single();

      if (!ad) {
        console.warn(`[FB Geographic] Ad ${platformAdId} not found in database`);
        return;
      }

      for (const row of data.data) {
        const conversions = this.extractActionValue(row.actions, 'purchase') ||
                           this.extractActionValue(row.actions, 'offsite_conversion.fb_pixel_purchase');
        const conversionValue = this.extractActionValue(row.action_values, 'purchase') ||
                               this.extractActionValue(row.action_values, 'offsite_conversion.fb_pixel_purchase');

        const impressions = parseInt(row.impressions) || 0;
        const clicks = parseInt(row.clicks) || 0;
        const spend = parseFloat(row.spend) || 0;
        const conversionsNum = parseInt(conversions) || 0;
        const conversionValueNum = parseFloat(conversionValue) || 0;

        const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
        const cpc = clicks > 0 ? spend / clicks : 0;
        const cpa = conversionsNum > 0 ? spend / conversionsNum : 0;
        const roas = spend > 0 ? conversionValueNum / spend : 0;

        await supabase
          .from('ad_insights_geographic')
          .upsert({
            user_id: this.userId,
            ad_id: ad.id,
            platform_ad_id: platformAdId,
            platform: 'facebook',
            date: row.date_start,
            country: row.country || 'unknown',
            region: row.region || null,
            city: null, // Not available in this breakdown
            impressions,
            clicks,
            spend,
            conversions: conversionsNum,
            conversion_value: conversionValueNum,
            ctr: parseFloat(ctr.toFixed(4)),
            cpc: parseFloat(cpc.toFixed(2)),
            cpa: parseFloat(cpa.toFixed(2)),
            roas: parseFloat(roas.toFixed(2)),
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'platform_ad_id,date,country,region,city'
          });
      }

      console.log(`[FB Geographic] Synced ${data.data.length} rows for ad ${platformAdId}`);
    } catch (error) {
      console.error(`[FB Geographic] Error:`, error);
    }
  }

  /**
   * Sync temporal (hourly) breakdown
   */
  private async syncTemporalBreakdown(platformAdId: string, datePreset: string): Promise<void> {
    try {
      const url = `https://graph.facebook.com/v18.0/${platformAdId}/insights` +
        `?access_token=${this.accessToken}` +
        `&date_preset=${datePreset}` +
        `&time_increment=1` +
        `&breakdowns=hourly_stats_aggregated_by_advertiser_time_zone` +
        `&fields=date_start,date_stop,impressions,clicks,spend,actions,action_values,hourly_stats_aggregated_by_advertiser_time_zone` +
        `&level=ad` +
        `&limit=500`;

      const response = await fetch(url);

      if (!response.ok) {
        const error = await response.json();
        console.error(`[FB Temporal] API Error:`, error);
        return;
      }

      const data: BreakdownResponse = await response.json();

      if (!data.data || data.data.length === 0) {
        console.log(`[FB Temporal] No data for ad ${platformAdId}`);
        return;
      }

      const { data: ad } = await supabase
        .from('ads')
        .select('id')
        .eq('platform_ad_id', platformAdId)
        .eq('user_id', this.userId)
        .single();

      if (!ad) {
        console.warn(`[FB Temporal] Ad ${platformAdId} not found in database`);
        return;
      }

      for (const row of data.data) {
        // Extract hour from hourly_stats field (format: "2024-01-09 14:00:00")
        const hourlyStats = row.hourly_stats_aggregated_by_advertiser_time_zone;
        if (!hourlyStats) continue;

        const hour = parseInt(hourlyStats.split(' ')[1].split(':')[0]);
        if (isNaN(hour)) continue;

        const conversions = this.extractActionValue(row.actions, 'purchase') ||
                           this.extractActionValue(row.actions, 'offsite_conversion.fb_pixel_purchase');
        const conversionValue = this.extractActionValue(row.action_values, 'purchase') ||
                               this.extractActionValue(row.action_values, 'offsite_conversion.fb_pixel_purchase');

        const impressions = parseInt(row.impressions) || 0;
        const clicks = parseInt(row.clicks) || 0;
        const spend = parseFloat(row.spend) || 0;
        const conversionsNum = parseInt(conversions) || 0;
        const conversionValueNum = parseFloat(conversionValue) || 0;

        const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
        const cpc = clicks > 0 ? spend / clicks : 0;
        const cpa = conversionsNum > 0 ? spend / conversionsNum : 0;
        const roas = spend > 0 ? conversionValueNum / spend : 0;

        await supabase
          .from('ad_insights_temporal')
          .upsert({
            user_id: this.userId,
            ad_id: ad.id,
            platform_ad_id: platformAdId,
            platform: 'facebook',
            date: row.date_start,
            hour,
            impressions,
            clicks,
            spend,
            conversions: conversionsNum,
            conversion_value: conversionValueNum,
            ctr: parseFloat(ctr.toFixed(4)),
            cpc: parseFloat(cpc.toFixed(2)),
            cpa: parseFloat(cpa.toFixed(2)),
            roas: parseFloat(roas.toFixed(2)),
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'platform_ad_id,date,hour'
          });
      }

      console.log(`[FB Temporal] Synced ${data.data.length} rows for ad ${platformAdId}`);
    } catch (error) {
      console.error(`[FB Temporal] Error:`, error);
    }
  }

  /**
   * Extract action value from actions array
   */
  private extractActionValue(actions: BreakdownRow['actions'], actionType: string): string {
    if (!actions) return '0';
    const action = actions.find(a => a.action_type === actionType);
    return action?.value || '0';
  }
}
