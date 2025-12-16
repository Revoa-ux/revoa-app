import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  DollarSign,
  ShoppingCart,
  Target,
  RefreshCw,
  Percent,
  Package,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Facebook,
  Link2
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { manualSync } from '@/lib/shopifyAutoSync';
import { matchOrdersToAds } from '@/lib/attributionService';
import { supabase } from '@/lib/supabase';
import { GlassCard } from '@/components/GlassCard';
import AdReportsTimeSelector, { TimeOption } from '@/components/reports/AdReportsTimeSelector';
import { useConnectionStore } from '@/lib/connectionStore';
import { PixelInstallation } from '@/components/settings/PixelInstallation';
import { CAPISettings } from '@/components/settings/CAPISettings';

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

const UTM_TEMPLATES = {
  facebook: {
    name: 'Facebook / Meta',
    icon: Facebook,
    color: '#1877F2',
    template: '?utm_source=facebook&utm_medium=paid&utm_campaign={{campaign.name}}&utm_content={{adset.name}}&utm_term={{ad.name}}',
    description: 'Use dynamic parameters to automatically populate campaign, ad set, and ad names.',
  },
  google: {
    name: 'Google Ads',
    icon: () => (
      <svg className="w-4 h-4" viewBox="0 0 24 24">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
      </svg>
    ),
    color: '#4285F4',
    template: '?utm_source=google&utm_medium=cpc&utm_campaign={campaignname}&utm_content={adgroupname}&utm_term={creative}',
    description: 'Google Ads uses curly braces for dynamic parameters.',
  },
  tiktok: {
    name: 'TikTok Ads',
    icon: () => (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
      </svg>
    ),
    color: '#000000',
    template: '?utm_source=tiktok&utm_medium=paid&utm_campaign=__CAMPAIGN_NAME__&utm_content=__AID_NAME__&utm_term=__CID_NAME__',
    description: 'TikTok uses double underscores for dynamic macros.',
  },
};

