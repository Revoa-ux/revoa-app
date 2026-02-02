/*
  # Clean up auth tables

  1. Changes
    - Drop all auth-related tables
    - Drop associated triggers and functions
    - Clean up any leftover data

  2. Tables to Drop
    - user_profiles
    - auth_sessions 
    - auth_audit_logs
    - auth_rate_limits
    - settings_audit_log
    - user_settings
*/

-- Drop tables if they exist
DROP TABLE IF EXISTS public.user_profiles CASCADE;
DROP TABLE IF EXISTS public.auth_sessions CASCADE;
DROP TABLE IF EXISTS public.auth_audit_logs CASCADE;
DROP TABLE IF EXISTS public.auth_rate_limits CASCADE;
DROP TABLE IF EXISTS public.settings_audit_log CASCADE;
DROP TABLE IF EXISTS public.user_settings CASCADE;

-- Drop related functions
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.initialize_user_settings() CASCADE;
DROP FUNCTION IF EXISTS public.initialize_user_settings_v2() CASCADE;
DROP FUNCTION IF EXISTS public.log_auth_event() CASCADE;
DROP FUNCTION IF EXISTS public.log_settings_change() CASCADE;
DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;

-- Clean up any orphaned data
DELETE FROM auth.users WHERE id NOT IN (
  SELECT user_id FROM public.team_members
);