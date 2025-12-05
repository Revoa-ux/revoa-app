/*
  # Add customer name fields to shopify_orders

  1. Changes
    - Add customer_first_name column to shopify_orders table
    - Add customer_last_name column to shopify_orders table
    - These fields will store the customer's name for better identification in order threads

  2. Security
    - No RLS changes needed as existing policies cover these fields
*/

DO $$ 
BEGIN
  -- Add customer_first_name if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'shopify_orders' 
    AND column_name = 'customer_first_name'
  ) THEN
    ALTER TABLE shopify_orders ADD COLUMN customer_first_name text;
  END IF;

  -- Add customer_last_name if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'shopify_orders' 
    AND column_name = 'customer_last_name'
  ) THEN
    ALTER TABLE shopify_orders ADD COLUMN customer_last_name text;
  END IF;
END $$;