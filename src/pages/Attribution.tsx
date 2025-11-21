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
  const [dateRange, setDateRange] = useState('30');

  useEffect(() => {
    if (user?.id) {
      loadAttributionMetrics();
    }
  }, [user?.id, dateRange]);

  const loadAttributionMetrics = async () => {
    if (!user?.id) return;

    setIsLoading(true);
    try {
      const daysBack = parseInt(dateRange);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysBack);
      const endDate = new Date();

      const { data: orders, error: ordersError } = await supabase
        .from('shopify_orders')
        .select('id, total_price, utm_source')
        .eq('user_id', user.id)
        .gte('ordered_at', startDate.toISOString())
        .lte('ordered_at', endDate.toISOString());

      if (ordersError) throw ordersError;

      const { data: conversions, error: conversionsError } = await supabase
        .from('ad_conversions')
        .select('conversion_value')
        .eq('user_id', user.id)
        .gte('converted_at', startDate.toISOString())
        .lte('converted_at', endDate.toISOString());

      if (conversionsError) throw conversionsError;

      const { data: pixelEvents, error: pixelError } = await supabase
        .from('pixel_events')
        .select('session_id')
        .eq('user_id', user.id)
        .gte('event_time', startDate.toISOString())
        .lte('event_time', endDate.toISOString());

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

  const handleSync = async () => {
    if (!user?.id) return;

    setIsSyncing(true);
    try {
      toast.loading('Syncing orders from Shopify...');

      const result = await syncShopifyOrders(user.id, parseInt(dateRange));

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-normal text-gray-900 dark:text-white mb-2">Attribution</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Track conversions with accurate first-party data
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-500"
          >
            <option value="7">Last 7 days</option>
            <option value="14">Last 14 days</option>
            <option value="30">Last 30 days</option>
            <option value="60">Last 60 days</option>
            <option value="90">Last 90 days</option>
          </select>
          <button
            onClick={handleSync}
            disabled={isSyncing}
            className="flex items-center gap-2 h-[39px] px-4 bg-gray-900 hover:bg-gray-800 disabled:opacity-50 text-white rounded-lg transition-all text-sm font-medium"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Syncing...' : 'Sync Orders'}</span>
          </button>
        </div>
      </div>

      {lastSync && (
        <div className="text-sm text-gray-500 dark:text-gray-400">
          Last synced: {formatDate(lastSync)}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
