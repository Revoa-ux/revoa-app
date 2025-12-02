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
  CheckCircle2,
  MoreVertical,
  Trash2,
  Shield,
  ShieldCheck,
  Send,
  XCircle
} from 'lucide-react';
import { format, subDays, startOfMonth, endOfMonth, startOfYear } from 'date-fns';
import { toast } from 'sonner';
import { useAdmin } from '@/contexts/AdminContext';
import { supabase } from '@/lib/supabase';
import AdReportsTimeSelector, { TimeOption } from '@/components/reports/AdReportsTimeSelector';
import InviteAdminModal from '@/components/admin/InviteAdminModal';
import Button from '@/components/Button';
import Modal from '@/components/Modal';

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

interface PendingInvitation {
  id: string;
  email: string;
  role: 'admin' | 'super_admin';
  invited_by: string;
  created_at: string;
  expires_at: string;
  invited_by_profile?: {
    name: string | null;
    email: string;
  };
}

export default function AdminManage() {
  const { isSuperAdmin } = useAdmin();
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<PendingInvitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [isInviting, setIsInviting] = useState(false);
  const [selectedTime, setSelectedTime] = useState<TimeOption>('7d');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{
    type: 'delete' | 'changeRole' | null;
    adminId: string | null;
    adminEmail: string | null;
    currentRole: string | null;
  }>({ type: null, adminId: null, adminEmail: null, currentRole: null });
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
    fetchPendingInvitations();
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

  const fetchPendingInvitations = async () => {
    if (!isSuperAdmin) return;

    try {
      const { data, error } = await supabase
        .from('admin_invitations')
        .select(`
          id,
          email,
          role,
          invited_by,
          created_at,
          expires_at,
          invited_by_profile:user_profiles!admin_invitations_invited_by_fkey(name, email)
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setPendingInvitations(data || []);
    } catch (error) {
      console.error('Error fetching pending invitations:', error);
    }
  };

  const handleInviteSuccess = () => {
    fetchAdmins();
    fetchPendingInvitations();
  };

  const handleCancelInvite = async (invitationId: string, email: string) => {
    try {
      const { error } = await supabase
        .from('admin_invitations')
        .update({ status: 'revoked' })
        .eq('id', invitationId);

      if (error) throw error;

      toast.success(`Invitation to ${email} has been cancelled`);
      fetchPendingInvitations();
    } catch (error) {
      console.error('Error canceling invitation:', error);
      toast.error('Failed to cancel invitation');
    }
  };

  const handleResendInvite = async (invitation: PendingInvitation) => {
    try {
      const { data, error } = await supabase.functions.invoke('send-admin-invitation', {
        body: {
          email: invitation.email,
          role: invitation.role,
          invitation_token: invitation.id,
        },
      });

      if (error) throw error;

      if (data?.emailSent) {
        toast.success(`Invitation resent to ${invitation.email}`);
      } else {
        toast.warning(`Invitation link generated but email may not have been sent`);
        if (data?.invitationLink) {
          console.log('Invitation link:', data.invitationLink);
        }
      }
    } catch (error) {
      console.error('Error resending invitation:', error);
      toast.error('Failed to resend invitation');
    }
  };

  const handleDeleteAdmin = async () => {
    if (!confirmAction.adminId || !confirmAction.adminEmail) return;

    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ is_admin: false, admin_role: null })
        .eq('user_id', confirmAction.adminId);

      if (error) throw error;

      toast.success('Admin removed successfully');
      fetchAdmins();
      setOpenMenuId(null);
      setConfirmAction({ type: null, adminId: null, adminEmail: null, currentRole: null });
    } catch (error) {
      console.error('Error deleting admin:', error);
      toast.error('Failed to remove admin');
    }
  };

  const handleChangeRole = async () => {
    if (!confirmAction.adminId || !confirmAction.currentRole) return;

    const newRole = confirmAction.currentRole === 'super_admin' ? 'admin' : 'super_admin';
    const roleLabel = newRole === 'super_admin' ? 'Super Admin' : 'Admin';

    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ admin_role: newRole })
        .eq('user_id', confirmAction.adminId);

      if (error) throw error;

      toast.success(`Role updated to ${roleLabel}`);
      fetchAdmins();
      setOpenMenuId(null);
      setConfirmAction({ type: null, adminId: null, adminEmail: null, currentRole: null });
    } catch (error) {
      console.error('Error changing role:', error);
      toast.error('Failed to update role');
    }
  };

  const totalAssignedUsers = admins.reduce((sum, admin) => sum + admin.assignedUsers, 0);
  const totalVolume = admins.reduce((sum, admin) => sum + admin.totalTransactions, 0);

  return (
    <div className="space-y-6">
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

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <AdReportsTimeSelector
            selectedTime={selectedTime}
            onTimeChange={handleTimeChange}
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
            onApply={() => fetchAdmins()}
          />
          {isSuperAdmin && (
            <Button
              variant="secondary"
              size="md"
              icon={<UserPlus className="w-4 h-4" />}
              iconPosition="left"
              onClick={() => setShowInviteModal(true)}
            >
              Invite Admin
            </Button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
              </div>
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24 animate-pulse" />
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-16 animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      ) : (
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
      )}

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">Admin Team Members</h2>
        </div>

        {isLoading ? (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="p-6">
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse flex-shrink-0" />
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center space-x-2">
                      <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-32 animate-pulse" />
                      <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-20 animate-pulse" />
                    </div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-48 animate-pulse" />
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                      {Array.from({ length: 6 }).map((_, j) => (
                        <div key={j} className="space-y-2">
                          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-20 animate-pulse" />
                          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-12 animate-pulse" />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
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

                  {isSuperAdmin && (
                    <div className="relative">
                      <button
                        onClick={() => setOpenMenuId(openMenuId === admin.id ? null : admin.id)}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                      >
                        <MoreVertical className="w-5 h-5 text-gray-400" />
                      </button>

                      {openMenuId === admin.id && (
                        <>
                          <div
                            className="fixed inset-0 z-10"
                            onClick={() => setOpenMenuId(null)}
                          />
                          <div className="absolute right-0 top-10 z-20 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1">
                            <button
                              onClick={() => {
                                setConfirmAction({
                                  type: 'changeRole',
                                  adminId: admin.id,
                                  adminEmail: admin.email,
                                  currentRole: admin.role
                                });
                                setOpenMenuId(null);
                              }}
                              className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 flex items-center space-x-2"
                            >
                              {admin.role === 'super_admin' ? (
                                <>
                                  <Shield className="w-4 h-4" />
                                  <span>Change to Admin</span>
                                </>
                              ) : (
                                <>
                                  <ShieldCheck className="w-4 h-4" />
                                  <span>Make Super Admin</span>
                                </>
                              )}
                            </button>
                            <button
                              onClick={() => {
                                setConfirmAction({
                                  type: 'delete',
                                  adminId: admin.id,
                                  adminEmail: admin.email,
                                  currentRole: admin.role
                                });
                                setOpenMenuId(null);
                              }}
                              className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 flex items-center space-x-2"
                            >
                              <Trash2 className="w-4 h-4" />
                              <span>Remove Admin</span>
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pending Invitations Section */}
      {isSuperAdmin && pendingInvitations.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">Pending Invitations</h2>
              <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300 rounded-full">
                {pendingInvitations.length} pending
              </span>
            </div>
          </div>

          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {pendingInvitations.map((invitation) => {
              const expiresAt = new Date(invitation.expires_at);
              const isExpiringSoon = expiresAt.getTime() - Date.now() < 24 * 60 * 60 * 1000; // Less than 24 hours
              const invitedByName = invitation.invited_by_profile?.name || invitation.invited_by_profile?.email || 'Unknown';

              return (
                <div key={invitation.id} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 flex-1">
                      <div className="w-12 h-12 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center flex-shrink-0">
                        <Clock className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <h3 className="text-base font-medium text-gray-900 dark:text-gray-100">
                            {invitation.email}
                          </h3>
                          <span
                            className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                              invitation.role === 'super_admin'
                                ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
                                : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                            }`}
                          >
                            {invitation.role === 'super_admin' ? 'Super Admin' : 'Admin'}
                          </span>
                          {isExpiringSoon && (
                            <span className="px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 rounded-full">
                              Expiring Soon
                            </span>
                          )}
                        </div>

                        <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                          <div className="flex items-center space-x-1">
                            <UserPlus className="w-4 h-4" />
                            <span>Invited by {invitedByName}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Calendar className="w-4 h-4" />
                            <span>Sent {format(new Date(invitation.created_at), 'MMM d, yyyy')}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Clock className="w-4 h-4" />
                            <span>Expires {format(expiresAt, 'MMM d, yyyy')}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 ml-4">
                      <button
                        onClick={() => handleResendInvite(invitation)}
                        className="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors flex items-center space-x-1.5"
                        title="Resend invitation email"
                      >
                        <Send className="w-4 h-4" />
                        <span>Resend</span>
                      </button>
                      <button
                        onClick={() => handleCancelInvite(invitation.id, invitation.email)}
                        className="px-3 py-1.5 text-sm font-medium text-red-600 dark:text-red-400 bg-white dark:bg-gray-800 border border-red-200 dark:border-red-900/50 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors flex items-center space-x-1.5"
                        title="Cancel invitation"
                      >
                        <XCircle className="w-4 h-4" />
                        <span>Cancel</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <InviteAdminModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        onSuccess={handleInviteSuccess}
      />

      <Modal
        isOpen={confirmAction.type !== null}
        onClose={() => setConfirmAction({ type: null, adminId: null, adminEmail: null, currentRole: null })}
        title={confirmAction.type === 'delete' ? 'Remove Admin' : 'Change Admin Role'}
      >
        <div className="space-y-4">
          <p className="text-gray-600 dark:text-gray-400">
            {confirmAction.type === 'delete' ? (
              <>
                Are you sure you want to remove <strong>{confirmAction.adminEmail}</strong> as an admin?
                This action cannot be undone.
              </>
            ) : (
              <>
                Change <strong>{confirmAction.adminEmail}</strong>'s role to{' '}
                <strong>
                  {confirmAction.currentRole === 'super_admin' ? 'Admin' : 'Super Admin'}
                </strong>
                ?
              </>
            )}
          </p>

          <div className="flex justify-end space-x-3">
            <Button
              variant="secondary"
              onClick={() => setConfirmAction({ type: null, adminId: null, adminEmail: null, currentRole: null })}
            >
              Cancel
            </Button>
            <Button
              variant={confirmAction.type === 'delete' ? 'danger' : 'primary'}
              onClick={confirmAction.type === 'delete' ? handleDeleteAdmin : handleChangeRole}
            >
              {confirmAction.type === 'delete' ? 'Remove Admin' : 'Change Role'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
