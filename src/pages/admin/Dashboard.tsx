import React from 'react';
import { Users, MessageSquare, FileText, Package, TrendingUp, DollarSign } from 'lucide-react';

const AdminDashboard: React.FC = () => {
  const stats = [
    { label: 'Total Users', value: '0', icon: Users, color: 'blue' },
    { label: 'Active Chats', value: '0', icon: MessageSquare, color: 'green' },
    { label: 'Pending Quotes', value: '0', icon: FileText, color: 'yellow' },
    { label: 'Products', value: '0', icon: Package, color: 'purple' },
    { label: 'Revenue', value: '$0', icon: DollarSign, color: 'emerald' },
    { label: 'Growth', value: '0%', icon: TrendingUp, color: 'indigo' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Admin Dashboard</h1>
        <p className="text-gray-600 dark:text-gray-400">Overview of system metrics and activity</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">{stat.label}</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stat.value}</p>
              </div>
              <div className={`p-3 bg-${stat.color}-100 dark:bg-${stat.color}-900/20 rounded-lg`}>
                <stat.icon className={`w-6 h-6 text-${stat.color}-600 dark:text-${stat.color}-400`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recent Activity</h2>
        <p className="text-gray-600 dark:text-gray-400">No recent activity</p>
      </div>
    </div>
  );
};

export default AdminDashboard;
