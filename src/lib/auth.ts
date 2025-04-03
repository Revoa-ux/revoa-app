import { supabase } from './supabase';
import { AuthError } from './errors';
import { validateRequest, authSchema } from './middleware/validate';

// Debug flag
const DEBUG = import.meta.env.DEV;

// Debug logging helper
const log = (message: string, data?: any) => {
  if (DEBUG) {
    console.log(`[Auth] ${message}`, data || '');
  }
};

export const signUp = async (email: string, password: string) => {
  try {
    log('Starting signup process...', { email });

    // Validate input
    const validData = await validateRequest(authSchema, { email, password });
    
    // Create auth user
    const { data, error } = await supabase.auth.signUp({
      email: validData.email,
      password: validData.password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: {
          email: validData.email
        }
      }
    });

    if (error) {
      log('Signup error:', error);
      if (error.message.includes('already registered')) {
        throw new AuthError('This email is already registered', 'auth/email-exists', 400);
      }
      throw error;
    }

    if (!data.user) {
      throw new AuthError('Failed to create user', 'auth/user-creation-failed', 500);
    }

    log('User created successfully:', { userId: data.user.id });
    return { data, error: null };
  } catch (error) {
    log('Signup error:', error);
    
    if (error instanceof AuthError) {
      return { error, data: null };
    }
    
    return {
      error: new AuthError('Failed to create account', 'auth/signup-failed', 500),
      data: null
    };
  }
};

export const signIn = async (email: string, password: string) => {
  try {
    log('Starting signin process...', { email });

    // Validate input
    const validData = await validateRequest(authSchema, { email, password });

    // Sign in with password
    const { data, error } = await supabase.auth.signInWithPassword({
      email: validData.email,
      password: validData.password
    });

    if (error) {
      log('Signin error:', error);
      if (error.message.includes('Invalid login credentials')) {
        return { 
          error: new AuthError('Invalid email or password', 'auth/invalid-credentials', 401),
          data: null
        };
      }
      throw error;
    }

    log('User signed in successfully:', { userId: data.user?.id });
    return { data, error: null };
  } catch (error) {
    log('Signin error:', error);
    return {
      error: new AuthError('Failed to sign in', 'auth/signin-failed', 500),
      data: null
    };
  }
};

export const signOut = async () => {
  try {
    log('Starting signout process...');

    // Sign out from Supabase
    const { error } = await supabase.auth.signOut();
    if (error) {
      log('Signout error:', error);
      throw error;
    }

    log('User signed out successfully');

    // Clear any remaining session data
    await supabase.auth.clearSession();

    // Small delay to ensure cleanup is complete
    await new Promise(resolve => setTimeout(resolve, 100));

  } catch (error) {
    log('Signout error:', error);
    throw error;
  }
};

export const updatePassword = async (password: string) => {
  try {
    log('Starting password update...');

    // Validate password
    await validateRequest(authSchema, { 
      email: 'dummy@example.com', // Email not used but required by schema
      password 
    });

    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      log('Password update error:', error);
      throw error;
    }

    log('Password updated successfully');
    return { error: null };
  } catch (error) {
    log('Update password error:', error);
    throw error;
  }
};