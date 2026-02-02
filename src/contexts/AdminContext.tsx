import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { AdminUser, AdminPermissions, AdminRole } from '../types/admin';

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

      // Create a timeout promise for the entire check
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Admin status check timeout')), 5000);
      });

      const checkPromise = (async () => {
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
          .maybeSingle();

        if (profileError) {
          console.error('Error fetching user profile:', profileError);
          throw profileError;
        }

        if (!profile?.is_admin || !profile?.admin_role) {
          setAdminUser(null);
          return;
        }

        // Create admin user object
        const adminUserData: AdminUser = {
          id: profile.id,
          userId: profile.user_id,
          role: (profile.admin_role as AdminRole) || 'admin',
          email: profile.email,
          name: profile.name || null,
          first_name: profile.first_name || null,
          last_name: profile.last_name || null,
          assignedUsersCount: 0,
          totalTransactionVolume: 0,
          lastActiveAt: profile.last_active_at || undefined,
          createdAt: profile.created_at || new Date().toISOString(),
          updatedAt: profile.updated_at || new Date().toISOString(),
          metadata: (profile.metadata as Record<string, any>) || undefined
        };

        setAdminUser(adminUserData);
      })();

      await Promise.race([checkPromise, timeoutPromise]);
    } catch (error) {
      console.error('Error checking admin status:', error);
      const message = error instanceof Error ? error.message : 'Failed to check admin status';
      setError(message);
      // Don't show toast for missing profile - user might not be admin
      setAdminUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const init = async () => {
      if (isMounted) {
        await checkAdminStatus().catch((err) => {
          console.error('Unhandled error in checkAdminStatus:', err);
          if (isMounted) {
            setLoading(false);
          }
        });
      }
    };

    init();

    return () => {
      isMounted = false;
    };
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