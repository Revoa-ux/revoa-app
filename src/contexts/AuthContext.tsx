import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Session, User } from '@supabase/supabase-js';
import { toast } from '../lib/toast';
import { supabase } from '../lib/supabase';
import { signIn, signUp as signUpUser, signOut, updatePassword } from '../lib/auth';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string) => Promise<{ error: any; data: any }>;
  signOut: () => Promise<{ error: any }>;
  updatePassword: (password: string) => Promise<{ error: any }>;
  resetPassword: (email: string) => Promise<{ error: any }>;
  isAuthenticated: boolean;
  hasCompletedOnboarding: boolean;
  setHasCompletedOnboarding: (value: boolean) => void;
  emailConfirmed: boolean | undefined;
  profileLoaded: boolean;
  refreshEmailConfirmed: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);
  const [emailConfirmed, setEmailConfirmed] = useState<boolean | undefined>(undefined);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;

    // Set a timeout to ensure loading state doesn't hang indefinitely
    const loadingTimeout = setTimeout(() => {
      if (isMounted) {
        console.warn('Session loading timeout - continuing without session');
        setIsLoading(false);
      }
    }, 8000); // 8 second timeout

    // Get initial session
    const initSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();

        if (!isMounted) return;
        clearTimeout(loadingTimeout);

        if (error) {
          console.error('Error getting session:', error);
          setIsLoading(false);
          return;
        }

        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          console.log('[AuthContext] Checking onboarding status for user:', session.user.id);

          try {
            const profilePromise = supabase
              .from('user_profiles')
              .select('onboarding_completed, email_confirmed')
              .eq('user_id', session.user.id)
              .maybeSingle();

            const timeoutPromise = new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Profile timeout')), 3000)
            );

            const { data: profile, error: profileError } = await Promise.race([
              profilePromise,
              timeoutPromise
            ]) as any;

            if (isMounted) {
              if (profileError) {
                console.error('[AuthContext] Error fetching user profile:', profileError);
                setEmailConfirmed(false);
              } else if (profile) {
                console.log('[AuthContext] User profile:', profile);
                const emailConfirmedValue = profile.email_confirmed === true;
                setHasCompletedOnboarding(profile.onboarding_completed || false);
                setEmailConfirmed(emailConfirmedValue);
              } else {
                // Profile is null - user might not have a profile yet
                console.warn('[AuthContext] No profile found for user');
                setEmailConfirmed(false);
              }
              setProfileLoaded(true);
            }
          } catch (err) {
            if (isMounted) {
              console.warn('[AuthContext] Profile fetch timeout or error:', err);
              // Don't reset states on timeout - set profileLoaded anyway
              setProfileLoaded(true);
            }
          }
        }

        if (isMounted) {
          setIsLoading(false);
        }
      } catch (error) {
        if (isMounted) {
          clearTimeout(loadingTimeout);
          console.error('Fatal error getting session:', error);
          setIsLoading(false);
        }
      }
    };

    initSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;

      console.debug('Auth state changed:', event, session?.user?.id);

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user && isMounted) {
          console.log('[AuthContext] SIGNED_IN/TOKEN_REFRESHED - Checking profile for user:', session.user.id);

          try {
            const profilePromise = supabase
              .from('user_profiles')
              .select('onboarding_completed, email_confirmed')
              .eq('user_id', session.user.id)
              .maybeSingle();

            const timeoutPromise = new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Profile timeout')), 3000)
            );

            const { data: profile, error } = await Promise.race([
              profilePromise,
              timeoutPromise
            ]) as any;

            if (isMounted) {
              if (error) {
                console.error('[AuthContext] Error on SIGNED_IN/TOKEN_REFRESHED:', error);
                setEmailConfirmed(false);
              } else if (profile) {
                console.log('[AuthContext] Profile:', profile);
                const emailConfirmedValue = profile.email_confirmed === true;
                setHasCompletedOnboarding(profile.onboarding_completed || false);
                setEmailConfirmed(emailConfirmedValue);
              } else {
                // Profile is null - user might not have a profile yet
                console.warn('[AuthContext] No profile found for user on SIGNED_IN');
                setEmailConfirmed(false);
              }
              setProfileLoaded(true);
            }
          } catch (err) {
            if (isMounted) {
              console.warn('[AuthContext] Profile check timeout');
              // Don't reset states on timeout - set profileLoaded anyway
              setProfileLoaded(true);
            }
          }
        }
      } else if (event === 'SIGNED_OUT') {
        // Only redirect if this was an intentional sign out
        // Don't redirect during normal page navigation or tab switching
        const wasAuthenticated = !!user;

        if (isMounted) {
          setSession(null);
          setUser(null);
          setHasCompletedOnboarding(false);
          setEmailConfirmed(false);
          setProfileLoaded(false);

          // Only navigate to auth if user was previously authenticated
          // and we're not already on a public route
          if (wasAuthenticated && !window.location.pathname.startsWith('/auth')) {
            navigate('/auth', { replace: true });
          }
        }
      } else if (event === 'USER_UPDATED') {
        // Update session and user without triggering navigation
        setSession(session);
        setUser(session?.user ?? null);
      }
    });

    return () => {
      isMounted = false;
      clearTimeout(loadingTimeout);
      subscription.unsubscribe();
    };
  }, [navigate]);

  const handleSetHasCompletedOnboarding = async (completed: boolean) => {
    if (!user) {
      console.error('No user found when updating onboarding status');
      return;
    }
    
    try {
      setIsLoading(true);
      
      const { error } = await supabase
        .from('user_profiles')
        .upsert({
          user_id: user.id,
          email: user.email || '',
          onboarding_completed: completed,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });

      if (error) throw error;

      setHasCompletedOnboarding(completed);

      if (completed) {
        navigate('/', { replace: true });
      }
    } catch (error) {
      console.error('Failed to update onboarding status:', error);
      toast.error('Failed to update onboarding status');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });
      return { error };
    } catch (error) {
      return { error };
    }
  };

  const refreshEmailConfirmed = async () => {
    if (!user) return;

    try {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('email_confirmed')
        .eq('user_id', user.id)
        .maybeSingle();

      if (profile) {
        setEmailConfirmed(profile.email_confirmed === true);
      } else {
        setEmailConfirmed(false);
      }
    } catch (err) {
      console.error('[AuthContext] Error refreshing email confirmed status:', err);
    }
  };

  const value = {
    session,
    user,
    isLoading,
    signIn,
    signUp: signUpUser,
    signOut,
    updatePassword,
    resetPassword: handleResetPassword,
    isAuthenticated: !!user,
    hasCompletedOnboarding,
    setHasCompletedOnboarding: handleSetHasCompletedOnboarding,
    emailConfirmed,
    profileLoaded,
    refreshEmailConfirmed
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
