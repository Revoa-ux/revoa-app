import { getDashboardMetrics, type ShopifyMetrics, getDefaultMetrics } from './shopify/api';
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

async function getMetricsFromDatabase(
  userId: string,
  startDate?: string,
  endDate?: string
): Promise<ShopifyMetrics> {
  const defaultMetrics = getDefaultMetrics();

  try {
    let query = supabase
      .from('shopify_orders')
      .select('total_price, total_refunded, ordered_at')
      .eq('user_id', userId);

    if (startDate) {
      query = query.gte('ordered_at', startDate);
    }
    if (endDate) {
      query = query.lte('ordered_at', endDate);
    }

    const { data: orders, error: ordersError } = await query;

    if (ordersError) {
      console.error('[getMetricsFromDatabase] Orders query error:', ordersError);
      return defaultMetrics;
    }

    if (!orders || orders.length === 0) {
      console.log('[getMetricsFromDatabase] No orders found in date range');
      return defaultMetrics;
    }

    let totalRevenue = 0;
    let totalRefunds = 0;
    let todayOrders = 0;
    const today = new Date().toISOString().split('T')[0];

    orders.forEach(order => {
      totalRevenue += parseFloat(order.total_price) || 0;
      totalRefunds += parseFloat(order.total_refunded) || 0;
      if (order.ordered_at?.startsWith(today)) {
        todayOrders++;
      }
    });

    const totalOrders = orders.length;
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    const { data: lineItems } = await supabase
      .from('order_line_items')
      .select('cogs_amount, shopify_order_id')
      .eq('user_id', userId);

    let costOfGoodsSold = 0;
    if (lineItems) {
      const orderIds = new Set(orders.map(o => o.ordered_at));
      lineItems.forEach(item => {
        costOfGoodsSold += parseFloat(String(item.cogs_amount)) || 0;
      });
    }

    const { count: productCount } = await supabase
      .from('products')
      .select('id', { count: 'exact', head: true })
      .eq('created_by', userId);

    const { count: customerCount } = await supabase
      .from('shopify_orders')
      .select('customer_email', { count: 'exact', head: true })
      .eq('user_id', userId)
      .not('customer_email', 'is', null);

    console.log('[getMetricsFromDatabase] Computed metrics:', {
      totalRevenue,
      totalOrders,
      averageOrderValue,
      costOfGoodsSold
    });

    return {
      ...defaultMetrics,
      totalRevenue,
      totalOrders,
      averageOrderValue,
      costOfGoodsSold,
      returnAmount: totalRefunds,
      returnRate: totalRevenue > 0 ? (totalRefunds / totalRevenue) * 100 : 0,
      totalProducts: productCount || 0,
      totalCustomers: customerCount || 0,
      newCustomersToday: todayOrders,
      monthlyRecurringRevenue: totalRevenue * 0.1,
      annualRecurringRevenue: totalRevenue * 1.2,
    };
  } catch (error) {
    console.error('[getMetricsFromDatabase] Error:', error);
    return defaultMetrics;
  }
}

