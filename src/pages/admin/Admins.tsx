import React, { useState, useRef, useEffect } from 'react';
import {
  Search,
  Filter,
  ChevronDown,
  Check,
  X,
  UserPlus,
  Mail,
  Shield,
  ShieldCheck,
  Clock,
  Calendar,
  Send,
  XCircle,
  CheckCircle2,
  MoreVertical,
  Trash2,
  RotateCw
} from 'lucide-react';
import { toast } from 'sonner';
import { useClickOutside } from '@/lib/useClickOutside';
import { supabase } from '@/lib/supabase';
import { useAdmin } from '@/contexts/AdminContext';
import { InviteAdminModal } from '@/components/admin/InviteAdminModal';
import { format, formatDistanceToNow } from 'date-fns';

type AdminType = 'super_admin' | 'admin';
type InviteStatus = 'pending' | 'accepted' | 'revoked' | 'expired';
type FilterType = 'all' | 'super_admins' | 'admins' | 'pending_invites' | 'revoked';
type SortField = 'name' | 'email' | 'date_added' | 'role';

interface AdminRow {
  id: string;
  type: 'admin' | 'invitation';
  email: string;
  name: string | null;
  role: AdminType;
  status: 'active' | InviteStatus;
  dateAdded: string;
  invitedBy?: string;
  expiresAt?: string;
  acceptedAt?: string;
  userId?: string;
}

