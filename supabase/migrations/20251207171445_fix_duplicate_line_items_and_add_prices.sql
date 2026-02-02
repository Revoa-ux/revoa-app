/*
  # Fix Duplicate Line Items and Add Customer Prices

  1. Changes
    - Remove duplicate line items from order_line_items table
    - Add unique constraint to prevent future duplicates
    - Add customer-facing price fields (unit_price)
    
  2. Details
    - Keeps only the first occurrence of each duplicate line item
    - Creates unique index on (shopify_order_id, product_name, variant_name)
    - Adds unit_price column to store customer-facing prices (not COGS)
    
  3. Notes
    - This will clean up the 4 duplicate items in order #1008
    - Future webhook inserts will use upsert to prevent duplicates
*/

-- Delete duplicate line items, keeping only the first occurrence
DELETE FROM order_line_items a
USING order_line_items b
WHERE a.id < b.id
  AND a.shopify_order_id = b.shopify_order_id
  AND a.product_name = b.product_name
  AND COALESCE(a.variant_name, '') = COALESCE(b.variant_name, '');

-- Add customer-facing unit_price column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'order_line_items' AND column_name = 'unit_price'
  ) THEN
    ALTER TABLE order_line_items ADD COLUMN unit_price decimal(10, 2) DEFAULT 0;
  END IF;
END $$;

-- Create unique index to prevent future duplicates
CREATE UNIQUE INDEX IF NOT EXISTS order_line_items_unique_idx
ON order_line_items (shopify_order_id, product_name, COALESCE(variant_name, ''));

-- Add comment to table
COMMENT ON COLUMN order_line_items.unit_price IS 'Customer-facing price per unit (not COGS)';
