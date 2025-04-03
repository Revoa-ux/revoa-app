import { supabase } from '../supabase';

interface ProtectOptions {
  requireAuth?: boolean;
  requireVerified?: boolean;
  permissions?: string[];
}

export const protect = async (options: ProtectOptions = {}) => {
  const {
    requireAuth = true,
    requireVerified = false,
    permissions = []
  } = options;

  if (requireAuth) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error('Authentication required');
    }

    if (requireVerified) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email_verified) {
        throw new Error('Email verification required');
      }
    }

    if (permissions.length > 0) {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('metadata')
        .eq('user_id', session.user.id)
        .single();

      const userPermissions = profile?.metadata?.permissions || [];
      const hasPermission = permissions.every(p => userPermissions.includes(p));

      if (!hasPermission) {
        throw new Error('Insufficient permissions');
      }
    }
  }

  return true;
};

export const protectRoute = (options: ProtectOptions = {}) => {
  return async () => {
    try {
      await protect(options);
      return true;
    } catch (error) {
      if (error instanceof Error) {
        switch (error.message) {
          case 'Authentication required':
            window.location.href = '/auth';
            break;
          case 'Email verification required':
            window.location.href = '/auth/verify';
            break;
          case 'Insufficient permissions':
            window.location.href = '/403';
            break;
          default:
            window.location.href = '/auth';
        }
      }
      return false;
    }
  };
};