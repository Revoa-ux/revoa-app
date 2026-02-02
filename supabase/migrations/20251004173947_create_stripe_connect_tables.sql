/*
  # Create Stripe Connect Infrastructure

  1. New Tables
    - `suppliers`
      - `id` (uuid, primary key)
      - `name` (text) - Supplier business name
      - `email` (text) - Supplier contact email
      - `stripe_account_id` (text) - Connected Stripe account ID
      - `stripe_account_status` (text) - 'pending', 'active', 'restricted', 'disabled'
      - `commission_rate` (numeric) - Platform commission percentage (default 3%)
      - `onboarding_completed` (boolean) - Whether Stripe onboarding is complete
      - `metadata` (jsonb)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `marketplace_transactions`
      - `id` (uuid, primary key)
      - `user_id` (uuid) - Customer who made the purchase
      - `supplier_id` (uuid) - Supplier who receives payment
      - `product_id` (uuid) - Product purchased (optional, for reference)
      - `stripe_payment_intent_id` (text) - Stripe Payment Intent ID
      - `stripe_transfer_id` (text) - Stripe Transfer ID to supplier
      - `total_amount` (numeric) - Total amount paid by customer
      - `supplier_amount` (numeric) - Amount transferred to supplier
      - `platform_fee` (numeric) - Platform commission amount
      - `status` (text) - 'pending', 'processing', 'succeeded', 'failed', 'refunded'
      - `metadata` (jsonb)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Suppliers can view their own data
    - Admins can view and manage all suppliers
    - Users can view their own transactions
    - Admins can view all transactions
*/

-- Create suppliers table
CREATE TABLE IF NOT EXISTS suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL UNIQUE,
  stripe_account_id text UNIQUE,
  stripe_account_status text NOT NULL DEFAULT 'pending' CHECK (
    stripe_account_status IN ('pending', 'active', 'restricted', 'disabled')
  ),
  commission_rate numeric(5,2) NOT NULL DEFAULT 3.00 CHECK (commission_rate >= 0 AND commission_rate <= 100),
  onboarding_completed boolean DEFAULT false,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP
);

-- Create marketplace_transactions table
CREATE TABLE IF NOT EXISTS marketplace_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  supplier_id uuid NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
  product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  stripe_payment_intent_id text NOT NULL UNIQUE,
  stripe_transfer_id text UNIQUE,
  total_amount numeric(20,2) NOT NULL CHECK (total_amount >= 0),
  supplier_amount numeric(20,2) NOT NULL CHECK (supplier_amount >= 0),
  platform_fee numeric(20,2) NOT NULL CHECK (platform_fee >= 0),
  status text NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'processing', 'succeeded', 'failed', 'refunded')
  ),
  currency text NOT NULL DEFAULT 'usd',
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_suppliers_email ON suppliers(email);
CREATE INDEX IF NOT EXISTS idx_suppliers_stripe_account_id ON suppliers(stripe_account_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_status ON suppliers(stripe_account_status);
CREATE INDEX IF NOT EXISTS idx_marketplace_transactions_user_id ON marketplace_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_transactions_supplier_id ON marketplace_transactions(supplier_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_transactions_product_id ON marketplace_transactions(product_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_transactions_status ON marketplace_transactions(status);
CREATE INDEX IF NOT EXISTS idx_marketplace_transactions_payment_intent ON marketplace_transactions(stripe_payment_intent_id);

-- Enable RLS
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for suppliers table

-- Admins can view all suppliers
CREATE POLICY "Admins can view all suppliers"
  ON suppliers
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid()
      AND is_admin = true
    )
  );

-- Admins can insert suppliers
CREATE POLICY "Admins can create suppliers"
  ON suppliers
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid()
      AND is_admin = true
    )
  );

-- Admins can update suppliers
CREATE POLICY "Admins can update suppliers"
  ON suppliers
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid()
      AND is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid()
      AND is_admin = true
    )
  );

-- RLS Policies for marketplace_transactions table

-- Users can view their own transactions
CREATE POLICY "Users can view own transactions"
  ON marketplace_transactions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Admins can view all transactions
CREATE POLICY "Admins can view all transactions"
  ON marketplace_transactions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid()
      AND is_admin = true
    )
  );

-- Only admins and system can insert transactions
CREATE POLICY "Admins can create transactions"
  ON marketplace_transactions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid()
      AND is_admin = true
    )
  );

-- Only admins can update transactions
CREATE POLICY "Admins can update transactions"
  ON marketplace_transactions
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid()
      AND is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid()
      AND is_admin = true
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_suppliers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_marketplace_transactions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers to update updated_at
DROP TRIGGER IF EXISTS trigger_update_suppliers_updated_at ON suppliers;
CREATE TRIGGER trigger_update_suppliers_updated_at
  BEFORE UPDATE ON suppliers
  FOR EACH ROW
  EXECUTE FUNCTION update_suppliers_updated_at();

DROP TRIGGER IF EXISTS trigger_update_marketplace_transactions_updated_at ON marketplace_transactions;
CREATE TRIGGER trigger_update_marketplace_transactions_updated_at
  BEFORE UPDATE ON marketplace_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_marketplace_transactions_updated_at();

-- Add helpful comments
COMMENT ON TABLE suppliers IS 'Stores supplier information and Stripe Connect account details';
COMMENT ON TABLE marketplace_transactions IS 'Tracks marketplace transactions with Stripe Connect payments';
COMMENT ON COLUMN suppliers.commission_rate IS 'Platform commission percentage (e.g., 3.00 for 3%)';
COMMENT ON COLUMN marketplace_transactions.supplier_amount IS 'Amount transferred to supplier after platform fee';
COMMENT ON COLUMN marketplace_transactions.platform_fee IS 'Platform commission amount deducted from total';
