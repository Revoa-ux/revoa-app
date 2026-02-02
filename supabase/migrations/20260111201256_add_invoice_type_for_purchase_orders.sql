/*
  # Add Invoice Type for Purchase Orders

  1. Changes to `invoices` table
    - Add `invoice_type` column to distinguish between:
      - 'auto_generated' - invoices from Shopify orders
      - 'purchase_order' - inventory replenishment orders
      - 'manual' - manually created invoices
    - Default to 'auto_generated' for existing invoices

  2. Changes to `products` table
    - Add `pending_order_quantity` column to track items currently in pending purchase orders

  3. Indexes
    - Index on invoice_type for efficient filtering
*/

-- Add invoice_type column to invoices table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoices' AND column_name = 'invoice_type'
  ) THEN
    ALTER TABLE invoices ADD COLUMN invoice_type text DEFAULT 'auto_generated' 
      CHECK (invoice_type IN ('auto_generated', 'purchase_order', 'manual'));
  END IF;
END $$;

-- Add index for efficient filtering by invoice type
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_type ON invoices(invoice_type);

-- Add pending_order_quantity to products table to track pending purchase orders
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'pending_order_quantity'
  ) THEN
    ALTER TABLE products ADD COLUMN pending_order_quantity integer DEFAULT 0;
  END IF;
END $$;

-- Create purchase_order_items table to track individual line items in purchase orders
CREATE TABLE IF NOT EXISTS purchase_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity integer NOT NULL CHECK (quantity > 0),
  unit_cost decimal(10, 2) NOT NULL,
  total_cost decimal(10, 2) NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'ordered', 'fulfilled', 'cancelled')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on purchase_order_items
ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;

-- Users can view their own purchase order items
CREATE POLICY "Users can view own purchase order items"
  ON purchase_order_items
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM invoices
      WHERE invoices.id = purchase_order_items.invoice_id
      AND invoices.user_id = auth.uid()
    )
  );

-- Users can create purchase order items for their own invoices
CREATE POLICY "Users can create own purchase order items"
  ON purchase_order_items
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM invoices
      WHERE invoices.id = purchase_order_items.invoice_id
      AND invoices.user_id = auth.uid()
    )
  );

-- Admins can view all purchase order items
CREATE POLICY "Admins can view all purchase order items"
  ON purchase_order_items
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
    )
  );

-- Super admins can manage all purchase order items
CREATE POLICY "Super admins can manage all purchase order items"
  ON purchase_order_items
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

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_purchase_order_items_invoice_id ON purchase_order_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_purchase_order_items_product_id ON purchase_order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_purchase_order_items_status ON purchase_order_items(status);

-- Function to update pending_order_quantity when purchase order items change
CREATE OR REPLACE FUNCTION update_product_pending_quantity()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE products
    SET pending_order_quantity = pending_order_quantity + NEW.quantity
    WHERE id = NEW.product_id;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status IN ('pending', 'paid') AND NEW.status IN ('ordered', 'fulfilled', 'cancelled') THEN
      UPDATE products
      SET pending_order_quantity = GREATEST(0, pending_order_quantity - NEW.quantity)
      WHERE id = NEW.product_id;
    ELSIF OLD.quantity != NEW.quantity AND NEW.status IN ('pending', 'paid') THEN
      UPDATE products
      SET pending_order_quantity = GREATEST(0, pending_order_quantity - OLD.quantity + NEW.quantity)
      WHERE id = NEW.product_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.status IN ('pending', 'paid') THEN
      UPDATE products
      SET pending_order_quantity = GREATEST(0, pending_order_quantity - OLD.quantity)
      WHERE id = OLD.product_id;
    END IF;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- Create trigger for purchase_order_items
DROP TRIGGER IF EXISTS purchase_order_items_quantity_trigger ON purchase_order_items;
CREATE TRIGGER purchase_order_items_quantity_trigger
  AFTER INSERT OR UPDATE OR DELETE ON purchase_order_items
  FOR EACH ROW
  EXECUTE FUNCTION update_product_pending_quantity();
