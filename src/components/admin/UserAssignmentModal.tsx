import React, { useState, useEffect } from 'react';
import { X, Search, Check, UserPlus, Loader2, Users, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { useAdmin } from '@/contexts/AdminContext';
import { UserProfile } from '@/types/admin';

interface UserAssignmentModalProps {
  onClose: () => void;
  onAssign: (userId: string, adminId: string) => Promise<void>;
  selectedUsers?: string[];
}

export const UserAssignmentModal: React.FC<UserAssignmentModalProps> = ({
  onClose,
  onAssign,
  selectedUsers = []
}) => {
  const { adminUser } = useAdmin();
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<string | null>(null);
  const [admins, setAdmins] = useState([
    {
      id: '1',
      name: 'Sarah Wilson',
      role: 'admin',
      assignedUsers: 156,
      email: 'sarah@revoa.app'
    },
    {
      id: '2',
      name: 'Michael Chen',
      role: 'admin',
      assignedUsers: 98,
      email: 'michael@revoa.app'
    },
    {
      id: '3',
      name: 'Emily Rodriguez',
      role: 'admin',
      assignedUsers: 88,
      email: 'emily@revoa.app'
    }
  ]);

  const handleAssign = async (adminId: string) => {
    if (!selectedUsers.length) {
      toast.error('Please select users to assign');
      return;
    }

    try {
      setIsLoading(true);
      for (const userId of selectedUsers) {
        await onAssign(userId, adminId);
      }
      toast.success(`Successfully assigned ${selectedUsers.length} user${selectedUsers.length === 1 ? '' : 's'}`);
      onClose();
    } catch (error) {
      console.error('Error assigning users:', error);
      toast.error('Failed to assign users');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDistributeEvenly = async () => {
    try {
      setIsLoading(true);
      
      // Filter out super admins
      const regularAdmins = admins.filter(admin => admin.role === 'admin');
      
      if (regularAdmins.length === 0) {
        toast.error('No regular admins available for distribution');
        return;
      }

      // Calculate users per admin
      const usersPerAdmin = Math.floor(selectedUsers.length / regularAdmins.length);
      const remainingUsers = selectedUsers.length % regularAdmins.length;

      let assignedCount = 0;

      // Distribute users evenly
      for (let i = 0; i < regularAdmins.length; i++) {
        const admin = regularAdmins[i];
        const userCount = i < remainingUsers ? usersPerAdmin + 1 : usersPerAdmin;
        
        // Get the slice of users for this admin
        const usersToAssign = selectedUsers.slice(assignedCount, assignedCount + userCount);
        
        // Assign users to this admin
        for (const userId of usersToAssign) {
          await onAssign(userId, admin.id);
        }
        
        assignedCount += userCount;
      }

      toast.success('Users distributed evenly among admins');
      onClose();
    } catch (error) {
      console.error('Error distributing users:', error);
      toast.error('Failed to distribute users');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
      
      <div className="fixed inset-0 overflow-y-auto">
        <div className="min-h-full flex items-center justify-center p-4">
          <div className="relative bg-white rounded-xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Assign Users</h3>
                <button 
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Selected Users
                  </label>
                  <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="text-sm text-gray-600">
                      {selectedUsers.length} user{selectedUsers.length === 1 ? '' : 's'} selected
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Assign To
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      placeholder="Search admins..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-300 focus:border-gray-200"
                    />
                  </div>

                  <div className="mt-3 space-y-2">
                    <button
                      onClick={handleDistributeEvenly}
                      className="w-full flex items-center justify-between p-3 text-left bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors group"
                    >
                      <div className="flex items-center">
                        <Users className="w-5 h-5 text-gray-400 group-hover:text-gray-600" />
                        <span className="ml-3 text-sm text-gray-700">Distribute Evenly</span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
                    </button>

                    {admins
                      .filter(admin => 
                        admin.role === 'admin' && // Only show regular admins
                        (admin.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        admin.email.toLowerCase().includes(searchTerm.toLowerCase()))
                      )
                      .map((admin) => (
                        <button
                          key={admin.id}
                          onClick={() => setSelectedAdmin(admin.id)}
                          className={`w-full flex items-center justify-between p-3 rounded-lg border transition-colors ${
                            selectedAdmin === admin.id
                              ? 'border-primary-500 bg-primary-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="flex items-center space-x-3">
                            <UserPlus className="w-5 h-5 text-gray-400" />
                            <div>
                              <h3 className="text-sm font-medium text-gray-900">{admin.name}</h3>
                              <p className="text-xs text-gray-500">{admin.assignedUsers} users assigned</p>
                            </div>
                          </div>
                          {selectedAdmin === admin.id && (
                            <Check className="w-4 h-4 text-primary-500" />
                          )}
                        </button>
                      ))
                    }
                  </div>
                </div>

                <div className="flex space-x-3">
                  <button
                    onClick={onClose}
                    className="flex-1 px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => selectedAdmin && handleAssign(selectedAdmin)}
                    disabled={isLoading || !selectedAdmin}
                    className="flex-1 px-4 py-2 text-sm text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Assigning...
                      </>
                    ) : (
                      'Assign Users'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserAssignmentModal;