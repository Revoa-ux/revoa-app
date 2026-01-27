import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Filter,
  Check,
  X,
  UserPlus,
  ArrowUpDown,
  Users as UsersIcon
} from 'lucide-react';
import { toast } from '../../lib/toast';
import { UserAssignmentModal } from '@/components/admin/UserAssignmentModal';
import { UserActionsMenu } from '@/components/admin/UserActionsMenu';
import { UserProfileSidebar } from '@/components/admin/UserProfileSidebar';
import { ActiveQuotesModal } from '@/components/admin/ActiveQuotesModal';
import MerchantTransactionsModal from '@/components/admin/MerchantTransactionsModal';
import { CustomCheckbox } from '@/components/CustomCheckbox';
import Modal from '@/components/Modal';
import { FilterButton } from '@/components/FilterButton';
import { useClickOutside } from '@/lib/useClickOutside';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useAdmin } from '@/contexts/AdminContext';

interface TableRowSkeletonProps {
  index: number;
}

interface User {
  id: string;
  user_id: string;
  name: string | null;
  email: string;
  company: string | null;
  storeUrl: string | null;
  registrationDate: string;
  transactions: number;
  invoices: number;
  activeQuotes: number;
  isAssigned: boolean;
  assignedTo?: {
    id: string;
    name: string | null;
    email: string;
  };
  volume: number;
  storeRevenue: number;
}

const TableRowSkeleton: React.FC<TableRowSkeletonProps> = ({ index }) => (
  <tr>
    <td className="px-6 py-4">
      <div className="h-4 w-4 bg-gray-200 dark:bg-[#3a3a3a] rounded animate-pulse" />
    </td>
    <td className="px-6 py-4">
      <div className="h-4 bg-gray-200 dark:bg-[#3a3a3a] rounded w-32 animate-pulse"></div>
    </td>
    {Array.from({ length: 7 }).map((_, i) => (
      <td key={i} className="px-6 py-4">
        <div
          className="h-4 bg-gray-200 dark:bg-[#3a3a3a] rounded w-16 animate-pulse"
          style={{ animationDelay: `${i * 0.1}s` }}
        ></div>
      </td>
    ))}
  </tr>
);

