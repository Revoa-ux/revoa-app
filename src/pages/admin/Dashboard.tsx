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
  ShoppingCart,
  FileText,
  ChevronRight,
  MessageSquare,
  Package,
  Clock
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useAdmin } from '@/contexts/AdminContext';
import AdReportsTimeSelector, { TimeOption } from '@/components/reports/AdReportsTimeSelector';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { getRecentNotifications, markAsRead, type Notification as DBNotification } from '@/lib/notificationService';
import { SubscriptionAnalytics } from '@/components/admin/SubscriptionAnalytics';

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
  const [adminStats, setAdminStats] = useState({
    unreadMessages: 0,
    newQuoteRequests: 0,
    assignedClients: 0,
    lastLoginTime: null as string | null
  });
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    fetchDashboardStats();
    fetchNotifications();
    if (!isSuperAdmin && adminUser) {
      fetchAdminStats();
    }

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
  }, [isSuperAdmin, adminUser]);

  const fetchNotifications = async () => {
    try {
      const dbNotifications = await getRecentNotifications(10);
      const mappedNotifications: Notification[] = dbNotifications.map(n => {
        let icon = <Bell className="w-4 h-4 text-gray-500" />;
        let priority: 'low' | 'medium' | 'high' = 'low';

        switch (n.action_type) {
          case 'quote_review':
            icon = <FileText className="w-4 h-4 text-blue-500" />;
            priority = n.action_required ? 'high' : 'medium';
            break;
          case 'invoice_payment':
            icon = <DollarSign className="w-4 h-4 text-green-500" />;
            priority = 'high';
            break;
          case 'cogs_update':
            icon = <Package className="w-4 h-4 text-orange-500" />;
            priority = 'medium';
            break;
          case 'system':
            icon = <AlertTriangle className="w-4 h-4 text-red-500" />;
            priority = 'high';
            break;
          default:
            icon = <Bell className="w-4 h-4 text-gray-500" />;
            priority = 'low';
        }

        return {
          id: n.id,
          title: n.title,
          message: n.message,
          timestamp: n.created_at,
          status: n.read ? 'read' : 'unread',
          priority,
          icon,
          actionUrl: n.link_to,
          actionLabel: n.action_required ? 'Take Action' : 'View'
        };
      });

      setNotifications(mappedNotifications);

      // Auto-mark unread notifications as read when dashboard loads (they've seen them now)
      const unreadIds = dbNotifications.filter(n => !n.read).map(n => n.id);
      if (unreadIds.length > 0) {
        // Mark them as read in the background
        Promise.all(unreadIds.map(id => markAsRead(id))).catch(err =>
          console.error('Error auto-marking notifications as read:', err)
        );
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

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

  const fetchAdminStats = async () => {
    if (!adminUser?.userId) return;

    try {
      // Get last login time
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('last_login')
        .eq('user_id', adminUser.userId)
        .maybeSingle();

      const lastLogin = profile?.last_login || null;

      // Get assigned users for this admin
      const { data: assignments } = await supabase
        .from('user_assignments')
        .select('user_id')
        .eq('admin_id', adminUser.userId);

      const assignedUserIds = assignments?.map(a => a.user_id) || [];

      if (assignedUserIds.length === 0) {
        setAdminStats({
          unreadMessages: 0,
          newQuoteRequests: 0,
          assignedClients: 0,
          lastLoginTime: lastLogin
        });
        return;
      }

      // Get unread messages count (messages in chats for assigned users)
      const { count: unreadMessages } = await supabase
        .from('messages')
        .select('chat_id, chats!inner(user_id)', { count: 'exact', head: true })
        .in('chats.user_id', assignedUserIds)
        .eq('sender_type', 'user')
        .gte('created_at', lastLogin || new Date(0).toISOString());

      // Get new quote requests (pending quotes for assigned users)
      const { count: newQuoteRequests } = await supabase
        .from('product_quotes')
        .select('*', { count: 'exact', head: true })
        .in('user_id', assignedUserIds)
        .eq('status', 'pending')
        .gte('created_at', lastLogin || new Date(0).toISOString());

      setAdminStats({
        unreadMessages: unreadMessages || 0,
        newQuoteRequests: newQuoteRequests || 0,
        assignedClients: assignedUserIds.length,
        lastLoginTime: lastLogin
      });
    } catch (error) {
      console.error('Error fetching admin stats:', error);
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {metrics.map(metric => (
          <div key={metric.id} className="bg-gradient-to-b from-gray-50 to-white dark:from-[#2a2a2a]/50 dark:to-[#1f1f1f]/50 p-6 rounded-xl border border-gray-200/60 dark:border-[#3a3a3a]/60 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-gray-100 dark:bg-[#3a3a3a] rounded-lg">
                {metric.icon}
              </div>
              {renderChangeIndicator(metric.change)}
            </div>
            <div>
              <h3 className="text-xs text-gray-500 dark:text-gray-400">{metric.title}</h3>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">{metric.value}</p>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-[#3a3a3a] space-y-2">
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
      <div>
        <h1 className="text-2xl font-normal text-gray-900 dark:text-gray-100 mb-2">
          Admin Dashboard
        </h1>
        <div className="flex items-start sm:items-center space-x-2">
          <div className="w-1.5 h-1.5 bg-red-500 rounded-full mt-1.5 sm:mt-0 flex-shrink-0"></div>
          <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400">
            {isLoading ? 'Updating metrics...' : 'Welcome back, ' + adminUser?.email}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <AdReportsTimeSelector
          selectedTime={selectedTime}
          onTimeChange={handleTimeChange}
          dateRange={dateRange}
          onDateRangeChange={handleDateRangeChange}
          onApply={handleApplyDateRange}
        />
        <button
          className="flex items-center justify-center space-x-2 h-[39px] px-3 text-sm text-gray-600 dark:text-gray-400 bg-white dark:bg-dark border border-gray-200 dark:border-[#3a3a3a] rounded-lg hover:bg-gray-50 dark:hover:bg-[#3a3a3a]/50 transition-colors"
          onClick={handleApplyDateRange}
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span className="hidden sm:inline">Refreshing...</span>
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4" />
              <span className="hidden sm:inline">Refresh</span>
            </>
          )}
        </button>
        <div className="flex items-center space-x-2 px-3 h-[39px] bg-white dark:bg-dark border border-gray-200 dark:border-[#3a3a3a] rounded-lg">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <p className="text-sm text-gray-900 dark:text-gray-100">{onlineUsers} active users</p>
        </div>
      </div>

      {/* Only show Active Alerts section if there are unread notifications (for super admins) or if regular admin has activity */}
      {(isSuperAdmin && notifications.filter(n => n.status === 'unread').length > 0) || (!isSuperAdmin && (adminStats.unreadMessages > 0 || adminStats.newQuoteRequests > 0)) ? (
        <div className="bg-gradient-to-b from-gray-50 to-white dark:from-[#2a2a2a]/50 dark:to-[#1f1f1f]/50 p-4 rounded-xl border border-gray-200/60 dark:border-[#3a3a3a]/60 shadow-sm">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gray-100 dark:bg-[#3a3a3a] rounded-lg">
              <Bell className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {isSuperAdmin ? 'Active Alerts' : 'What\'s New Since Your Last Visit'}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {isSuperAdmin
                  ? `${notifications.filter(n => n.status === 'unread').length} unread notifications`
                  : adminStats.lastLoginTime
                    ? `Last login: ${new Date(adminStats.lastLoginTime).toLocaleString()}`
                    : 'Welcome back!'
                }
              </p>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {isSuperAdmin ? (
              // Only show unread notifications for super admins
              notifications.filter(n => n.status === 'unread').map((notification) => (
              <div
                key={notification.id}
                className={`flex items-start justify-between p-4 rounded-lg border ${
                  notification.status === 'unread'
                    ? 'bg-gray-50 dark:bg-[#3a3a3a]/50 border-gray-200 dark:border-[#4a4a4a]'
                    : 'bg-white dark:bg-[#3a3a3a]/30 border-gray-100 dark:border-[#4a4a4a]'
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
                      <span className={`px-2 py-0.5 text-xs rounded-full ${
                        notification.priority === 'high'
                          ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
                          : notification.priority === 'medium'
                          ? 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400'
                          : 'bg-gray-50 dark:bg-[#3a3a3a] text-gray-700 dark:text-gray-300'
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
                  className="p-1 hover:bg-gray-100 dark:hover:bg-[#4a4a4a] rounded-lg transition-colors"
                  onClick={async () => {
                    try {
                      await markAsRead(notification.id);
                      setNotifications(prev =>
                        prev.map(n =>
                          n.id === notification.id
                            ? { ...n, status: 'read' }
                            : n
                        )
                      );
                    } catch (error) {
                      console.error('Error marking notification as read:', error);
                    }
                  }}
                >
                  <X className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                </button>
              </div>
              ))
            ) : (
            <>
              <Link
                to="/admin/chat"
                className="flex items-center justify-between p-4 rounded-lg border border-gray-200 dark:border-[#3a3a3a] bg-gradient-to-r from-blue-50 to-transparent dark:from-blue-900/20 dark:to-transparent hover:from-blue-100 dark:hover:from-blue-900/30 transition-all group"
              >
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <MessageSquare className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">Unread Messages</h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400">From your assigned clients</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">{adminStats.unreadMessages}</span>
                  <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />
                </div>
              </Link>

              <Link
                to="/admin/quotes"
                className="flex items-center justify-between p-4 rounded-lg border border-gray-200 dark:border-[#3a3a3a] bg-gradient-to-r from-green-50 to-transparent dark:from-green-900/20 dark:to-transparent hover:from-green-100 dark:hover:from-green-900/30 transition-all group"
              >
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                    <FileText className="w-5 h-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">New Quote Requests</h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Pending your response</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-2xl font-bold text-green-600 dark:text-green-400">{adminStats.newQuoteRequests}</span>
                  <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors" />
                </div>
              </Link>

              <div className="flex items-center justify-between p-4 rounded-lg border border-gray-200 dark:border-[#3a3a3a] bg-gradient-to-r from-gray-50 to-transparent dark:from-[#3a3a3a]/50 dark:to-transparent">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-gray-100 dark:bg-[#3a3a3a] rounded-lg">
                    <Users className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">Assigned Clients</h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Total clients under your care</p>
                  </div>
                </div>
                <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">{adminStats.assignedClients}</span>
              </div>
            </>
            )}
          </div>
        </div>
      ) : null}

      {getMetricCards()}

      <div className="bg-gradient-to-b from-gray-50 to-white dark:from-[#2a2a2a]/50 dark:to-[#1f1f1f]/50 p-6 rounded-xl border border-gray-200/60 dark:border-[#3a3a3a]/60 shadow-sm">
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
                  <stop offset="0%" stopColor="#F43F5E" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#FB7185" stopOpacity={0.2} />
                </linearGradient>
                <linearGradient id="colorActiveUsers" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#94A3B8" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#CBD5E1" stopOpacity={0.15} />
                </linearGradient>
                <filter id="glassBlur">
                  <feGaussianBlur in="SourceGraphic" stdDeviation="0.5" />
                </filter>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#3a3a3a" opacity={0.2} />
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
                  backgroundColor: '#1f1f1f',
                  border: '1px solid #3a3a3a',
                  borderRadius: '8px',
                  color: '#F9FAFB'
                }}
              />
              <Bar
                dataKey="newUsers"
                fill="url(#colorNewUsers)"
                radius={[8, 8, 0, 0]}
                maxBarSize={40}
                style={{
                  backdropFilter: 'blur(10px)',
                  WebkitBackdropFilter: 'blur(10px)'
                }}
              />
              <Bar
                dataKey="activeUsers"
                fill="url(#colorActiveUsers)"
                radius={[8, 8, 0, 0]}
                maxBarSize={40}
                style={{
                  backdropFilter: 'blur(10px)',
                  WebkitBackdropFilter: 'blur(10px)'
                }}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Subscription Analytics - Super Admin Only */}
      {isSuperAdmin && (
        <div className="mt-6">
          <SubscriptionAnalytics />
        </div>
      )}
    </div>
  );
}