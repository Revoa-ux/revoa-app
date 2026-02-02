/*
  # Add OAuth Sessions Management

  1. New Tables
    - `oauth_sessions`
      - `id` (uuid, primary key)
      - `state` (text, unique)
      - `shop_domain` (text)
      - `created_at` (timestamptz)
      - `expires_at` (timestamptz)
      - `user_id` (uuid, references users)

  2. Security
    - Enable RLS on `oauth_sessions` table
    - Add policy for authenticated users to manage their own sessions

  3. Changes
    - Add index on state for fast lookups
    - Add index on shop_domain for performance
    - Add cleanup trigger for expired sessions
*/

-- Drop existing objects if they exist
DO $$ 
BEGIN
  -- Drop trigger if it exists
  IF EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'cleanup_expired_oauth_sessions_trigger'
  ) THEN
    DROP TRIGGER cleanup_expired_oauth_sessions_trigger ON oauth_sessions;
  END IF;

  -- Drop functions if they exist
  IF EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'trigger_cleanup_expired_oauth_sessions'
  ) THEN
    DROP FUNCTION trigger_cleanup_expired_oauth_sessions();
  END IF;

  -- Drop policies if they exist
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Users can manage their own OAuth sessions'
    AND tablename = 'oauth_sessions'
  ) THEN
    DROP POLICY IF EXISTS "Users can manage their own OAuth sessions" ON oauth_sessions;
  END IF;

  -- Drop table and related objects if they exist
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

-- Create indexes
CREATE INDEX idx_oauth_sessions_state ON oauth_sessions(state);
CREATE INDEX idx_oauth_sessions_shop_domain ON oauth_sessions(shop_domain);

-- Enable RLS
ALTER TABLE oauth_sessions ENABLE ROW LEVEL SECURITY;

-- Add RLS policies
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Users can manage their own OAuth sessions'
    AND tablename = 'oauth_sessions'
  ) THEN
    CREATE POLICY "Users can manage their own OAuth sessions"
      ON oauth_sessions
      FOR ALL
      TO authenticated
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

-- Create cleanup function for expired sessions
CREATE OR REPLACE FUNCTION trigger_cleanup_expired_oauth_sessions()
RETURNS trigger AS $$
BEGIN
  DELETE FROM oauth_sessions
  WHERE expires_at < NOW();
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create cleanup trigger
CREATE TRIGGER cleanup_expired_oauth_sessions_trigger
  AFTER INSERT ON oauth_sessions
  FOR EACH STATEMENT
  EXECUTE FUNCTION trigger_cleanup_expired_oauth_sessions();