import React, { useEffect, useState } from 'react';
import { TrendingUp, Users, DollarSign, Activity } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { pricingTiers } from '@/components/pricing/PricingTiers';

interface TierStats {
  tier: string;
  count: number;
  revenue: number;
  percentage: number;
}

interface AnalyticsData {
  totalStores: number;
  activeSubscriptions: number;
  totalMRR: number;
  averageOrderCount: number;
  tierDistribution: TierStats[];
  recentUpgrades: number;
  churnRate: number;
}

export function SubscriptionAnalytics() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');

  useEffect(() => {
    loadAnalytics();
  }, [timeRange]);

  const loadAnalytics = async () => {
    setLoading(true);

    try {
      // Get all stores with subscription data
      const { data: stores, error } = await supabase
        .from('shopify_stores')
        .select('id, current_tier, subscription_status, monthly_order_count');

      if (error) throw error;

      // Calculate tier distribution
      const tierCounts: Record<string, number> = {};
      let totalActiveSubscriptions = 0;
      let totalOrderCount = 0;

      stores?.forEach(store => {
        const tier = store.current_tier || 'startup';
        tierCounts[tier] = (tierCounts[tier] || 0) + 1;

        if (store.subscription_status === 'ACTIVE') {
          totalActiveSubscriptions++;
          totalOrderCount += store.monthly_order_count || 0;
        }
      });

      // Calculate MRR and tier stats
      const tierDistribution: TierStats[] = [];
      let totalMRR = 0;

      Object.entries(tierCounts).forEach(([tier, count]) => {
        const tierData = pricingTiers.find(t => t.id === tier);
        const revenue = tierData ? tierData.monthlyFee * count : 0;
        totalMRR += revenue;

        tierDistribution.push({
          tier,
          count,
          revenue,
          percentage: 0, // Will calculate after
        });
      });

      // Calculate percentages
      tierDistribution.forEach(stat => {
        stat.percentage = Math.round((stat.count / (stores?.length || 1)) * 100);
      });

      // Sort by tier order
      const tierOrder = ['startup', 'momentum', 'scale', 'enterprise'];
      tierDistribution.sort((a, b) => tierOrder.indexOf(a.tier) - tierOrder.indexOf(b.tier));

      // Get recent upgrades count
      const daysAgo = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
      const { count: upgradeCount } = await supabase
        .from('subscription_history')
        .select('id', { count: 'exact', head: true })
        .eq('event_type', 'upgraded')
        .gte('created_at', new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString());

      // Get cancellations for churn rate
      const { count: cancelCount } = await supabase
        .from('subscription_history')
        .select('id', { count: 'exact', head: true })
        .eq('event_type', 'cancelled')
        .gte('created_at', new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString());

      const churnRate = totalActiveSubscriptions > 0
        ? Math.round(((cancelCount || 0) / totalActiveSubscriptions) * 100)
        : 0;

      setData({
        totalStores: stores?.length || 0,
        activeSubscriptions: totalActiveSubscriptions,
        totalMRR,
        averageOrderCount: totalActiveSubscriptions > 0
          ? Math.round(totalOrderCount / totalActiveSubscriptions)
          : 0,
        tierDistribution,
        recentUpgrades: upgradeCount || 0,
        churnRate,
      });
    } catch (error) {
      console.error('Error loading analytics:', error);
    }

    setLoading(false);
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-32 bg-gray-200 dark:bg-[#3a3a3a] rounded-xl"></div>
        <div className="h-64 bg-gray-200 dark:bg-[#3a3a3a] rounded-xl"></div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 dark:text-gray-400">Failed to load analytics</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Time Range Selector */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
          Subscription Analytics
        </h2>
        <div className="flex gap-2">
          {(['7d', '30d', '90d'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                timeRange === range
                  ? 'bg-red-500 text-white'
                  : 'bg-gray-100 dark:bg-dark text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-[#3a3a3a]'
              }`}
            >
              {range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : '90 Days'}
            </button>
          ))}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="rounded-xl border border-gray-200 dark:border-[#3a3a3a] bg-white dark:bg-dark p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <span className="text-sm text-gray-500 dark:text-gray-400">Active Stores</span>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">
            {data.activeSubscriptions.toLocaleString()}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            of {data.totalStores.toLocaleString()} total
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 dark:border-[#3a3a3a] bg-white dark:bg-dark p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
              <DollarSign className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <span className="text-sm text-gray-500 dark:text-gray-400">Monthly Revenue</span>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">
            ${data.totalMRR.toLocaleString()}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">MRR</p>
        </div>

        <div className="rounded-xl border border-gray-200 dark:border-[#3a3a3a] bg-white dark:bg-dark p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
              <Activity className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <span className="text-sm text-gray-500 dark:text-gray-400">Avg Orders/Store</span>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">
            {data.averageOrderCount.toLocaleString()}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">per month</p>
        </div>

        <div className="rounded-xl border border-gray-200 dark:border-[#3a3a3a] bg-white dark:bg-dark p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
              <TrendingUp className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <span className="text-sm text-gray-500 dark:text-gray-400">Recent Upgrades</span>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">
            {data.recentUpgrades}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            in last {timeRange === '7d' ? '7' : timeRange === '30d' ? '30' : '90'} days
          </p>
        </div>
      </div>

      {/* Tier Distribution */}
      <div className="rounded-xl border border-gray-200 dark:border-[#3a3a3a] bg-white dark:bg-dark p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
          Tier Distribution
        </h3>

        <div className="space-y-4">
          {data.tierDistribution.map((stat) => {
            const tierData = pricingTiers.find(t => t.id === stat.tier);
            return (
              <div key={stat.tier}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-900 dark:text-white capitalize">
                      {tierData?.name || stat.tier}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      ${tierData?.monthlyFee}/mo
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {stat.count} stores
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {stat.percentage}%
                    </span>
                  </div>
                </div>
                <div className="w-full h-2 bg-gray-100 dark:bg-[#3a3a3a] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-red-500 to-red-600 rounded-full transition-all duration-500"
                    style={{ width: `${stat.percentage}%` }}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-[#3a3a3a]">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">Total MRR</span>
            <span className="font-semibold text-gray-900 dark:text-white">
              ${data.totalMRR.toLocaleString()}/month
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
