import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  DollarSign,
  ShoppingCart,
  Target,
  RefreshCw,
  Percent,
  Package
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { syncShopifyOrders } from '@/lib/attributionService';
import { supabase } from '@/lib/supabase';
import { GlassCard } from '@/components/GlassCard';
import AdReportsTimeSelector, { TimeOption } from '@/components/reports/AdReportsTimeSelector';
import { useConnectionStore } from '@/lib/connectionStore';

interface AttributionMetrics {
  totalOrders: number;
  totalRevenue: number;
  attributedOrders: number;
  attributedRevenue: number;
  attributionRate: number;
  averageOrderValue: number;
  unattributedOrders: number;
  unattributedRevenue: number;
  totalPixelEvents: number;
  uniqueSessions: number;
}

export default function Attribution() {
  const { user } = useAuth();
  const { facebook } = useConnectionStore();
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [metrics, setMetrics] = useState<AttributionMetrics>({
    totalOrders: 0,
    totalRevenue: 0,
    attributedOrders: 0,
    attributedRevenue: 0,
    attributionRate: 0,
    averageOrderValue: 0,
    unattributedOrders: 0,
    unattributedRevenue: 0,
    totalPixelEvents: 0,
    uniqueSessions: 0,
  });
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<TimeOption>('30d');

  // Initialize date range for 30 days
  const initialEndDate = new Date();
  initialEndDate.setHours(23, 59, 59, 999);
  const initialStartDate = new Date(initialEndDate);
  initialStartDate.setDate(initialStartDate.getDate() - 30);
  initialStartDate.setHours(0, 0, 0, 0);

  const [dateRange, setDateRange] = useState({
    startDate: initialStartDate,
    endDate: initialEndDate
  });

  useEffect(() => {
    if (user?.id) {
      loadAttributionMetrics();
    }
  }, [user?.id, dateRange]);

  const loadAttributionMetrics = async () => {
    if (!user?.id) return;

    setIsLoading(true);
    try {
      // Trigger incremental sync first (fire and forget)
      const { useConnectionStore } = await import('@/lib/connectionStore');
      const { facebook } = useConnectionStore.getState();
      if (facebook.isConnected && facebook.accounts && facebook.accounts.length > 0) {
        const { facebookAdsService } = await import('@/lib/facebookAds');
        facebook.accounts.forEach(account => {
          facebookAdsService.syncAdAccount(account.platform_account_id, undefined, undefined, true)
            .catch(err => console.error('[Attribution] Auto-sync failed:', err));
        });
      }

      const { data: orders, error: ordersError } = await supabase
        .from('shopify_orders')
        .select('id, total_price, utm_source')
        .eq('user_id', user.id)
        .gte('ordered_at', dateRange.startDate.toISOString())
        .lte('ordered_at', dateRange.endDate.toISOString());

      if (ordersError) throw ordersError;

      const { data: conversions, error: conversionsError } = await supabase
        .from('ad_conversions')
        .select('conversion_value')
        .eq('user_id', user.id)
        .gte('converted_at', dateRange.startDate.toISOString())
        .lte('converted_at', dateRange.endDate.toISOString());

      if (conversionsError) throw conversionsError;

      const { data: pixelEvents, error: pixelError } = await supabase
        .from('pixel_events')
        .select('session_id')
        .eq('user_id', user.id)
        .gte('event_time', dateRange.startDate.toISOString())
        .lte('event_time', dateRange.endDate.toISOString());

      if (pixelError) throw pixelError;

      const totalOrders = orders?.length || 0;
      const totalRevenue = orders?.reduce((sum, o) => sum + parseFloat(o.total_price || '0'), 0) || 0;
      const attributedOrders = conversions?.length || 0;
      const attributedRevenue = conversions?.reduce((sum, c) => sum + parseFloat(c.conversion_value || '0'), 0) || 0;
      const unattributedOrders = totalOrders - attributedOrders;
      const unattributedRevenue = totalRevenue - attributedRevenue;
      const attributionRate = totalOrders > 0 ? (attributedOrders / totalOrders) * 100 : 0;
      const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
      const totalPixelEvents = pixelEvents?.length || 0;
      const uniqueSessions = new Set(pixelEvents?.map(e => e.session_id) || []).size;

      setMetrics({
        totalOrders,
        totalRevenue,
        attributedOrders,
        attributedRevenue,
        attributionRate,
        averageOrderValue,
        unattributedOrders,
        unattributedRevenue,
        totalPixelEvents,
        uniqueSessions,
      });

      const { data: syncData } = await supabase
        .from('shopify_orders')
        .select('created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (syncData?.created_at) {
        setLastSync(syncData.created_at);
      }
    } catch (error) {
      console.error('Error loading attribution metrics:', error);
      toast.error('Failed to load attribution data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTimeChange = (time: TimeOption) => {
    setSelectedTime(time);

    const now = new Date();
    let startDate = new Date();
    let endDate = new Date();

    switch (time) {
      case 'today':
        startDate = new Date(now);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(now);
        endDate.setHours(23, 59, 59, 999);
        break;
      case '7d':
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 7);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(now);
        endDate.setHours(23, 59, 59, 999);
        break;
      case '30d':
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 30);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(now);
        endDate.setHours(23, 59, 59, 999);
        break;
      case '90d':
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 90);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(now);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'custom':
        return;
    }

    setDateRange({ startDate, endDate });
  };

  const handleSync = async () => {
    if (!user?.id) return;

    setIsSyncing(true);
    try {
      toast.loading('Syncing orders from Shopify...');

      const daysDiff = Math.ceil((dateRange.endDate.getTime() - dateRange.startDate.getTime()) / (1000 * 60 * 60 * 24));
      const result = await syncShopifyOrders(user.id, daysDiff);

      toast.dismiss();

      if (result.success) {
        toast.success(`Synced ${result.synced} orders, matched ${result.matched} to ads`);
        loadAttributionMetrics();
      } else {
        toast.error(result.error || 'Failed to sync orders');
      }
    } catch (error) {
      toast.dismiss();
      console.error('Sync error:', error);
      toast.error('Failed to sync orders');
    } finally {
      setIsSyncing(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-normal text-gray-900 dark:text-white mb-2">Attribution</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
          <span className="w-1.5 h-1.5 bg-gray-400 rounded-full"></span>
          {(() => {
            const connected = [];
            if (facebook.isConnected && facebook.accounts && facebook.accounts.length > 0) {
              connected.push('Meta Ads');
            }
            // Placeholder for future integrations
            // if (google.isConnected) connected.push('Google Ads');
            // if (tiktok.isConnected) connected.push('TikTok Ads');

            if (connected.length === 0) {
              return 'No ad platforms connected';
            }

            const platformText = connected.join(' - ') + ' Connected';

            // Get last sync time from accounts
            const lastSyncedAccount = facebook.accounts
              ?.filter(acc => acc.last_synced_at)
              .sort((a, b) => new Date(b.last_synced_at!).getTime() - new Date(a.last_synced_at!).getTime())[0];

            const timeText = lastSyncedAccount?.last_synced_at
              ? ` - Updated ${new Date(lastSyncedAccount.last_synced_at).toLocaleTimeString()}`
              : '';

            return platformText + timeText;
          })()}
        </p>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3"></div>

        <div className="flex items-center gap-3 sm:flex-shrink-0">
          <button
            onClick={handleSync}
            disabled={isSyncing}
            className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Syncing...' : 'Sync Orders'}</span>
          </button>

          <AdReportsTimeSelector
            selectedTime={selectedTime}
            onTimeChange={handleTimeChange}
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
            onApply={loadAttributionMetrics}
          />
        </div>
      </div>

      {lastSync && (
        <div className="text-sm text-gray-500 dark:text-gray-400">
          Last synced: {formatDate(lastSync)}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        <GlassCard>
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
              <ShoppingCart className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-gray-500 dark:text-gray-400">Total Orders</p>
            <p className="text-3xl font-semibold text-gray-900 dark:text-white">
              {isLoading ? '...' : metrics.totalOrders.toLocaleString()}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {isLoading ? '...' : formatCurrency(metrics.totalRevenue)} revenue
            </p>
          </div>
        </GlassCard>

        <GlassCard>
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
              <Target className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-gray-500 dark:text-gray-400">Attributed Orders</p>
            <p className="text-3xl font-semibold text-gray-900 dark:text-white">
              {isLoading ? '...' : metrics.attributedOrders.toLocaleString()}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {isLoading ? '...' : formatCurrency(metrics.attributedRevenue)} revenue
            </p>
          </div>
        </GlassCard>

        <GlassCard>
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
              <Percent className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-gray-500 dark:text-gray-400">Attribution Rate</p>
            <p className="text-3xl font-semibold text-gray-900 dark:text-white">
              {isLoading ? '...' : `${metrics.attributionRate.toFixed(1)}%`}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {isLoading ? '...' : `${formatCurrency(metrics.averageOrderValue)} AOV`}
            </p>
          </div>
        </GlassCard>

        <GlassCard>
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-gray-500 dark:text-gray-400">Total Revenue</p>
            <p className="text-3xl font-semibold text-gray-900 dark:text-white">
              {isLoading ? '...' : formatCurrency(metrics.totalRevenue)}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {isLoading ? '...' : `${metrics.totalOrders} orders`}
            </p>
          </div>
        </GlassCard>

        <GlassCard>
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
              <Package className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-gray-500 dark:text-gray-400">Average Order Value</p>
            <p className="text-3xl font-semibold text-gray-900 dark:text-white">
              {isLoading ? '...' : formatCurrency(metrics.averageOrderValue)}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Per order
            </p>
          </div>
        </GlassCard>

        <GlassCard>
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-gray-500 dark:text-gray-400">Pixel Events</p>
            <p className="text-3xl font-semibold text-gray-900 dark:text-white">
              {isLoading ? '...' : metrics.totalPixelEvents.toLocaleString()}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {isLoading ? '...' : `${metrics.uniqueSessions} sessions`}
            </p>
          </div>
        </GlassCard>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-normal text-gray-900 dark:text-white mb-4">
          How Attribution Works
        </h2>
        <div className="space-y-4 text-sm text-gray-600 dark:text-gray-400">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-xs text-gray-600 dark:text-gray-400">1</span>
            </div>
            <div>
              <p className="font-normal text-gray-900 dark:text-white mb-1">UTM Tracking</p>
              <p>When users click your ads, UTM parameters (especially utm_term with ad ID) are captured and stored in cookies.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-xs text-gray-600 dark:text-gray-400">2</span>
            </div>
            <div>
              <p className="font-normal text-gray-900 dark:text-white mb-1">Order Syncing</p>
              <p>Shopify orders are synced with UTM data automatically via webhooks and the pixel.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-xs text-gray-600 dark:text-gray-400">3</span>
            </div>
            <div>
              <p className="font-normal text-gray-900 dark:text-white mb-1">Ad Matching</p>
              <p>Orders are matched to specific ads using utm_term, ad names, and click IDs (fbclid, gclid).</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-xs text-gray-600 dark:text-gray-400">4</span>
            </div>
            <div>
              <p className="font-normal text-gray-900 dark:text-white mb-1">CAPI Enhancement</p>
              <p>Matched conversions are sent back to ad platforms via CAPI to improve algorithm learning and targeting.</p>
            </div>
          </div>
        </div>
      </div>

      {metrics.attributionRate < 50 && metrics.totalOrders > 5 && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5">⚠️</div>
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-1">
                Low Attribution Rate Detected
              </h4>
              <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                Only {metrics.attributionRate.toFixed(1)}% of your orders are being attributed to ads. To improve:
              </p>
              <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1 list-disc list-inside">
                <li>Install the Revoa pixel on your store (Settings → Tracking Pixel)</li>
                <li>Ensure your ad URLs include utm_term parameter with the ad ID</li>
                <li>Check that Shopify integration is active and syncing</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
