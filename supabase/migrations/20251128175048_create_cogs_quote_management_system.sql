/*
  # COGS & Quote Management System with Auto-Invoicing Support

  ## Overview
  Creates comprehensive system for managing product COGS updates, shipping rates by country,
  notifications, and auto-invoice generation.

  ## New Tables

  ### 1. product_cogs_updates
  Tracks COGS changes that require user acceptance before being applied.
  - Admin proposes new COGS
  - User receives notification
  - User accepts/rejects in quote review page
  - Updates apply to pending and future invoices

  ### 2. shipping_rates_by_country
  Per-SKU shipping costs by destination country.
  - Enables accurate invoice calculations
  - $5 default for undefined countries
  - Supports bulk CSV imports

  ### 3. invoice_generation_logs
  Audit trail of automated daily invoice generation.
  - Tracks success/failure
  - Links to generated invoices
  - Records orders included

  ### 4. invoice_generation_settings
  Per-user controls for auto-invoicing.
  - Enable/disable auto-generation
  - Set timezone for midnight calculation
  - Admin override capabilities

  ## Updates to Existing Tables
  - notifications: Add link_to, action_type columns
  - invoices: Add period tracking, auto-generation flag, timezone
  - messages: Add invoice_data jsonb for rich invoice messages

  ## Security
  - RLS enabled on all tables
  - Users see only their data
  - Admins see everything
  - Super admins can manage system-wide settings
*/

-- =====================================================
-- Table: product_cogs_updates
-- =====================================================

CREATE TABLE IF NOT EXISTS product_cogs_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_id uuid REFERENCES product_variants(id) ON DELETE CASCADE,
  old_cogs numeric(20,2) NOT NULL CHECK (old_cogs >= 0),
  new_cogs numeric(20,2) NOT NULL CHECK (new_cogs >= 0),
  updated_by_admin_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  affected_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending_acceptance' CHECK (
    status IN ('pending_acceptance', 'accepted', 'rejected', 'expired')
  ),
  reason_for_change text,
  admin_notes text,
  user_response_notes text,
  accepted_at timestamptz,
  rejected_at timestamptz,
  expires_at timestamptz,
  chat_message_id uuid,
  notification_id uuid,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_product_cogs_updates_product_id ON product_cogs_updates(product_id);
CREATE INDEX IF NOT EXISTS idx_product_cogs_updates_variant_id ON product_cogs_updates(variant_id);
CREATE INDEX IF NOT EXISTS idx_product_cogs_updates_affected_user ON product_cogs_updates(affected_user_id);
CREATE INDEX IF NOT EXISTS idx_product_cogs_updates_status ON product_cogs_updates(status);
CREATE INDEX IF NOT EXISTS idx_product_cogs_updates_created_at ON product_cogs_updates(created_at DESC);

-- =====================================================
-- Table: shipping_rates_by_country
-- =====================================================

CREATE TABLE IF NOT EXISTS shipping_rates_by_country (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  variant_id uuid REFERENCES product_variants(id) ON DELETE CASCADE,
  sku text NOT NULL,
  country_code text NOT NULL CHECK (length(country_code) = 2),
  shipping_cost numeric(20,2) NOT NULL CHECK (shipping_cost >= 0),
  currency text NOT NULL DEFAULT 'USD',
  created_by_admin_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notes text,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(variant_id, country_code)
);

CREATE INDEX IF NOT EXISTS idx_shipping_rates_sku ON shipping_rates_by_country(sku);
CREATE INDEX IF NOT EXISTS idx_shipping_rates_country ON shipping_rates_by_country(country_code);
CREATE INDEX IF NOT EXISTS idx_shipping_rates_variant ON shipping_rates_by_country(variant_id);
CREATE INDEX IF NOT EXISTS idx_shipping_rates_product ON shipping_rates_by_country(product_id);

-- =====================================================
-- Table: invoice_generation_logs
-- =====================================================

CREATE TABLE IF NOT EXISTS invoice_generation_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid REFERENCES invoices(id) ON DELETE SET NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  generation_date date NOT NULL,
  period_start timestamptz NOT NULL,
  period_end timestamptz NOT NULL,
  orders_included text[] DEFAULT ARRAY[]::text[],
  total_amount numeric(20,2),
  status text NOT NULL CHECK (status IN ('success', 'failed', 'skipped')),
  error_message text,
  triggered_by text NOT NULL CHECK (triggered_by IN ('auto_daily', 'manual_admin')),
  triggered_by_admin_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_invoice_generation_logs_user_id ON invoice_generation_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_invoice_generation_logs_generation_date ON invoice_generation_logs(generation_date DESC);
CREATE INDEX IF NOT EXISTS idx_invoice_generation_logs_status ON invoice_generation_logs(status);

