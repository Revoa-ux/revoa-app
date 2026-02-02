/*
  # Add Shopify App Tables

  1. New Tables
    - `shopify_app_subscriptions`
      - Track app subscriptions and billing
      - Store subscription status and plan details
    
    - `shopify_app_installations`
      - Track app installations from the app store
      - Store installation status and shop details

  2. Security
    - Enable RLS on all tables
    - Add policies for secure access
    - Add audit logging
*/

-- Create app subscriptions table
CREATE TABLE IF NOT EXISTS shopify_app_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_domain text NOT NULL REFERENCES shopify_installations(store_url) ON DELETE CASCADE,
  subscription_id text UNIQUE,
  plan_name text NOT NULL,
  status text NOT NULL,
  trial_ends_at timestamptz,
  test boolean DEFAULT false,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Create app installations table
CREATE TABLE IF NOT EXISTS shopify_app_installations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_domain text NOT NULL REFERENCES shopify_installations(store_url) ON DELETE CASCADE,
  app_id text NOT NULL,
  access_token text,
  scopes text[],
  installed_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  uninstalled_at timestamptz,
  status text NOT NULL DEFAULT 'active',
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(shop_domain, app_id)
);

-- Enable RLS
ALTER TABLE shopify_app_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopify_app_installations ENABLE ROW LEVEL SECURITY;

-- Create policies for app subscriptions
CREATE POLICY "Service role has full access to subscriptions"
  ON shopify_app_subscriptions
  FOR ALL 
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can read own store subscriptions"
  ON shopify_app_subscriptions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM shopify_installations
      WHERE store_url = shop_domain
      AND user_id = auth.uid()
    )
  );

-- Create policies for app installations
CREATE POLICY "Service role has full access to installations"
  ON shopify_app_installations
  FOR ALL 
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can read own store installations"
  ON shopify_app_installations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM shopify_installations
      WHERE store_url = shop_domain
      AND user_id = auth.uid()
    )
  );

-- Create indexes
CREATE INDEX idx_app_subscriptions_shop ON shopify_app_subscriptions(shop_domain);
CREATE INDEX idx_app_subscriptions_status ON shopify_app_subscriptions(status);
CREATE INDEX idx_app_installations_shop ON shopify_app_installations(shop_domain);
CREATE INDEX idx_app_installations_status ON shopify_app_installations(status);

-- Add updated_at triggers
CREATE TRIGGER update_app_subscriptions_updated_at
  BEFORE UPDATE ON shopify_app_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_app_installations_updated_at
  BEFORE UPDATE ON shopify_app_installations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Create audit log function
CREATE OR REPLACE FUNCTION log_app_installation_change()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO shopify_installation_audit_log (
    installation_id,
    event_type,
    metadata
  ) VALUES (
    NEW.id,
    CASE
      WHEN TG_OP = 'INSERT' THEN 'app_installed'
      WHEN TG_OP = 'UPDATE' AND NEW.status != OLD.status THEN 'status_changed'
      WHEN TG_OP = 'UPDATE' AND NEW.uninstalled_at IS NOT NULL AND OLD.uninstalled_at IS NULL THEN 'app_uninstalled'
      ELSE 'installation_updated'
    END,
    jsonb_build_object(
      'shop_domain', NEW.shop_domain,
      'app_id', NEW.app_id,
      'status', NEW.status,
      'old_status', CASE WHEN TG_OP = 'UPDATE' THEN OLD.status ELSE null END
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create audit trigger
CREATE TRIGGER log_app_installation_changes
  AFTER INSERT OR UPDATE ON shopify_app_installations
  FOR EACH ROW
  EXECUTE FUNCTION log_app_installation_change();