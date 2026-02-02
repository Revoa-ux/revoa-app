/*
  # Create OAuth Sessions Table

  1. New Tables
    - `oauth_sessions`
      - `id` (uuid, primary key)
      - `state` (text, unique)
      - `shop_domain` (text)
      - `created_at` (timestamptz)
      - `expires_at` (timestamptz)

  2. Security
    - Enable RLS
    - Add policy for authenticated users
*/

CREATE TABLE IF NOT EXISTS oauth_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  state text UNIQUE NOT NULL,
  shop_domain text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  user_id uuid REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE oauth_sessions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can manage their own OAuth sessions"
  ON oauth_sessions
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX idx_oauth_sessions_state ON oauth_sessions(state);
CREATE INDEX idx_oauth_sessions_shop_domain ON oauth_sessions(shop_domain);

-- Create function to clean up expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_oauth_sessions()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM oauth_sessions
  WHERE expires_at < now();
END;
$$;

-- Create a trigger to automatically clean up expired sessions
CREATE OR REPLACE FUNCTION trigger_cleanup_expired_oauth_sessions()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM cleanup_expired_oauth_sessions();
  RETURN NEW;
END;
$$;

CREATE TRIGGER cleanup_expired_oauth_sessions_trigger
  AFTER INSERT ON oauth_sessions
  EXECUTE FUNCTION trigger_cleanup_expired_oauth_sessions();

-- Create function to increment installation count
CREATE OR REPLACE FUNCTION increment_install_count(store_url text)
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  current_count integer;
BEGIN
  SELECT COALESCE(
    (SELECT (metadata->>'install_count')::integer + 1
     FROM shopify_installations
     WHERE store_url = $1
     LIMIT 1),
    1
  ) INTO current_count;
  
  RETURN current_count;
END;
$$;