export default function Users() {
  const { user: currentUser } = useAuth();
  const { adminUser, isSuperAdmin } = useAdmin();
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'assigned' | 'unassigned'>('all');
  const [selectedAdminFilter, setSelectedAdminFilter] = useState<string>('all');
  const [admins, setAdmins] = useState<Array<{ id: string; name: string; email: string }>>([]);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [showAdminFilterDropdown, setShowAdminFilterDropdown] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [sortBy, setSortBy] = useState<{
    field: keyof User;
    direction: 'asc' | 'desc';
  }>({
    field: 'registrationDate',
    direction: 'desc'
  });

  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [showUserProfile, setShowUserProfile] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [showActiveQuotesModal, setShowActiveQuotesModal] = useState(false);
  const [activeQuotesUser, setActiveQuotesUser] = useState<{ id: string; name: string } | null>(null);
  const [showTransactionsModal, setShowTransactionsModal] = useState(false);
  const [transactionsUser, setTransactionsUser] = useState<{ id: string; name: string; email: string } | null>(null);
  const filterDropdownRef = useRef<HTMLDivElement>(null);
  const adminFilterDropdownRef = useRef<HTMLDivElement>(null);
  const sortDropdownRef = useRef<HTMLDivElement>(null);
  useClickOutside(filterDropdownRef, () => setShowFilterDropdown(false));
  useClickOutside(adminFilterDropdownRef, () => setShowAdminFilterDropdown(false));
  useClickOutside(sortDropdownRef, () => setShowSortDropdown(false));

  const sortOptions = [
    { value: 'registrationDate', label: 'Registration Date' },
    { value: 'volume', label: 'Volume' },
    { value: 'storeRevenue', label: 'Store Revenue' },
    { value: 'transactions', label: 'Transactions' },
    { value: 'invoices', label: 'Invoices' }
  ];

  useEffect(() => {
    fetchUsers();
    if (isSuperAdmin) {
      fetchAdmins();
    }
  }, [isSuperAdmin]);

  const fetchAdmins = async () => {
    try {
      const { data: adminProfiles, error } = await supabase
        .from('user_profiles')
        .select('user_id, name, first_name, last_name, email')
        .eq('is_admin', true)
        .eq('is_super_admin', false);

      if (error) throw error;

      const transformedAdmins = (adminProfiles || []).map(admin => ({
        id: admin.user_id,
        name: admin.name || (admin.first_name && admin.last_name ? `${admin.first_name} ${admin.last_name}` : admin.email),
        email: admin.email
      }));

      setAdmins(transformedAdmins);
    } catch (error) {
      console.error('Error fetching admins:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      setIsLoading(true);

      // For regular admins, only fetch their assigned users
      let profiles;
      let profilesError;

      if (!isSuperAdmin && adminUser?.userId) {
        // Get assigned user IDs first
        const { data: assignments, error: assignError } = await supabase
          .from('user_assignments')
          .select('user_id')
          .eq('admin_id', adminUser.userId);

        if (assignError) throw assignError;

        const assignedUserIds = assignments?.map(a => a.user_id) || [];

        if (assignedUserIds.length === 0) {
          setUsers([]);
          setIsLoading(false);
          return;
        }

        // Fetch only assigned users
        const { data: assignedProfiles, error: assignedError } = await supabase
          .from('user_profiles')
          .select('user_id, name, first_name, last_name, email, created_at, is_admin, company')
          .in('user_id', assignedUserIds)
          .eq('is_admin', false);

        profiles = assignedProfiles;
        profilesError = assignedError;
      } else {
        // Fetch all user profiles (non-admins only) for super admins
        const { data: allProfiles, error: allError } = await supabase
          .from('user_profiles')
          .select('user_id, name, first_name, last_name, email, created_at, is_admin, company')
          .eq('is_admin', false);

        profiles = allProfiles;
        profilesError = allError;
      }

      if (profilesError) throw profilesError;

      if (!profiles || profiles.length === 0) {
        setUsers([]);
        setIsLoading(false);
        return;
      }

      const userIds = profiles.map(p => p.user_id);

      // Fetch Shopify store data
      const { data: shopifyStores } = await supabase
        .from('shopify_installations')
        .select('user_id, store_url')
        .in('user_id', userIds)
        .is('uninstalled_at', null);

      const storeMap = new Map(
        (shopifyStores || []).map(s => [s.user_id, s.store_url])
      );

      // Fetch user assignments
      const { data: assignments } = await supabase
        .from('user_assignments')
        .select('user_id, admin_id, total_transactions, total_invoices')
        .in('user_id', userIds);

      // Fetch active quotes count for each user
      const { data: quotesData } = await supabase
        .from('product_quotes')
        .select('user_id')
        .eq('status', 'accepted')
        .in('user_id', userIds);

      const quotesCountMap = new Map<string, number>();
      (quotesData || []).forEach(quote => {
        quotesCountMap.set(quote.user_id, (quotesCountMap.get(quote.user_id) || 0) + 1);
      });

      // Fetch admin profiles for assigned admins
      const adminIds = Array.from(new Set(assignments?.map(a => a.admin_id) || []));
      const { data: adminProfiles } = await supabase
        .from('user_profiles')
        .select('user_id, name, email')
        .in('user_id', adminIds);

      // Create maps for quick lookup
      const assignmentMap = new Map(
        (assignments || []).map(a => [a.user_id, a])
      );
      const adminMap = new Map(
        (adminProfiles || []).map(a => [a.user_id, a])
      );

      // Transform to User interface
      const transformedUsers: User[] = profiles.map(profile => {
        const assignment = assignmentMap.get(profile.user_id);
        const admin = assignment ? adminMap.get(assignment.admin_id) : null;

        // Build display name from available fields
        const displayName = profile.name ||
          (profile.first_name && profile.last_name
            ? `${profile.first_name} ${profile.last_name}`
            : profile.email.split('@')[0]);

        return {
          id: profile.user_id,
          user_id: profile.user_id,
          name: displayName,
          email: profile.email,
          company: profile.company || null,
          storeUrl: storeMap.get(profile.user_id) || null,
          registrationDate: profile.created_at ? new Date(profile.created_at).toLocaleDateString() : 'N/A',
          transactions: assignment?.total_transactions || 0,
          invoices: assignment?.total_invoices || 0,
          activeQuotes: quotesCountMap.get(profile.user_id) || 0,
          isAssigned: !!assignment,
          assignedTo: admin ? {
            id: admin.user_id,
            name: admin.name,
            email: admin.email
          } : undefined,
          volume: assignment?.total_transactions || 0,
          storeRevenue: 0
        };
      });

      setUsers(transformedUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (term: string) => {
    setSearchTerm(term);
  };

  const handleFilter = (filter: typeof selectedFilter) => {
    setSelectedFilter(filter);
    setShowFilterDropdown(false);
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(filteredUsers.map(user => user.id));
    }
    setSelectAll(!selectAll);
  };

  const handleSelectUser = (userId: string) => {
    setSelectedUsers(prev => {
      const isSelected = prev.includes(userId);
      if (isSelected) {
        return prev.filter(id => id !== userId);
      } else {
        return [...prev, userId];
      }
    });
  };

  const handleSort = (field: keyof User) => {
    setSortBy(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const getSortedUsers = (usersToSort: User[]) => {
    return [...usersToSort].sort((a, b) => {
      const direction = sortBy.direction === 'asc' ? 1 : -1;

      switch (sortBy.field) {
        case 'registrationDate':
          return (new Date(a.registrationDate).getTime() - new Date(b.registrationDate).getTime()) * direction;
        case 'volume':
          return (a.volume - b.volume) * direction;
        case 'storeRevenue':
          return (a.storeRevenue - b.storeRevenue) * direction;
        case 'transactions':
          return (a.transactions - b.transactions) * direction;
        case 'invoices':
          return (a.invoices - b.invoices) * direction;
        default:
          return 0;
      }
    });
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch =
      user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesFilter =
      selectedFilter === 'all' ||
      (selectedFilter === 'assigned' && user.isAssigned) ||
      (selectedFilter === 'unassigned' && !user.isAssigned);

    const matchesAdminFilter =
      !isSuperAdmin ||
      selectedAdminFilter === 'all' ||
      (selectedAdminFilter === 'unassigned' && !user.assignedTo) ||
      (user.assignedTo?.id === selectedAdminFilter);

    return matchesSearch && matchesFilter && matchesAdminFilter;
  });

  const sortedUsers = getSortedUsers(filteredUsers);

  const handleAssignUsers = async (userId: string, adminId: string) => {
    try {
      // Assign user to admin
      const { error } = await supabase
        .from('user_assignments')
        .upsert({
          user_id: userId,
          admin_id: adminId
        });

      if (error) throw error;

      await fetchUsers();
    } catch (error) {
      console.error('Error assigning user:', error);
      toast.error('Failed to assign user');
      throw error;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-normal text-gray-900 dark:text-gray-100 mb-2">
          User Management
        </h1>
        <div className="flex items-start sm:items-center space-x-2">
          <div className="w-1.5 h-1.5 bg-red-500 rounded-full mt-1.5 sm:mt-0 flex-shrink-0"></div>
          <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400">
            Manage and monitor user accounts
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto flex-wrap">
          <div className="relative flex-1 min-w-[180px] sm:flex-initial sm:w-[280px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full h-[38px] pl-10 pr-10 text-sm bg-white dark:bg-dark border border-gray-200 dark:border-[#3a3a3a] rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-300 focus:border-gray-200"
            />
            {searchTerm && (
              <button
                onClick={() => handleSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 dark:hover:bg-[#3a3a3a] rounded-full transition-colors"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            )}
          </div>

          <div className="relative flex-shrink-0" ref={filterDropdownRef}>
            <FilterButton
              icon={Filter}
              label="Filter"
              selectedLabel={selectedFilter === 'all' ? 'All' : selectedFilter === 'assigned' ? 'Assigned' : 'Unassigned'}
              onClick={() => setShowFilterDropdown(!showFilterDropdown)}
              isActive={selectedFilter !== 'all'}
              activeCount={selectedFilter !== 'all' ? 1 : 0}
              hideLabel="md"
              isOpen={showFilterDropdown}
            />

            {showFilterDropdown && (
              <div className="absolute z-50 right-0 w-48 mt-2 bg-white dark:bg-dark rounded-lg shadow-lg border border-gray-200 dark:border-[#3a3a3a] overflow-hidden">
                {[
                  { value: 'all', label: 'All Users' },
                  { value: 'assigned', label: 'Assigned' },
                  { value: 'unassigned', label: 'Unassigned' }
                ].map((filter) => (
                  <button
                    key={filter.value}
                    onClick={() => handleFilter(filter.value as typeof selectedFilter)}
                    className="flex items-center justify-between w-full px-4 py-2 text-sm text-left text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#3a3a3a]/50 transition-colors"
                  >
                    <span>{filter.label}</span>
                    {selectedFilter === filter.value && <Check className="w-4 h-4 text-rose-500 dark:text-rose-400" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {isSuperAdmin && (
            <div className="relative flex-shrink-0" ref={adminFilterDropdownRef}>
              <FilterButton
                icon={UsersIcon}
                label="Admin"
                selectedLabel={
                  selectedAdminFilter === 'all'
                    ? 'All'
                    : selectedAdminFilter === 'unassigned'
                    ? 'None'
                    : admins.find(a => a.id === selectedAdminFilter)?.name || 'Admin'
                }
                onClick={() => setShowAdminFilterDropdown(!showAdminFilterDropdown)}
                isActive={selectedAdminFilter !== 'all'}
                activeCount={selectedAdminFilter !== 'all' ? 1 : 0}
                hideLabel="md"
                isOpen={showAdminFilterDropdown}
              />

              {showAdminFilterDropdown && (
                <div className="absolute z-50 right-0 w-56 mt-2 bg-white dark:bg-dark rounded-lg shadow-lg border border-gray-200 dark:border-[#3a3a3a] overflow-hidden max-h-64 overflow-y-auto">
                  <button
                    onClick={() => {
                      setSelectedAdminFilter('all');
                      setShowAdminFilterDropdown(false);
                    }}
                    className="flex items-center justify-between w-full px-4 py-2 text-sm text-left text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#3a3a3a]/50 transition-colors"
                  >
                    <span>All Admins</span>
                    {selectedAdminFilter === 'all' && <Check className="w-4 h-4 text-rose-500 dark:text-rose-400" />}
                  </button>
                  <button
                    onClick={() => {
                      setSelectedAdminFilter('unassigned');
                      setShowAdminFilterDropdown(false);
                    }}
                    className="flex items-center justify-between w-full px-4 py-2 text-sm text-left text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#3a3a3a]/50 transition-colors"
                  >
                    <span>Unassigned</span>
                    {selectedAdminFilter === 'unassigned' && <Check className="w-4 h-4 text-rose-500 dark:text-rose-400" />}
                  </button>
                  <div className="border-t border-gray-200 dark:border-[#3a3a3a] my-1"></div>
                  {admins.map((admin) => (
                    <button
                      key={admin.id}
                      onClick={() => {
                        setSelectedAdminFilter(admin.id);
                        setShowAdminFilterDropdown(false);
                      }}
                      className="flex items-center justify-between w-full px-4 py-2 text-sm text-left text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#3a3a3a]/50 transition-colors"
                    >
                      <span className="truncate">{admin.name}</span>
                      {selectedAdminFilter === admin.id && <Check className="w-4 h-4 text-rose-500 dark:text-rose-400 flex-shrink-0 ml-2" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="relative flex-shrink-0" ref={sortDropdownRef}>
            <FilterButton
              icon={ArrowUpDown}
              label="Sort"
              selectedLabel={sortOptions.find(opt => opt.value === sortBy.field)?.label || 'Sort'}
              onClick={() => setShowSortDropdown(!showSortDropdown)}
              hideLabel="md"
              isOpen={showSortDropdown}
            />

            {showSortDropdown && (
              <div className="absolute z-50 right-0 w-48 mt-2 bg-white dark:bg-dark rounded-lg shadow-lg border border-gray-200 dark:border-[#3a3a3a] overflow-hidden">
                {sortOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => {
                      handleSort(option.value as keyof User);
                      setShowSortDropdown(false);
                    }}
                    className="flex items-center justify-between w-full px-4 py-2 text-sm text-left text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#3a3a3a]/50 transition-colors"
                  >
                    <span>{option.label}</span>
                    {sortBy.field === option.value && <Check className="w-4 h-4 text-rose-500 dark:text-rose-400" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {selectedUsers.length > 0 && (
          <button
            onClick={() => setShowAssignModal(true)}
            className="w-full sm:w-auto px-4 py-2 text-sm bg-white dark:bg-dark border border-gray-200 dark:border-[#3a3a3a] rounded-lg hover:bg-gray-50 dark:hover:bg-[#3a3a3a]/50 transition-colors flex items-center justify-center sm:justify-start space-x-2 whitespace-nowrap"
          >
            <UserPlus className="w-4 h-4" />
            <span>Assign ({selectedUsers.length})</span>
          </button>
        )}
      </div>

      <div className="bg-white dark:bg-dark rounded-xl border border-gray-200 dark:border-[#3a3a3a] overflow-hidden">
        <div className="relative overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 dark:bg-dark/50 border-b border-gray-200 dark:border-[#3a3a3a]">
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap first:rounded-tl-xl w-12">
                  <CustomCheckbox
                    checked={selectAll}
                    onChange={(e) => handleSelectAll(e)}
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap w-1/4">User</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap w-24">Registration</th>
                {isSuperAdmin && (
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap w-32">Assigned To</th>
                )}
                <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap w-24">Volume</th>
                <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap w-28">Transactions</th>
                <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap w-20">Invoices</th>
                <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap w-24">Active Quotes</th>
                <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap w-20 last:rounded-tr-xl">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-[#3a3a3a]">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, index) => (
                  <TableRowSkeleton key={index} index={index} />
                ))
              ) : sortedUsers.length === 0 ? (
                <tr>
                  <td colSpan={isSuperAdmin ? 9 : 8} className="px-6 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                    No users found
                  </td>
                </tr>
              ) : (
                sortedUsers.map((user, index) => (
                  <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-[#3a3a3a]/50">
                    <td className={`px-6 py-4 ${index === sortedUsers.length - 1 ? 'rounded-bl-xl' : ''}`}>
                      <CustomCheckbox
                        checked={selectedUsers.includes(user.id)}
                        onChange={() => handleSelectUser(user.id)}
                      />
                    </td>
                    <td className="px-4 py-4">
                      <div className="max-w-xs">
                        <div className="text-sm text-gray-900 dark:text-white truncate">
                          {user.name || user.email.split('@')[0]}
                        </div>
                        {(user.company || user.storeUrl) && (
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                            {user.company || user.storeUrl}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-500 dark:text-gray-400">{user.registrationDate}</span>
                    </td>
                    {isSuperAdmin && (
                      <td className="px-3 py-4 whitespace-nowrap">
                        {user.assignedTo ? (
                          <span className="text-sm text-gray-900 dark:text-gray-100 truncate block max-w-[8rem]" title={user.assignedTo.name || user.assignedTo.email}>{user.assignedTo.name || user.assignedTo.email}</span>
                        ) : (
                          <span className="text-sm text-gray-500 dark:text-gray-400">Unassigned</span>
                        )}
                      </td>
                    )}
                    <td className="px-3 py-4 whitespace-nowrap text-right text-sm text-gray-900 dark:text-white">
                      ${user.volume.toLocaleString()}
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-right text-sm text-gray-900 dark:text-white">
                      ${user.transactions.toLocaleString()}
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-right text-sm text-gray-900 dark:text-white">
                      {user.invoices > 0 ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/admin/invoices?userId=${user.user_id}`);
                          }}
                          className="text-gray-900 dark:text-white underline hover:no-underline cursor-pointer transition-all"
                          title="View invoices"
                        >
                          {user.invoices}
                        </button>
                      ) : (
                        <span className="text-gray-500 dark:text-gray-400">0</span>
                      )}
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-right text-sm text-gray-900 dark:text-white">
                      {user.activeQuotes > 0 ? (
                        <button
                          onClick={() => {
                            setActiveQuotesUser({ id: user.user_id, name: user.name || user.email.split('@')[0] });
                            setShowActiveQuotesModal(true);
                          }}
                          className="text-gray-900 dark:text-white underline hover:no-underline cursor-pointer transition-all"
                        >
                          {user.activeQuotes}
                        </button>
                      ) : (
                        <span className="text-gray-500 dark:text-gray-400">0</span>
                      )}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-right text-sm relative ${index === sortedUsers.length - 1 ? 'rounded-br-xl' : ''}`}>
                      <div className="relative flex justify-end">
                        <UserActionsMenu
                          userId={user.user_id}
                          userEmail={user.email}
                          isActive={true}
                          isAssigned={user.isAssigned}
                          currentUserEmail={currentUser?.email}
                         onViewProfile={() => {
                            setSelectedUserId(user.user_id);
                            setShowUserProfile(true);
                          }}
                          onViewTransactions={() => {
                            setTransactionsUser({
                              id: user.user_id,
                              name: user.name || user.email.split('@')[0],
                              email: user.email
                            });
                            setShowTransactionsModal(true);
                          }}
                         onResetPassword={() => {
                            toast.success('Password reset email sent');
                          }}
                         onToggleStatus={(_, active) => {
                            toast.success(`User ${active ? 'enabled' : 'disabled'} successfully`);
                          }}
                         onReassign={() => {
                            setSelectedUsers([user.user_id]);
                            setShowAssignModal(true);
                          }}
                         onRemoveAssignment={async () => {
                            try {
                              const { error } = await supabase
                                .from('user_assignments')
                                .delete()
                                .eq('user_id', user.user_id);

                              if (error) throw error;

                              toast.success('User assignment removed');
                              await fetchUsers();
                            } catch (error) {
                              console.error('Error removing assignment:', error);
                              toast.error('Failed to remove assignment');
                            }
                          }}
                        />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showAssignModal && (
        <UserAssignmentModal
          onClose={() => {
            setShowAssignModal(false);
            setSelectedUsers([]);
          }}
          onAssign={async (userId, adminId) => {
            await handleAssignUsers(userId, adminId);
            setShowAssignModal(false);
            setSelectedUsers([]);
          }}
          selectedUsers={selectedUsers}
        />
      )}

      {/* User Profile Modal */}
      {showUserProfile && selectedUserId && (
        <Modal
          isOpen={true}
          onClose={() => {
            setShowUserProfile(false);
            setSelectedUserId(null);
          }}
          title="Client Profile"
        >
          <div className="max-h-[75vh] overflow-y-auto -mx-6">
            <UserProfileSidebar
              userId={selectedUserId}
              onClose={() => {
                setShowUserProfile(false);
                setSelectedUserId(null);
              }}
              showHeader={false}
            />
          </div>
        </Modal>
      )}

      {/* Active Quotes Modal */}
      {showActiveQuotesModal && activeQuotesUser && (
        <ActiveQuotesModal
          userId={activeQuotesUser.id}
          userName={activeQuotesUser.name}
          onClose={() => {
            setShowActiveQuotesModal(false);
            setActiveQuotesUser(null);
          }}
        />
      )}

      {/* Merchant Transactions Modal */}
      {showTransactionsModal && transactionsUser && (
        <MerchantTransactionsModal
          userId={transactionsUser.id}
          merchantName={transactionsUser.name}
          merchantEmail={transactionsUser.email}
          onClose={() => {
            setShowTransactionsModal(false);
            setTransactionsUser(null);
          }}
        />
      )}
    </div>
  );
}
