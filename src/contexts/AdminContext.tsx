import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '../lib/supabase';
import { AdminUser, AdminPermissions } from '../types/admin';

interface AdminContextType {
  isAdmin: boolean;
  isSuperAdmin: boolean;
  adminUser: AdminUser | null;
  permissions: AdminPermissions;
  loading: boolean;
  error: string | null;
  checkAdminStatus: () => Promise<void>;
}

const AdminContext = createContext<AdminContextType>({} as AdminContextType);

export const useAdmin = () => {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error('useAdmin must be used within an AdminProvider');
  }
  return context;
};

export const AdminProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate(); // eslint-disable-line @typescript-eslint/no-unused-vars

  const getPermissions = (role: string): AdminPermissions => {
    const isSuperAdmin = role === 'super_admin';
    return {
      canManageUsers: true,
      canManageAdmins: isSuperAdmin,
      canManageSettings: isSuperAdmin,
      canViewMetrics: true,
      canAssignUsers: true,
      canProcessQuotes: true,
      canManageProducts: true,
      canManageInvoices: true
    };
  };

  const checkAdminStatus = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;

      if (!session?.user) {
        setAdminUser(null);
        return;
      }

      // Check if user has admin privileges in user_profiles
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', session.user.id)
        .single();

      if (profileError) throw profileError;

      if (!profile?.is_admin || !profile?.admin_role) {
        setAdminUser(null);
        return;
      }

      // Create admin user object
      const adminUserData: AdminUser = {
        id: profile.id,
        userId: profile.user_id,
        role: profile.admin_role,
        email: profile.email,
        assignedUsersCount: 0,
        totalTransactionVolume: 0,
        lastActiveAt: profile.last_active_at,
        createdAt: profile.created_at,
        updatedAt: profile.updated_at,
        metadata: profile.metadata
      };

      setAdminUser(adminUserData);
    } catch (error) {
      console.error('Error checking admin status:', error);
      const message = error instanceof Error ? error.message : 'Failed to check admin status';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAdminStatus();
  }, []);

  const value = {
    isAdmin: !!adminUser,
    isSuperAdmin: adminUser?.role === 'super_admin',
    adminUser,
    permissions: adminUser ? getPermissions(adminUser.role) : getPermissions('admin'),
    loading,
    error,
    checkAdminStatus
  };

  return (
    <AdminContext.Provider value={value}>
      {children}
    </AdminContext.Provider>
  );
};