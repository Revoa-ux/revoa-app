import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/database';
import { config } from './config';

// Debug flag
const DEBUG = import.meta.env.DEV;

// Debug logging helper
const log = (message: string, data?: any) => {
  if (DEBUG) {
    console.log(`[Supabase] ${message}`, data || ''); // eslint-disable-line @typescript-eslint/no-explicit-any
  }
};

log('Initializing Supabase client...');

// Create a single instance of the Supabase client
export const supabase = createClient<Database>(
  config.supabase.url,
  config.supabase.anonKey || '',
  {
    auth: {
      persistSession: config.auth.persistSession,
      autoRefreshToken: config.auth.autoRefreshToken,
      detectSessionInUrl: config.auth.detectSessionInUrl,
      storage: window.localStorage,
      storageKey: config.auth.cookieName,
      flowType: 'pkce'
    },
    global: {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    }
  }
);

// Verify Supabase connection
export const verifyConnection = async () => {
  try {
    log('Verifying Supabase connection...');

    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      log('Session error:', sessionError);
      return { connected: false, error: 'Failed to verify session' };
    }

    log('Session check:', { hasSession: !!session });

    return { connected: true, error: null };
  } catch (error) {
    log('Connection error:', error);
    return { 
      connected: false, 
      error: error instanceof Error ? error.message : 'Failed to connect to database'
    };
  }
};

// Export initialized client
export { supabase as default };