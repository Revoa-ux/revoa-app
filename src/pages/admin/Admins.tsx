import React, { useState, useEffect } from 'react';
import {
  UserPlus,
  Mail,
  X,
  BarChart3,
  Clock,
  Users,
  DollarSign,
  Loader2,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAdmin } from '@/contexts/AdminContext';
import { supabase } from '@/lib/supabase';

interface AdminUser {
  id: string;
  user_id: string;
  name: string | null;
  email: string;
  role: 'admin' | 'super_admin';
  assignedUsers: number;
  avgResponseTime: string;
  totalTransactions: number;
  lastActive: string | null;
  performance: {
    score: number;
    change: number;
  };
}

export default function AdminManage() {
  const { isSuperAdmin } = useAdmin();
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [isInviting, setIsInviting] = useState(false);

  useEffect(() => {
    fetchAdmins();
  }, []);

  const fetchAdmins = async () => {
    try {
      setIsLoading(true);

      // Fetch all admin profiles
      const { data: adminProfiles, error: profilesError } = await supabase
        .from('user_profiles')
        .select('user_id, name, email, admin_role, last_login')
        .eq('is_admin', true);

      if (profilesError) throw profilesError;

      if (!adminProfiles || adminProfiles.length === 0) {
        setAdmins([]);
        setIsLoading(false);
        return;
      }

      const adminIds = adminProfiles.map(p => p.user_id);

      // Fetch user assignments for each admin
      const { data: assignments } = await supabase
        .from('user_assignments')
        .select('admin_id, total_transactions')
        .in('admin_id', adminIds);

      // Group assignments by admin
      const assignmentsByAdmin = new Map<string, { count: number; totalTransactions: number }>();
      assignments?.forEach(assignment => {
        const existing = assignmentsByAdmin.get(assignment.admin_id) || { count: 0, totalTransactions: 0 };
        assignmentsByAdmin.set(assignment.admin_id, {
          count: existing.count + 1,
          totalTransactions: existing.totalTransactions + (assignment.total_transactions || 0)
        });
      });

      // Transform to AdminUser interface
      const transformedAdmins: AdminUser[] = adminProfiles.map(profile => {
        const stats = assignmentsByAdmin.get(profile.user_id) || { count: 0, totalTransactions: 0 };

        return {
          id: profile.user_id,
          user_id: profile.user_id,
          name: profile.name,
          email: profile.email,
          role: (profile.admin_role as 'admin' | 'super_admin') || 'admin',
          assignedUsers: stats.count,
          avgResponseTime: 'N/A',
          totalTransactions: stats.totalTransactions,
          lastActive: profile.last_login,
          performance: {
            score: 0,
            change: 0
          }
        };
      });

      setAdmins(transformedAdmins);
    } catch (error) {
      console.error('Error fetching admins:', error);
      toast.error('Failed to load admins');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.endsWith('@revoa.app')) {
      toast.error('Only @revoa.app email addresses are allowed');
      return;
    }

    setIsInviting(true);
    try {
      toast.info('Invite functionality coming soon');
      setInviteEmail('');
      setShowInviteModal(false);
    } catch (error) {
      console.error('Error inviting admin:', error);
      toast.error('Failed to send invitation');
    } finally {
      setIsInviting(false);
    }
  };

  const totalAssignedUsers = admins.reduce((sum, admin) => sum + admin.assignedUsers, 0);
  const totalVolume = admins.reduce((sum, admin) => sum + admin.totalTransactions, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-normal text-gray-900 dark:text-gray-100 mb-2">
            Admin Team
          </h1>
          <div className="flex items-center space-x-2">
            <div className="w-1.5 h-1.5 bg-primary-500 rounded-full"></div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Manage your admin team and monitor performance
            </p>
          </div>
        </div>

        {isSuperAdmin && (
          <button
            onClick={() => setShowInviteModal(true)}
            className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors flex items-center space-x-2"
          >
            <UserPlus className="w-4 h-4" />
            <span>Invite Admin</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-gray-500 dark:text-gray-400">Total Admins</p>
            <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
              {admins.length}
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <BarChart3 className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-gray-500 dark:text-gray-400">Assigned Users</p>
            <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
              {totalAssignedUsers}
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <DollarSign className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-gray-500 dark:text-gray-400">Total Volume</p>
            <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
              ${(totalVolume / 1000).toFixed(1)}k
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">Admin Team Members</h2>
        </div>

        {isLoading ? (
          <div className="p-12 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
          </div>
        ) : admins.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">No admins found</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {admins.map((admin) => (
              <div key={admin.id} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4 flex-1">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 flex items-center justify-center flex-shrink-0">
                      {admin.name ? (
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          {admin.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                        </span>
                      ) : (
                        <Users className="w-6 h-6 text-gray-600 dark:text-gray-400" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <h3 className="text-base font-medium text-gray-900 dark:text-gray-100">
                          {admin.name || 'Admin User'}
                        </h3>
                        <span
                          className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                            admin.role === 'super_admin'
                              ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
                              : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                          }`}
                        >
                          {admin.role === 'super_admin' ? 'Super Admin' : 'Admin'}
                        </span>
                      </div>
                      <div className="flex items-center space-x-1 text-sm text-gray-500 dark:text-gray-400 mb-3">
                        <Mail className="w-4 h-4" />
                        <span>{admin.email}</span>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Assigned Users</p>
                          <div className="flex items-center space-x-1">
                            <Users className="w-4 h-4 text-gray-400" />
                            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              {admin.assignedUsers}
                            </span>
                          </div>
                        </div>

                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Avg Response Time</p>
                          <div className="flex items-center space-x-1">
                            <Clock className="w-4 h-4 text-gray-400" />
                            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              {admin.avgResponseTime}
                            </span>
                          </div>
                        </div>

                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total Volume</p>
                          <div className="flex items-center space-x-1">
                            <DollarSign className="w-4 h-4 text-gray-400" />
                            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              ${(admin.totalTransactions / 1000).toFixed(1)}k
                            </span>
                          </div>
                        </div>

                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Last Active</p>
                          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {admin.lastActive
                              ? new Date(admin.lastActive).toLocaleDateString()
                              : 'Never'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showInviteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                Invite Admin
              </h3>
              <button
                onClick={() => setShowInviteModal(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleInvite} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="admin@revoa.app"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 dark:bg-gray-700 dark:text-gray-100"
                  required
                />
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  Only @revoa.app email addresses are allowed
                </p>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isInviting}
                  className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isInviting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Sending...</span>
                    </>
                  ) : (
                    <>
                      <Mail className="w-4 h-4" />
                      <span>Send Invitation</span>
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
