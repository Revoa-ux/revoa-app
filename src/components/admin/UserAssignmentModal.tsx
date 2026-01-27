import React, { useState, useEffect } from 'react';
import { X, Search, Check, UserPlus, Loader2, Users, ChevronRight, ArrowRight } from 'lucide-react';
import { toast } from '../../lib/toast';
import { supabase } from '@/lib/supabase';

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
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<string | null>(null);
  const [admins, setAdmins] = useState<Array<{
    id: string;
    name: string;
    role: string;
    assignedUsers: number;
    email: string;
  }>>([]);
  const [loadingAdmins, setLoadingAdmins] = useState(true);

  useEffect(() => {
    fetchAdmins();
  }, []);

  const fetchAdmins = async () => {
    try {
      setLoadingAdmins(true);

      const { data: adminProfiles, error: adminError } = await supabase
        .from('user_profiles')
        .select('user_id, email, first_name, last_name, is_super_admin, admin_role')
        .eq('is_admin', true)
        .eq('is_super_admin', false)
        .order('email');

      if (adminError) throw adminError;

      // Get assignment counts per admin
      const { data: assignments, error: assignError } = await supabase
        .from('user_assignments')
        .select('admin_id');

      if (assignError) throw assignError;

      // Count assignments per admin
      const countMap = new Map<string, number>();
      assignments?.forEach((assignment: { admin_id: string }) => {
        const currentCount = countMap.get(assignment.admin_id) || 0;
        countMap.set(assignment.admin_id, currentCount + 1);
      });

      // Map admin profiles to list format
      const adminList = adminProfiles?.map(admin => ({
        id: admin.user_id,
        name: admin.first_name && admin.last_name
          ? `${admin.first_name} ${admin.last_name}`
          : admin.email.split('@')[0],
        role: 'admin',
        assignedUsers: countMap.get(admin.user_id) || 0,
        email: admin.email
      })) || [];

      setAdmins(adminList);
    } catch (error) {
      console.error('Error fetching admins:', error);
      toast.error('Failed to load admins');
    } finally {
      setLoadingAdmins(false);
    }
  };

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

      if (admins.length === 0) {
        toast.error('No admins available for distribution');
        return;
      }

      // Calculate users per admin
      const usersPerAdmin = Math.floor(selectedUsers.length / admins.length);
      const remainingUsers = selectedUsers.length % admins.length;

      let assignedCount = 0;

      // Distribute users evenly
      for (let i = 0; i < admins.length; i++) {
        const admin = admins[i];
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
    <div className="fixed inset-0 z-[100]">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      
      <div className="fixed inset-0 overflow-y-auto">
        <div className="min-h-full flex items-center justify-center p-4">
          <div className="relative bg-white dark:bg-dark rounded-xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-[#3a3a3a]">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Assign Users</h3>
                <button 
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Selected Users
                  </label>
                  <div className="p-3 bg-gray-50 dark:bg-[#3a3a3a]/50 rounded-lg border border-gray-200 dark:border-[#4a4a4a]">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {selectedUsers.length} user{selectedUsers.length === 1 ? '' : 's'} selected
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Assign To
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      placeholder="Search admins..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 text-sm bg-white dark:bg-[#3a3a3a] border border-gray-200 dark:border-[#4a4a4a] rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-300 dark:focus:ring-gray-500 focus:border-gray-200 dark:focus:border-gray-500 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
                    />
                  </div>

                  <div className="mt-3 space-y-2">
                    <button
                      onClick={handleDistributeEvenly}
                      disabled={loadingAdmins}
                      className="w-full flex items-center justify-between p-4 text-left bg-gray-50 dark:bg-[#3a3a3a] hover:bg-gray-100 dark:hover:bg-[#4a4a4a] rounded-lg transition-all group disabled:opacity-50 disabled:cursor-not-allowed border border-gray-200 dark:border-[#4a4a4a]"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full bg-white dark:bg-[#4a4a4a] flex items-center justify-center flex-shrink-0">
                          <Users className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                        </div>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Distribute Evenly</span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 group-hover:translate-x-0.5 transition-all" />
                    </button>

                    {loadingAdmins ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
                      </div>
                    ) : (
                      admins
                        .filter(admin =>
                          admin.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          admin.email.toLowerCase().includes(searchTerm.toLowerCase())
                        )
                        .map((admin) => (
                          <button
                            key={admin.id}
                            onClick={() => setSelectedAdmin(admin.id)}
                            className={`w-full flex items-center justify-between p-4 rounded-lg border transition-all group ${
                              selectedAdmin === admin.id
                                ? 'border-gray-900 dark:border-gray-300 bg-gray-50 dark:bg-[#3a3a3a]'
                                : 'border-gray-200 dark:border-[#4a4a4a] hover:border-gray-300 dark:hover:border-gray-500 bg-white dark:bg-[#3a3a3a]/30'
                            }`}
                          >
                            <div className="flex items-center space-x-3 min-w-0 flex-1">
                              <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-[#4a4a4a] flex items-center justify-center flex-shrink-0">
                                <UserPlus className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <h3 className="text-sm font-medium text-gray-900 dark:text-white truncate">{admin.email}</h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{admin.assignedUsers} users assigned</p>
                              </div>
                            </div>
                            {selectedAdmin === admin.id ? (
                              <div className="w-5 h-5 rounded-full bg-dark dark:bg-white flex items-center justify-center flex-shrink-0 ml-2">
                                <Check className="w-3 h-3 text-white dark:text-gray-900" />
                              </div>
                            ) : (
                              <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 group-hover:translate-x-0.5 transition-all flex-shrink-0 ml-2" />
                            )}
                          </button>
                        ))
                    )}
                  </div>
                </div>

                <div className="flex space-x-3">
                  <button
                    onClick={onClose}
                    className="btn btn-secondary flex-1"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => selectedAdmin && handleAssign(selectedAdmin)}
                    disabled={isLoading || !selectedAdmin}
                    className="btn btn-primary flex-1 group"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="btn-icon animate-spin" />
                        Assigning...
                      </>
                    ) : (
                      <>
                        Assign Users
                        <ArrowRight className="btn-icon btn-icon-arrow" />
                      </>
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