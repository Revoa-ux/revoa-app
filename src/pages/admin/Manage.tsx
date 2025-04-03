import React, { useState } from 'react';
import { 
  UserPlus, 
  Mail, 
  Check, 
  X, 
  ChevronDown,
  BarChart3,
  Clock,
  Users,
  DollarSign,
  Loader2,
  ArrowUpRight,
  ArrowDownRight,
  AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';
import { useAdmin } from '@/contexts/AdminContext';

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'super_admin';
  assignedUsers: number;
  avgResponseTime: string;
  totalTransactions: number;
  lastActive: string;
  performance: {
    score: number;
    change: number;
  };
}

const mockAdmins: AdminUser[] = [
  {
    id: '1',
    name: 'Sarah Wilson',
    email: 'sarah@revoa.app',
    role: 'admin',
    assignedUsers: 156,
    avgResponseTime: '1h 45m',
    totalTransactions: 450000,
    lastActive: '2024-03-20T15:30:00Z',
    performance: {
      score: 94,
      change: 5.2
    }
  },
  {
    id: '2',
    name: 'Michael Chen',
    email: 'michael@revoa.app',
    role: 'admin',
    assignedUsers: 98,
    avgResponseTime: '2h 10m',
    totalTransactions: 320000,
    lastActive: '2024-03-21T09:15:00Z',
    performance: {
      score: 88,
      change: -2.1
    }
  }
];

export default function AdminManage() {
  const { isSuperAdmin } = useAdmin();
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [isInviting, setIsInviting] = useState(false);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.endsWith('@revoa.app')) {
      toast.error('Only @revoa.app email addresses are allowed');
      return;
    }

    setIsInviting(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      toast.success('Invitation sent successfully');
      setShowInviteModal(false);
      setInviteEmail('');
    } catch (error) {
      toast.error('Failed to send invitation');
    } finally {
      setIsInviting(false);
    }
  };

  const renderChangeIndicator = (change: number) => {
    const Icon = change >= 0 ? ArrowUpRight : ArrowDownRight;
    return (
      <div className={`flex items-center text-sm ${change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
        <Icon className="w-4 h-4 mr-1" />
        {Math.abs(change)}%
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-normal text-gray-900 mb-2">
          Manage Admins
        </h1>
        <div className="flex items-center space-x-2">
          <div className="w-1.5 h-1.5 bg-primary-500 rounded-full"></div>
          <p className="text-sm text-gray-500">
            Manage admin team members and monitor performance
          </p>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-gray-100 rounded-lg">
              <Users className="w-4 h-4 text-gray-600" />
            </div>
            {renderChangeIndicator(12.5)}
          </div>
          <h3 className="text-xs text-gray-500">Total Admins</h3>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {mockAdmins.length}
          </p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-gray-100 rounded-lg">
              <Clock className="w-4 h-4 text-gray-600" />
            </div>
            {renderChangeIndicator(-8.3)}
          </div>
          <h3 className="text-xs text-gray-500">Avg Response Time</h3>
          <p className="text-2xl font-bold text-gray-900 mt-1">1h 58m</p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-gray-100 rounded-lg">
              <BarChart3 className="w-4 h-4 text-gray-600" />
            </div>
            {renderChangeIndicator(15.7)}
          </div>
          <h3 className="text-xs text-gray-500">Avg Performance</h3>
          <p className="text-2xl font-bold text-gray-900 mt-1">91%</p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-gray-100 rounded-lg">
              <DollarSign className="w-4 h-4 text-gray-600" />
            </div>
            {renderChangeIndicator(23.4)}
          </div>
          <h3 className="text-xs text-gray-500">Total Volume</h3>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            ${((mockAdmins.reduce((sum, admin) => sum + admin.totalTransactions, 0)) / 1000).toFixed(1)}k
          </p>
        </div>
      </div>

      {/* Admin List */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium text-gray-900">Team Members</h2>
            <button
              onClick={() => setShowInviteModal(true)}
              className="px-4 py-2 text-sm text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors flex items-center"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Invite Admin
            </button>
          </div>
        </div>

        <div className="divide-y divide-gray-200">
          {mockAdmins.map((admin) => (
            <div key={admin.id} className="px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                    <span className="text-sm font-medium text-gray-600">
                      {admin.name.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">{admin.name}</h4>
                    <p className="text-sm text-gray-500">{admin.email}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-8">
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">{admin.assignedUsers}</p>
                    <p className="text-xs text-gray-500">Users</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">{admin.avgResponseTime}</p>
                    <p className="text-xs text-gray-500">Avg Response</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">{admin.performance.score}%</p>
                    <p className="text-xs text-gray-500">Performance</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">Invite Admin</h3>
                <button 
                  onClick={() => setShowInviteModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <form onSubmit={handleInvite} className="p-6">
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="admin@revoa.app"
                    className="w-full pl-10 pr-4 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-300 focus:border-gray-200"
                  />
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  Only @revoa.app email addresses are allowed
                </p>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isInviting || !inviteEmail.endsWith('@revoa.app')}
                  className="px-4 py-2 text-sm text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 flex items-center"
                >
                  {isInviting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Mail className="w-4 h-4 mr-2" />
                      Send Invite
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}