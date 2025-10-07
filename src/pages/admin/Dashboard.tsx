import React, { useState, useEffect } from 'react';
import {
  Users,
  MessageSquare,
  FileText,
  Package,
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface DashboardStats {
  totalUsers: number;
  activeChats: number;
  pendingQuotes: number;
  pendingProducts: number;
  totalRevenue: number;
  newUsersThisWeek: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    activeChats: 0,
    pendingQuotes: 0,
    pendingProducts: 0,
    totalRevenue: 0,
    newUsersThisWeek: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardStats();
  }, []);

  const loadDashboardStats = async () => {
    try {
      setLoading(true);

      const [usersResult, chatsResult, quotesResult, productsResult] = await Promise.all([
        supabase.from('user_profiles').select('id, created_at', { count: 'exact' }),
        supabase.from('chats').select('id', { count: 'exact' }).eq('status', 'active'),
        supabase.from('product_quotes').select('id', { count: 'exact' }).eq('status', 'pending'),
        supabase.from('products').select('id', { count: 'exact' }).eq('approval_status', 'pending')
      ]);

      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const newUsers = usersResult.data?.filter(
        user => new Date(user.created_at) > weekAgo
      ).length || 0;

      setStats({
        totalUsers: usersResult.count || 0,
        activeChats: chatsResult.count || 0,
        pendingQuotes: quotesResult.count || 0,
        pendingProducts: productsResult.count || 0,
        totalRevenue: 0,
        newUsersThisWeek: newUsers
      });
    } catch (error) {
      console.error('Error loading dashboard stats:', error);
      toast.error('Failed to load dashboard statistics');
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: 'Total Users',
      value: stats.totalUsers,
      icon: Users,
      color: 'bg-blue-500',
      change: `+${stats.newUsersThisWeek} this week`
    },
    {
      title: 'Active Chats',
      value: stats.activeChats,
      icon: MessageSquare,
      color: 'bg-green-500',
      change: 'Ongoing conversations'
    },
    {
      title: 'Pending Quotes',
      value: stats.pendingQuotes,
      icon: FileText,
      color: 'bg-yellow-500',
      change: 'Awaiting response'
    },
    {
      title: 'Product Approvals',
      value: stats.pendingProducts,
      icon: Package,
      color: 'bg-purple-500',
      change: 'Needs review'
    }
  ];

  const recentActivity = [
    { type: 'user', message: 'New user registration', time: '5 minutes ago', icon: Users },
    { type: 'quote', message: 'Quote request submitted', time: '15 minutes ago', icon: FileText },
    { type: 'product', message: 'Product uploaded for approval', time: '1 hour ago', icon: Package },
    { type: 'chat', message: 'New chat conversation started', time: '2 hours ago', icon: MessageSquare }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-gray-200 dark:border-gray-700 border-t-gray-900 dark:border-t-white rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-sm text-gray-600 dark:text-gray-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Admin Dashboard</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Overview of platform activity and statistics
          </p>
        </div>
        <button
          onClick={loadDashboardStats}
          className="px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg text-sm font-medium hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors"
        >
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.title}
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`${card.color} w-12 h-12 rounded-lg flex items-center justify-center`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{card.title}</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{card.value}</p>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">{card.change}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recent Activity</h2>
          <div className="space-y-4">
            {recentActivity.map((activity, index) => {
              const Icon = activity.icon;
              return (
                <div key={index} className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 dark:text-white">{activity.message}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-0.5">{activity.time}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <a
              href="/admin/products"
              className="block p-4 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors"
            >
              <div className="flex items-center gap-3">
                <Package className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">Review Products</p>
                  <p className="text-xs text-gray-500 dark:text-gray-500">
                    {stats.pendingProducts} pending approval
                  </p>
                </div>
              </div>
            </a>
            <a
              href="/admin/chat"
              className="block p-4 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors"
            >
              <div className="flex items-center gap-3">
                <MessageSquare className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">Manage Conversations</p>
                  <p className="text-xs text-gray-500 dark:text-gray-500">
                    {stats.activeChats} active chats
                  </p>
                </div>
              </div>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