-- =====================================================
-- Table: invoice_generation_settings
-- =====================================================

CREATE TABLE IF NOT EXISTS invoice_generation_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  auto_generation_enabled boolean NOT NULL DEFAULT true,
  generation_time time NOT NULL DEFAULT '00:00:00',
  timezone text NOT NULL DEFAULT 'UTC',
  paused_by_admin_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  paused_at timestamptz,
  pause_reason text,
  last_generated_at timestamptz,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_invoice_generation_settings_user_id ON invoice_generation_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_invoice_generation_settings_enabled ON invoice_generation_settings(auto_generation_enabled);

-- =====================================================
-- Update Existing Tables
-- =====================================================

-- Add columns to notifications table
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'link_to') THEN
    ALTER TABLE notifications ADD COLUMN link_to text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'action_type') THEN
    ALTER TABLE notifications ADD COLUMN action_type text CHECK (
      action_type IN ('quote_review', 'cogs_update', 'invoice_payment', 'general', 'system')
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'action_required') THEN
    ALTER TABLE notifications ADD COLUMN action_required boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'reference_id') THEN
    ALTER TABLE notifications ADD COLUMN reference_id uuid;
  END IF;
END $$;

-- Add columns to invoices table
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'period_start') THEN
    ALTER TABLE invoices ADD COLUMN period_start timestamptz;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'period_end') THEN
    ALTER TABLE invoices ADD COLUMN period_end timestamptz;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'auto_generated') THEN
    ALTER TABLE invoices ADD COLUMN auto_generated boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'invoice_message_id') THEN
    ALTER TABLE invoices ADD COLUMN invoice_message_id uuid;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'user_timezone') THEN
    ALTER TABLE invoices ADD COLUMN user_timezone text;
  END IF;
END $$;

-- Add columns to messages table for invoice data
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'message_type') THEN
    ALTER TABLE messages ADD COLUMN message_type text DEFAULT 'text' CHECK (
      message_type IN ('text', 'file', 'image', 'invoice', 'quote_update', 'system')
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'invoice_data') THEN
    ALTER TABLE messages ADD COLUMN invoice_data jsonb;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'payment_status') THEN
    ALTER TABLE messages ADD COLUMN payment_status text CHECK (
      payment_status IN ('pending', 'processing', 'paid', 'failed')
    );
  END IF;
END $$;

-- =====================================================
-- Enable RLS
-- =====================================================

ALTER TABLE product_cogs_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipping_rates_by_country ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_generation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_generation_settings ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS Policies: product_cogs_updates
-- =====================================================

CREATE POLICY "Users can view their own COGS updates"
  ON product_cogs_updates FOR SELECT
  TO authenticated
  USING (auth.uid() = affected_user_id);

CREATE POLICY "Admins can view all COGS updates"
  ON product_cogs_updates FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "Admins can create COGS updates"
  ON product_cogs_updates FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "Users can update their COGS updates status"
  ON product_cogs_updates FOR UPDATE
  TO authenticated
  USING (auth.uid() = affected_user_id)
  WITH CHECK (auth.uid() = affected_user_id);

CREATE POLICY "Admins can update all COGS updates"
  ON product_cogs_updates FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid() AND is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid() AND is_admin = true
    )
  );

-- =====================================================
-- RLS Policies: shipping_rates_by_country
-- =====================================================

CREATE POLICY "Everyone can view shipping rates"
  ON shipping_rates_by_country FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can create shipping rates"
  ON shipping_rates_by_country FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "Admins can update shipping rates"
  ON shipping_rates_by_country FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid() AND is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "Admins can delete shipping rates"
  ON shipping_rates_by_country FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid() AND is_admin = true
    )
  );

-- =====================================================
-- RLS Policies: invoice_generation_logs
-- =====================================================

CREATE POLICY "Users can view their own invoice logs"
  ON invoice_generation_logs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all invoice logs"
  ON invoice_generation_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "System can create invoice logs"
  ON invoice_generation_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- =====================================================
-- RLS Policies: invoice_generation_settings
-- =====================================================

CREATE POLICY "Users can view their own invoice settings"
  ON invoice_generation_settings FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all invoice settings"
  ON invoice_generation_settings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "Users can update their own invoice settings"
  ON invoice_generation_settings FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can update all invoice settings"
  ON invoice_generation_settings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid() AND is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid() AND is_admin = true
    )
  );

-- =====================================================
-- Trigger Functions
-- =====================================================

-- Update timestamp triggers
CREATE OR REPLACE FUNCTION update_product_cogs_updates_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_shipping_rates_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_invoice_generation_settings_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
DROP TRIGGER IF EXISTS trigger_update_product_cogs_updates_timestamp ON product_cogs_updates;
CREATE TRIGGER trigger_update_product_cogs_updates_timestamp
  BEFORE UPDATE ON product_cogs_updates
  FOR EACH ROW
  EXECUTE FUNCTION update_product_cogs_updates_timestamp();

