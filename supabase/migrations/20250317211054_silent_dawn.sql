/*
  # Shopify Installation Schema Setup

  1. Changes
    - Drop dependent tables in correct order
    - Create new tables with proper constraints
    - Add RLS policies and triggers
    - Add indexes for performance

  2. Security
    - Enable RLS on all tables
    - Add policies for secure access
    - Implement audit logging
*/

-- Drop existing tables and their dependencies
DROP TABLE IF EXISTS shopify_installation_audit_log CASCADE;
DROP TABLE IF EXISTS shopify_app_subscriptions CASCADE;
DROP TABLE IF EXISTS shopify_app_installations CASCADE;
DROP TABLE IF EXISTS shopify_sync_logs CASCADE;
DROP TABLE IF EXISTS shopify_installations CASCADE;

-- Drop and recreate enum type
DROP TYPE IF EXISTS shopify_installation_status CASCADE;
CREATE TYPE shopify_installation_status AS ENUM (
  'installed',
  'pending',
  'requires_reauth',
  'uninstalled'
);

-- Create shopify_installations table
CREATE TABLE shopify_installations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  store_url text UNIQUE NOT NULL,
  access_token text,
  scopes text[],
  status shopify_installation_status NOT NULL DEFAULT 'pending',
  installed_at timestamptz,
  last_auth_at timestamptz,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT valid_store_url CHECK (store_url ~ '^[a-zA-Z0-9][a-zA-Z0-9-]*\.myshopify\.com$')
);

-- Create sync logs table
CREATE TABLE shopify_sync_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid REFERENCES shopify_installations(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  status text NOT NULL,
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT valid_status CHECK (status IN ('success', 'error', 'warning'))
);

-- Enable RLS
ALTER TABLE shopify_installations ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopify_sync_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can manage their own installations"
  ON shopify_installations
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Service role has full access to installations"
  ON shopify_installations
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can view their own sync logs"
  ON shopify_sync_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM shopify_installations
      WHERE id = store_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Service role has full access to sync logs"
  ON shopify_sync_logs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Create indexes
CREATE INDEX idx_shopify_installations_user_id 
  ON shopify_installations(user_id);

CREATE INDEX idx_shopify_installations_store_url 
  ON shopify_installations(store_url);

CREATE INDEX idx_shopify_installations_status 
  ON shopify_installations(status);

CREATE INDEX idx_shopify_sync_logs_store_id 
  ON shopify_sync_logs(store_id);

CREATE INDEX idx_shopify_sync_logs_event_type 
  ON shopify_sync_logs(event_type);

-- Create installation change logging function
CREATE OR REPLACE FUNCTION log_installation_change()
RETURNS TRIGGER AS $$
DECLARE
  previous_status text;
  new_status text;
BEGIN
  -- Handle status changes safely
  IF TG_OP = 'UPDATE' THEN
    previous_status = OLD.status::text;
    new_status = NEW.status::text;
  ELSE
    previous_status = null;
    new_status = NEW.status::text;
  END IF;

  INSERT INTO shopify_sync_logs (
    store_id,
    event_type,
    status,
    details
  ) VALUES (
    NEW.id,
    CASE
      WHEN TG_OP = 'INSERT' THEN 'installation_created'
      WHEN TG_OP = 'UPDATE' AND previous_status IS DISTINCT FROM new_status THEN 'status_changed'
      ELSE 'installation_updated'
    END,
    'success',
    jsonb_build_object(
      'previous_status', previous_status,
      'new_status', new_status,
      'changed_at', CURRENT_TIMESTAMP,
      'changed_by', auth.uid()
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the installation change trigger
CREATE TRIGGER log_shopify_installation_changes
  AFTER INSERT OR UPDATE ON shopify_installations
  FOR EACH ROW
  EXECUTE FUNCTION log_installation_change();

-- Create the updated_at trigger
CREATE TRIGGER update_shopify_installations_updated_at
  BEFORE UPDATE ON shopify_installations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Add documentation comments
COMMENT ON TABLE shopify_installations IS 'Tracks Shopify store installations and their authentication status';
COMMENT ON TABLE shopify_sync_logs IS 'Audit log for Shopify integration events and sync operations';
COMMENT ON COLUMN shopify_installations.status IS 'Current status of the Shopify installation';
COMMENT ON COLUMN shopify_installations.metadata IS 'Additional installation-specific data stored as JSON';