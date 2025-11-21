import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  DollarSign,
  ShoppingCart,
  Target,
  RefreshCw,
  Settings,
  ChevronDown,
  ChevronUp,
  Percent,
  Users,
  Package,
  CreditCard,
  TrendingDown
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { syncShopifyOrders } from '@/lib/attributionService';
import { supabase } from '@/lib/supabase';
import { MetricCard, MetricDefinition } from '@/components/attribution/MetricCard';
import { CustomizeMetricsModal } from '@/components/attribution/CustomizeMetricsModal';

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

const ALL_METRICS: MetricDefinition[] = [
  {
    id: 'total_orders',
    label: 'Total Orders',
    icon: ShoppingCart,
    iconColor: 'text-blue-600 dark:text-blue-400',
    iconBgColor: 'bg-blue-100 dark:bg-blue-900/30',
    format: 'number',
    getValue: (metrics) => metrics.totalOrders,
    getSubtext: (metrics) => `${new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(metrics.totalRevenue)} revenue`,
  },
  {
    id: 'attributed_orders',
    label: 'Attributed Orders',
    icon: Target,
    iconColor: 'text-green-600 dark:text-green-400',
    iconBgColor: 'bg-green-100 dark:bg-green-900/30',
    format: 'number',
    getValue: (metrics) => metrics.attributedOrders,
    getSubtext: (metrics) => `${new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(metrics.attributedRevenue)} revenue`,
  },
  {
    id: 'attribution_rate',
    label: 'Attribution Rate',
    icon: Percent,
    iconColor: 'text-purple-600 dark:text-purple-400',
    iconBgColor: 'bg-purple-100 dark:bg-purple-900/30',
    format: 'percentage',
    getValue: (metrics) => metrics.attributionRate,
    getSubtext: (metrics) => `${new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(metrics.averageOrderValue)} AOV`,
  },
  {
    id: 'unattributed_orders',
    label: 'Unattributed Orders',
    icon: TrendingDown,
    iconColor: 'text-orange-600 dark:text-orange-400',
    iconBgColor: 'bg-orange-100 dark:bg-orange-900/30',
    format: 'number',
    getValue: (metrics) => metrics.unattributedOrders,
    getSubtext: (metrics) => `${new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(metrics.unattributedRevenue)} revenue`,
  },
  {
    id: 'total_revenue',
    label: 'Total Revenue',
    icon: DollarSign,
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    iconBgColor: 'bg-emerald-100 dark:bg-emerald-900/30',
    format: 'currency',
    getValue: (metrics) => metrics.totalRevenue,
    getSubtext: (metrics) => `${metrics.totalOrders} orders`,
  },
  {
    id: 'attributed_revenue',
    label: 'Attributed Revenue',
    icon: CreditCard,
    iconColor: 'text-teal-600 dark:text-teal-400',
    iconBgColor: 'bg-teal-100 dark:bg-teal-900/30',
    format: 'currency',
    getValue: (metrics) => metrics.attributedRevenue,
    getSubtext: (metrics) => `${metrics.attributedOrders} orders`,
  },
  {
    id: 'average_order_value',
    label: 'Average Order Value',
    icon: Package,
    iconColor: 'text-indigo-600 dark:text-indigo-400',
    iconBgColor: 'bg-indigo-100 dark:bg-indigo-900/30',
    format: 'currency',
    getValue: (metrics) => metrics.averageOrderValue,
  },
  {
    id: 'pixel_events',
    label: 'Pixel Events',
    icon: TrendingUp,
    iconColor: 'text-pink-600 dark:text-pink-400',
    iconBgColor: 'bg-pink-100 dark:bg-pink-900/30',
    format: 'number',
    getValue: (metrics) => metrics.totalPixelEvents,
    getSubtext: (metrics) => `${metrics.uniqueSessions} sessions`,
  },
];

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
  const [showCustomizeModal, setShowCustomizeModal] = useState(false);
  const [isOverviewCollapsed, setIsOverviewCollapsed] = useState(false);
  const [visibleMetrics, setVisibleMetrics] = useState<string[]>(
    ALL_METRICS.slice(0, 6).map(m => m.id)
  );
  const [metricOrder, setMetricOrder] = useState<string[]>(
    ALL_METRICS.map(m => m.id)
  );

  useEffect(() => {
    if (user?.id) {
      loadDashboardPreferences();
      loadAttributionMetrics();
    }
  }, [user?.id, dateRange]);

  const loadDashboardPreferences = async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('dashboard_preferences')
        .select('*')
        .eq('user_id', user.id)
        .eq('dashboard_type', 'attribution')
        .maybeSingle();

      if (error) throw error;

      if (data) {
        if (data.visible_metrics && Array.isArray(data.visible_metrics)) {
          setVisibleMetrics(data.visible_metrics);
        }
        if (data.metric_order && Array.isArray(data.metric_order)) {
          setMetricOrder(data.metric_order);
        }
        if (data.view_settings?.isCollapsed !== undefined) {
          setIsOverviewCollapsed(data.view_settings.isCollapsed);
        }
      }
    } catch (error) {
      console.error('Error loading dashboard preferences:', error);
    }
  };

  const saveDashboardPreferences = async (
    newVisibleMetrics: string[],
    newMetricOrder: string[],
    newCollapsed?: boolean
  ) => {
    if (!user?.id) return;

    try {
      const { error } = await supabase
        .from('dashboard_preferences')
        .upsert({
          user_id: user.id,
          dashboard_type: 'attribution',
          visible_metrics: newVisibleMetrics,
          metric_order: newMetricOrder,
          view_settings: {
            isCollapsed: newCollapsed ?? isOverviewCollapsed,
          },
        });

      if (error) throw error;
      toast.success('Dashboard preferences saved');
    } catch (error) {
      console.error('Error saving dashboard preferences:', error);
      toast.error('Failed to save preferences');
    }
  };

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

  const handleSaveCustomization = (newVisible: string[], newOrder: string[]) => {
    setVisibleMetrics(newVisible);
    setMetricOrder(newOrder);
    saveDashboardPreferences(newVisible, newOrder);
  };

  const toggleOverviewCollapse = () => {
    const newCollapsed = !isOverviewCollapsed;
    setIsOverviewCollapsed(newCollapsed);
    saveDashboardPreferences(visibleMetrics, metricOrder, newCollapsed);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const displayedMetrics = metricOrder
    .filter(id => visibleMetrics.includes(id))
    .map(id => ALL_METRICS.find(m => m.id === id))
    .filter(Boolean) as MetricDefinition[];

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
            className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors text-sm font-medium"
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

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <div
          className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
          onClick={toggleOverviewCollapse}
        >
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Performance Overview
            </h2>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {displayedMetrics.length} metrics
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowCustomizeModal(true);
              }}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title="Customize metrics"
            >
              <Settings className="w-5 h-5" />
            </button>
            {isOverviewCollapsed ? (
              <ChevronDown className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            ) : (
              <ChevronUp className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            )}
          </div>
        </div>

        {!isOverviewCollapsed && (
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {displayedMetrics.map((metric) => (
                <MetricCard
                  key={metric.id}
                  metric={metric}
                  data={metrics}
                  isLoading={isLoading}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          How Attribution Works
        </h2>
        <div className="space-y-4 text-sm text-gray-600 dark:text-gray-400">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">1</span>
            </div>
            <div>
              <p className="font-medium text-gray-900 dark:text-white mb-1">UTM Tracking</p>
              <p>When users click your ads, UTM parameters (especially utm_term with ad ID) are captured and stored in cookies.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-xs font-semibold text-green-600 dark:text-green-400">2</span>
            </div>
            <div>
              <p className="font-medium text-gray-900 dark:text-white mb-1">Order Syncing</p>
              <p>Shopify orders are synced with UTM data automatically via webhooks and the pixel.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-xs font-semibold text-purple-600 dark:text-purple-400">3</span>
            </div>
            <div>
              <p className="font-medium text-gray-900 dark:text-white mb-1">Ad Matching</p>
              <p>Orders are matched to specific ads using utm_term, ad names, and click IDs (fbclid, gclid).</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-xs font-semibold text-orange-600 dark:text-orange-400">4</span>
            </div>
            <div>
              <p className="font-medium text-gray-900 dark:text-white mb-1">CAPI Enhancement</p>
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

      <CustomizeMetricsModal
        isOpen={showCustomizeModal}
        onClose={() => setShowCustomizeModal(false)}
        allMetrics={ALL_METRICS}
        visibleMetrics={visibleMetrics}
        metricOrder={metricOrder}
        onSave={handleSaveCustomization}
      />
    </div>
  );
}
