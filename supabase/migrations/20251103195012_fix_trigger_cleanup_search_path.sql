/*
  # Fix trigger_cleanup_expired_oauth_sessions search path

  This migration fixes the search_path issue in the trigger_cleanup_expired_oauth_sessions function
  that was preventing OAuth sessions from being created.

  ## Changes
  - Updates trigger_cleanup_expired_oauth_sessions to use 'public' schema in search_path
  - This allows the function to find cleanup_expired_oauth_sessions() function

  ## Security
  - Maintains SECURITY DEFINER for proper access control
  - Uses explicit schema reference for security
*/

-- Drop and recreate the trigger function with correct search_path
CREATE OR REPLACE FUNCTION public.trigger_cleanup_expired_oauth_sessions()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  PERFORM cleanup_expired_oauth_sessions();
  RETURN NEW;
END;
$$;