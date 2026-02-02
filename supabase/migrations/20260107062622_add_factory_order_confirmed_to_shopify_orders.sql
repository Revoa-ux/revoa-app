/*
  # Add factory order tracking to shopify_orders

  1. Changes
    - Add `factory_order_confirmed` column to shopify_orders
    - Add index for efficient queries on factory_order_confirmed
  
  2. Purpose
    - Track when orders are ready to be exported to 3PL after factory order confirmation
    - Bridge the gap between invoices (factory_order_placed) and shopify_orders
*/

-- Add factory_order_confirmed column to shopify_orders
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'shopify_orders' AND column_name = 'factory_order_confirmed'
  ) THEN
    ALTER TABLE shopify_orders ADD COLUMN factory_order_confirmed boolean DEFAULT false;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'shopify_orders' AND column_name = 'factory_order_confirmed_at'
  ) THEN
    ALTER TABLE shopify_orders ADD COLUMN factory_order_confirmed_at timestamptz;
  END IF;
END $$;

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_shopify_orders_factory_order_confirmed 
  ON shopify_orders(factory_order_confirmed) 
  WHERE factory_order_confirmed = true;
