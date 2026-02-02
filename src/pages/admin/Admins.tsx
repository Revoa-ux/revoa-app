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
  XCircle,
  CheckCircle2,
  MoreVertical,
  Trash2,
  RotateCw,
  ArrowRight,
  User,
  Image,
  ArrowUpDown
} from 'lucide-react';
import { toast } from '../../lib/toast';
import { useClickOutside } from '@/lib/useClickOutside';
import { FilterButton } from '@/components/FilterButton';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { InviteAdminModal } from '@/components/admin/InviteAdminModal';
import Modal from '@/components/Modal';
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
  const { profile } = useAuth();
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
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ id: string; email: string; type: 'invitation' | 'admin'; userId?: string } | null>(null);

  const PROTECTED_ADMIN_EMAIL = 'tyler@revoa.app';
  const currentUserEmail = profile?.email;

  const filterDropdownRef = useRef<HTMLDivElement>(null);
  const sortDropdownRef = useRef<HTMLDivElement>(null);
  const actionMenuRef = useRef<HTMLDivElement>(null);

  useClickOutside(filterDropdownRef, () => setShowFilterDropdown(false));
  useClickOutside(sortDropdownRef, () => setShowSortDropdown(false));
  useClickOutside(actionMenuRef, () => setActionMenuOpen(null));

  const filterOptions = [
    { value: 'all', label: 'All' },
    { value: 'super_admins', label: 'Super Admins' },
    { value: 'admins', label: 'Admins' },
    { value: 'pending_invites', label: 'Pending Invites' },
    { value: 'revoked', label: 'Revoked' }
  ];

  const sortOptions = [
    { value: 'name', label: 'Name' },
    { value: 'email', label: 'Email' },
    { value: 'date_added', label: 'Date Added' },
    { value: 'role', label: 'Role' }
  ];

  useEffect(() => {
    fetchData();

    // Set up real-time subscription for invitation changes
    const invitationSubscription = supabase
      .channel('admin_invitations_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'admin_invitations'
        },
        () => {
          fetchData();
        }
      )
      .subscribe();

    // Set up real-time subscription for admin profile changes
    const adminSubscription = supabase
      .channel('user_profiles_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_profiles',
          filter: 'is_admin=eq.true'
        },
        () => {
          fetchData();
        }
      )
      .subscribe();

    return () => {
      invitationSubscription.unsubscribe();
      adminSubscription.unsubscribe();
    };
  }, []);

  const fetchData = async () => {
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

      // Fetch invitations - only get the most recent invitation per email
      const { data: allInvitations, error: invitationsError } = await supabase
        .from('admin_invitations')
        .select('id, email, role, status, created_at, expires_at, accepted_at, invited_by')
        .order('created_at', { ascending: false });

      if (invitationsError) throw invitationsError;

      // Create a set of active admin emails to filter out
      const activeAdminEmails = new Set(admins?.map(a => a.email) || []);

      // Deduplicate invitations - keep only the most recent one per email
      // and exclude invitations for users who are already active admins
      const invitationsMap = new Map<string, typeof allInvitations[0]>();
      allInvitations?.forEach(inv => {
        if (!invitationsMap.has(inv.email) && !activeAdminEmails.has(inv.email)) {
          invitationsMap.set(inv.email, inv);
        }
      });
      const invitations = Array.from(invitationsMap.values());

      if (invitations && invitations.length > 0) {
        const inviterIds = [...new Set(invitations.map(inv => inv.invited_by))];
        const { data: inviters } = await supabase
          .from('user_profiles')
          .select('user_id, name, email, first_name, last_name')
          .in('user_id', inviterIds);

        const inviterMap = new Map(
          inviters?.map(inv => [
            inv.user_id,
            inv.name || (inv.first_name && inv.last_name ? `${inv.first_name} ${inv.last_name}` : inv.email)
          ])
        );

        invitations.forEach(inv => {
          const inviterName = inviterMap.get(inv.invited_by) || 'Unknown';

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
    // Protect tyler@revoa.app from being cancelled by anyone except himself
    if (email === PROTECTED_ADMIN_EMAIL && currentUserEmail !== PROTECTED_ADMIN_EMAIL) {
      toast.error('This invitation cannot be cancelled');
      return;
    }

    try {
      const { error } = await supabase
        .from('admin_invitations')
        .update({ status: 'revoked' })
        .eq('id', rowId);

      if (error) throw error;
      toast.success(`Invitation cancelled for ${email}`);
      setActionMenuOpen(null);
      await fetchData();
    } catch (error) {
      console.error('Error cancelling invitation:', error);
      toast.error('Failed to cancel invitation');
    }
  };

  const handleRemoveAdmin = async () => {
    if (!deleteConfirmation || deleteConfirmation.type !== 'admin' || !deleteConfirmation.userId) return;

    if (deleteConfirmation.email === PROTECTED_ADMIN_EMAIL && currentUserEmail !== PROTECTED_ADMIN_EMAIL) {
      toast.error('This admin account cannot be removed');
      setDeleteConfirmation(null);
      return;
    }

    try {
      console.log('Removing admin:', deleteConfirmation.email, deleteConfirmation.userId);

      const { data, error } = await supabase
        .from('user_profiles')
        .update({ is_admin: false, is_super_admin: false })
        .eq('user_id', deleteConfirmation.userId)
        .select();

      console.log('Update result:', { data, error });

      if (error) {
        console.error('Database error:', error);
        throw error;
      }

      toast.success(`Removed ${deleteConfirmation.email} as admin`);
      setDeleteConfirmation(null);
      setActionMenuOpen(null);
      await fetchData();
    } catch (error) {
      console.error('Error removing admin:', error);
      toast.error(`Failed to remove admin: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleResetProfilePicture = async (userId: string, email: string) => {
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ profile_picture_url: null })
        .eq('user_id', userId);

      if (error) throw error;

      toast.success(`Reset profile picture for ${email}`);
      setActionMenuOpen(null);
      await fetchData();
    } catch (error) {
      console.error('Error resetting profile picture:', error);
      toast.error('Failed to reset profile picture');
    }
  };

  const handleResetUsername = async (userId: string, email: string) => {
    try {
      // Reset name to null, which will make the system fall back to email or first/last name
      const { error } = await supabase
        .from('user_profiles')
        .update({ name: null })
        .eq('user_id', userId);

      if (error) throw error;

      toast.success(`Reset username for ${email}`);
      setActionMenuOpen(null);
      await fetchData();
    } catch (error) {
      console.error('Error resetting username:', error);
      toast.error('Failed to reset username');
    }
  };

  const handleDeleteAction = async () => {
    if (!deleteConfirmation) return;

    if (deleteConfirmation.type === 'invitation') {
      // Protect tyler@revoa.app from being deleted by anyone except himself
      if (deleteConfirmation.email === PROTECTED_ADMIN_EMAIL && currentUserEmail !== PROTECTED_ADMIN_EMAIL) {
        toast.error('This invitation cannot be deleted');
        setDeleteConfirmation(null);
        return;
      }

      try {
        const { error } = await supabase
          .from('admin_invitations')
          .delete()
          .eq('id', deleteConfirmation.id);

        if (error) throw error;
        toast.success(`Deleted invitation for ${deleteConfirmation.email}`);
        setDeleteConfirmation(null);
        setActionMenuOpen(null);
        await fetchData();
      } catch (error) {
        console.error('Error deleting invitation:', error);
        toast.error('Failed to delete invitation');
      }
    } else if (deleteConfirmation.type === 'admin') {
      await handleRemoveAdmin();
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
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400">
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
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400">
            <XCircle className="w-3 h-3 mr-1" />
            Cancelled
          </span>
        );
      case 'expired':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-50 text-gray-700 dark:bg-dark/20 dark:text-gray-400">
            <XCircle className="w-3 h-3 mr-1" />
            Expired
          </span>
        );
      case 'accepted':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Accepted
          </span>
        );
    }
  };

  const getRoleBadge = (role: AdminType) => {
    return role === 'super_admin' ? (
      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400">
        <ShieldCheck className="w-3 h-3 mr-1" />
        Super Admin
      </span>
    ) : (
      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400">
        <Shield className="w-3 h-3 mr-1" />
        Admin
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-normal text-gray-900 dark:text-gray-100 mb-2">
          Admin Management
        </h1>
        <div className="flex items-start sm:items-center space-x-2">
          <div className="w-1.5 h-1.5 bg-red-500 rounded-full mt-1.5 sm:mt-0 flex-shrink-0"></div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Manage admin team members and invitations
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2 sm:gap-3">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* Search */}
          <div className="relative flex-1 sm:flex-initial sm:min-w-[240px] lg:w-[280px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search admins..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-10 py-2 text-sm bg-white dark:bg-dark border border-gray-200 dark:border-[#3a3a3a] rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-300 focus:border-gray-200"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 dark:hover:bg-[#3a3a3a] rounded-full transition-colors"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            )}
          </div>

          {/* Filter */}
          <div className="relative flex-shrink-0" ref={filterDropdownRef}>
            <FilterButton
              icon={Filter}
              label="Filter"
              selectedLabel={filterOptions.find(o => o.value === filterType)?.label || 'All'}
              onClick={() => setShowFilterDropdown(!showFilterDropdown)}
              isActive={filterType !== 'all'}
              activeCount={filterType !== 'all' ? 1 : 0}
              hideLabel="md"
              isOpen={showFilterDropdown}
            />

            {showFilterDropdown && (
              <div className="absolute z-50 right-0 w-48 mt-2 bg-white dark:bg-dark rounded-lg shadow-lg border border-gray-200 dark:border-[#3a3a3a] overflow-hidden">
                {filterOptions.map(option => (
                  <button
                    key={option.value}
                    onClick={() => {
                      setFilterType(option.value as FilterType);
                      setShowFilterDropdown(false);
                    }}
                    className="flex items-center justify-between w-full px-4 py-2 text-sm text-left text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#3a3a3a]/50 transition-colors"
                  >
                    <span>{option.label}</span>
                    {filterType === option.value && (
                      <Check className="w-4 h-4 text-rose-500 dark:text-rose-400" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Sort */}
          <div className="relative flex-shrink-0" ref={sortDropdownRef}>
            <FilterButton
              icon={ArrowUpDown}
              label="Sort"
              selectedLabel={sortOptions.find(o => o.value === sortBy.field)?.label || 'Sort'}
              onClick={() => setShowSortDropdown(!showSortDropdown)}
              hideLabel="md"
              isOpen={showSortDropdown}
            />

            {showSortDropdown && (
              <div className="absolute z-50 right-0 w-48 mt-2 bg-white dark:bg-dark rounded-lg shadow-lg border border-gray-200 dark:border-[#3a3a3a] overflow-hidden">
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
                    className="flex items-center justify-between w-full px-4 py-2 text-sm text-left text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#3a3a3a]/50 transition-colors"
                  >
                    <span>{option.label}</span>
                    {sortBy.field === option.value && (
                      <Check className="w-4 h-4 text-rose-500 dark:text-rose-400" />
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
          className="btn btn-primary group w-full sm:w-auto sm:ml-auto"
        >
          <UserPlus className="btn-icon" />
          <span>Invite Admin</span>
          <ArrowRight className="btn-icon btn-icon-arrow" />
        </button>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-dark rounded-xl border border-gray-200 dark:border-[#3a3a3a] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 dark:bg-dark/50 border-b border-gray-200 dark:border-[#3a3a3a]">
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap first:rounded-tl-xl">
                  Admin
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">
                  Role
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">
                  Status
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">
                  Date Added
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">
                  Details
                </th>
                <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap last:rounded-tr-xl">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-[#3a3a3a]">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, index) => (
                  <tr key={index}>
                    {Array.from({ length: 6 }).map((_, i) => (
                      <td key={i} className="px-4 py-4">
                        <div className="h-4 bg-gray-200 dark:bg-[#3a3a3a] rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : sortedRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                    No {filterType === 'all' ? 'admins' : filterType.replace('_', ' ')} found
                  </td>
                </tr>
              ) : (
                sortedRows.map((row, index) => (
                  <tr
                    key={row.id}
                    className="hover:bg-gray-50 dark:hover:bg-[#3a3a3a]/50 transition-colors"
                  >
                    <td className={`px-4 py-4 whitespace-nowrap ${index === sortedRows.length - 1 ? 'rounded-bl-xl' : ''}`}>
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {row.name || row.email.split('@')[0]}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {row.email}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap">
                      {getRoleBadge(row.role)}
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap">
                      {getStatusBadge(row)}
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {format(new Date(row.dateAdded), 'MMM dd, yyyy')}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {formatDistanceToNow(new Date(row.dateAdded), { addSuffix: true })}
                      </div>
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap">
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
                            <span>
                              {new Date(row.expiresAt) < new Date() ? 'Expired' : 'Expires'}{' '}
                              {formatDistanceToNow(new Date(row.expiresAt), { addSuffix: true })}
                            </span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className={`px-3 py-4 whitespace-nowrap text-right ${index === sortedRows.length - 1 ? 'rounded-br-xl' : ''}`}>
                      <div className="relative inline-block" ref={actionMenuOpen === row.id ? actionMenuRef : null}>
                        <button
                          onClick={() => setActionMenuOpen(actionMenuOpen === row.id ? null : row.id)}
                          className="p-1 hover:bg-gray-100 dark:hover:bg-[#3a3a3a] rounded transition-colors"
                        >
                          <MoreVertical className="w-4 h-4 text-gray-500" />
                        </button>

                        {actionMenuOpen === row.id && (
                          (row.type === 'invitation' && (row.status === 'pending' || row.status === 'revoked')) || (row.type === 'admin' && row.userId)
                        ) && (
                          <div className={`absolute right-0 w-48 bg-white dark:bg-dark border border-gray-200 dark:border-[#3a3a3a] rounded-lg shadow-lg z-[100] ${
                            index >= sortedRows.length - 2 ? 'bottom-full mb-2' : 'top-full mt-2'
                          }`}>
                            {row.type === 'invitation' && row.status === 'pending' && (
                              <>
                                <button
                                  onClick={() => handleResendInvite(row.id, row.email)}
                                  className="w-full px-4 py-2 text-sm text-left hover:bg-gray-50 dark:hover:bg-[#3a3a3a]/50 flex items-center space-x-2 text-gray-700 dark:text-gray-300"
                                >
                                  <RotateCw className="w-4 h-4" />
                                  <span>Resend Invite</span>
                                </button>
                                {(row.email !== PROTECTED_ADMIN_EMAIL || currentUserEmail === PROTECTED_ADMIN_EMAIL) && (
                                  <button
                                    onClick={() => handleCancelInvite(row.id, row.email)}
                                    className="w-full px-4 py-2 text-sm text-left hover:bg-gray-50 dark:hover:bg-[#3a3a3a]/50 flex items-center space-x-2 text-red-600 dark:text-red-400"
                                  >
                                    <XCircle className="w-4 h-4" />
                                    <span>Cancel Invite</span>
                                  </button>
                                )}
                              </>
                            )}
                            {row.type === 'invitation' && row.status === 'revoked' && (row.email !== PROTECTED_ADMIN_EMAIL || currentUserEmail === PROTECTED_ADMIN_EMAIL) && (
                              <button
                                onClick={() => {
                                  setDeleteConfirmation({ id: row.id, email: row.email, type: 'invitation' });
                                  setActionMenuOpen(null);
                                }}
                                className="w-full px-4 py-2 text-sm text-left hover:bg-gray-50 dark:hover:bg-[#3a3a3a]/50 flex items-center space-x-2 text-red-600 dark:text-red-400"
                              >
                                <Trash2 className="w-4 h-4" />
                                <span>Delete Invitation</span>
                              </button>
                            )}
                            {row.type === 'admin' && row.userId && (
                              <>
                                <button
                                  onClick={() => handleResetProfilePicture(row.userId!, row.email)}
                                  className="w-full px-4 py-2 text-sm text-left hover:bg-gray-50 dark:hover:bg-[#3a3a3a]/50 flex items-center space-x-2 text-gray-700 dark:text-gray-300"
                                >
                                  <Image className="w-4 h-4" />
                                  <span>Reset Profile Picture</span>
                                </button>
                                <button
                                  onClick={() => handleResetUsername(row.userId!, row.email)}
                                  className="w-full px-4 py-2 text-sm text-left hover:bg-gray-50 dark:hover:bg-[#3a3a3a]/50 flex items-center space-x-2 text-gray-700 dark:text-gray-300"
                                >
                                  <User className="w-4 h-4" />
                                  <span>Reset Username</span>
                                </button>
                                {(row.email !== PROTECTED_ADMIN_EMAIL || currentUserEmail === PROTECTED_ADMIN_EMAIL) && (
                                  <>
                                    <div className="border-t border-gray-200 dark:border-[#3a3a3a] my-1"></div>
                                    <button
                                      onClick={() => {
                                        setDeleteConfirmation({ id: row.id, email: row.email, type: 'admin', userId: row.userId });
                                        setActionMenuOpen(null);
                                      }}
                                      className="w-full px-4 py-2 text-sm text-left hover:bg-gray-50 dark:hover:bg-[#3a3a3a]/50 flex items-center space-x-2 text-red-600 dark:text-red-400"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                      <span>Remove Admin</span>
                                    </button>
                                  </>
                                )}
                              </>
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

      {/* Invite Modal */}
      <InviteAdminModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        onSuccess={handleInviteSuccess}
      />

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteConfirmation}
        onClose={() => setDeleteConfirmation(null)}
        title={deleteConfirmation?.type === 'admin' ? 'Remove Admin' : 'Delete Invitation'}
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {deleteConfirmation?.type === 'admin'
              ? <>Are you sure you want to remove <span className="font-medium text-gray-900 dark:text-gray-100">{deleteConfirmation?.email}</span> as an admin?</>
              : <>Are you sure you want to permanently delete the invitation for <span className="font-medium text-gray-900 dark:text-gray-100">{deleteConfirmation?.email}</span>?</>
            }
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            This action cannot be undone.
          </p>
          <div className="flex justify-end gap-3 pt-4">
            <button
              onClick={() => setDeleteConfirmation(null)}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button
              onClick={handleDeleteAction}
              className="btn btn-danger group"
            >
              <span>{deleteConfirmation?.type === 'admin' ? 'Remove' : 'Delete'}</span>
              <ArrowRight className="btn-icon btn-icon-arrow" />
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
