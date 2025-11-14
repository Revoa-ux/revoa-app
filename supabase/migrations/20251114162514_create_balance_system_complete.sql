/*
  # Create Complete Balance System for COGS Tracking

  ## Overview
  Creates balance management where merchant balances track COGS owed to supplier.
  Orders debit balance, payments credit balance, cancellations credit back.

  ## New Tables
  - balance_accounts: Running balance per merchant
  - balance_transactions: Ledger of all balance changes
  - order_line_items: Products within orders with COGS
  - invoice_line_items: Line items on invoices
  - payment_intents: Stripe/wire payment tracking

  ## Updates to Existing Tables
  - invoices: Add missing columns
  - products: Add COGS tracking columns

  ## Security
  - RLS enabled on all tables
  - Merchants see only their data
  - Admins see everything
*/

-- Create balance_accounts table
CREATE TABLE IF NOT EXISTS balance_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  current_balance numeric(20,2) NOT NULL DEFAULT 0.00,
  currency text NOT NULL DEFAULT 'USD',
  last_transaction_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP
);

-- Create balance_transactions table
CREATE TABLE IF NOT EXISTS balance_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('order_charge', 'payment', 'refund', 'adjustment', 'cancellation')),
  amount numeric(20,2) NOT NULL,
  balance_after numeric(20,2) NOT NULL,
  description text NOT NULL,
  reference_type text CHECK (reference_type IN ('order', 'invoice', 'payment_intent', 'manual')),
  reference_id uuid,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP
);

-- Create order_line_items table
CREATE TABLE IF NOT EXISTS order_line_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shopify_order_id text NOT NULL,
  product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  variant_name text,
  quantity integer NOT NULL CHECK (quantity > 0),
  unit_cost numeric(20,2) NOT NULL CHECK (unit_cost >= 0),
  total_cost numeric(20,2) NOT NULL CHECK (total_cost >= 0),
  fulfillment_status text NOT NULL DEFAULT 'pending' CHECK (fulfillment_status IN ('pending', 'fulfilled', 'cancelled')),
  cancelled_at timestamptz,
  fulfilled_at timestamptz,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP
);

-- Create invoice_line_items table
CREATE TABLE IF NOT EXISTS invoice_line_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  order_line_item_id uuid REFERENCES order_line_items(id) ON DELETE SET NULL,
  shopify_order_id text,
  description text NOT NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  unit_price numeric(20,2) NOT NULL CHECK (unit_price >= 0),
  total_price numeric(20,2) NOT NULL CHECK (total_price >= 0),
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP
);

-- Create payment_intents table
CREATE TABLE IF NOT EXISTS payment_intents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  supplier_id uuid REFERENCES suppliers(id) ON DELETE SET NULL,
  payment_method text NOT NULL CHECK (payment_method IN ('stripe', 'wire')),
  amount numeric(20,2) NOT NULL CHECK (amount > 0),
  platform_fee numeric(20,2) NOT NULL DEFAULT 0.00 CHECK (platform_fee >= 0),
  supplier_amount numeric(20,2) NOT NULL CHECK (supplier_amount >= 0),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'succeeded', 'failed', 'cancelled')),
  stripe_payment_intent_id text,
  wire_reference_number text,
  invoice_ids uuid[],
  confirmed_by_admin_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  confirmed_at timestamptz,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP
);

-- Add missing columns to invoices table
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'invoice_number') THEN
    ALTER TABLE invoices ADD COLUMN invoice_number text;
    CREATE UNIQUE INDEX idx_invoices_invoice_number ON invoices(invoice_number) WHERE invoice_number IS NOT NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'supplier_id') THEN
    ALTER TABLE invoices ADD COLUMN supplier_id uuid REFERENCES suppliers(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'total_amount') THEN
    ALTER TABLE invoices ADD COLUMN total_amount numeric(20,2);
    UPDATE invoices SET total_amount = amount WHERE total_amount IS NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'paid_at') THEN
    ALTER TABLE invoices ADD COLUMN paid_at timestamptz;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'payment_method') THEN
    ALTER TABLE invoices ADD COLUMN payment_method text CHECK (payment_method IN ('stripe', 'wire'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'notes') THEN
    ALTER TABLE invoices ADD COLUMN notes text;
  END IF;
END $$;

-- Add columns to products table
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'cogs_cost') THEN
    ALTER TABLE products ADD COLUMN cogs_cost numeric(20,2) DEFAULT 0.00 CHECK (cogs_cost >= 0);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'supplier_id') THEN
    ALTER TABLE products ADD COLUMN supplier_id uuid REFERENCES suppliers(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_balance_accounts_user_id ON balance_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_balance_transactions_user_id ON balance_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_balance_transactions_created_at ON balance_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_balance_transactions_reference ON balance_transactions(reference_type, reference_id);
CREATE INDEX IF NOT EXISTS idx_order_line_items_user_id ON order_line_items(user_id);
CREATE INDEX IF NOT EXISTS idx_order_line_items_shopify_order_id ON order_line_items(shopify_order_id);
CREATE INDEX IF NOT EXISTS idx_order_line_items_status ON order_line_items(fulfillment_status);
CREATE INDEX IF NOT EXISTS idx_invoice_line_items_invoice_id ON invoice_line_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payment_intents_user_id ON payment_intents(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_intents_status ON payment_intents(status);
CREATE INDEX IF NOT EXISTS idx_payment_intents_stripe_pi ON payment_intents(stripe_payment_intent_id);

-- Enable RLS
ALTER TABLE balance_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE balance_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_intents ENABLE ROW LEVEL SECURITY;

-- RLS Policies for balance_accounts
CREATE POLICY "Users can view own balance account"
  ON balance_accounts FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all balance accounts"
  ON balance_accounts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid() AND is_admin = true
    )
  );

