import React, { useState, useEffect } from 'react';
import {
  Users,
  DollarSign,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  AlertTriangle,
  Bell,
  X,
  Database,
  MemoryStick as Memory,
  Activity,
  ShoppingCart,
  FileText,
  Shield,
  ChevronRight
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useAdmin } from '@/contexts/AdminContext';
import AdReportsTimeSelector, { TimeOption } from '@/components/reports/AdReportsTimeSelector';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

interface DateRange {
  startDate: Date;
  endDate: Date;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  status: 'read' | 'unread';
  priority: 'low' | 'medium' | 'high';
  icon: React.ReactNode;
  actionUrl?: string;
  actionLabel?: string;
}

interface BackendHealthMetrics {
  api: {
    requestsPerMinute: number;
    averageResponseTime: number;
    errorRate: number;
    status: 'healthy' | 'degraded' | 'critical';
  };
  database: {
    connections: number;
    averageQueryTime: number;
    diskUsage: number;
    status: 'healthy' | 'degraded' | 'critical';
  };
  memory: {
    used: number;
    total: number;
    percentage: number;
    status: 'healthy' | 'degraded' | 'critical';
  };
  security: {
    activeUsers: number;
    failedLogins: number;
    threatLevel: 'low' | 'medium' | 'high';
    status: 'healthy' | 'degraded' | 'critical';
  };
}

interface MetricCard {
  id: string;
  title: string;
  icon: React.ReactNode;
  value: string | number;
  change: number;
  metric1: { label: string; value: string | number };
  metric2: { label: string; value: string | number };
}

