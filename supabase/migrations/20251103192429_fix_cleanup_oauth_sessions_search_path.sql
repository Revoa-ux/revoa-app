/*
  # Fix Cleanup OAuth Sessions Function Search Path

  1. Changes
    - Update cleanup_expired_oauth_sessions function to use fully qualified table name
    - This fixes the "function does not exist" error caused by empty search_path

  2. Security
    - Maintains SECURITY DEFINER for proper permissions
    - Uses fully qualified table name to prevent search_path attacks
*/

CREATE OR REPLACE FUNCTION public.cleanup_expired_oauth_sessions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  DELETE FROM public.oauth_sessions WHERE expires_at < now();
END;
$$;