/*
  # Factory Orders System

  1. New Tables
    - `factory_orders`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references user_profiles) - the merchant this order is for
      - `invoice_id` (uuid, nullable, references invoices) - linked invoice if applicable
      - `status` (text) - ordered, in_transit, arrived, allocated
      - `line_items` (jsonb) - array of SKU, product_name, quantity, unit_cost, total_cost
      - `total_amount` (decimal) - total order value
      - `ordered_at` (timestamptz) - when order was placed with factory
      - `created_by` (uuid) - admin who placed the order
      - `notes` (text) - optional notes
      - `created_at`, `updated_at` (timestamps)
    
    - `invoice_factory_allocations`
      - `id` (uuid, primary key)
      - `invoice_id` (uuid, references invoices)
      - `factory_order_id` (uuid, references factory_orders)
      - `amount_allocated` (decimal) - amount from invoice used for this order
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on both tables
    - Policies for admin access based on user assignments
    - Super admins have full access

  3. Indexes
    - Index on user_id, invoice_id, status for efficient queries
*/

-- Create factory_orders table
CREATE TABLE IF NOT EXISTS factory_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  invoice_id uuid REFERENCES invoices(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'ordered' CHECK (status IN ('ordered', 'in_transit', 'arrived', 'allocated', 'cancelled')),
  line_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  total_amount decimal(12, 2) NOT NULL DEFAULT 0,
  ordered_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  notes text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create invoice_factory_allocations table for tracking partial orders
CREATE TABLE IF NOT EXISTS invoice_factory_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  factory_order_id uuid NOT NULL REFERENCES factory_orders(id) ON DELETE CASCADE,
  amount_allocated decimal(12, 2) NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(invoice_id, factory_order_id)
);

-- Add factory_order_placed column to invoices to track if order has been placed
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoices' AND column_name = 'factory_order_placed'
  ) THEN
    ALTER TABLE invoices ADD COLUMN factory_order_placed boolean DEFAULT false;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoices' AND column_name = 'factory_order_amount'
  ) THEN
    ALTER TABLE invoices ADD COLUMN factory_order_amount decimal(12, 2) DEFAULT 0;
  END IF;
END $$;

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_factory_orders_user_id ON factory_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_factory_orders_invoice_id ON factory_orders(invoice_id);
CREATE INDEX IF NOT EXISTS idx_factory_orders_status ON factory_orders(status);
CREATE INDEX IF NOT EXISTS idx_factory_orders_created_at ON factory_orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_invoice_factory_allocations_invoice_id ON invoice_factory_allocations(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_factory_allocations_factory_order_id ON invoice_factory_allocations(factory_order_id);

-- Enable RLS
ALTER TABLE factory_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_factory_allocations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Super admins can manage all factory orders" ON factory_orders;
DROP POLICY IF EXISTS "Admins can view assigned user factory orders" ON factory_orders;
DROP POLICY IF EXISTS "Admins can create factory orders for assigned users" ON factory_orders;
DROP POLICY IF EXISTS "Admins can update factory orders for assigned users" ON factory_orders;
DROP POLICY IF EXISTS "Super admins can manage all allocations" ON invoice_factory_allocations;
DROP POLICY IF EXISTS "Admins can view allocations for assigned users" ON invoice_factory_allocations;
DROP POLICY IF EXISTS "Admins can create allocations for assigned users" ON invoice_factory_allocations;

-- Policies for factory_orders
CREATE POLICY "Super admins can manage all factory orders"
  ON factory_orders
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_super_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_super_admin = true
    )
  );

CREATE POLICY "Admins can view assigned user factory orders"
  ON factory_orders
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
      AND up.is_admin = true
      AND (
        up.is_super_admin = true
        OR EXISTS (
          SELECT 1 FROM user_assignments ua
          WHERE ua.admin_id = auth.uid()
          AND ua.user_id = factory_orders.user_id
        )
      )
    )
  );

CREATE POLICY "Admins can create factory orders for assigned users"
  ON factory_orders
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
      AND up.is_admin = true
      AND (
        up.is_super_admin = true
        OR EXISTS (
          SELECT 1 FROM user_assignments ua
          WHERE ua.admin_id = auth.uid()
          AND ua.user_id = factory_orders.user_id
        )
      )
    )
  );

CREATE POLICY "Admins can update factory orders for assigned users"
  ON factory_orders
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
      AND up.is_admin = true
      AND (
        up.is_super_admin = true
        OR EXISTS (
          SELECT 1 FROM user_assignments ua
          WHERE ua.admin_id = auth.uid()
          AND ua.user_id = factory_orders.user_id
        )
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
      AND up.is_admin = true
      AND (
        up.is_super_admin = true
        OR EXISTS (
          SELECT 1 FROM user_assignments ua
          WHERE ua.admin_id = auth.uid()
          AND ua.user_id = factory_orders.user_id
        )
      )
    )
  );

-- Policies for invoice_factory_allocations
CREATE POLICY "Super admins can manage all allocations"
  ON invoice_factory_allocations
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_super_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_super_admin = true
    )
  );

CREATE POLICY "Admins can view allocations for assigned users"
  ON invoice_factory_allocations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
      AND up.is_admin = true
      AND (
        up.is_super_admin = true
        OR EXISTS (
          SELECT 1 FROM invoices i
          JOIN user_assignments ua ON ua.user_id = i.user_id
          WHERE i.id = invoice_factory_allocations.invoice_id
          AND ua.admin_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Admins can create allocations for assigned users"
  ON invoice_factory_allocations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
      AND up.is_admin = true
      AND (
        up.is_super_admin = true
        OR EXISTS (
          SELECT 1 FROM invoices i
          JOIN user_assignments ua ON ua.user_id = i.user_id
          WHERE i.id = invoice_factory_allocations.invoice_id
          AND ua.admin_id = auth.uid()
        )
      )
    )
  );

-- Create updated_at trigger for factory_orders
CREATE OR REPLACE FUNCTION update_factory_orders_updated_at()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS factory_orders_updated_at ON factory_orders;
CREATE TRIGGER factory_orders_updated_at
  BEFORE UPDATE ON factory_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_factory_orders_updated_at();
