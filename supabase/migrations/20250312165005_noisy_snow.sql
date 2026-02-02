/*
  # Fix OAuth Sessions Table

  1. Changes
    - Drop existing table and dependencies cleanly
    - Recreate table with proper constraints
    - Add indexes for performance
    - Add cleanup trigger for expired sessions
    - Add proper RLS policies

  2. Security
    - Enable RLS
    - Add policies for authenticated users
    - Add service role access
*/

-- Drop existing objects if they exist
DO $$ 
BEGIN
  -- Drop triggers
  DROP TRIGGER IF EXISTS cleanup_expired_oauth_sessions_trigger ON oauth_sessions;
  
  -- Drop functions
  DROP FUNCTION IF EXISTS trigger_cleanup_expired_oauth_sessions();
  DROP FUNCTION IF EXISTS cleanup_expired_oauth_sessions();
  
  -- Drop policies
  DROP POLICY IF EXISTS "Users can manage their own OAuth sessions" ON oauth_sessions;
  DROP POLICY IF EXISTS "Users can manage own sessions" ON oauth_sessions;
  
  -- Drop table and related objects
  DROP TABLE IF EXISTS oauth_sessions CASCADE;
END $$;

-- Create OAuth sessions table
CREATE TABLE oauth_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  state text NOT NULL UNIQUE,
  shop_domain text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  user_id uuid REFERENCES auth.users(id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_oauth_sessions_state ON oauth_sessions(state);
CREATE INDEX IF NOT EXISTS idx_oauth_sessions_shop_domain ON oauth_sessions(shop_domain);

-- Enable RLS
ALTER TABLE oauth_sessions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can manage their own OAuth sessions"
  ON oauth_sessions
  FOR ALL
  TO authenticated
  USING (
    CASE 
      WHEN user_id IS NOT NULL THEN user_id = auth.uid()
      ELSE true -- Allow creation of sessions before user is known
    END
  )
  WITH CHECK (
    CASE 
      WHEN user_id IS NOT NULL THEN user_id = auth.uid()
      ELSE true -- Allow creation of sessions before user is known
    END
  );

-- Create service role policy
CREATE POLICY "Service role has full access"
  ON oauth_sessions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Create function to clean up expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_oauth_sessions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM oauth_sessions WHERE expires_at < now();
END;
$$;

-- Create trigger function for automatic cleanup
CREATE OR REPLACE FUNCTION trigger_cleanup_expired_oauth_sessions()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM cleanup_expired_oauth_sessions();
  RETURN NEW;
END;
$$;

-- Create trigger for automatic cleanup
CREATE TRIGGER cleanup_expired_oauth_sessions_trigger
  AFTER INSERT ON oauth_sessions
  FOR EACH STATEMENT
  EXECUTE FUNCTION trigger_cleanup_expired_oauth_sessions();