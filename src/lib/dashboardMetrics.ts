import { getDashboardMetrics, type ShopifyMetrics } from './shopify/api';
import { facebookAdsService } from './facebookAds';
import { supabase } from './supabase';

export interface CombinedMetrics {
  shopify: ShopifyMetrics;
  facebook: {
    totalSpend: number;
    accountIds: string[];
    hasData: boolean;
  };
  computed: {
    profit: number;
    profitMargin: number;
    roas: number;
    netProfit: number;
  };
}

/**
 * Fetch combined metrics from Shopify and Facebook for the dashboard
 * This provides a unified view of revenue, costs, and profitability
 */
export async function getCombinedDashboardMetrics(
  startDate?: string,
  endDate?: string
): Promise<CombinedMetrics> {
  try {
    // Fetch Shopify metrics
    const shopifyMetrics = await getDashboardMetrics();

    // Get user's Facebook ad accounts
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    let totalAdSpend = 0;
    let accountIds: string[] = [];
    let hasData = false;

    try {
      // Fetch Facebook ad accounts for the user
      const accounts = await facebookAdsService.getAdAccounts('facebook');
      accountIds = accounts.map(acc => acc.id);

      if (accounts.length > 0) {
        // Calculate date range if not provided
        const end = endDate || new Date().toISOString().split('T')[0];
        const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        // Fetch aggregated metrics for all accounts
        const metrics = await facebookAdsService.getAggregatedMetrics(accountIds, start, end);
        totalAdSpend = metrics.totalSpend;
        hasData = totalAdSpend > 0 || metrics.totalImpressions > 0;
      }
    } catch (error) {
      console.error('[DashboardMetrics] Error fetching Facebook data:', error);
      // Continue with zero ad spend if Facebook data fails
    }

    // Compute combined metrics
    const profit = shopifyMetrics.totalRevenue - shopifyMetrics.costOfGoodsSold - totalAdSpend;
    const profitMargin = shopifyMetrics.totalRevenue > 0
      ? (profit / shopifyMetrics.totalRevenue) * 100
      : 0;
    const roas = totalAdSpend > 0
      ? shopifyMetrics.totalRevenue / totalAdSpend
      : 0;
    const netProfit = profit - shopifyMetrics.transactionFees;

    return {
      shopify: shopifyMetrics,
      facebook: {
        totalSpend: totalAdSpend,
        accountIds,
        hasData,
      },
      computed: {
        profit,
        profitMargin,
        roas,
        netProfit,
      },
    };
  } catch (error) {
    console.error('[DashboardMetrics] Error fetching combined metrics:', error);
    throw error;
  }
}

/**
 * Get ad spend for a specific time range
 */
export async function getAdSpendForPeriod(
  startDate: string,
  endDate: string
): Promise<number> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return 0;

    const accounts = await facebookAdsService.getAdAccounts('facebook');
    if (accounts.length === 0) return 0;

    const accountIds = accounts.map(acc => acc.id);
    const totalSpend = await facebookAdsService.getTotalAdSpend(accountIds, startDate, endDate);

    return totalSpend;
  } catch (error) {
    console.error('[DashboardMetrics] Error fetching ad spend:', error);
    return 0;
  }
}

/**
 * Check if user has connected both Shopify and Facebook
 */
export async function checkIntegrationsStatus(): Promise<{
  hasShopify: boolean;
  hasFacebook: boolean;
  isFullyConnected: boolean;
}> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { hasShopify: false, hasFacebook: false, isFullyConnected: false };
    }

    // Check Shopify
    const { data: shopifyInstallation } = await supabase
      .from('shopify_installations')
      .select('id')
      .eq('user_id', user.id)
      .eq('status', 'installed')
      .is('uninstalled_at', null)
      .maybeSingle();

    const hasShopify = !!shopifyInstallation;

    // Check Facebook
    const facebookStatus = await facebookAdsService.checkConnectionStatus();
    const hasFacebook = facebookStatus.connected;

    return {
      hasShopify,
      hasFacebook,
      isFullyConnected: hasShopify && hasFacebook,
    };
  } catch (error) {
    console.error('[DashboardMetrics] Error checking integrations:', error);
    return { hasShopify: false, hasFacebook: false, isFullyConnected: false };
  }
}
