/*
  # Add OAuth Sessions Table
  
  1. New Tables
    - `oauth_sessions`
      - `id` (uuid, primary key)
      - `state` (text, unique)
      - `shop_domain` (text)
      - `created_at` (timestamptz)
      - `expires_at` (timestamptz)
      - `user_id` (uuid, foreign key)

  2. Security
    - Enable RLS on `oauth_sessions` table
    - Add policy for authenticated users to manage their own sessions
*/

-- Drop existing objects if they exist
DROP TRIGGER IF EXISTS cleanup_expired_oauth_sessions_trigger ON oauth_sessions;
DROP FUNCTION IF EXISTS trigger_cleanup_expired_oauth_sessions();
DROP FUNCTION IF EXISTS cleanup_expired_oauth_sessions();
DROP INDEX IF EXISTS idx_oauth_sessions_shop_domain;
DROP INDEX IF EXISTS idx_oauth_sessions_state;
DROP POLICY IF EXISTS "Users can manage own sessions" ON oauth_sessions;
DROP TABLE IF EXISTS oauth_sessions;

-- Create OAuth sessions table
CREATE TABLE oauth_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  state text NOT NULL UNIQUE,
  shop_domain text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  user_id uuid REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE oauth_sessions ENABLE ROW LEVEL SECURITY;

-- Allow users to manage their own sessions
CREATE POLICY "Users can manage own sessions"
  ON oauth_sessions
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create indexes for faster lookups
CREATE INDEX idx_oauth_sessions_state ON oauth_sessions(state);
CREATE INDEX idx_oauth_sessions_shop_domain ON oauth_sessions(shop_domain);

-- Add function to clean up expired sessions
CREATE FUNCTION cleanup_expired_oauth_sessions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM oauth_sessions WHERE expires_at < now();
END;
$$;

-- Create trigger to automatically clean up expired sessions
CREATE FUNCTION trigger_cleanup_expired_oauth_sessions()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM cleanup_expired_oauth_sessions();
  RETURN NEW;
END;
$$;

CREATE TRIGGER cleanup_expired_oauth_sessions_trigger
  AFTER INSERT ON oauth_sessions
  FOR EACH STATEMENT
  EXECUTE FUNCTION trigger_cleanup_expired_oauth_sessions();