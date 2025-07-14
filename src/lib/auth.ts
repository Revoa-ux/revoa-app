import { supabase } from './supabase';
import { User, AuthError } from '@supabase/supabase-js';

export interface AuthResponse {
  user: User | null;
  error: AuthError | null;
}

export interface SignUpData {
  user: User | null;
  session: any;
}

export interface SignUpResponse {
  data: SignUpData | null;
  error: AuthError | null;
}

// Sign in with email and password
export const signIn = async (email: string, password: string): Promise<AuthResponse> => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    return {
      user: data.user,
      error,
    };
  } catch (error) {
    return {
      user: null,
      error: error as AuthError,
    };
  }
};

// Sign up with email and password
export const signUp = async (email: string, password: string): Promise<SignUpResponse> => {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    return {
      data: data.user ? { user: data.user, session: data.session } : null,
      error,
    };
  } catch (error) {
    return {
      data: null,
      error: error as AuthError,
    };
  }
};

// Sign out
export const signOut = async (): Promise<{ error: AuthError | null }> => {
  try {
    const { error } = await supabase.auth.signOut();
    return { error };
  } catch (error) {
    return { error: error as AuthError };
  }
};

// Reset password
export const resetPassword = async (email: string): Promise<{ error: AuthError | null }> => {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    return { error };
  } catch (error) {
    return { error: error as AuthError };
  }
};

// Update password
export const updatePassword = async (password: string): Promise<{ error: AuthError | null }> => {
  try {
    const { error } = await supabase.auth.updateUser({
      password,
    });
    return { error };
  } catch (error) {
    return { error: error as AuthError };
  }
};

// Get current user
export const getCurrentUser = async (): Promise<User | null> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
};

// Check if user is authenticated
export const isAuthenticated = async (): Promise<boolean> => {
  const user = await getCurrentUser();
  return !!user;
};