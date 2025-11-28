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
  Calendar,
  Package,
  MessageSquare,
  TrendingUp,
  CheckCircle2
} from 'lucide-react';
import { format, subDays, startOfMonth, endOfMonth, startOfYear } from 'date-fns';
import { toast } from 'sonner';
import { useAdmin } from '@/contexts/AdminContext';
import { supabase } from '@/lib/supabase';
import AdReportsTimeSelector, { TimeOption } from '@/components/reports/AdReportsTimeSelector';
import InviteAdminModal from '@/components/admin/InviteAdminModal';
import Button from '@/components/Button';

interface AdminUser {
  id: string;
  user_id: string;
  name: string | null;
  email: string;
  role: 'admin' | 'super_admin';
  assignedUsers: number;
  activeClients: number;
  avgResponseTime: string;
  avgFulfillmentTime: number | null;
  quotesResponded: number;
  totalQuotes: number;
  totalTransactions: number;
  lastActive: string | null;
  performance: {
    score: number;
    change: number;
  };
}

interface DateRange {
  startDate: Date;
  endDate: Date;
}

export default function AdminManage() {
  const { isSuperAdmin } = useAdmin();
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [isInviting, setIsInviting] = useState(false);
  const [selectedTime, setSelectedTime] = useState<TimeOption>('7d');
  const initialEndDate = new Date();
  initialEndDate.setHours(23, 59, 59, 999);
  const initialStartDate = new Date(initialEndDate);
  initialStartDate.setDate(initialStartDate.getDate() - 7);
  initialStartDate.setHours(0, 0, 0, 0);
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: initialStartDate,
    endDate: initialEndDate
  });

  useEffect(() => {
    fetchAdmins();
  }, [dateRange]);

  const handleTimeChange = (time: TimeOption) => {
    setSelectedTime(time);
    // Date range update is handled by AdReportsTimeSelector
  };

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
      const { startDate, endDate } = dateRange;

      // Fetch user assignments for each admin
      const { data: assignments } = await supabase
        .from('user_assignments')
        .select('admin_id, user_id, total_transactions')
        .in('admin_id', adminIds);

      // Get invoices within time range to calculate active clients and fulfillment time
      const { data: invoices } = await supabase
        .from('invoices')
        .select('user_id, created_at, paid_at, status')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      // Get quotes within time range
      const { data: quotes } = await supabase
        .from('product_quotes')
        .select('user_id, status, created_at')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      // Calculate stats for each admin
      const adminStats = new Map<string, {
        count: number;
        totalTransactions: number;
        activeClients: Set<string>;
        fulfillmentDays: number[];
        quotesResponded: number;
        totalQuotes: number;
      }>();

      adminIds.forEach(adminId => {
        adminStats.set(adminId, {
          count: 0,
          totalTransactions: 0,
          activeClients: new Set(),
          fulfillmentDays: [],
          quotesResponded: 0,
          totalQuotes: 0
        });
      });

      // Process assignments
      assignments?.forEach(assignment => {
        const stats = adminStats.get(assignment.admin_id);
        if (stats) {
          stats.count++;
          stats.totalTransactions += assignment.total_transactions || 0;
        }
      });

      // Process invoices to find active clients and fulfillment time
      invoices?.forEach(invoice => {
        // Find which admin manages this user
        const userAssignment = assignments?.find(a => a.user_id === invoice.user_id);
        if (userAssignment) {
          const stats = adminStats.get(userAssignment.admin_id);
          if (stats) {
            // Active client (has invoice in time range)
            stats.activeClients.add(invoice.user_id);

            // Calculate fulfillment time for paid invoices
            if (invoice.status === 'paid' && invoice.created_at && invoice.paid_at) {
              const created = new Date(invoice.created_at);
              const paid = new Date(invoice.paid_at);
              const days = (paid.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
              stats.fulfillmentDays.push(days);
            }
          }
        }
      });

      // Process quotes
      quotes?.forEach(quote => {
        const userAssignment = assignments?.find(a => a.user_id === quote.user_id);
        if (userAssignment) {
          const stats = adminStats.get(userAssignment.admin_id);
          if (stats) {
            stats.totalQuotes++;
            if (quote.status === 'quoted' || quote.status === 'accepted') {
              stats.quotesResponded++;
            }
          }
        }
      });

      // Transform to AdminUser interface
      const transformedAdmins: AdminUser[] = adminProfiles.map(profile => {
        const stats = adminStats.get(profile.user_id);

        const avgFulfillmentDays = stats && stats.fulfillmentDays.length > 0
          ? stats.fulfillmentDays.reduce((sum, days) => sum + days, 0) / stats.fulfillmentDays.length
          : null;

        return {
          id: profile.user_id,
          user_id: profile.user_id,
          name: profile.name,
          email: profile.email,
          role: (profile.admin_role as 'admin' | 'super_admin') || 'admin',
          assignedUsers: stats?.count || 0,
          activeClients: stats?.activeClients.size || 0,
          avgResponseTime: 'N/A',
          avgFulfillmentTime: avgFulfillmentDays,
          quotesResponded: stats?.quotesResponded || 0,
          totalQuotes: stats?.totalQuotes || 0,
          totalTransactions: stats?.totalTransactions || 0,
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

  const handleInviteSuccess = () => {
    fetchAdmins();
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
            <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Manage your admin team and monitor performance
            </p>
          </div>
        </div>

        {isSuperAdmin && (
          <Button
            variant="primary"
            size="md"
            icon={<UserPlus className="w-4 h-4" />}
            iconPosition="left"
            onClick={() => setShowInviteModal(true)}
          >
            Invite Admin
          </Button>
        )}
      </div>

      {/* Time Range Selector */}
      <div className="flex items-center justify-end">
        <AdReportsTimeSelector
          selectedTime={selectedTime}
          onTimeChange={handleTimeChange}
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
          onApply={() => fetchAdmins()}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <Users className="w-6 h-6 text-gray-600 dark:text-gray-400" />
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
            <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <BarChart3 className="w-6 h-6 text-gray-600 dark:text-gray-400" />
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
            <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <DollarSign className="w-6 h-6 text-gray-600 dark:text-gray-400" />
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

                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
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
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Active Clients</p>
                          <div className="flex items-center space-x-1">
                            <TrendingUp className="w-4 h-4 text-green-500 dark:text-green-400" />
                            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              {admin.activeClients}
                            </span>
                          </div>
                        </div>

                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Avg Fulfillment</p>
                          <div className="flex items-center space-x-1">
                            <Clock className="w-4 h-4 text-blue-500 dark:text-blue-400" />
                            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              {admin.avgFulfillmentTime !== null
                                ? `${Math.round(admin.avgFulfillmentTime)}d`
                                : 'N/A'}
                            </span>
                          </div>
                        </div>

                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Quotes Handled</p>
                          <div className="flex items-center space-x-1">
                            <MessageSquare className="w-4 h-4 text-gray-400" />
                            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              {admin.quotesResponded}/{admin.totalQuotes}
                            </span>
                          </div>
                        </div>

                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Quote Rate</p>
                          <div className="flex items-center space-x-1">
                            <CheckCircle2 className="w-4 h-4 text-gray-400" />
                            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              {admin.totalQuotes > 0
                                ? `${Math.round((admin.quotesResponded / admin.totalQuotes) * 100)}%`
                                : 'N/A'}
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

      <InviteAdminModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        onSuccess={handleInviteSuccess}
      />
    </div>
  );
}
