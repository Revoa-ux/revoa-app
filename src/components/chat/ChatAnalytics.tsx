import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Clock, MessageSquare, Users, TrendingUp } from 'lucide-react';
import { Message } from '@/types/chat';

interface ChatAnalytics {
  totalMessages: number;
  averageResponseTime: string;
  messagesByType: Record<string, number>;
  messagesByHour: { hour: number; count: number }[];
  activeUsers: number;
  messageVolume: {
    today: number;
    yesterday: number;
    change: number;
  };
}

interface ChatAnalyticsProps {
  messages: Message[];
}

export const ChatAnalytics: React.FC<ChatAnalyticsProps> = ({ messages }) => {
  // Calculate analytics
  const analytics: ChatAnalytics = React.useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Message counts
    const totalMessages = messages.length;
    const todayMessages = messages.filter(m => new Date(m.timestamp) >= today).length;
    const yesterdayMessages = messages.filter(m => {
      const date = new Date(m.timestamp);
      return date >= yesterday && date < today;
    }).length;

    // Messages by type
    const messagesByType = messages.reduce((acc, msg) => {
      acc[msg.type] = (acc[msg.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Messages by hour
    const messagesByHour = Array.from({ length: 24 }, (_, hour) => ({
      hour,
      count: messages.filter(m => new Date(m.timestamp).getHours() === hour).length
    }));

    // Response times
    const responseTimes = messages.reduce((acc, msg, i) => {
      if (i === 0 || msg.sender === messages[i - 1].sender) return acc;
      const responseTime = new Date(msg.timestamp).getTime() - 
        new Date(messages[i - 1].timestamp).getTime();
      return [...acc, responseTime];
    }, [] as number[]);

    const avgResponseTime = responseTimes.length
      ? formatDuration(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
      : 'N/A';

    return {
      totalMessages,
      averageResponseTime: avgResponseTime,
      messagesByType,
      messagesByHour,
      activeUsers: new Set(messages.map(m => m.sender)).size,
      messageVolume: {
        today: todayMessages,
        yesterday: yesterdayMessages,
        change: yesterdayMessages ? ((todayMessages - yesterdayMessages) / yesterdayMessages) * 100 : 0
      }
    };
  }, [messages]);

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-primary-50 rounded-lg">
              <MessageSquare className="w-5 h-5 text-primary-600" />
            </div>
            <div className={`flex items-center text-sm ${
              analytics.messageVolume.change >= 0 ? 'text-green-500' : 'text-red-500'
            }`}>
              <TrendingUp className="w-4 h-4 mr-1" />
              {Math.abs(analytics.messageVolume.change).toFixed(1)}%
            </div>
          </div>
          <h3 className="text-xs text-gray-500">Total Messages</h3>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {analytics.totalMessages.toLocaleString()}
          </p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-blue-50 rounded-lg">
              <Clock className="w-5 h-5 text-blue-600" />
            </div>
          </div>
          <h3 className="text-xs text-gray-500">Average Response Time</h3>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {analytics.averageResponseTime}
          </p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-green-50 rounded-lg">
              <Users className="w-5 h-5 text-green-600" />
            </div>
          </div>
          <h3 className="text-xs text-gray-500">Active Users</h3>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {analytics.activeUsers}
          </p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-purple-50 rounded-lg">
              <TrendingUp className="w-5 h-5 text-purple-600" />
            </div>
          </div>
          <h3 className="text-xs text-gray-500">Today's Messages</h3>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {analytics.messageVolume.today.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Message Volume Chart */}
      <div className="bg-white p-6 rounded-xl border border-gray-200">
        <h3 className="text-base font-medium text-gray-900 mb-6">Message Volume by Hour</h3>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={analytics.messagesByHour}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis 
                dataKey="hour" 
                tickFormatter={(hour) => `${hour}:00`}
                axisLine={false}
                tickLine={false}
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                width={40}
              />
              <Tooltip 
                formatter={(value: number) => [value, 'Messages']}
                labelFormatter={(hour) => `${hour}:00`}
              />
              <Bar 
                dataKey="count" 
                fill="#F43F5E"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Message Types */}
      <div className="bg-white p-6 rounded-xl border border-gray-200">
        <h3 className="text-base font-medium text-gray-900 mb-4">Message Types</h3>
        <div className="grid grid-cols-4 gap-4">
          {Object.entries(analytics.messagesByType).map(([type, count]) => (
            <div key={type} className="p-4 bg-gray-50 rounded-lg">
              <h4 className="text-sm font-medium text-gray-900 capitalize">{type}</h4>
              <p className="text-2xl font-bold text-gray-900 mt-1">{count}</p>
              <p className="text-sm text-gray-500 mt-1">
                {((count / analytics.totalMessages) * 100).toFixed(1)}%
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Helper function to format duration
const formatDuration = (ms: number): string => {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
};