function UTMTemplateCard({ platformKey }: { platformKey: keyof typeof UTM_TEMPLATES }) {
  const [copied, setCopied] = useState(false);
  const platform = UTM_TEMPLATES[platformKey];
  const Icon = platform.icon;

  const handleCopy = () => {
    navigator.clipboard.writeText(platform.template);
    setCopied(true);
    toast.success('UTM template copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-6 h-6 flex items-center justify-center">
          {typeof Icon === 'function' ? <Icon /> : <Icon className="w-4 h-4" style={{ color: platform.color }} />}
        </div>
        <span className="font-medium text-gray-900 dark:text-white">{platform.name}</span>
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">{platform.description}</p>
      <div className="relative">
        <code className="block w-full p-3 pr-12 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg text-xs text-gray-700 dark:text-gray-300 overflow-x-auto whitespace-nowrap">
          {platform.template}
        </code>
        <button
          onClick={handleCopy}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
        >
          {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-gray-500" />}
        </button>
      </div>
    </div>
  );
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
  const [expandedSection, setExpandedSection] = useState<string | null>('capi');

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
      toast.info('Syncing Shopify orders...');
      const syncResult = await manualSync(user.id);

      if (!syncResult.success) {
        toast.error(syncResult.error || 'Failed to sync orders');
        return;
      }

      const startDate = dateRange.startDate.toISOString();
      const endDate = dateRange.endDate.toISOString();
      const matchResult = await matchOrdersToAds(user.id, startDate, endDate);

      const message = syncResult.pages && syncResult.pages > 1
        ? `Synced ${syncResult.totalOrders} orders (${syncResult.fulfillmentsCreated} matched to quotes, ${syncResult.pages} pages) and attributed ${matchResult.matches} to ads`
        : `Synced ${syncResult.totalOrders} orders (${syncResult.fulfillmentsCreated} matched to quotes) and attributed ${matchResult.matches} to ads`;

      toast.success(message);
      loadAttributionMetrics();
    } catch (error) {
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

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-normal text-gray-900 dark:text-white mb-2">Pixel Optimization</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
          <span className="w-1.5 h-1.5 bg-gray-400 rounded-full"></span>
          Configure UTM tracking, pixel installation, and server-side conversion APIs
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <button
          onClick={() => toggleSection('capi')}
          className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-teal-50 dark:bg-teal-900/30 rounded-lg flex items-center justify-center">
              <Link2 className="w-5 h-5 text-teal-600 dark:text-teal-400" />
            </div>
            <div className="text-left">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white">Conversions API (CAPI)</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Send server-side events to ad platforms for improved tracking
              </p>
            </div>
          </div>
          {expandedSection === 'capi' ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </button>
        {expandedSection === 'capi' && (
          <div className="px-6 pb-6 border-t border-gray-100 dark:border-gray-700">
            <div className="pt-6">
              {user?.id && <CAPISettings userId={user.id} />}
            </div>
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <button
          onClick={() => toggleSection('pixel')}
          className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
              <Target className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </div>
            <div className="text-left">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white">Revoa Tracking Pixel</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Install the Revoa pixel for accurate attribution and conversion tracking
              </p>
            </div>
          </div>
          {expandedSection === 'pixel' ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </button>
        {expandedSection === 'pixel' && (
          <div className="px-6 pb-6 border-t border-gray-100 dark:border-gray-700">
            <div className="pt-6">
              {user?.id && <PixelInstallation userId={user.id} />}
            </div>
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <button
          onClick={() => toggleSection('utm')}
          className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
              <Link2 className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </div>
            <div className="text-left">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white">UTM Parameter Templates</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Copy-paste UTM templates for each ad platform
              </p>
            </div>
          </div>
          {expandedSection === 'utm' ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </button>
        {expandedSection === 'utm' && (
          <div className="px-6 pb-6 border-t border-gray-100 dark:border-gray-700">
            <div className="pt-6">
              <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <h3 className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-2">Why UTM Parameters Matter</h3>
                <p className="text-sm text-blue-700 dark:text-blue-400">
                  UTM parameters help track which ads drive conversions. Add these to your ad destination URLs
                  to enable accurate attribution in your analytics.
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <UTMTemplateCard platformKey="facebook" />
                <UTMTemplateCard platformKey="google" />
                <UTMTemplateCard platformKey="tiktok" />
              </div>

              <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Parameter Reference</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="font-mono text-xs bg-gray-200 dark:bg-gray-600 px-1.5 py-0.5 rounded text-gray-700 dark:text-gray-300">utm_source</span>
                    <span className="text-gray-600 dark:text-gray-400 ml-2">Platform (facebook, google, tiktok)</span>
                  </div>
                  <div>
                    <span className="font-mono text-xs bg-gray-200 dark:bg-gray-600 px-1.5 py-0.5 rounded text-gray-700 dark:text-gray-300">utm_medium</span>
                    <span className="text-gray-600 dark:text-gray-400 ml-2">Traffic type (paid, cpc, cpm)</span>
                  </div>
                  <div>
                    <span className="font-mono text-xs bg-gray-200 dark:bg-gray-600 px-1.5 py-0.5 rounded text-gray-700 dark:text-gray-300">utm_campaign</span>
                    <span className="text-gray-600 dark:text-gray-400 ml-2">Campaign name</span>
                  </div>
                  <div>
                    <span className="font-mono text-xs bg-gray-200 dark:bg-gray-600 px-1.5 py-0.5 rounded text-gray-700 dark:text-gray-300">utm_content</span>
                    <span className="text-gray-600 dark:text-gray-400 ml-2">Ad set / Ad group name</span>
                  </div>
                  <div>
                    <span className="font-mono text-xs bg-gray-200 dark:bg-gray-600 px-1.5 py-0.5 rounded text-gray-700 dark:text-gray-300">utm_term</span>
                    <span className="text-gray-600 dark:text-gray-400 ml-2">Ad name / Creative ID</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <button
          onClick={() => toggleSection('metrics')}
          className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </div>
            <div className="text-left">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white">Attribution Metrics</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                View your order attribution and tracking performance
              </p>
            </div>
          </div>
          {expandedSection === 'metrics' ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </button>
        {expandedSection === 'metrics' && (
          <div className="px-6 pb-6 border-t border-gray-100 dark:border-gray-700">
            <div className="pt-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleSync}
                    disabled={isSyncing}
                    className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                    <span>{isSyncing ? 'Syncing...' : 'Sync Orders'}</span>
                  </button>
                  {lastSync && (
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      Last synced: {formatDate(lastSync)}
                    </span>
                  )}
                </div>

                <AdReportsTimeSelector
                  selectedTime={selectedTime}
                  onTimeChange={handleTimeChange}
                  dateRange={dateRange}
                  onDateRangeChange={setDateRange}
                  onApply={loadAttributionMetrics}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <ShoppingCart className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-500 dark:text-gray-400">Total Orders</span>
                  </div>
                  <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                    {isLoading ? '...' : metrics.totalOrders.toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {isLoading ? '...' : formatCurrency(metrics.totalRevenue)}
                  </p>
                </div>

                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-500 dark:text-gray-400">Attributed</span>
                  </div>
                  <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                    {isLoading ? '...' : metrics.attributedOrders.toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {isLoading ? '...' : formatCurrency(metrics.attributedRevenue)}
                  </p>
                </div>

                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Percent className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-500 dark:text-gray-400">Attribution Rate</span>
                  </div>
                  <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                    {isLoading ? '...' : `${metrics.attributionRate.toFixed(1)}%`}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {isLoading ? '...' : `${formatCurrency(metrics.averageOrderValue)} AOV`}
                  </p>
                </div>

                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-500 dark:text-gray-400">Pixel Events</span>
                  </div>
                  <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                    {isLoading ? '...' : metrics.totalPixelEvents.toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {isLoading ? '...' : `${metrics.uniqueSessions} sessions`}
                  </p>
                </div>

                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-500 dark:text-gray-400">Total Revenue</span>
                  </div>
                  <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                    {isLoading ? '...' : formatCurrency(metrics.totalRevenue)}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {isLoading ? '...' : `${metrics.totalOrders} orders`}
                  </p>
                </div>

                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Package className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-500 dark:text-gray-400">Avg Order Value</span>
                  </div>
                  <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                    {isLoading ? '...' : formatCurrency(metrics.averageOrderValue)}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Per order</p>
                </div>
              </div>

              {metrics.attributionRate < 50 && metrics.totalOrders > 5 && (
                <div className="mt-6 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <span className="text-yellow-600 dark:text-yellow-400">!</span>
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white mb-1">
                        Low Attribution Rate Detected
                      </h4>
                      <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                        Only {metrics.attributionRate.toFixed(1)}% of your orders are being attributed to ads. To improve:
                      </p>
                      <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1 list-disc list-inside">
                        <li>Configure your CAPI settings above</li>
                        <li>Install the Revoa pixel on your store</li>
                        <li>Use the UTM templates for your ad URLs</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
