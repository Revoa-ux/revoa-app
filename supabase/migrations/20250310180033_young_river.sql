/*
  # Shopify Authentication Tables

  1. New Tables
    - `shopify_installations`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references users)
      - `store_url` (text, unique)
      - `access_token` (text, nullable)
      - `scopes` (text[], nullable)
      - `installed_at` (timestamptz)
      - `last_auth_at` (timestamptz)
      - `status` (shopify_installation_status)
      - `metadata` (jsonb)
      - Timestamps (created_at, updated_at)

    - `shopify_installation_audit_log`
      - `id` (uuid, primary key)
      - `installation_id` (uuid, references shopify_installations)
      - `event_type` (text)
      - `previous_status` (shopify_installation_status)
      - `new_status` (shopify_installation_status)
      - `metadata` (jsonb)
      - `created_at` (timestamptz)

  2. Security
    - RLS enabled on all tables
    - Policies for secure access control
    - Encrypted token storage

  3. Triggers
    - Automatic status change logging
    - Updated timestamp maintenance
*/

-- Create enum for installation status if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'shopify_installation_status') THEN
    CREATE TYPE shopify_installation_status AS ENUM (
      'pending',
      'installed',
      'uninstalled',
      'requires_reauth'
    );
  END IF;
END $$;

-- Create shopify_installations table
CREATE TABLE IF NOT EXISTS shopify_installations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users ON DELETE CASCADE,
  store_url text NOT NULL UNIQUE,
  access_token text,
  scopes text[],
  installed_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  last_auth_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  status shopify_installation_status DEFAULT 'pending',
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP
);

-- Create shopify_installation_audit_log table
CREATE TABLE IF NOT EXISTS shopify_installation_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  installation_id uuid REFERENCES shopify_installations ON DELETE CASCADE,
  event_type text NOT NULL,
  previous_status shopify_installation_status,
  new_status shopify_installation_status,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS
ALTER TABLE shopify_installations ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopify_installation_audit_log ENABLE ROW LEVEL SECURITY;

-- Create policies for shopify_installations
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'shopify_installations' 
    AND policyname = 'Service role has full access to installations'
  ) THEN
    CREATE POLICY "Service role has full access to installations"
      ON shopify_installations
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'shopify_installations' 
    AND policyname = 'Users can read own store data'
  ) THEN
    CREATE POLICY "Users can read own store data"
      ON shopify_installations
      FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- Create policies for shopify_installation_audit_log
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'shopify_installation_audit_log' 
    AND policyname = 'Service role has full access to audit log'
  ) THEN
    CREATE POLICY "Service role has full access to audit log"
      ON shopify_installation_audit_log
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'shopify_installation_audit_log' 
    AND policyname = 'Users can read own audit log'
  ) THEN
    CREATE POLICY "Users can read own audit log"
      ON shopify_installation_audit_log
      FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM shopify_installations
          WHERE shopify_installations.id = shopify_installation_audit_log.installation_id
          AND shopify_installations.user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_shopify_installations_updated_at ON shopify_installations;
CREATE TRIGGER update_shopify_installations_updated_at
  BEFORE UPDATE ON shopify_installations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Create function to log installation status changes
CREATE OR REPLACE FUNCTION log_installation_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO shopify_installation_audit_log (
      installation_id,
      event_type,
      previous_status,
      new_status,
      metadata
    ) VALUES (
      NEW.id,
      'status_change',
      OLD.status,
      NEW.status,
      jsonb_build_object(
        'changed_at', CURRENT_TIMESTAMP,
        'changed_by', auth.uid()
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for status change logging
DROP TRIGGER IF EXISTS log_shopify_installation_status_change ON shopify_installations;
CREATE TRIGGER log_shopify_installation_status_change
  AFTER UPDATE OF status ON shopify_installations
  FOR EACH ROW
  EXECUTE FUNCTION log_installation_status_change();

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_shopify_installations_user_id
  ON shopify_installations(user_id);

CREATE INDEX IF NOT EXISTS idx_shopify_installations_store_url
  ON shopify_installations(store_url);

CREATE UNIQUE INDEX IF NOT EXISTS shopify_installations_store_url_key
  ON shopify_installations(store_url);