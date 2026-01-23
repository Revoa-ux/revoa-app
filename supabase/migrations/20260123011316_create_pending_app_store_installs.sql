/*
  # Pending App Store Installations Tracking

  1. New Table: pending_app_store_installs
    - Tracks users who initiate installation from members site
    - Links state tokens to user accounts for OAuth callback
    - Prevents duplicate account creation

  2. Security
    - Enable RLS on pending_app_store_installs table
    - Users can only read/write their own records
    - Auto-cleanup for expired records

  3. Indexes
    - Index on state_token for fast OAuth lookups
    - Index on user_id for user queries
    - Index on expires_at for cleanup operations
*/

-- Create pending_app_store_installs table
CREATE TABLE IF NOT EXISTS pending_app_store_installs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  state_token text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  expires_at timestamptz NOT NULL,
  completed_at timestamptz,
  source text DEFAULT 'members_site' NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_pending_installs_state_token
  ON pending_app_store_installs(state_token);

CREATE INDEX IF NOT EXISTS idx_pending_installs_user_id
  ON pending_app_store_installs(user_id);

CREATE INDEX IF NOT EXISTS idx_pending_installs_expires_at
  ON pending_app_store_installs(expires_at);

-- Enable RLS
ALTER TABLE pending_app_store_installs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own pending installs"
  ON pending_app_store_installs
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own pending installs"
  ON pending_app_store_installs
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own pending installs"
  ON pending_app_store_installs
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Function to cleanup expired pending installs
CREATE OR REPLACE FUNCTION cleanup_expired_pending_installs()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM pending_app_store_installs
  WHERE expires_at < now()
    AND completed_at IS NULL;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- Add helpful comments
COMMENT ON TABLE pending_app_store_installs IS 'Tracks users who click Install on Shopify before completing OAuth flow';
COMMENT ON COLUMN pending_app_store_installs.state_token IS 'Unique state token passed through OAuth flow to link accounts';
COMMENT ON COLUMN pending_app_store_installs.expires_at IS 'Token expires 30 minutes after creation';
COMMENT ON COLUMN pending_app_store_installs.completed_at IS 'When OAuth callback successfully completed';
COMMENT ON COLUMN pending_app_store_installs.source IS 'Where install was initiated: members_site, onboarding, settings';