export default function AdminsManagement() {
  const { isSuperAdmin } = useAdmin();
  const [rows, setRows] = useState<AdminRow[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [sortBy, setSortBy] = useState<{ field: SortField; direction: 'asc' | 'desc' }>({
    field: 'date_added',
    direction: 'desc'
  });
  const [actionMenuOpen, setActionMenuOpen] = useState<string | null>(null);

  const filterDropdownRef = useRef<HTMLDivElement>(null);
  const sortDropdownRef = useRef<HTMLDivElement>(null);
  const actionMenuRef = useRef<HTMLDivElement>(null);

  useClickOutside(filterDropdownRef, () => setShowFilterDropdown(false));
  useClickOutside(sortDropdownRef, () => setShowSortDropdown(false));
  useClickOutside(actionMenuRef, () => setActionMenuOpen(null));

  const filterOptions = [
    { value: 'all', label: 'All', icon: Shield },
    { value: 'super_admins', label: 'Super Admins', icon: ShieldCheck },
    { value: 'admins', label: 'Admins', icon: Shield },
    { value: 'pending_invites', label: 'Pending Invites', icon: Clock },
    { value: 'revoked', label: 'Revoked', icon: XCircle }
  ];

  const sortOptions = [
    { value: 'name', label: 'Name' },
    { value: 'email', label: 'Email' },
    { value: 'date_added', label: 'Date Added' },
    { value: 'role', label: 'Role' }
  ];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    if (!isSuperAdmin) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const combinedRows: AdminRow[] = [];

      // Fetch active admins
      const { data: admins, error: adminsError } = await supabase
        .from('user_profiles')
        .select('user_id, name, first_name, last_name, email, is_super_admin, created_at')
        .eq('is_admin', true)
        .order('created_at', { ascending: false });

      if (adminsError) throw adminsError;

      if (admins) {
        admins.forEach(admin => {
          const displayName = admin.name ||
            (admin.first_name && admin.last_name ? `${admin.first_name} ${admin.last_name}` : null);

          combinedRows.push({
            id: admin.user_id,
            type: 'admin',
            email: admin.email,
            name: displayName,
            role: admin.is_super_admin ? 'super_admin' : 'admin',
            status: 'active',
            dateAdded: admin.created_at,
            userId: admin.user_id
          });
        });
      }

      // Fetch invitations
      const { data: invitations, error: invitationsError } = await supabase
        .from('admin_invitations')
        .select(`
          id,
          email,
          role,
          status,
          created_at,
          expires_at,
          accepted_at,
          user_profiles!admin_invitations_invited_by_fkey(name, email)
        `)
        .order('created_at', { ascending: false });

      if (invitationsError) throw invitationsError;

      if (invitations) {
        invitations.forEach(inv => {
          const inviterProfile = inv.user_profiles as any;
          const inviterName = inviterProfile?.name || inviterProfile?.email || 'Unknown';

          combinedRows.push({
            id: inv.id,
            type: 'invitation',
            email: inv.email,
            name: null,
            role: inv.role as AdminType,
            status: inv.status as InviteStatus,
            dateAdded: inv.created_at,
            invitedBy: inviterName,
            expiresAt: inv.expires_at,
            acceptedAt: inv.accepted_at
          });
        });
      }

      setRows(combinedRows);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load admin data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInviteSuccess = () => {
    setShowInviteModal(false);
    fetchData();
  };

  const handleResendInvite = async (rowId: string, email: string) => {
    try {
      const { error } = await supabase.functions.invoke('send-admin-invitation', {
        body: {
          email,
          role: rows.find(r => r.id === rowId)?.role || 'admin',
          invitation_token: rowId,
        },
      });

      if (error) throw error;
      toast.success(`Invitation resent to ${email}`);
      setActionMenuOpen(null);
    } catch (error) {
      console.error('Error resending invitation:', error);
      toast.error('Failed to resend invitation');
    }
  };

  const handleCancelInvite = async (rowId: string, email: string) => {
    try {
      const { error } = await supabase
        .from('admin_invitations')
        .update({ status: 'revoked' })
        .eq('id', rowId);

      if (error) throw error;
      toast.success(`Invitation cancelled for ${email}`);
      setActionMenuOpen(null);
      fetchData();
    } catch (error) {
      console.error('Error cancelling invitation:', error);
      toast.error('Failed to cancel invitation');
    }
  };

  const handleRemoveAdmin = async (userId: string, email: string) => {
    if (!confirm(`Are you sure you want to remove ${email} as an admin?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ is_admin: false, is_super_admin: false })
        .eq('user_id', userId);

      if (error) throw error;
      toast.success(`Removed ${email} as admin`);
      setActionMenuOpen(null);
      fetchData();
    } catch (error) {
      console.error('Error removing admin:', error);
      toast.error('Failed to remove admin');
    }
  };

  const filteredRows = rows.filter(row => {
    const matchesSearch =
      row.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (row.name && row.name.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesFilter =
      filterType === 'all' ||
      (filterType === 'super_admins' && row.role === 'super_admin' && row.status === 'active') ||
      (filterType === 'admins' && row.role === 'admin' && row.status === 'active') ||
      (filterType === 'pending_invites' && row.status === 'pending') ||
      (filterType === 'revoked' && row.status === 'revoked');

    return matchesSearch && matchesFilter;
  });

  const sortedRows = [...filteredRows].sort((a, b) => {
    let aValue: any;
    let bValue: any;

    switch (sortBy.field) {
      case 'name':
        aValue = (a.name || a.email).toLowerCase();
        bValue = (b.name || b.email).toLowerCase();
        break;
      case 'email':
        aValue = a.email.toLowerCase();
        bValue = b.email.toLowerCase();
        break;
      case 'date_added':
        aValue = new Date(a.dateAdded).getTime();
        bValue = new Date(b.dateAdded).getTime();
        break;
      case 'role':
        aValue = a.role === 'super_admin' ? 0 : 1;
        bValue = b.role === 'super_admin' ? 0 : 1;
        break;
      default:
        return 0;
    }

    if (aValue < bValue) return sortBy.direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortBy.direction === 'asc' ? 1 : -1;
    return 0;
  });

  const getStatusBadge = (row: AdminRow) => {
    if (row.type === 'admin') {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400">
          <CheckCircle2 className="w-3 h-3 mr-1" />
          Active
        </span>
      );
    }

    switch (row.status) {
      case 'pending':
        const isExpiringSoon = row.expiresAt &&
          new Date(row.expiresAt).getTime() - Date.now() < 24 * 60 * 60 * 1000;
        return (
          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
            isExpiringSoon
              ? 'bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400'
              : 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400'
          }`}>
            <Clock className="w-3 h-3 mr-1" />
            {isExpiringSoon ? 'Expiring Soon' : 'Pending'}
          </span>
        );
      case 'revoked':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400">
            <XCircle className="w-3 h-3 mr-1" />
            Cancelled
          </span>
        );
      case 'expired':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-50 text-gray-700 dark:bg-gray-900/20 dark:text-gray-400">
            <XCircle className="w-3 h-3 mr-1" />
            Expired
          </span>
        );
      case 'accepted':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Accepted
          </span>
        );
    }
  };

  const getRoleBadge = (role: AdminType) => {
    return role === 'super_admin' ? (
      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400">
        <ShieldCheck className="w-3 h-3 mr-1" />
        Super Admin
      </span>
    ) : (
      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400">
        <Shield className="w-3 h-3 mr-1" />
        Admin
      </span>
    );
  };

  if (!isSuperAdmin) {
    return (
      <div className="max-w-[1050px] mx-auto">
        <div className="text-center py-12">
          <Shield className="w-12 h-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Super Admin Access Required
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            You need super admin privileges to manage admins
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1050px] mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-normal text-gray-900 dark:text-gray-100 mb-2">
          Admin Management
        </h1>
        <div className="flex items-center space-x-2">
          <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Manage admin team members and invitations
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {/* Search */}
          <div className="relative w-[280px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search admins..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-10 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-300 focus:border-gray-200 dark:border-gray-700"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded-full"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            )}
          </div>

          {/* Filter */}
          <div className="relative" ref={filterDropdownRef}>
            <button
              onClick={() => setShowFilterDropdown(!showFilterDropdown)}
              className="px-4 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors flex items-center space-x-2"
            >
              <Filter className="w-4 h-4 text-gray-400" />
              <span className="text-gray-700 dark:text-gray-300">
                {filterOptions.find(f => f.value === filterType)?.label}
              </span>
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </button>

            {showFilterDropdown && (
              <div className="absolute top-full mt-2 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10">
                {filterOptions.map(option => {
                  const Icon = option.icon;
                  return (
                    <button
                      key={option.value}
                      onClick={() => {
                        setFilterType(option.value as FilterType);
                        setShowFilterDropdown(false);
                      }}
                      className="w-full px-4 py-2 text-sm text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 flex items-center justify-between group"
                    >
                      <div className="flex items-center space-x-2">
                        <Icon className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-700 dark:text-gray-300">{option.label}</span>
                      </div>
                      {filterType === option.value && (
                        <Check className="w-4 h-4 text-gray-900 dark:text-white" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Sort */}
          <div className="relative" ref={sortDropdownRef}>
            <button
              onClick={() => setShowSortDropdown(!showSortDropdown)}
              className="px-4 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors flex items-center space-x-2"
            >
              <span className="text-gray-700 dark:text-gray-300">
                Sort: {sortOptions.find(s => s.value === sortBy.field)?.label}
              </span>
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </button>

            {showSortDropdown && (
              <div className="absolute top-full mt-2 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10">
                {sortOptions.map(option => (
                  <button
                    key={option.value}
                    onClick={() => {
                      if (sortBy.field === option.value) {
                        setSortBy({
                          field: option.value as SortField,
                          direction: sortBy.direction === 'asc' ? 'desc' : 'asc'
                        });
                      } else {
                        setSortBy({
                          field: option.value as SortField,
                          direction: 'asc'
                        });
                      }
                      setShowSortDropdown(false);
                    }}
                    className="w-full px-4 py-2 text-sm text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 flex items-center justify-between"
                  >
                    <span className="text-gray-700 dark:text-gray-300">{option.label}</span>
                    {sortBy.field === option.value && (
                      <span className="text-xs text-gray-500">
                        {sortBy.direction === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Invite Button */}
        <button
          onClick={() => setShowInviteModal(true)}
          className="px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-medium rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors flex items-center space-x-2"
        >
          <UserPlus className="w-4 h-4" />
          <span>Invite Admin</span>
        </button>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Admin
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Date Added
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Details
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, index) => (
                  <tr key={index}>
                    {Array.from({ length: 6 }).map((_, i) => (
                      <td key={i} className="px-6 py-4">
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : sortedRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <Shield className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                      No {filterType === 'all' ? 'admins' : filterType.replace('_', ' ')} found
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {searchTerm ? 'Try adjusting your search' : 'Get started by inviting an admin'}
                    </p>
                  </td>
                </tr>
              ) : (
                sortedRows.map(row => (
                  <tr
                    key={row.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {row.name || row.email.split('@')[0]}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {row.email}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {getRoleBadge(row.role)}
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(row)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {format(new Date(row.dateAdded), 'MMM dd, yyyy')}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {formatDistanceToNow(new Date(row.dateAdded), { addSuffix: true })}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {row.type === 'invitation' && row.invitedBy && (
                          <div className="flex items-center space-x-1">
                            <Mail className="w-3 h-3" />
                            <span>by {row.invitedBy}</span>
                          </div>
                        )}
                        {row.expiresAt && row.status === 'pending' && (
                          <div className="flex items-center space-x-1 mt-1">
                            <Clock className="w-3 h-3" />
                            <span>Expires {formatDistanceToNow(new Date(row.expiresAt), { addSuffix: true })}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="relative inline-block" ref={actionMenuOpen === row.id ? actionMenuRef : null}>
                        <button
                          onClick={() => setActionMenuOpen(actionMenuOpen === row.id ? null : row.id)}
                          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                        >
                          <MoreVertical className="w-4 h-4 text-gray-500" />
                        </button>

                        {actionMenuOpen === row.id && (
                          <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10">
                            {row.type === 'invitation' && row.status === 'pending' && (
                              <>
                                <button
                                  onClick={() => handleResendInvite(row.id, row.email)}
                                  className="w-full px-4 py-2 text-sm text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 flex items-center space-x-2 text-gray-700 dark:text-gray-300"
                                >
                                  <RotateCw className="w-4 h-4" />
                                  <span>Resend Invite</span>
                                </button>
                                <button
                                  onClick={() => handleCancelInvite(row.id, row.email)}
                                  className="w-full px-4 py-2 text-sm text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 flex items-center space-x-2 text-red-600 dark:text-red-400"
                                >
                                  <XCircle className="w-4 h-4" />
                                  <span>Cancel Invite</span>
                                </button>
                              </>
                            )}
                            {row.type === 'admin' && row.userId && (
                              <button
                                onClick={() => handleRemoveAdmin(row.userId!, row.email)}
                                className="w-full px-4 py-2 text-sm text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 flex items-center space-x-2 text-red-600 dark:text-red-400"
                              >
                                <Trash2 className="w-4 h-4" />
                                <span>Remove Admin</span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary */}
      {!isLoading && sortedRows.length > 0 && (
        <div className="text-sm text-gray-500 dark:text-gray-400 text-center">
          Showing {sortedRows.length} of {rows.length} {rows.length === 1 ? 'admin' : 'admins/invitations'}
        </div>
      )}

      {/* Invite Modal */}
      <InviteAdminModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        onSuccess={handleInviteSuccess}
      />
    </div>
  );
}