DROP TRIGGER IF EXISTS trigger_update_shipping_rates_timestamp ON shipping_rates_by_country;
CREATE TRIGGER trigger_update_shipping_rates_timestamp
  BEFORE UPDATE ON shipping_rates_by_country
  FOR EACH ROW
  EXECUTE FUNCTION update_shipping_rates_timestamp();

DROP TRIGGER IF EXISTS trigger_update_invoice_generation_settings_timestamp ON invoice_generation_settings;
CREATE TRIGGER trigger_update_invoice_generation_settings_timestamp
  BEFORE UPDATE ON invoice_generation_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_invoice_generation_settings_timestamp();

-- Function to create invoice generation settings for new users
CREATE OR REPLACE FUNCTION create_invoice_settings_for_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO invoice_generation_settings (
    user_id,
    auto_generation_enabled,
    timezone
  )
  VALUES (
    NEW.user_id,
    true,
    COALESCE(NEW.timezone, 'America/New_York')
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create invoice settings when user profile created
DROP TRIGGER IF EXISTS trigger_create_invoice_settings ON user_profiles;
CREATE TRIGGER trigger_create_invoice_settings
  AFTER INSERT ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION create_invoice_settings_for_user();

-- Function to apply accepted COGS updates to products
CREATE OR REPLACE FUNCTION apply_accepted_cogs_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Only process if status changed to 'accepted'
  IF NEW.status = 'accepted' AND OLD.status != 'accepted' THEN
    -- Update the variant's COGS
    IF NEW.variant_id IS NOT NULL THEN
      UPDATE product_variants
      SET item_cost = NEW.new_cogs,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = NEW.variant_id;
    END IF;

    -- Update the product's COGS if exists
    IF NEW.product_id IS NOT NULL THEN
      UPDATE products
      SET cogs_cost = NEW.new_cogs,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = NEW.product_id;
    END IF;

    -- Set acceptance timestamp
    NEW.accepted_at = CURRENT_TIMESTAMP;
  END IF;

  -- Set rejection timestamp
  IF NEW.status = 'rejected' AND OLD.status != 'rejected' THEN
    NEW.rejected_at = CURRENT_TIMESTAMP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to apply COGS updates on acceptance
DROP TRIGGER IF EXISTS trigger_apply_accepted_cogs_update ON product_cogs_updates;
CREATE TRIGGER trigger_apply_accepted_cogs_update
  BEFORE UPDATE ON product_cogs_updates
  FOR EACH ROW
  EXECUTE FUNCTION apply_accepted_cogs_update();

-- =====================================================
-- Helper Function: Get Shipping Cost
-- =====================================================

CREATE OR REPLACE FUNCTION get_shipping_cost_for_order_line(
  p_variant_id uuid,
  p_country_code text,
  p_default_cost numeric DEFAULT 5.00
)
RETURNS numeric AS $$
DECLARE
  v_shipping_cost numeric;
BEGIN
  -- Try to get country-specific rate
  SELECT shipping_cost INTO v_shipping_cost
  FROM shipping_rates_by_country
  WHERE variant_id = p_variant_id
    AND country_code = UPPER(p_country_code)
  LIMIT 1;

  -- If not found, return default
  IF v_shipping_cost IS NULL THEN
    RETURN p_default_cost;
  END IF;

  RETURN v_shipping_cost;
END;
$$ LANGUAGE plpgsql STABLE;

-- =====================================================
-- Comments for Documentation
-- =====================================================

COMMENT ON TABLE product_cogs_updates IS 'Tracks COGS changes requiring user acceptance before applying';
COMMENT ON TABLE shipping_rates_by_country IS 'Per-SKU shipping costs by destination country for accurate invoicing';
COMMENT ON TABLE invoice_generation_logs IS 'Audit trail of automated daily invoice generation';
COMMENT ON TABLE invoice_generation_settings IS 'Per-user controls for auto-invoicing (enable/disable, timezone)';

COMMENT ON COLUMN product_cogs_updates.status IS 'pending_acceptance: awaiting user review; accepted: applied to products; rejected: declined by user';
COMMENT ON COLUMN shipping_rates_by_country.country_code IS 'ISO 3166-1 alpha-2 country code (e.g., US, CA, GB)';
COMMENT ON COLUMN invoice_generation_logs.triggered_by IS 'auto_daily: scheduled generation; manual_admin: triggered by admin';
COMMENT ON COLUMN invoice_generation_settings.auto_generation_enabled IS 'Master switch for auto-invoice generation for this user';