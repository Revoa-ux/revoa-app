/*
  # Add Comprehensive Shopify Order Fields
  
  1. New Columns to shopify_orders
    - billing_address_line1, billing_address_line2, billing_city, billing_state, billing_zip, billing_country
    - discount_codes (text array)
    - total_discounts (numeric)
    - subtotal_price (numeric)
    - total_tax (numeric)
    - total_shipping (numeric)
    - note (text) - customer notes
    - tags (text) - Shopify tags for order
    - is_repeat_customer (boolean)
    - order_count (integer) - number of orders this customer has placed
    - cancelled_at (timestamptz)
    - cancel_reason (text)
    - processed_at (timestamptz)
  
  2. Security
    - No RLS changes needed, existing policies cover new columns
*/

-- Add billing address fields
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'shopify_orders' AND column_name = 'billing_address_line1'
  ) THEN
    ALTER TABLE shopify_orders ADD COLUMN billing_address_line1 text;
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'shopify_orders' AND column_name = 'billing_address_line2'
  ) THEN
    ALTER TABLE shopify_orders ADD COLUMN billing_address_line2 text;
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'shopify_orders' AND column_name = 'billing_city'
  ) THEN
    ALTER TABLE shopify_orders ADD COLUMN billing_city text;
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'shopify_orders' AND column_name = 'billing_state'
  ) THEN
    ALTER TABLE shopify_orders ADD COLUMN billing_state text;
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'shopify_orders' AND column_name = 'billing_zip'
  ) THEN
    ALTER TABLE shopify_orders ADD COLUMN billing_zip text;
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'shopify_orders' AND column_name = 'billing_country'
  ) THEN
    ALTER TABLE shopify_orders ADD COLUMN billing_country text;
  END IF;
END $$;

-- Add discount and pricing details
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'shopify_orders' AND column_name = 'discount_codes'
  ) THEN
    ALTER TABLE shopify_orders ADD COLUMN discount_codes text[] DEFAULT '{}';
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'shopify_orders' AND column_name = 'total_discounts'
  ) THEN
    ALTER TABLE shopify_orders ADD COLUMN total_discounts numeric DEFAULT 0;
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'shopify_orders' AND column_name = 'subtotal_price'
  ) THEN
    ALTER TABLE shopify_orders ADD COLUMN subtotal_price numeric DEFAULT 0;
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'shopify_orders' AND column_name = 'total_tax'
  ) THEN
    ALTER TABLE shopify_orders ADD COLUMN total_tax numeric DEFAULT 0;
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'shopify_orders' AND column_name = 'total_shipping'
  ) THEN
    ALTER TABLE shopify_orders ADD COLUMN total_shipping numeric DEFAULT 0;
  END IF;
END $$;

-- Add customer notes and tags
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'shopify_orders' AND column_name = 'note'
  ) THEN
    ALTER TABLE shopify_orders ADD COLUMN note text;
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'shopify_orders' AND column_name = 'tags'
  ) THEN
    ALTER TABLE shopify_orders ADD COLUMN tags text;
  END IF;
END $$;

-- Add repeat customer tracking
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'shopify_orders' AND column_name = 'is_repeat_customer'
  ) THEN
    ALTER TABLE shopify_orders ADD COLUMN is_repeat_customer boolean DEFAULT false;
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'shopify_orders' AND column_name = 'order_count'
  ) THEN
    ALTER TABLE shopify_orders ADD COLUMN order_count integer DEFAULT 1;
  END IF;
END $$;

-- Add cancellation tracking
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'shopify_orders' AND column_name = 'cancelled_at'
  ) THEN
    ALTER TABLE shopify_orders ADD COLUMN cancelled_at timestamptz;
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'shopify_orders' AND column_name = 'cancel_reason'
  ) THEN
    ALTER TABLE shopify_orders ADD COLUMN cancel_reason text;
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'shopify_orders' AND column_name = 'processed_at'
  ) THEN
    ALTER TABLE shopify_orders ADD COLUMN processed_at timestamptz;
  END IF;
END $$;

-- Create index on customer email for repeat customer lookups
CREATE INDEX IF NOT EXISTS idx_shopify_orders_customer_email ON shopify_orders(customer_email) WHERE customer_email IS NOT NULL;

-- Create index on tags for filtering
CREATE INDEX IF NOT EXISTS idx_shopify_orders_tags ON shopify_orders USING gin(to_tsvector('english', COALESCE(tags, ''))) WHERE tags IS NOT NULL;
