/*
  # Shopify Installation Tracking

  1. New Tables
    - `shopify_installations`
      - `id` (uuid, primary key)
      - `store_url` (text, unique)
      - `access_token` (text)
      - `scopes` (text[])
      - `installed_at` (timestamptz)
      - `last_auth_at` (timestamptz)
      - `status` (text)
      - `metadata` (jsonb)

  2. Security
    - Enable RLS on `shopify_installations` table
    - Add policy for service role access
    - Add policy for authenticated users to read own store data

  3. Changes
    - Add installation tracking table
    - Add installation status enum type
    - Add installation audit trigger
*/

-- Create installation status enum
CREATE TYPE shopify_installation_status AS ENUM (
  'pending',
  'installed',
  'uninstalled',
  'requires_reauth'
);

-- Create installations table
CREATE TABLE IF NOT EXISTS shopify_installations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  store_url text UNIQUE NOT NULL,
  access_token text,
  scopes text[],
  installed_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  last_auth_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  status shopify_installation_status DEFAULT 'pending',
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP
);

-- Create index on store_url
CREATE INDEX idx_shopify_installations_store_url ON shopify_installations(store_url);

-- Create index on user_id
CREATE INDEX idx_shopify_installations_user_id ON shopify_installations(user_id);

-- Enable RLS
ALTER TABLE shopify_installations ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Service role has full access to installations"
  ON shopify_installations
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can read own store data"
  ON shopify_installations
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Create updated_at trigger
CREATE TRIGGER update_shopify_installations_updated_at
  BEFORE UPDATE ON shopify_installations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Create installation audit table
CREATE TABLE IF NOT EXISTS shopify_installation_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  installation_id uuid REFERENCES shopify_installations(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  previous_status shopify_installation_status,
  new_status shopify_installation_status,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS on audit log
ALTER TABLE shopify_installation_audit_log ENABLE ROW LEVEL SECURITY;

-- Create audit log policies
CREATE POLICY "Service role has full access to audit log"
  ON shopify_installation_audit_log
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can read own audit log"
  ON shopify_installation_audit_log
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM shopify_installations
      WHERE id = installation_id
      AND user_id = auth.uid()
    )
  );

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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for status changes
CREATE TRIGGER log_shopify_installation_status_change
  AFTER UPDATE OF status ON shopify_installations
  FOR EACH ROW
  EXECUTE FUNCTION log_installation_status_change();