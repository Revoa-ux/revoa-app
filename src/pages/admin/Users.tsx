{/* Full updated Users.tsx content */}
import React, { useState, useRef } from 'react';
import { 
  Search, 
  Filter, 
  ChevronDown, 
  Check,
  X,
  UserPlus
} from 'lucide-react';
import { toast } from 'sonner';
import { UserAssignmentModal } from '@/components/admin/UserAssignmentModal';
import { UserActionsMenu } from '@/components/admin/UserActionsMenu';
import { useClickOutside } from '@/lib/useClickOutside';

interface TableRowSkeletonProps {
  index: number;
}

interface User {
  id: string;
  name: string;
  email: string;
  registrationDate: string;
  transactions: number;
  invoices: number;
  isAssigned: boolean;
  assignedTo?: {
    id: string;
    name: string;
    email: string;
  };
  volume: number;
  storeRevenue: number;
}

const TableRowSkeleton: React.FC<TableRowSkeletonProps> = ({ index }) => (
  <tr className={`border-b border-gray-200 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
    <td className="px-4 py-4">
      <div className="h-4 w-4 bg-gray-200 rounded animate-pulse" />
    </td>
    <td className="px-4 py-4">
      <div className="flex items-center space-x-3 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-32"></div>
        <div className="h-3 bg-gray-200 rounded w-20"></div>
      </div>
    </td>
    {Array.from({ length: 4 }).map((_, i) => (
      <td key={i} className="px-4 py-4">
        <div 
          className="h-4 bg-gray-200 rounded w-16 animate-pulse" 
          style={{ animationDelay: `${i * 0.1}s` }}
        ></div>
      </td>
    ))}
  </tr>
);

const mockUsers: User[] = Array.from({ length: 5 }).map((_, index) => ({
  id: `user-${index}`,
  name: `John Doe ${index + 1}`,
  email: `john${index + 1}@example.com`,
  registrationDate: '2024-03-15',
  transactions: 15678.90,
  invoices: 12,
  isAssigned: index % 2 === 0,
  assignedTo: index % 2 === 0 ? {
    id: 'admin-1',
    name: 'Sarah Wilson',
    email: 'sarah@revoa.app'
  } : undefined,
  volume: 45678.90,
  storeRevenue: 89123.45
}));

export default function Users() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'assigned' | 'unassigned'>('all');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false); // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
  const sortDropdownRef = useRef<HTMLDivElement>(null);
  useClickOutside(filterDropdownRef, () => setShowFilterDropdown(false));
  useClickOutside(sortDropdownRef, () => setShowSortDropdown(false));

  const sortOptions = [
    { value: 'registrationDate', label: 'Registration Date' },
    { value: 'volume', label: 'Volume' },
    { value: 'storeRevenue', label: 'Store Revenue' },
    { value: 'transactions', label: 'Transactions' },
    { value: 'invoices', label: 'Invoices' }
  ];

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
      setSelectedUsers(mockUsers.map(user => user.id));
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

  const getSortedUsers = (users: typeof mockUsers) => {
    return [...users].sort((a, b) => {
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

  const filteredUsers = mockUsers.filter(user => {
    const matchesSearch = 
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = 
      selectedFilter === 'all' ||
      (selectedFilter === 'assigned' && user.isAssigned) ||
      (selectedFilter === 'unassigned' && !user.isAssigned);
    
    return matchesSearch && matchesFilter;
  });

  const sortedUsers = getSortedUsers(filteredUsers);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-normal text-gray-900 mb-2">
          User Management
        </h1>
        <div className="flex items-center space-x-2">
          <div className="w-1.5 h-1.5 bg-primary-500 rounded-full"></div>
          <p className="text-sm text-gray-500">
            Manage and monitor user accounts
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="relative w-[280px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full pl-10 pr-10 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-300 focus:border-gray-200"
            />
            {searchTerm && (
              <button
                onClick={() => handleSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded-full"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            )}
          </div>

          <div className="relative" ref={filterDropdownRef}>
            <button
              onClick={() => setShowFilterDropdown(!showFilterDropdown)}
              className="px-4 py-2 text-sm bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors flex items-center space-x-2"
            >
              <Filter className="w-4 h-4 text-gray-400" />
              <span>Filter: {selectedFilter === 'all' ? 'All Users' : selectedFilter === 'assigned' ? 'Assigned' : 'Unassigned'}</span>
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </button>
            
            {showFilterDropdown && (
              <div className="absolute z-50 w-48 mt-2 bg-white rounded-lg shadow-lg border border-gray-200 py-1">
                {[
                  { value: 'all', label: 'All Users' },
                  { value: 'assigned', label: 'Assigned' },
                  { value: 'unassigned', label: 'Unassigned' }
                ].map((filter) => (
                  <button
                    key={filter.value}
                    onClick={() => handleFilter(filter.value as typeof selectedFilter)}
                    className="flex items-center justify-between w-full px-4 py-2 text-sm text-left text-gray-700 hover:bg-gray-50"
                  >
                    <span>{filter.label}</span>
                    {selectedFilter === filter.value && <Check className="w-4 h-4 text-gray-900" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="relative" ref={sortDropdownRef}>
            <button
              onClick={() => setShowSortDropdown(!showSortDropdown)}
              className="px-4 py-2 text-sm bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors flex items-center space-x-2"
            >
              <span>Sort by: {sortOptions.find(opt => opt.value === sortBy.field)?.label}</span>
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </button>
            
            {showSortDropdown && (
              <div className="absolute z-50 w-48 mt-2 bg-white rounded-lg shadow-lg border border-gray-200 py-1">
                {sortOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => {
                      handleSort(option.value as keyof User);
                      setShowSortDropdown(false);
                    }}
                    className="flex items-center justify-between w-full px-4 py-2 text-sm text-left text-gray-700 hover:bg-gray-50"
                  >
                    <span>{option.label}</span>
                    {sortBy.field === option.value && <Check className="w-4 h-4 text-gray-900" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {selectedUsers.length > 0 && (
            <button
              onClick={() => setShowAssignModal(true)}
              className="px-4 py-2 text-sm text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors flex items-center"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Assign Selected ({selectedUsers.length})
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="relative overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-4 text-left first:rounded-tl-xl">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={selectAll}
                      onChange={handleSelectAll}
                      className="rounded border-gray-300 text-gray-900 focus:ring-gray-900"
                    />
                  </div>
                </th>
                <th className="px-4 py-4 text-left text-sm font-medium text-gray-500">User</th>
                <th className="px-4 py-4 text-left text-sm font-medium text-gray-500">Registration</th>
                <th className="px-4 py-4 text-right text-sm font-medium text-gray-500">Volume</th>
                <th className="px-4 py-4 text-right text-sm font-medium text-gray-500">Store Revenue</th>
                <th className="px-4 py-4 text-left text-sm font-medium text-gray-500">Assigned To</th>
                <th className="px-4 py-4 text-right text-sm font-medium text-gray-500">Transactions</th>
                <th className="px-4 py-4 text-right text-sm font-medium text-gray-500">Invoices</th>
                <th className="px-4 py-4 text-right text-sm font-medium text-gray-500 last:rounded-tr-xl">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, index) => (
                  <TableRowSkeleton key={index} index={index} />
                ))
              ) : (
                sortedUsers.map((user, index) => (
                  <tr key={user.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}>
                    <td className="px-4 py-4">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={selectedUsers.includes(user.id)}
                          onChange={() => handleSelectUser(user.id)}
                          className="rounded border-gray-300 text-gray-900 focus:ring-gray-900"
                        />
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{user.name}</div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-500">{user.registrationDate}</td>
                    <td className="px-4 py-4 text-right text-sm font-medium text-gray-900">
                      ${user.volume.toLocaleString()}
                    </td>
                    <td className="px-4 py-4 text-right text-sm font-medium text-gray-900">
                      ${user.storeRevenue.toLocaleString()}
                    </td>
                    <td className="px-4 py-4">
                      {user.assignedTo ? (
                        <span className="text-sm text-gray-900">{user.assignedTo.name}</span>
                      ) : (
                        <span className="text-sm text-gray-500">Unassigned</span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-right text-sm font-medium text-gray-900">
                      ${user.transactions.toLocaleString()}
                    </td>
                    <td className="px-4 py-4 text-right text-sm font-medium text-gray-900">
                      {user.invoices}
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="relative flex justify-end">
                        <UserActionsMenu
                          userId={user.id}
                          userEmail={user.email}
                          isActive={true}
                          onViewProfile={(userId) => {
                            toast.info('View profile functionality coming soon');
                          }}
                          onResetPassword={(userId) => {
                            toast.success('Password reset email sent');
                          }}
                          onToggleStatus={(userId, active) => {
                            toast.success(`User ${active ? 'enabled' : 'disabled'} successfully`);
                          }}
                          onRemoveAssignment={(userId) => {
                            toast.success('User assignment removed');
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
          onClose={() => setShowAssignModal(false)}
          onAssign={async () => {
            await new Promise(resolve => setTimeout(resolve, 1000));
            toast.success('User assigned successfully');
          }}
          selectedUsers={selectedUsers}
        />
      )}
    </div>
  );
}