export default function AdminDashboard() {
  const { adminUser, isSuperAdmin } = useAdmin();
  const [selectedTime, setSelectedTime] = useState<TimeOption>('7d');
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    endDate: new Date()
  });
  const [isLoading, setIsLoading] = useState(true);
  const [onlineUsers, setOnlineUsers] = useState(0);
  const [dashboardStats, setDashboardStats] = useState({
    totalUsers: 0,
    newUsersToday: 0,
    activeUsers: 0,
    totalRevenue: 0,
    totalOrders: 0,
    completedOrders: 0,
    pendingOrders: 0,
    activeQuotes: 0
  });
  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: '1',
      title: 'High Server Load Detected',
      message: 'Server CPU usage has exceeded 80% for the past 5 minutes.',
      timestamp: new Date().toISOString(),
      status: 'unread',
      priority: 'high',
      icon: <AlertTriangle className="w-4 h-4 text-red-500" />
    },
    {
      id: '2',
      title: 'New User Registration Spike',
      message: '50+ new users registered in the last hour.',
      timestamp: new Date().toISOString(),
      status: 'unread',
      priority: 'medium',
      icon: <Users className="w-4 h-4 text-yellow-500" />,
      actionUrl: '/admin/users',
      actionLabel: 'View Users'
    }
  ]);

  const [backendHealth] = useState<BackendHealthMetrics>({
    api: {
      requestsPerMinute: 350,
      averageResponseTime: 245,
      errorRate: 0.5,
      status: 'healthy'
    },
    database: {
      connections: 42,
      averageQueryTime: 85,
      diskUsage: 68,
      status: 'healthy'
    },
    memory: {
      used: 6.2,
      total: 8,
      percentage: 77.5,
      status: 'degraded'
    },
    security: {
      activeUsers: 128,
      failedLogins: 12,
      threatLevel: 'low',
      status: 'healthy'
    }
  });

  useEffect(() => {
    fetchDashboardStats();

    const subscription = supabase
      .channel('admin-dashboard')
      .on('presence', { event: 'sync' }, () => {
        const presenceState = subscription.presenceState();
        setOnlineUsers(Object.keys(presenceState).length);
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchDashboardStats = async () => {
    try {
      setIsLoading(true);

      // Fetch total users (non-admins)
      const { count: totalUsers } = await supabase
        .from('user_profiles')
        .select('*', { count: 'exact', head: true })
        .eq('is_admin', false);

      // Fetch users created today
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const { count: newUsersToday } = await supabase
        .from('user_profiles')
        .select('*', { count: 'exact', head: true })
        .eq('is_admin', false)
        .gte('created_at', todayStart.toISOString());

      // Fetch product quotes count
      const { count: activeQuotes } = await supabase
        .from('product_quotes')
        .select('*', { count: 'exact', head: true })
        .in('status', ['pending', 'quoted']);

      // Calculate active users percentage (users with assignments)
      const { count: assignedUsers } = await supabase
        .from('user_assignments')
        .select('*', { count: 'exact', head: true });

      const activePercentage = totalUsers && totalUsers > 0
        ? Math.round((assignedUsers || 0) / totalUsers * 100)
        : 0;

      setDashboardStats({
        totalUsers: totalUsers || 0,
        newUsersToday: newUsersToday || 0,
        activeUsers: activePercentage,
        totalRevenue: 0,
        totalOrders: 0,
        completedOrders: 0,
        pendingOrders: 0,
        activeQuotes: activeQuotes || 0
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTimeChange = (time: TimeOption) => {
    setSelectedTime(time);
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 1000);
  };

  const handleDateRangeChange = (range: DateRange) => {
    setDateRange(range);
  };

  const handleApplyDateRange = () => {
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 1000);
  };

  const renderChangeIndicator = (change: number) => {
    const Icon = change > 0 ? ArrowUpRight : ArrowDownRight;
    return (
      <div className={`flex items-center text-sm ${
        change > 0 ? 'text-green-500' : 'text-red-500'
      }`}>
        <Icon className="w-4 h-4 mr-1" />
        {Math.abs(change)}%
      </div>
    );
  };

  const getMetricCards = () => {
    const metrics: MetricCard[] = [
      {
        id: 'users',
        title: 'Total Users',
        icon: <Users className="w-4 h-4 text-gray-600 dark:text-gray-400" />,
        value: dashboardStats.totalUsers.toLocaleString(),
        change: 0,
        metric1: { label: 'New Today', value: dashboardStats.newUsersToday.toString() },
        metric2: { label: 'Active', value: `${dashboardStats.activeUsers}%` }
      },
      {
        id: 'revenue',
        title: 'Total Revenue',
        icon: <DollarSign className="w-4 h-4 text-gray-600 dark:text-gray-400" />,
        value: `$${dashboardStats.totalRevenue.toLocaleString()}`,
        change: 0,
        metric1: { label: 'MRR', value: '$0' },
        metric2: { label: 'ARR', value: '$0' }
      },
      {
        id: 'orders',
        title: 'Total Orders',
        icon: <ShoppingCart className="w-4 h-4 text-gray-600 dark:text-gray-400" />,
        value: dashboardStats.totalOrders.toLocaleString(),
        change: 0,
        metric1: { label: 'Completed', value: dashboardStats.completedOrders.toString() },
        metric2: { label: 'Pending', value: dashboardStats.pendingOrders.toString() }
      },
      {
        id: 'quotes',
        title: 'Active Quotes',
        icon: <FileText className="w-4 h-4 text-gray-600 dark:text-gray-400" />,
        value: dashboardStats.activeQuotes.toString(),
        change: 0,
        metric1: { label: 'Acceptance Rate', value: 'N/A' },
        metric2: { label: 'Avg Value', value: 'N/A' }
      }
    ];

    return (
      <div className="grid grid-cols-4 gap-6">
        {metrics.map(metric => (
          <div key={metric.id} className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                {metric.icon}
              </div>
              {renderChangeIndicator(metric.change)}
            </div>
            <div>
              <h3 className="text-xs text-gray-500 dark:text-gray-400">{metric.title}</h3>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">{metric.value}</p>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500 dark:text-gray-400">{metric.metric1.label}</span>
                <span className="text-xs font-medium text-gray-900 dark:text-gray-100">{metric.metric1.value}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500 dark:text-gray-400">{metric.metric2.label}</span>
                <span className="text-xs font-medium text-gray-900 dark:text-gray-100">{metric.metric2.value}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-normal text-gray-900 dark:text-gray-100 mb-2">
            Admin Dashboard
          </h1>
          <div className="flex items-center space-x-2">
            <div className="w-1.5 h-1.5 bg-primary-500 rounded-full"></div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {isLoading ? 'Updating metrics...' : 'Welcome back, ' + adminUser?.email}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <p className="text-sm text-gray-900 dark:text-gray-100">{onlineUsers} users active now</p>
          </div>
          <button 
            className="px-3 py-2 text-sm text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 dark:bg-gray-900/50 transition-colors flex items-center space-x-2"
            onClick={handleApplyDateRange}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Refreshing...</span>
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4" />
                <span>Refresh</span>
              </>
            )}
          </button>
          <AdReportsTimeSelector
            selectedTime={selectedTime}
            onTimeChange={handleTimeChange}
            dateRange={dateRange}
            onDateRangeChange={handleDateRangeChange}
            onApply={handleApplyDateRange}
          />
        </div>
      </div>

      {/* Backend Health Section for Super Admins */}
      {isSuperAdmin && (
        <div className="grid grid-cols-4 gap-6">
          {/* API Health */}
          <div className="p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                <Activity className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              </div>
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                backendHealth.api.status === 'healthy' ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400' :
                backendHealth.api.status === 'degraded' ? 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400' :
                'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
              }`}>
                {backendHealth.api.status.charAt(0).toUpperCase() + backendHealth.api.status.slice(1)}
              </span>
            </div>
            <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">API Performance</h4>
            <div className="mt-2 space-y-1">
              <div className="flex justify-between">
                <span className="text-xs text-gray-500 dark:text-gray-400">Requests/min</span>
                <span className="text-xs font-medium text-gray-900 dark:text-gray-100">{backendHealth.api.requestsPerMinute}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-gray-500 dark:text-gray-400">Avg Response</span>
                <span className="text-xs font-medium text-gray-900 dark:text-gray-100">{backendHealth.api.averageResponseTime}ms</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-gray-500 dark:text-gray-400">Error Rate</span>
                <span className="text-xs font-medium text-gray-900 dark:text-gray-100">{backendHealth.api.errorRate}%</span>
              </div>
            </div>
          </div>

          {/* Database Health */}
          <div className="p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                <Database className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              </div>
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                backendHealth.database.status === 'healthy' ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400' :
                backendHealth.database.status === 'degraded' ? 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400' :
                'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
              }`}>
                {backendHealth.database.status.charAt(0).toUpperCase() + backendHealth.database.status.slice(1)}
              </span>
            </div>
            <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">Database Health</h4>
            <div className="mt-2 space-y-1">
              <div className="flex justify-between">
                <span className="text-xs text-gray-500 dark:text-gray-400">Connections</span>
                <span className="text-xs font-medium text-gray-900 dark:text-gray-100">{backendHealth.database.connections}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-gray-500 dark:text-gray-400">Query Time</span>
                <span className="text-xs font-medium text-gray-900 dark:text-gray-100">{backendHealth.database.averageQueryTime}ms</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-gray-500 dark:text-gray-400">Disk Usage</span>
                <span className="text-xs font-medium text-gray-900 dark:text-gray-100">{backendHealth.database.diskUsage}%</span>
              </div>
            </div>
          </div>

          {/* Memory Usage */}
          <div className="p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                <Memory className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              </div>
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                backendHealth.memory.status === 'healthy' ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400' :
                backendHealth.memory.status === 'degraded' ? 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400' :
                'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
              }`}>
                {backendHealth.memory.status.charAt(0).toUpperCase() + backendHealth.memory.status.slice(1)}
              </span>
            </div>
            <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">Memory Usage</h4>
            <div className="mt-2 space-y-1">
              <div className="flex justify-between">
                <span className="text-xs text-gray-500 dark:text-gray-400">Used</span>
                <span className="text-xs font-medium text-gray-900 dark:text-gray-100">{backendHealth.memory.used}GB</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-gray-500 dark:text-gray-400">Total</span>
                <span className="text-xs font-medium text-gray-900 dark:text-gray-100">{backendHealth.memory.total}GB</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-gray-500 dark:text-gray-400">Usage</span>
                <span className="text-xs font-medium text-gray-900 dark:text-gray-100">{backendHealth.memory.percentage}%</span>
              </div>
            </div>
          </div>

          {/* Security Overview */}
          <div className="p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                <Shield className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              </div>
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                backendHealth.security.status === 'healthy' ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400' :
                backendHealth.security.status === 'degraded' ? 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400' :
                'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
              }`}>
                {backendHealth.security.status.charAt(0).toUpperCase() + backendHealth.security.status.slice(1)}
              </span>
            </div>
            <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">Security Overview</h4>
            <div className="mt-2 space-y-1">
              <div className="flex justify-between">
                <span className="text-xs text-gray-500 dark:text-gray-400">Active Users</span>
                <span className="text-xs font-medium text-gray-900 dark:text-gray-100">{backendHealth.security.activeUsers}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-gray-500 dark:text-gray-400">Failed Logins</span>
                <span className="text-xs font-medium text-gray-900 dark:text-gray-100">{backendHealth.security.failedLogins}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-gray-500 dark:text-gray-400">Threat Level</span>
                <span className={`text-xs font-medium ${
                  backendHealth.security.threatLevel === 'low' ? 'text-green-600' :
                  backendHealth.security.threatLevel === 'medium' ? 'text-yellow-600' :
                  'text-red-600'
                }`}>
                  {backendHealth.security.threatLevel.toUpperCase()}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
            <Bell className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">Active Alerts</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {notifications.filter(n => n.status === 'unread').length} unread notifications
            </p>
          </div>
        </div>
        
        <div className="mt-4 space-y-3">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={`flex items-start justify-between p-4 rounded-lg border ${
                notification.status === 'unread'
                  ? 'bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600'
                  : 'bg-white dark:bg-gray-700/30 border-gray-100 dark:border-gray-600'
              }`}
            >
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 mt-1">
                  {notification.icon}
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {notification.title}
                    </h4>
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                      notification.priority === 'high'
                        ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
                        : notification.priority === 'medium'
                        ? 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400'
                        : 'bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                    }`}>
                      {notification.priority.charAt(0).toUpperCase() + notification.priority.slice(1)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{notification.message}</p>
                  <div className="flex items-center space-x-4 mt-2">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(notification.timestamp).toLocaleTimeString()}
                    </span>
                    {notification.actionUrl && (
                      <Link
                        to={notification.actionUrl}
                        className="text-xs text-primary-600 hover:text-primary-700 font-medium flex items-center"
                      >
                        {notification.actionLabel}
                        <ChevronRight className="w-3 h-3 ml-1" />
                      </Link>
                    )}
                  </div>
                </div>
              </div>
              <button
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors"
                onClick={() => {
                  setNotifications(prev =>
                    prev.map(n =>
                      n.id === notification.id
                        ? { ...n, status: 'read' }
                        : n
                    )
                  );
                }}
              >
                <X className="w-4 h-4 text-gray-400 dark:text-gray-500" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {getMetricCards()}

      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-base font-medium text-gray-900 dark:text-gray-100">New Users</h3>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-primary-500 rounded"></div>
              <span className="text-sm text-gray-600 dark:text-gray-400">New Signups</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-gray-300 rounded"></div>
              <span className="text-sm text-gray-600 dark:text-gray-400">Active Users</span>
            </div>
          </div>
        </div>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={[
                { date: '2024-03-01', newUsers: 42, activeUsers: 38 },
                { date: '2024-03-02', newUsers: 38, activeUsers: 35 },
                { date: '2024-03-03', newUsers: 45, activeUsers: 40 },
                { date: '2024-03-04', newUsers: 52, activeUsers: 48 },
                { date: '2024-03-05', newUsers: 48, activeUsers: 45 },
                { date: '2024-03-06', newUsers: 55, activeUsers: 50 },
                { date: '2024-03-07', newUsers: 58, activeUsers: 52 }
              ]}
              barGap={8}
              barCategoryGap="20%"
            >
              <defs>
                <linearGradient id="colorNewUsers" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#F43F5E" stopOpacity={0.95} />
                  <stop offset="50%" stopColor="#F43F5E" stopOpacity={0.85} />
                  <stop offset="100%" stopColor="#FB7185" stopOpacity={0.8} />
                </linearGradient>
                <linearGradient id="colorActiveUsers" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#94A3B8" stopOpacity={0.85} />
                  <stop offset="50%" stopColor="#B0BBC9" stopOpacity={0.75} />
                  <stop offset="100%" stopColor="#CBD5E1" stopOpacity={0.65} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" opacity={0.2} />
              <XAxis
                dataKey="date"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: '#6B7280' }}
                tickFormatter={(value) => new Date(value).toLocaleDateString()}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: '#6B7280' }}
              />
              <Tooltip
                cursor={false}
                contentStyle={{
                  backgroundColor: '#1F2937',
                  border: '1px solid #374151',
                  borderRadius: '8px',
                  color: '#F9FAFB'
                }}
              />
              <Bar
                dataKey="newUsers"
                fill="url(#colorNewUsers)"
                radius={[8, 8, 0, 0]}
                maxBarSize={40}
              />
              <Bar
                dataKey="activeUsers"
                fill="url(#colorActiveUsers)"
                radius={[8, 8, 0, 0]}
                maxBarSize={40}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}