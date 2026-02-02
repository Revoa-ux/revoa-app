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
  const [isLoading, setIsLoading] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState(0);
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
        icon: <Users className="w-4 h-4 text-gray-600" />,
        value: '342',
        change: 12.5,
        metric1: { label: 'New Today', value: '12' },
        metric2: { label: 'Active', value: '89%' }
      },
      {
        id: 'revenue',
        title: 'Total Revenue',
        icon: <DollarSign className="w-4 h-4 text-gray-600" />,
        value: '$32,621',
        change: 8.2,
        metric1: { label: 'MRR', value: '$12.5k' },
        metric2: { label: 'ARR', value: '$150k' }
      },
      {
        id: 'orders',
        title: 'Total Orders',
        icon: <ShoppingCart className="w-4 h-4 text-gray-600" />,
        value: '1,203',
        change: -3.4,
        metric1: { label: 'Completed', value: '1,180' },
        metric2: { label: 'Pending', value: '23' }
      },
      {
        id: 'quotes',
        title: 'Active Quotes',
        icon: <FileText className="w-4 h-4 text-gray-600" />,
        value: '45',
        change: 15.8,
        metric1: { label: 'Acceptance Rate', value: '92%' },
        metric2: { label: 'Avg Value', value: '$2.8k' }
      }
    ];

    return (
      <div className="grid grid-cols-4 gap-6">
        {metrics.map(metric => (
          <div key={metric.id} className="bg-white p-6 rounded-xl border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-gray-100 rounded-lg">
                {metric.icon}
              </div>
              {renderChangeIndicator(metric.change)}
            </div>
            <div>
              <h3 className="text-xs text-gray-500">{metric.title}</h3>
              <p className="text-2xl font-bold text-gray-900 mt-1">{metric.value}</p>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">{metric.metric1.label}</span>
                <span className="text-xs font-medium text-gray-900">{metric.metric1.value}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">{metric.metric2.label}</span>
                <span className="text-xs font-medium text-gray-900">{metric.metric2.value}</span>
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
          <h1 className="text-2xl font-normal text-gray-900 mb-2">
            Admin Dashboard
          </h1>
          <div className="flex items-center space-x-2">
            <div className="w-1.5 h-1.5 bg-primary-500 rounded-full"></div>
            <p className="text-sm text-gray-500">
              {isLoading ? 'Updating metrics...' : 'Welcome back, ' + adminUser?.email}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 px-4 py-2 bg-white border border-gray-200 rounded-lg">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <p className="text-sm text-gray-900">{onlineUsers} users active now</p>
          </div>
          <button 
            className="px-3 py-2 text-sm text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors flex items-center space-x-2"
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
          <div className="p-4 bg-white rounded-xl border border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 bg-gray-100 rounded-lg">
                <Activity className="w-4 h-4 text-gray-600" />
              </div>
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                backendHealth.api.status === 'healthy' ? 'bg-green-50 text-green-700' :
                backendHealth.api.status === 'degraded' ? 'bg-yellow-50 text-yellow-700' :
                'bg-red-50 text-red-700'
              }`}>
                {backendHealth.api.status.charAt(0).toUpperCase() + backendHealth.api.status.slice(1)}
              </span>
            </div>
            <h4 className="text-sm font-medium text-gray-900">API Performance</h4>
            <div className="mt-2 space-y-1">
              <div className="flex justify-between">
                <span className="text-xs text-gray-500">Requests/min</span>
                <span className="text-xs font-medium text-gray-900">{backendHealth.api.requestsPerMinute}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-gray-500">Avg Response</span>
                <span className="text-xs font-medium text-gray-900">{backendHealth.api.averageResponseTime}ms</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-gray-500">Error Rate</span>
                <span className="text-xs font-medium text-gray-900">{backendHealth.api.errorRate}%</span>
              </div>
            </div>
          </div>

          {/* Database Health */}
          <div className="p-4 bg-white rounded-xl border border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 bg-gray-100 rounded-lg">
                <Database className="w-4 h-4 text-gray-600" />
              </div>
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                backendHealth.database.status === 'healthy' ? 'bg-green-50 text-green-700' :
                backendHealth.database.status === 'degraded' ? 'bg-yellow-50 text-yellow-700' :
                'bg-red-50 text-red-700'
              }`}>
                {backendHealth.database.status.charAt(0).toUpperCase() + backendHealth.database.status.slice(1)}
              </span>
            </div>
            <h4 className="text-sm font-medium text-gray-900">Database Health</h4>
            <div className="mt-2 space-y-1">
              <div className="flex justify-between">
                <span className="text-xs text-gray-500">Connections</span>
                <span className="text-xs font-medium text-gray-900">{backendHealth.database.connections}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-gray-500">Query Time</span>
                <span className="text-xs font-medium text-gray-900">{backendHealth.database.averageQueryTime}ms</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-gray-500">Disk Usage</span>
                <span className="text-xs font-medium text-gray-900">{backendHealth.database.diskUsage}%</span>
              </div>
            </div>
          </div>

          {/* Memory Usage */}
          <div className="p-4 bg-white rounded-xl border border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 bg-gray-100 rounded-lg">
                <Memory className="w-4 h-4 text-gray-600" />
              </div>
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                backendHealth.memory.status === 'healthy' ? 'bg-green-50 text-green-700' :
                backendHealth.memory.status === 'degraded' ? 'bg-yellow-50 text-yellow-700' :
                'bg-red-50 text-red-700'
              }`}>
                {backendHealth.memory.status.charAt(0).toUpperCase() + backendHealth.memory.status.slice(1)}
              </span>
            </div>
            <h4 className="text-sm font-medium text-gray-900">Memory Usage</h4>
            <div className="mt-2 space-y-1">
              <div className="flex justify-between">
                <span className="text-xs text-gray-500">Used</span>
                <span className="text-xs font-medium text-gray-900">{backendHealth.memory.used}GB</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-gray-500">Total</span>
                <span className="text-xs font-medium text-gray-900">{backendHealth.memory.total}GB</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-gray-500">Usage</span>
                <span className="text-xs font-medium text-gray-900">{backendHealth.memory.percentage}%</span>
              </div>
            </div>
          </div>

          {/* Security Overview */}
          <div className="p-4 bg-white rounded-xl border border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 bg-gray-100 rounded-lg">
                <Shield className="w-4 h-4 text-gray-600" />
              </div>
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                backendHealth.security.status === 'healthy' ? 'bg-green-50 text-green-700' :
                backendHealth.security.status === 'degraded' ? 'bg-yellow-50 text-yellow-700' :
                'bg-red-50 text-red-700'
              }`}>
                {backendHealth.security.status.charAt(0).toUpperCase() + backendHealth.security.status.slice(1)}
              </span>
            </div>
            <h4 className="text-sm font-medium text-gray-900">Security Overview</h4>
            <div className="mt-2 space-y-1">
              <div className="flex justify-between">
                <span className="text-xs text-gray-500">Active Users</span>
                <span className="text-xs font-medium text-gray-900">{backendHealth.security.activeUsers}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-gray-500">Failed Logins</span>
                <span className="text-xs font-medium text-gray-900">{backendHealth.security.failedLogins}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-gray-500">Threat Level</span>
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

      <div className="bg-white p-4 rounded-xl border border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-red-50 rounded-lg">
            <Bell className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-900">Active Alerts</h3>
            <p className="text-sm text-gray-500">
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
                  ? 'bg-gray-50 border-gray-200'
                  : 'bg-white border-gray-100'
              }`}
            >
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 mt-1">
                  {notification.icon}
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h4 className="text-sm font-medium text-gray-900">
                      {notification.title}
                    </h4>
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                      notification.priority === 'high'
                        ? 'bg-red-50 text-red-700'
                        : notification.priority === 'medium'
                        ? 'bg-yellow-50 text-yellow-700'
                        : 'bg-gray-50 text-gray-700'
                    }`}>
                      {notification.priority.charAt(0).toUpperCase() + notification.priority.slice(1)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                  <div className="flex items-center space-x-4 mt-2">
                    <span className="text-xs text-gray-500">
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
                className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
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
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {getMetricCards()}

      <div className="bg-white p-6 rounded-xl border border-gray-200">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-base font-medium text-gray-900">New Users</h3>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-primary-500 rounded"></div>
              <span className="text-sm text-gray-600">New Signups</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-gray-300 rounded"></div>
              <span className="text-sm text-gray-600">Active Users</span>
            </div>
          </div>
        </div>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={[
              { date: '2024-03-01', newUsers: 42, activeUsers: 38 },
              { date: '2024-03-02', newUsers: 38, activeUsers: 35 },
              { date: '2024-03-03', newUsers: 45, activeUsers: 40 },
              { date: '2024-03-04', newUsers: 52, activeUsers: 48 },
              { date: '2024-03-05', newUsers: 48, activeUsers: 45 },
              { date: '2024-03-06', newUsers: 55, activeUsers: 50 },
              { date: '2024-03-07', newUsers: 58, activeUsers: 52 }
            ]}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
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
              <Tooltip />
              <Bar dataKey="newUsers" fill="#F43F5E" radius={[4, 4, 0, 0]} />
              <Bar dataKey="activeUsers" fill="#E5E7EB" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}