async function getAdSpendFromDatabase(
  userId: string,
  startDate?: string,
  endDate?: string
): Promise<{ totalSpend: number; accountIds: string[]; hasData: boolean }> {
  try {
    const start = startDate ? (startDate.includes('T') ? startDate.split('T')[0] : startDate) : null;
    const end = endDate ? (endDate.includes('T') ? endDate.split('T')[0] : endDate) : null;

    console.log('[getAdSpendFromDatabase] Querying with date range:', { start, end, userId });

    const { data: accounts } = await supabase
      .from('ad_accounts')
      .select('id, platform_account_id, platform, access_token')
      .eq('user_id', userId)
      .not('access_token', 'is', null);

    const connectedAccounts = (accounts || []).filter(a => a.access_token && a.access_token.length > 0);

    console.log('[getAdSpendFromDatabase] Found ad accounts:', {
      total: accounts?.length || 0,
      withValidTokens: connectedAccounts.length,
      accounts: connectedAccounts.map(a => ({ id: a.id, platform: a.platform }))
    });

    if (connectedAccounts.length === 0) {
      console.log('[getAdSpendFromDatabase] No connected ad accounts found for user');
      return { totalSpend: 0, accountIds: [], hasData: false };
    }

    const accountUuids = connectedAccounts.map(a => a.id);
    const platformAccountIds = connectedAccounts.map(a => a.platform_account_id);

    const { data: campaigns } = await supabase
      .from('ad_campaigns')
      .select('id')
      .in('ad_account_id', accountUuids);

    console.log('[getAdSpendFromDatabase] Found campaigns:', campaigns?.length || 0);

    if (!campaigns || campaigns.length === 0) {
      console.log('[getAdSpendFromDatabase] No campaigns found for accounts');
      return { totalSpend: 0, accountIds: platformAccountIds, hasData: false };
    }

    const campaignIds = campaigns.map(c => c.id);

    let query = supabase
      .from('ad_metrics')
      .select('spend, date')
      .eq('entity_type', 'campaign')
      .in('entity_id', campaignIds);

    if (start) {
      query = query.gte('date', start);
    }
    if (end) {
      query = query.lte('date', end);
    }

    const { data: metrics, error } = await query;

    if (error) {
      console.error('[getAdSpendFromDatabase] Error:', error);
      return { totalSpend: 0, accountIds: platformAccountIds, hasData: false };
    }

    const uniqueDates = [...new Set((metrics || []).map(m => m.date))].sort();
    console.log('[getAdSpendFromDatabase] Metrics found:', {
      count: metrics?.length || 0,
      dateRange: { requested: { start, end }, actual: { first: uniqueDates[0], last: uniqueDates[uniqueDates.length - 1] } },
      uniqueDates
    });

    const totalSpend = (metrics || []).reduce((sum, m) => sum + (parseFloat(String(m.spend)) || 0), 0);

    console.log('[getAdSpendFromDatabase] Total ad spend:', totalSpend);

    return { totalSpend, accountIds: platformAccountIds, hasData: totalSpend > 0 };
  } catch (error) {
    console.error('[getAdSpendFromDatabase] Error:', error);
    return { totalSpend: 0, accountIds: [], hasData: false };
  }
}

/**
 * Fetch combined metrics from database for the dashboard
 * Uses synced data from shopify_orders and ad_metrics tables
 */
export async function getCombinedDashboardMetrics(
  startDate?: string,
  endDate?: string
): Promise<CombinedMetrics> {
  try {
    console.log('[CombinedMetrics] === STARTING DATABASE FETCH ===');
    console.log('[CombinedMetrics] Date range:', { startDate, endDate });

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('[CombinedMetrics] ERROR: User not authenticated');
      throw new Error('User not authenticated');
    }

    const shopifyMetrics = await getMetricsFromDatabase(user.id, startDate, endDate);
    console.log('[CombinedMetrics] Shopify metrics from DB:', {
      totalRevenue: shopifyMetrics.totalRevenue,
      totalOrders: shopifyMetrics.totalOrders,
      costOfGoodsSold: shopifyMetrics.costOfGoodsSold
    });

    const { totalSpend: totalAdSpend, accountIds, hasData } = await getAdSpendFromDatabase(user.id, startDate, endDate);
    console.log('[CombinedMetrics] Ad spend from DB:', totalAdSpend);

    const profit = shopifyMetrics.totalRevenue - shopifyMetrics.costOfGoodsSold - totalAdSpend;
    const profitMargin = shopifyMetrics.totalRevenue > 0
      ? (profit / shopifyMetrics.totalRevenue) * 100
      : 0;
    const roas = totalAdSpend > 0
      ? shopifyMetrics.totalRevenue / totalAdSpend
      : 0;
    const netProfit = profit - shopifyMetrics.transactionFees;

    const result = {
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

    console.log('[CombinedMetrics] === FINAL METRICS ===');
    console.log('[CombinedMetrics] Revenue:', shopifyMetrics.totalRevenue);
    console.log('[CombinedMetrics] Orders:', shopifyMetrics.totalOrders);
    console.log('[CombinedMetrics] Ad Spend:', totalAdSpend);
    console.log('[CombinedMetrics] Profit:', profit);

    return result;
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
