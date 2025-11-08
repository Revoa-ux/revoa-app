import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Session, User } from '@supabase/supabase-js';
import { toast } from 'sonner';
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

          // Check onboarding status with shorter timeout
          try {
            const profilePromise = supabase
              .from('user_profiles')
              .select('onboarding_completed')
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
                setHasCompletedOnboarding(false);
              } else {
                console.log('[AuthContext] User profile:', profile);
                const completed = profile?.onboarding_completed || false;
                console.log('[AuthContext] Onboarding completed:', completed);
                setHasCompletedOnboarding(completed);
              }
            }
          } catch (err) {
            if (isMounted) {
              console.warn('[AuthContext] Profile fetch timeout or error:', err);
              setHasCompletedOnboarding(false);
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

      if (event === 'SIGNED_IN') {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user && isMounted) {
          console.log('[AuthContext] SIGNED_IN - Checking onboarding status for user:', session.user.id);

          try {
            const profilePromise = supabase
              .from('user_profiles')
              .select('onboarding_completed')
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
                console.error('[AuthContext] Error on SIGNED_IN:', error);
                setHasCompletedOnboarding(false);
              } else {
                console.log('[AuthContext] SIGNED_IN profile:', profile);
                const completed = profile?.onboarding_completed || false;
                console.log('[AuthContext] SIGNED_IN onboarding completed:', completed);
                setHasCompletedOnboarding(completed);
              }
            }
          } catch (err) {
            if (isMounted) {
              console.warn('[AuthContext] Profile check timeout on SIGNED_IN');
              setHasCompletedOnboarding(false);
            }
          }
        }
      } else if (event === 'SIGNED_OUT') {
        if (isMounted) {
          setSession(null);
          setUser(null);
          setHasCompletedOnboarding(false);
          navigate('/auth', { replace: true });
        }
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
    setHasCompletedOnboarding: handleSetHasCompletedOnboarding
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};