/*
  # Quote-Based Auto-Invoicing System

  ## Overview
  This migration creates the infrastructure for quote-based automatic invoice generation.
  When clients accept quotes with SKU and country-specific shipping costs, the system
  can automatically generate daily invoices based on Shopify orders.

  ## New Tables

  ### 1. `invoice_generation_settings`
  Per-user settings for automatic invoice generation

  ### 2. `invoice_generation_logs`
  Audit trail for invoice generation attempts

  ### 3. `shopify_order_fulfillment`
  Enhanced order tracking specifically for invoice generation with line items

  ## Modified Tables

  ### `invoices`
  Add auto-generation tracking fields

  ## Security
  - RLS enabled on all new tables
  - Users can only read their own settings and logs
  - Admins can manage all settings and view all logs
*/

-- Create invoice_generation_settings table
CREATE TABLE IF NOT EXISTS invoice_generation_settings (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  auto_generation_enabled boolean DEFAULT false,
  generation_time time DEFAULT '00:00:00',
  timezone text DEFAULT 'UTC',
  paused_by_admin_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  paused_at timestamptz,
  pause_reason text,
  last_generation_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE invoice_generation_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own invoice settings"
  ON invoice_generation_settings FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own invoice settings"
  ON invoice_generation_settings FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all invoice settings"
  ON invoice_generation_settings FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid() AND user_profiles.is_super_admin = true
    )
  );

CREATE INDEX IF NOT EXISTS idx_invoice_settings_enabled 
  ON invoice_generation_settings(auto_generation_enabled) 
  WHERE auto_generation_enabled = true;

-- Create invoice_generation_logs table
CREATE TABLE IF NOT EXISTS invoice_generation_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid REFERENCES invoices(id) ON DELETE SET NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  generation_date date NOT NULL,
  period_start timestamptz NOT NULL,
  period_end timestamptz NOT NULL,
  orders_included text[] DEFAULT ARRAY[]::text[],
  total_amount decimal(10, 2) DEFAULT 0,
  status text NOT NULL CHECK (status IN ('success', 'partial_success', 'failed', 'no_orders')),
  error_message text,
  skipped_line_items jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE invoice_generation_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own generation logs"
  ON invoice_generation_logs FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can read all generation logs"
  ON invoice_generation_logs FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid() AND user_profiles.is_super_admin = true
    )
  );

CREATE INDEX IF NOT EXISTS idx_invoice_gen_logs_user_id ON invoice_generation_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_invoice_gen_logs_generation_date ON invoice_generation_logs(generation_date);
CREATE INDEX IF NOT EXISTS idx_invoice_gen_logs_status ON invoice_generation_logs(status);

-- Create shopify_order_fulfillment table for invoice generation
CREATE TABLE IF NOT EXISTS shopify_order_fulfillment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shopify_order_id text NOT NULL,
  shopify_order_number text NOT NULL,
  customer_email text,
  customer_name text,
  shipping_country text NOT NULL,
  line_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  order_date timestamptz NOT NULL,
  financial_status text,
  fulfillment_status text,
  total_price decimal(10, 2),
  invoiced boolean DEFAULT false,
  invoice_id uuid REFERENCES invoices(id) ON DELETE SET NULL,
  synced_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, shopify_order_id)
);

ALTER TABLE shopify_order_fulfillment ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own fulfillment orders"
  ON shopify_order_fulfillment FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can read all fulfillment orders"
  ON shopify_order_fulfillment FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid() AND user_profiles.is_super_admin = true
    )
  );

CREATE POLICY "System can insert fulfillment orders"
  ON shopify_order_fulfillment FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "System can update fulfillment orders"
  ON shopify_order_fulfillment FOR UPDATE TO authenticated
  USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_shopify_fulfillment_user_id ON shopify_order_fulfillment(user_id);
CREATE INDEX IF NOT EXISTS idx_shopify_fulfillment_order_id ON shopify_order_fulfillment(shopify_order_id);
CREATE INDEX IF NOT EXISTS idx_shopify_fulfillment_order_date ON shopify_order_fulfillment(order_date);
CREATE INDEX IF NOT EXISTS idx_shopify_fulfillment_invoiced ON shopify_order_fulfillment(user_id, invoiced) WHERE invoiced = false;

-- Add auto-generation fields to invoices table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoices' AND column_name = 'auto_generated'
  ) THEN
    ALTER TABLE invoices ADD COLUMN auto_generated boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoices' AND column_name = 'period_start'
  ) THEN
    ALTER TABLE invoices ADD COLUMN period_start timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoices' AND column_name = 'period_end'
  ) THEN
    ALTER TABLE invoices ADD COLUMN period_end timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoices' AND column_name = 'generation_log_id'
  ) THEN
    ALTER TABLE invoices ADD COLUMN generation_log_id uuid REFERENCES invoice_generation_logs(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_invoices_auto_generated ON invoices(auto_generated) WHERE auto_generated = true;
CREATE INDEX IF NOT EXISTS idx_invoices_generation_log_id ON invoices(generation_log_id) WHERE generation_log_id IS NOT NULL;

-- Function to initialize invoice settings for new users
CREATE OR REPLACE FUNCTION initialize_invoice_settings()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO invoice_generation_settings (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_initialize_invoice_settings ON auth.users;
CREATE TRIGGER trigger_initialize_invoice_settings
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION initialize_invoice_settings();

-- Function to get shipping cost for SKU and country from active quotes
CREATE OR REPLACE FUNCTION get_shipping_cost_for_sku(
  p_user_id uuid,
  p_sku text,
  p_country text
)
RETURNS decimal
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_shipping_cost decimal;
  v_variant jsonb;
BEGIN
  SELECT variant INTO v_variant
  FROM product_quotes pq,
       jsonb_array_elements(pq.variants) AS variant
  WHERE pq.user_id = p_user_id
    AND pq.status = 'accepted'
    AND variant->>'sku' = p_sku
  LIMIT 1;

  IF v_variant IS NULL THEN
    RETURN NULL;
  END IF;

  v_shipping_cost := (v_variant->'shippingCosts'->>p_country)::decimal;

  IF v_shipping_cost IS NULL THEN
    v_shipping_cost := (v_variant->'shippingCosts'->>'_default')::decimal;
  END IF;

  RETURN v_shipping_cost;
END;
$$ LANGUAGE plpgsql;

-- Function to get COGS for SKU from active quotes
CREATE OR REPLACE FUNCTION get_cogs_for_sku(
  p_user_id uuid,
  p_sku text
)
RETURNS decimal
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cogs decimal;
BEGIN
  SELECT (variant->>'costPerItem')::decimal INTO v_cogs
  FROM product_quotes pq,
       jsonb_array_elements(pq.variants) AS variant
  WHERE pq.user_id = p_user_id
    AND pq.status = 'accepted'
    AND variant->>'sku' = p_sku
  LIMIT 1;

  RETURN v_cogs;
END;
$$ LANGUAGE plpgsql;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_invoice_settings_updated_at()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_invoice_settings_updated_at ON invoice_generation_settings;
CREATE TRIGGER trigger_update_invoice_settings_updated_at
  BEFORE UPDATE ON invoice_generation_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_invoice_settings_updated_at();
