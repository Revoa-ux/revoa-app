/*
  # Fix cleanup_expired_oauth_sessions search path

  This migration updates the cleanup_expired_oauth_sessions function to use proper search_path
  for consistency and reliability.

  ## Changes
  - Updates cleanup_expired_oauth_sessions to use 'public' schema in search_path
  - Maintains explicit schema reference for security

  ## Security
  - Maintains SECURITY DEFINER for proper access control
  - Uses explicit schema reference for security
*/

-- Update the cleanup function with correct search_path
CREATE OR REPLACE FUNCTION public.cleanup_expired_oauth_sessions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  DELETE FROM oauth_sessions WHERE expires_at < now();
END;
$$;