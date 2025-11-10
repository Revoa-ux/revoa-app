import { supabase, getCurrentUser } from './supabase';
import type {
  AdAccount,
  AdCampaign,
  AdMetric,
  Ad,
  AdCreativePerformance,
  AggregatedMetrics,
  FacebookOAuthResponse,
  SyncResponse,
  DisconnectResponse,
  AdPlatform,
} from '../types/ads';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

export class FacebookAdsService {
  private getAuthHeaders = async () => {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;

    if (!token) {
      throw new Error('Not authenticated');
    }

    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  };

  async getAdAccounts(platform?: AdPlatform): Promise<AdAccount[]> {
    try {
      console.log('[FacebookAds] === FETCHING AD ACCOUNTS ===');
      console.log('[FacebookAds] Platform filter:', platform || 'all');

      let query = supabase
        .from('ad_accounts')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (platform) {
        query = query.eq('platform', platform);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[FacebookAds] ERROR fetching accounts:', error);
        throw error;
      }

      console.log('[FacebookAds] Found', data?.length || 0, 'ad accounts');
      if (data && data.length > 0) {
        console.log('[FacebookAds] Account details:', data.map(acc => ({
          id: acc.id,
          platform: acc.platform,
          name: acc.name || 'unnamed',
          platform_account_id: acc.platform_account_id
        })));
      }

      return data || [];
    } catch (error) {
      console.error('[FacebookAds] Exception in getAdAccounts:', error);
      throw error;
    }
  }

