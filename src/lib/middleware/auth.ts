import { supabase } from '../supabase';

export const requireAuth = async () => {
  const { data: { session }, error } = await supabase.auth.getSession();

  if (error) {
    throw new Error('Authentication error');
  }

  if (!session) {
    throw new Error('Authentication required');
  }

  return session;
};

export const checkPermissions = async (requiredPermissions: string[]) => {
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error('Authentication required');
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('metadata')
    .eq('user_id', user.id)
    .single();

  if (!profile) {
    throw new Error('User profile not found');
  }

  const hasPermission = requiredPermissions.every(permission => 
    profile.metadata?.permissions?.includes(permission)
  );

  if (!hasPermission) {
    throw new Error('Insufficient permissions');
  }

  return true;
};

export const validateSession = async (session: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
  if (new Date(session.expires_at) < new Date()) {
    throw new Error('Session expired');
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('locked_until')
    .eq('user_id', session.user.id)
    .single();

  if (profile?.locked_until && new Date(profile.locked_until) > new Date()) {
    throw new Error('Account is temporarily locked');
  }

  return true;
};