-- RLS Policies for balance_transactions
CREATE POLICY "Users can view own transactions"
  ON balance_transactions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all transactions"
  ON balance_transactions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid() AND is_admin = true
    )
  );

-- RLS Policies for order_line_items
CREATE POLICY "Users can view own order line items"
  ON order_line_items FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all order line items"
  ON order_line_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "Admins can update order line items"
  ON order_line_items FOR UPDATE
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

-- RLS Policies for invoice_line_items
CREATE POLICY "Users can view own invoice line items"
  ON invoice_line_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM invoices
      WHERE invoices.id = invoice_line_items.invoice_id
      AND invoices.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all invoice line items"
  ON invoice_line_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "Admins can create invoice line items"
  ON invoice_line_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid() AND is_admin = true
    )
  );

-- RLS Policies for payment_intents
CREATE POLICY "Users can view own payment intents"
  ON payment_intents FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all payment intents"
  ON payment_intents FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "Admins can update payment intents"
  ON payment_intents FOR UPDATE
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

-- Trigger functions for updated_at
CREATE OR REPLACE FUNCTION update_balance_accounts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_order_line_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_payment_intents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
DROP TRIGGER IF EXISTS trigger_update_balance_accounts_updated_at ON balance_accounts;
CREATE TRIGGER trigger_update_balance_accounts_updated_at
  BEFORE UPDATE ON balance_accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_balance_accounts_updated_at();

DROP TRIGGER IF EXISTS trigger_update_order_line_items_updated_at ON order_line_items;
CREATE TRIGGER trigger_update_order_line_items_updated_at
  BEFORE UPDATE ON order_line_items
  FOR EACH ROW
  EXECUTE FUNCTION update_order_line_items_updated_at();

DROP TRIGGER IF EXISTS trigger_update_payment_intents_updated_at ON payment_intents;
CREATE TRIGGER trigger_update_payment_intents_updated_at
  BEFORE UPDATE ON payment_intents
  FOR EACH ROW
  EXECUTE FUNCTION update_payment_intents_updated_at();

-- Function to initialize balance account for new users
CREATE OR REPLACE FUNCTION create_balance_account_for_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO balance_accounts (user_id, current_balance, currency)
  VALUES (NEW.user_id, 0.00, 'USD')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create balance account when user profile created
DROP TRIGGER IF EXISTS trigger_create_balance_account ON user_profiles;
CREATE TRIGGER trigger_create_balance_account
  AFTER INSERT ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION create_balance_account_for_user();

-- Comments for documentation
COMMENT ON TABLE balance_accounts IS 'Tracks running balance for each merchant (negative = owes supplier)';
COMMENT ON TABLE balance_transactions IS 'Ledger of all balance changes (orders debit, payments credit)';
COMMENT ON TABLE order_line_items IS 'Products within Shopify orders with COGS tracking';
COMMENT ON TABLE invoice_line_items IS 'Line items on invoices linking to specific orders';
COMMENT ON TABLE payment_intents IS 'Tracks Stripe and wire transfer payments (with 3% platform fee)';
COMMENT ON COLUMN balance_accounts.current_balance IS 'Negative = merchant owes, Positive = merchant has credit';
COMMENT ON COLUMN balance_transactions.amount IS 'Positive = credit to merchant, Negative = debit from merchant';
COMMENT ON COLUMN payment_intents.platform_fee IS '3% commission taken by platform on all payments';