  async connectFacebookAds(): Promise<string> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/facebook-ads-oauth?action=connect`,
        { headers }
      );

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || 'Failed to generate OAuth URL');
      }

      const data: FacebookOAuthResponse = await response.json();

      if (!data.success || !data.oauthUrl) {
        throw new Error(data.error || 'Failed to generate OAuth URL');
      }

      return data.oauthUrl;
    } catch (error) {
      console.error('Error connecting Facebook Ads:', error);
      throw error;
    }
  }

  async handleOAuthCallback(code: string, state: string): Promise<FacebookOAuthResponse> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/facebook-ads-oauth?action=callback&code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`,
        { headers }
      );

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || 'OAuth callback failed');
      }

      const data: FacebookOAuthResponse = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'OAuth callback failed');
      }

      return data;
    } catch (error) {
      console.error('Error handling OAuth callback:', error);
      throw error;
    }
  }

  async syncAdAccount(
    accountId: string,
    startDate?: string,
    endDate?: string
  ): Promise<SyncResponse> {
    try {
      const headers = await this.getAuthHeaders();

      const params = new URLSearchParams({
        accountId,
      });

      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const url = `${SUPABASE_URL}/functions/v1/facebook-ads-sync?${params.toString()}`;
      console.log('[FacebookAds] Calling sync function:', url);
      console.log('[FacebookAds] Headers:', { ...headers, Authorization: 'Bearer [REDACTED]' });

      const response = await fetch(url, { headers });

      console.log('[FacebookAds] Sync response status:', response.status);
      console.log('[FacebookAds] Sync response ok:', response.ok);

      if (!response.ok) {
        const error = await response.text();
        console.error('[FacebookAds] Sync error response:', error);
        throw new Error(error || 'Sync failed');
      }

      const data: SyncResponse = await response.json();
      console.log('[FacebookAds] Sync data received:', data);

      if (!data.success) {
        throw new Error(data.error || 'Sync failed');
      }

      console.log('[FacebookAds] Updating last_synced_at for account:', accountId);
      await supabase
        .from('ad_accounts')
        .update({ last_synced_at: new Date().toISOString() })
        .eq('platform_account_id', accountId);

      return data;
    } catch (error) {
      console.error('[FacebookAds] Error syncing ad account:', error);
      if (error instanceof Error) {
        console.error('[FacebookAds] Error name:', error.name);
        console.error('[FacebookAds] Error message:', error.message);
      }
      throw error;
    }
  }

  async disconnectAdAccount(accountId: string): Promise<DisconnectResponse> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/facebook-ads-oauth?action=disconnect`,
        {
          method: 'DELETE',
          headers,
          body: JSON.stringify({ accountId }),
        }
      );

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || 'Failed to disconnect account');
      }

      const data: DisconnectResponse = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to disconnect account');
      }

      return data;
    } catch (error) {
      console.error('Error disconnecting ad account:', error);
      throw error;
    }
  }

  async getCampaigns(accountId: string): Promise<AdCampaign[]> {
    try {
      const { data, error } = await supabase
        .from('ad_campaigns')
        .select('*')
        .eq('ad_account_id', accountId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      throw error;
    }
  }

  async getAggregatedMetrics(
    accountIds: string[],
    startDate: string,
    endDate: string
  ): Promise<AggregatedMetrics> {
    try {
      console.log('[FacebookAds] getAggregatedMetrics called with:', {
        accountIds,
        startDate,
        endDate,
        accountCount: accountIds.length
      });

      // Query metrics through campaigns since metrics are linked via entity_id
      // First get campaign IDs for these accounts
      const { data: campaigns, error: campaignsError } = await supabase
        .from('ad_campaigns')
        .select('id')
        .in('ad_account_id', accountIds);

      if (campaignsError) {
        console.error('[FacebookAds] Error fetching campaigns:', campaignsError);
        throw campaignsError;
      }

      if (!campaigns || campaigns.length === 0) {
        console.warn('[FacebookAds] No campaigns found for account IDs:', accountIds);
        console.warn('[FacebookAds] This means sync hasn\'t created campaigns yet');

        return {
          totalSpend: 0,
          totalImpressions: 0,
          totalClicks: 0,
          totalConversions: 0,
          totalConversionValue: 0,
          averageCTR: 0,
          averageCPC: 0,
          averageCPM: 0,
          averageROAS: 0,
          totalReach: 0,
        };
      }

      const campaignIds = campaigns.map(c => c.id);
      console.log('[FacebookAds] Found', campaignIds.length, 'campaigns for these accounts');

      // Now query metrics for these campaigns
      const { data, error } = await supabase
        .from('ad_metrics')
        .select('*')
        .in('entity_id', campaignIds)
        .gte('date', startDate)
        .lte('date', endDate)
        .eq('entity_type', 'campaign');

      console.log('[FacebookAds] Metrics query result:', {
        error: error?.message,
        dataLength: data?.length || 0,
        hasData: !!data && data.length > 0
      });

      if (error) {
        console.error('[FacebookAds] Supabase query error:', error);
        throw error;
      }

      if (!data || data.length === 0) {
        console.warn('[FacebookAds] No metrics found for query parameters');
        console.warn('[FacebookAds] This could mean:');
        console.warn('[FacebookAds]   1. No data has been synced yet - click Sync in Settings');
        console.warn('[FacebookAds]   2. Date range has no data - try a different date range');
        console.warn('[FacebookAds]   3. Campaigns exist but have no metrics');

        // Query without date filters to check if ANY data exists
        const { data: anyData, error: anyError } = await supabase
          .from('ad_metrics')
          .select('entity_id, date, spend')
          .in('entity_id', campaignIds)
          .limit(5);

        if (!anyError && anyData && anyData.length > 0) {
          console.log('[FacebookAds] Found some metrics (without date filter):', anyData);
          console.log('[FacebookAds] The date range filter might be excluding your data');
        } else {
          console.log('[FacebookAds] No metrics found at all for these campaigns');
          console.log('[FacebookAds] Check if sync was successful and data was stored');
        }

        return {
          totalSpend: 0,
          totalImpressions: 0,
          totalClicks: 0,
          totalConversions: 0,
          totalConversionValue: 0,
          averageCTR: 0,
          averageCPC: 0,
          averageCPM: 0,
          averageROAS: 0,
          totalReach: 0,
        };
      }

      console.log('[FacebookAds] Processing', data.length, 'metric records');
      if (data.length > 0) {
        console.log('[FacebookAds] Sample metric:', {
          date: data[0].date,
          spend: data[0].spend,
          impressions: data[0].impressions,
          clicks: data[0].clicks
        });
      }

      const aggregated = data.reduce(
        (acc, metric) => ({
          totalSpend: acc.totalSpend + (metric.spend || 0),
          totalImpressions: acc.totalImpressions + (metric.impressions || 0),
          totalClicks: acc.totalClicks + (metric.clicks || 0),
          totalConversions: acc.totalConversions + (metric.conversions || 0),
          totalConversionValue: acc.totalConversionValue + (metric.conversion_value || 0),
          totalReach: acc.totalReach + (metric.reach || 0),
        }),
        {
          totalSpend: 0,
          totalImpressions: 0,
          totalClicks: 0,
          totalConversions: 0,
          totalConversionValue: 0,
          totalReach: 0,
        }
      );

      const averageCTR = aggregated.totalImpressions > 0
        ? (aggregated.totalClicks / aggregated.totalImpressions) * 100
        : 0;

      const averageCPC = aggregated.totalClicks > 0
        ? aggregated.totalSpend / aggregated.totalClicks
        : 0;

      const averageCPM = aggregated.totalImpressions > 0
        ? (aggregated.totalSpend / aggregated.totalImpressions) * 1000
        : 0;

      const averageROAS = aggregated.totalSpend > 0
        ? aggregated.totalConversionValue / aggregated.totalSpend
        : 0;

      return {
        ...aggregated,
        averageCTR,
        averageCPC,
        averageCPM,
        averageROAS,
      };
    } catch (error) {
      console.error('Error fetching aggregated metrics:', error);
      throw error;
    }
  }

  async getTotalAdSpend(
    accountIds: string[],
    startDate: string,
    endDate: string
  ): Promise<number> {
    try {
      const metrics = await this.getAggregatedMetrics(accountIds, startDate, endDate);
      return metrics.totalSpend;
    } catch (error) {
      console.error('Error fetching total ad spend:', error);
      return 0;
    }
  }

  async getAdCreatives(
    accountIds: string[],
    startDate: string,
    endDate: string
  ): Promise<AdCreativePerformance[]> {
    try {
      const { data: ads, error: adsError } = await supabase
        .from('ads')
        .select(`
          *,
          ad_sets:ad_set_id (
            id,
            name,
            ad_campaigns:campaign_id (
              id,
              name,
              ad_accounts:ad_account_id (
                id,
                platform
              )
            )
          )
        `)
        .in('ad_sets.ad_campaigns.ad_account_id', accountIds);

      if (adsError) throw adsError;

      if (!ads || ads.length === 0) {
        return [];
      }

      const adIds = ads.map(ad => ad.id);

      const { data: metrics, error: metricsError } = await supabase
        .from('ad_metrics')
        .select('*')
        .in('entity_id', adIds)
        .eq('entity_type', 'ad')
        .gte('date', startDate)
        .lte('date', endDate);

      if (metricsError) throw metricsError;

      const creativePerformance: AdCreativePerformance[] = ads.map(ad => {
        const adMetrics = metrics?.filter(m => m.entity_id === ad.id) || [];

        const aggregated = adMetrics.reduce(
          (acc, metric) => ({
            totalImpressions: acc.totalImpressions + (metric.impressions || 0),
            totalClicks: acc.totalClicks + (metric.clicks || 0),
            totalSpend: acc.totalSpend + (metric.spend || 0),
            totalConversions: acc.totalConversions + (metric.conversions || 0),
          }),
          {
            totalImpressions: 0,
            totalClicks: 0,
            totalSpend: 0,
            totalConversions: 0,
          }
        );

        const averageCTR = aggregated.totalImpressions > 0
          ? (aggregated.totalClicks / aggregated.totalImpressions) * 100
          : 0;

        const averageROAS = aggregated.totalSpend > 0 && adMetrics.length > 0
          ? adMetrics.reduce((sum, m) => sum + (m.roas || 0), 0) / adMetrics.length
          : 0;

        const averageCPC = aggregated.totalClicks > 0
          ? aggregated.totalSpend / aggregated.totalClicks
          : 0;

        const adSet = ad.ad_sets as any;
        const campaign = adSet?.ad_campaigns as any;
        const account = campaign?.ad_accounts as any;

        return {
          ad: ad as Ad,
          metrics: adMetrics as AdMetric[],
          aggregated: {
            ...aggregated,
            averageCTR,
            averageROAS,
            averageCPC,
          },
          campaign: {
            id: campaign?.id || '',
            name: campaign?.name || 'Unknown Campaign',
          },
          adSet: {
            id: adSet?.id || '',
            name: adSet?.name || 'Unknown Ad Set',
          },
          platform: account?.platform || 'facebook',
        };
      });

      return creativePerformance.sort(
        (a, b) => b.aggregated.totalSpend - a.aggregated.totalSpend
      );
    } catch (error) {
      console.error('Error fetching ad creatives:', error);
      throw error;
    }
  }

  async checkConnectionStatus(): Promise<{ connected: boolean; accounts: AdAccount[] }> {
    try {
      const user = await getCurrentUser();
      if (!user) {
        return { connected: false, accounts: [] };
      }

      const accounts = await this.getAdAccounts('facebook');
      return {
        connected: accounts.length > 0,
        accounts,
      };
    } catch (error) {
      console.error('Error checking connection status:', error);
      return { connected: false, accounts: [] };
    }
  }
}

export const facebookAdsService = new FacebookAdsService();
