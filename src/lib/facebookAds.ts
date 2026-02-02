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
      'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
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
        .not('access_token', 'is', null)
        .order('created_at', { ascending: false });

      if (platform) {
        query = query.eq('platform', platform);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[FacebookAds] ERROR fetching accounts:', error);
        throw error;
      }

      const connectedAccounts = (data || []).filter(acc => acc.access_token && acc.access_token.length > 0);

      console.log('[FacebookAds] Found', connectedAccounts.length, 'connected ad accounts (filtered from', data?.length || 0, 'total)');
      if (connectedAccounts.length > 0) {
        console.log('[FacebookAds] Account details:', connectedAccounts.map(acc => ({
          id: acc.id,
          platform: acc.platform,
          name: acc.name || 'unnamed',
          platform_account_id: acc.platform_account_id
        })));
      }

      return connectedAccounts;
    } catch (error) {
      console.error('[FacebookAds] Exception in getAdAccounts:', error);
      throw error;
    }
  }

  async connectFacebookAds(): Promise<string> {
    try {
      // Store Supabase config in localStorage for OAuth callback page
      localStorage.setItem('revoa_supabase_config', JSON.stringify({
        url: import.meta.env.VITE_SUPABASE_URL,
        anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY
      }));

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

  async quickRefresh(accountId: string, datePreset: string = 'last_28d'): Promise<{ success: boolean; needsFullSync?: boolean; message?: string }> {
    try {
      const headers = await this.getAuthHeaders();

      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/facebook-ads-quick-refresh`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({
            adAccountId: accountId,
            datePreset,
          }),
        }
      );

      if (!response.ok) {
        return { success: false, message: `Request failed with status ${response.status}` };
      }

      const data = await response.json();
      return data;
    } catch {
      return { success: false, message: 'Network error' };
    }
  }

  async syncAdAccount(
    accountId: string,
    startDate?: string,
    endDate?: string,
    isAutoSync: boolean = false
  ): Promise<SyncResponse> {
    try {
      const headers = await this.getAuthHeaders();

      // If no dates provided and this is auto-sync, get last_synced_at
      if (!startDate && isAutoSync) {
        const { data: account } = await supabase
          .from('ad_accounts')
          .select('last_synced_at')
          .eq('platform_account_id', accountId)
          .maybeSingle();

        if (account?.last_synced_at) {
          // Sync from last sync date to now
          startDate = new Date(account.last_synced_at).toISOString().split('T')[0];
          console.log('[FacebookAds] Incremental sync from last_synced_at:', startDate);
        } else {
          // First time sync - get last 7 days
          startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
          console.log('[FacebookAds] First sync - using 7 days:', startDate);
        }
      }

      const url = `${SUPABASE_URL}/functions/v1/facebook-ads-sync`;
      console.log('[FacebookAds] Calling sync function:', url);
      console.log('[FacebookAds] Headers:', { ...headers, Authorization: 'Bearer [REDACTED]' });

      const body: any = {
        adAccountId: accountId,
      };

      if (startDate) body.startDate = startDate;
      if (endDate) body.endDate = endDate;

      console.log('[FacebookAds] Request body:', body);

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });

      console.log('[FacebookAds] Sync response status:', response.status);
      console.log('[FacebookAds] Sync response ok:', response.ok);

      if (!response.ok) {
        const error = await response.text();
        console.error('[FacebookAds] Sync error response:', error);
        throw new Error(error || 'Sync failed');
      }

      const data: SyncResponse & { errors?: string[] } = await response.json();
      console.log('[FacebookAds] Sync data received:', data);

      if (!data.success && !data.errors) {
        throw new Error(data.error || 'Sync failed');
      }

      console.log('[FacebookAds] Updating last_synced_at for account:', accountId);
      const { error: updateError } = await supabase
        .from('ad_accounts')
        .update({ last_synced_at: new Date().toISOString() })
        .eq('platform_account_id', accountId);

      if (updateError) {
        console.error('[FacebookAds] Error updating last_synced_at:', updateError);
      } else {
        console.log('[FacebookAds] Successfully updated last_synced_at');
      }

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

  async autoSyncAllAccounts(): Promise<void> {
    try {
      console.log('[FacebookAds] Starting auto-sync for all connected accounts');
      const accounts = await this.getAdAccounts();

      if (!accounts || accounts.length === 0) {
        console.log('[FacebookAds] No accounts to sync');
        return;
      }

      console.log(`[FacebookAds] Auto-syncing ${accounts.length} account(s)`);

      for (const account of accounts) {
        try {
          console.log(`[FacebookAds] Auto-syncing account: ${account.platform_account_id}`);
          await this.syncAdAccount(account.platform_account_id, undefined, undefined, true);
          console.log(`[FacebookAds] Successfully synced account: ${account.platform_account_id}`);
        } catch (error) {
          console.error(`[FacebookAds] Failed to sync account ${account.platform_account_id}:`, error);
        }
      }

      console.log('[FacebookAds] Auto-sync completed for all accounts');
    } catch (error) {
      console.error('[FacebookAds] Error in auto-sync:', error);
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

      // Only query campaign-level metrics to avoid double-counting
      // (Campaign metrics already aggregate the ad set data from Facebook)
      console.log('[FacebookAds] Executing metrics query with filters:', {
        entityIds: campaignIds.length,
        startDate,
        endDate,
        sampleEntityId: campaignIds[0]
      });

      const { data, error } = await supabase
        .from('ad_metrics')
        .select('*')
        .eq('entity_type', 'campaign')
        .in('entity_id', campaignIds)
        .gte('date', startDate)
        .lte('date', endDate);

      console.log('[FacebookAds] Metrics query result:', {
        error: error?.message,
        dataLength: data?.length || 0,
        hasData: !!data && data.length > 0
      });

      if (data && data.length > 0) {
        console.log('[FacebookAds] Date range of returned data:', {
          firstDate: data[0].date,
          lastDate: data[data.length - 1].date,
          totalRecords: data.length
        });
      }

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
          .in('entity_id', allEntityIds)
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
