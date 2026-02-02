import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Users,
  DollarSign,
  Mail,
  FileText,
  BarChart3,
  Calendar,
  ArrowUp,
  ArrowDown,
  Loader2,
  Tag
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAdmin } from '@/contexts/AdminContext';
import { formatDistanceToNow } from 'date-fns';

interface SaaSMetrics {
  mrr: number;
  arr: number;
  activeUsers: number;
  churnRate: number;
  activationRate: number;
  avgRevenuePerUser: number;
}

interface TemplateStats {
  totalTemplates: number;
  totalUsage: number;
  mostUsedTemplate: {
    name: string;
    usage_count: number;
  } | null;
  recentlyUsed: Array<{
    template_name: string;
    user_name: string;
    used_at: string;
    action: string;
  }>;
  usageByCategory: Array<{
    category: string;
    count: number;
  }>;
}

export default function AdminAnalytics() {
  const { isSuperAdmin } = useAdmin();
  const [isLoading, setIsLoading] = useState(true);
  const [saasMetrics, setSaasMetrics] = useState<SaaSMetrics>({
    mrr: 0,
    arr: 0,
    activeUsers: 0,
    churnRate: 0,
    activationRate: 0,
    avgRevenuePerUser: 0,
  });
  const [templateStats, setTemplateStats] = useState<TemplateStats>({
    totalTemplates: 0,
    totalUsage: 0,
    mostUsedTemplate: null,
    recentlyUsed: [],
    usageByCategory: [],
  });
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');

  useEffect(() => {
    if (isSuperAdmin) {
      fetchAnalytics();
    }
  }, [isSuperAdmin, timeRange]);

  const fetchAnalytics = async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        fetchSaaSMetrics(),
        fetchTemplateStats(),
      ]);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSaaSMetrics = async () => {
    try {
      // Get active users (users with quotes in last 30 days)
      const { count: activeUsers } = await supabase
        .from('product_quotes')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

      // Get total revenue from invoices
      const { data: paidInvoices } = await supabase
        .from('invoices')
        .select('amount')
        .eq('status', 'paid')
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

      const monthlyRevenue = (paidInvoices || []).reduce((sum, inv) => sum + (inv.amount || 0), 0);

      // Get total users
      const { count: totalUsers } = await supabase
        .from('user_profiles')
        .select('*', { count: 'exact', head: true })
        .not('is_admin', 'is', true);

      // Calculate activation rate (users with at least one accepted quote)
      const { count: activatedUsers } = await supabase
        .from('product_quotes')
        .select('user_id', { count: 'exact', head: true })
        .eq('status', 'accepted');

      const activationRate = totalUsers && totalUsers > 0
        ? ((activatedUsers || 0) / totalUsers) * 100
        : 0;

      const arpu = activeUsers && activeUsers > 0
        ? monthlyRevenue / activeUsers
        : 0;

      setSaasMetrics({
        mrr: monthlyRevenue,
        arr: monthlyRevenue * 12,
        activeUsers: activeUsers || 0,
        churnRate: 5.2, // Placeholder - would need historical data
        activationRate: activationRate,
        avgRevenuePerUser: arpu,
      });
    } catch (error) {
      console.error('Error fetching SaaS metrics:', error);
    }
  };

  const fetchTemplateStats = async () => {
    try {
      // Total templates
      const { count: totalTemplates } = await supabase
        .from('email_response_templates')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      // Total usage
      const { data: templates } = await supabase
        .from('email_response_templates')
        .select('usage_count, template_name, template_category')
        .eq('is_active', true);

      const totalUsage = (templates || []).reduce((sum, t) => sum + (t.usage_count || 0), 0);

      // Most used template
      const sortedTemplates = [...(templates || [])].sort((a, b) => (b.usage_count || 0) - (a.usage_count || 0));
      const mostUsedTemplate = sortedTemplates.length > 0
        ? { name: sortedTemplates[0].template_name, usage_count: sortedTemplates[0].usage_count || 0 }
        : null;

      // Usage by category
      const categoryMap = new Map<string, number>();
      (templates || []).forEach((t) => {
        const current = categoryMap.get(t.template_category) || 0;
        categoryMap.set(t.template_category, current + (t.usage_count || 0));
      });

      const usageByCategory = Array.from(categoryMap.entries())
        .map(([category, count]) => ({ category, count }))
        .sort((a, b) => b.count - a.count);

      // Recently used templates
      const daysAgo = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
      const { data: recentUsage } = await supabase
        .from('template_usage_log')
        .select(`
          action_taken,
          used_at,
          email_response_templates(template_name),
          user_profiles(first_name, last_name, company)
        `)
        .gte('used_at', new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString())
        .order('used_at', { ascending: false })
        .limit(10);

      const recentlyUsed = (recentUsage || []).map((usage: any) => ({
        template_name: usage.email_response_templates?.template_name || 'Unknown',
        user_name: usage.user_profiles?.first_name && usage.user_profiles?.last_name
          ? `${usage.user_profiles.first_name} ${usage.user_profiles.last_name}`
          : usage.user_profiles?.company || 'Unknown User',
        used_at: usage.used_at,
        action: usage.action_taken,
      }));

      setTemplateStats({
        totalTemplates: totalTemplates || 0,
        totalUsage,
        mostUsedTemplate,
        recentlyUsed,
        usageByCategory,
      });
    } catch (error) {
      console.error('Error fetching template stats:', error);
    }
  };

  if (!isSuperAdmin) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400">
            This page is only accessible to super admins
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-normal text-gray-900 dark:text-gray-100 mb-2">
            Platform Analytics
          </h1>
          <div className="flex items-start sm:items-center space-x-2">
            <div className="w-1.5 h-1.5 bg-red-500 rounded-full mt-1.5 sm:mt-0 flex-shrink-0"></div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Super admin only · Real-time metrics
            </p>
          </div>
        </div>

        {/* Time Range Selector */}
        <div className="flex items-center gap-2">
          {(['7d', '30d', '90d'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                timeRange === range
                  ? 'bg-rose-600 text-white'
                  : 'bg-gray-100 dark:bg-dark text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-[#3a3a3a]'
              }`}
            >
              {range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : '90 Days'}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      ) : (
        <>
          {/* SaaS Metrics */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              SaaS Metrics
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* MRR */}
              <div className="bg-white dark:bg-dark p-6 rounded-xl border border-gray-200 dark:border-[#3a3a3a]">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                    <DollarSign className="w-5 h-5 text-green-600 dark:text-green-400" />
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-400">Monthly</span>
                </div>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
                  ${saasMetrics.mrr.toFixed(0)}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">MRR</p>
              </div>

              {/* ARR */}
              <div className="bg-white dark:bg-dark p-6 rounded-xl border border-gray-200 dark:border-[#3a3a3a]">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                    <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-400">Annual</span>
                </div>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
                  ${saasMetrics.arr.toFixed(0)}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">ARR</p>
              </div>

              {/* Active Users */}
              <div className="bg-white dark:bg-dark p-6 rounded-xl border border-gray-200 dark:border-[#3a3a3a]">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                    <Users className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-400">Last 30d</span>
                </div>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
                  {saasMetrics.activeUsers}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Active Users</p>
              </div>

              {/* Churn Rate */}
              <div className="bg-white dark:bg-dark p-6 rounded-xl border border-gray-200 dark:border-[#3a3a3a]">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2 bg-red-100 dark:bg-red-900/20 rounded-lg">
                    <ArrowDown className="w-5 h-5 text-red-600 dark:text-red-400" />
                  </div>
                </div>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
                  {saasMetrics.churnRate.toFixed(1)}%
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Churn Rate</p>
              </div>

              {/* Activation Rate */}
              <div className="bg-white dark:bg-dark p-6 rounded-xl border border-gray-200 dark:border-[#3a3a3a]">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2 bg-amber-100 dark:bg-amber-900/20 rounded-lg">
                    <BarChart3 className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                  </div>
                </div>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
                  {saasMetrics.activationRate.toFixed(1)}%
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Activation Rate</p>
              </div>

              {/* ARPU */}
              <div className="bg-white dark:bg-dark p-6 rounded-xl border border-gray-200 dark:border-[#3a3a3a]">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2 bg-indigo-100 dark:bg-indigo-900/20 rounded-lg">
                    <DollarSign className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  </div>
                </div>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
                  ${saasMetrics.avgRevenuePerUser.toFixed(0)}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">ARPU</p>
              </div>
            </div>
          </div>

          {/* Template Analytics */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Email Template Analytics
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Template Overview */}
              <div className="bg-white dark:bg-dark p-6 rounded-xl border border-gray-200 dark:border-[#3a3a3a]">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
                  Overview
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        Total Templates
                      </span>
                    </div>
                    <span className="text-lg font-semibold text-gray-900 dark:text-white">
                      {templateStats.totalTemplates}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        Total Usage
                      </span>
                    </div>
                    <span className="text-lg font-semibold text-gray-900 dark:text-white">
                      {templateStats.totalUsage}
                    </span>
                  </div>
                  {templateStats.mostUsedTemplate && (
                    <div className="pt-4 border-t border-gray-200 dark:border-[#3a3a3a]">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Most Used</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {templateStats.mostUsedTemplate.name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {templateStats.mostUsedTemplate.usage_count} uses
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Usage by Category */}
              <div className="bg-white dark:bg-dark p-6 rounded-xl border border-gray-200 dark:border-[#3a3a3a]">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
                  Usage by Category
                </h3>
                <div className="space-y-3">
                  {templateStats.usageByCategory.map((category, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Tag className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          {category.category.replace('_', ' ')}
                        </span>
                      </div>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {category.count}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Recent Template Usage */}
          <div className="bg-white dark:bg-dark p-6 rounded-xl border border-gray-200 dark:border-[#3a3a3a]">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
              Recent Template Usage
            </h3>
            <div className="space-y-3">
              {templateStats.recentlyUsed.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
                  No recent template usage
                </p>
              ) : (
                templateStats.recentlyUsed.map((usage, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-dark rounded-lg"
                  >
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {usage.template_name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {usage.user_name} · {usage.action}
                      </p>
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {formatDistanceToNow(new Date(usage.used_at), { addSuffix: true })}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
