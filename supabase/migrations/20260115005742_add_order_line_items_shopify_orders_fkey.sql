/*
  # Add foreign key relationship between order_line_items and shopify_orders

  1. Changes
    - Add foreign key constraint from order_line_items(user_id, shopify_order_id) to shopify_orders(user_id, shopify_order_id)
    - This enables Supabase joins between these tables using the composite key

  2. Notes
    - This fixes the PGRST200 error when querying order_line_items with shopify_orders join
    - The relationship is based on the composite unique constraint (user_id, shopify_order_id)
*/

-- Add foreign key constraint from order_line_items to shopify_orders
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'order_line_items_shopify_order_fkey'
  ) THEN
    ALTER TABLE order_line_items
    ADD CONSTRAINT order_line_items_shopify_order_fkey
    FOREIGN KEY (user_id, shopify_order_id) 
    REFERENCES shopify_orders(user_id, shopify_order_id)
    ON DELETE CASCADE;
  END IF;
END $$;

-- Create index for better join performance
CREATE INDEX IF NOT EXISTS idx_order_line_items_user_shopify_order 
ON order_line_items(user_id, shopify_order_id);
