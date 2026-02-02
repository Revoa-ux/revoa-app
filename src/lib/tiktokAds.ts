import { supabase, getCurrentUser } from './supabase';
import type {
  AdAccount,
  AdCampaign,
  AggregatedMetrics,
  SyncResponse,
  DisconnectResponse,
} from '../types/ads';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

export interface TikTokOAuthResponse {
  success: boolean;
  oauthUrl?: string;
  accounts?: number;
  error?: string;
}

export class TikTokAdsService {
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

  async getAdAccounts(): Promise<AdAccount[]> {
    try {
      console.log('[TikTokAds] Fetching ad accounts...');

      const { data, error } = await supabase
        .from('ad_accounts')
        .select('*')
        .eq('platform', 'tiktok')
        .eq('status', 'active')
        .not('access_token', 'is', null)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[TikTokAds] Error fetching accounts:', error);
        throw error;
      }

      const connectedAccounts = (data || []).filter(acc => acc.access_token && acc.access_token.length > 0);
      console.log('[TikTokAds] Found', connectedAccounts.length, 'connected TikTok Ads accounts (filtered from', data?.length || 0, 'total)');
      return connectedAccounts;
    } catch (error) {
      console.error('[TikTokAds] Exception in getAdAccounts:', error);
      throw error;
    }
  }

  async connectTikTokAds(): Promise<string> {
    try {
      const headers = await this.getAuthHeaders();
      console.log('[TikTokAds] Initiating OAuth with headers:', {
        hasAuthorization: !!headers.Authorization,
        hasApikey: !!headers.apikey
      });

      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/tiktok-ads-oauth?action=connect`,
        {
          method: 'GET',
          headers
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[TikTokAds] OAuth error response:', errorText);
        throw new Error(errorText || 'Failed to generate OAuth URL');
      }

      const data: TikTokOAuthResponse = await response.json();
      console.log('[TikTokAds] OAuth response:', data);

      if (!data.success || !data.oauthUrl) {
        throw new Error(data.error || 'Failed to generate OAuth URL');
      }

      return data.oauthUrl;
    } catch (error) {
      console.error('[TikTokAds] Error connecting:', error);
      throw error;
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

      if (!startDate && isAutoSync) {
        const { data: account } = await supabase
          .from('ad_accounts')
          .select('last_synced_at')
          .eq('platform_account_id', accountId)
          .eq('platform', 'tiktok')
          .maybeSingle();

        if (account?.last_synced_at) {
          startDate = new Date(account.last_synced_at).toISOString().split('T')[0];
          console.log('[TikTokAds] Incremental sync from last_synced_at:', startDate);
        } else {
          startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
          console.log('[TikTokAds] First sync - using 7 days:', startDate);
        }
      }

      const url = `${SUPABASE_URL}/functions/v1/tiktok-ads-sync`;
      console.log('[TikTokAds] Calling sync function:', url);

      const body: any = { adAccountId: accountId };
      if (startDate) body.startDate = startDate;
      if (endDate) body.endDate = endDate;

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('[TikTokAds] Sync error response:', error);
        throw new Error(error || 'Sync failed');
      }

      const data: SyncResponse & { errors?: string[] } = await response.json();

      if (!data.success && !data.errors) {
        throw new Error(data.error || 'Sync failed');
      }

      await supabase
        .from('ad_accounts')
        .update({ last_synced_at: new Date().toISOString() })
        .eq('platform_account_id', accountId)
        .eq('platform', 'tiktok');

      return data;
    } catch (error) {
      console.error('[TikTokAds] Error syncing ad account:', error);
      throw error;
    }
  }

  async autoSyncAllAccounts(): Promise<void> {
    try {
      console.log('[TikTokAds] Starting auto-sync for all connected accounts');
      const accounts = await this.getAdAccounts();

      if (!accounts || accounts.length === 0) {
        console.log('[TikTokAds] No accounts to sync');
        return;
      }

      console.log(`[TikTokAds] Auto-syncing ${accounts.length} account(s)`);

      for (const account of accounts) {
        try {
          console.log(`[TikTokAds] Auto-syncing account: ${account.platform_account_id}`);
          await this.syncAdAccount(account.platform_account_id, undefined, undefined, true);
          console.log(`[TikTokAds] Successfully synced account: ${account.platform_account_id}`);
        } catch (error) {
          console.error(`[TikTokAds] Failed to sync account ${account.platform_account_id}:`, error);
        }
      }

      console.log('[TikTokAds] Auto-sync completed for all accounts');
    } catch (error) {
      console.error('[TikTokAds] Error in auto-sync:', error);
    }
  }

  async disconnectAdAccount(accountId: string): Promise<DisconnectResponse> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/tiktok-ads-oauth?action=disconnect`,
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
      console.error('[TikTokAds] Error disconnecting ad account:', error);
      throw error;
    }
  }

  async getCampaigns(accountId: string): Promise<AdCampaign[]> {
    try {
      const { data, error } = await supabase
        .from('ad_campaigns')
        .select('*')
        .eq('ad_account_id', accountId)
        .eq('platform', 'tiktok')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('[TikTokAds] Error fetching campaigns:', error);
      throw error;
    }
  }

  async getAggregatedMetrics(
    accountIds: string[],
    startDate: string,
    endDate: string
  ): Promise<AggregatedMetrics> {
    try {
      console.log('[TikTokAds] getAggregatedMetrics called:', { accountIds, startDate, endDate });

      const { data: campaigns, error: campaignsError } = await supabase
        .from('ad_campaigns')
        .select('id')
        .in('ad_account_id', accountIds)
        .eq('platform', 'tiktok');

      if (campaignsError) throw campaignsError;

      if (!campaigns || campaigns.length === 0) {
        console.warn('[TikTokAds] No campaigns found for account IDs:', accountIds);
        return this.getEmptyMetrics();
      }

      const campaignIds = campaigns.map(c => c.id);

      const { data, error } = await supabase
        .from('ad_metrics')
        .select('*')
        .eq('entity_type', 'campaign')
        .in('entity_id', campaignIds)
        .gte('date', startDate)
        .lte('date', endDate);

      if (error) throw error;

      if (!data || data.length === 0) {
        return this.getEmptyMetrics();
      }

      return this.aggregateMetrics(data);
    } catch (error) {
      console.error('[TikTokAds] Error fetching aggregated metrics:', error);
      throw error;
    }
  }

  async checkConnectionStatus(): Promise<{ connected: boolean; accounts: AdAccount[] }> {
    try {
      const user = await getCurrentUser();
      if (!user) {
        return { connected: false, accounts: [] };
      }

      const accounts = await this.getAdAccounts();
      return {
        connected: accounts.length > 0,
        accounts,
      };
    } catch (error) {
      console.error('[TikTokAds] Error checking connection status:', error);
      return { connected: false, accounts: [] };
    }
  }

  private getEmptyMetrics(): AggregatedMetrics {
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

  private aggregateMetrics(data: any[]): AggregatedMetrics {
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

    return {
      ...aggregated,
      averageCTR: aggregated.totalImpressions > 0
        ? (aggregated.totalClicks / aggregated.totalImpressions) * 100
        : 0,
      averageCPC: aggregated.totalClicks > 0
        ? aggregated.totalSpend / aggregated.totalClicks
        : 0,
      averageCPM: aggregated.totalImpressions > 0
        ? (aggregated.totalSpend / aggregated.totalImpressions) * 1000
        : 0,
      averageROAS: aggregated.totalSpend > 0
        ? aggregated.totalConversionValue / aggregated.totalSpend
        : 0,
    };
  }
}

export const tiktokAdsService = new TikTokAdsService();
