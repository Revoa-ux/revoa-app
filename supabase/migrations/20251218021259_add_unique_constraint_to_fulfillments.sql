/*
  # Add Unique Constraint to Fulfillments Table

  1. Changes
    - Add unique constraint on (user_id, shopify_fulfillment_id) to prevent duplicate tracking records
    - This enables upsert operations when syncing fulfillment data from Shopify

  2. Security
    - No changes to RLS policies
*/

-- Add unique constraint to prevent duplicate fulfillment records
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'shopify_order_fulfillments_user_fulfillment_unique'
  ) THEN
    ALTER TABLE shopify_order_fulfillments
      ADD CONSTRAINT shopify_order_fulfillments_user_fulfillment_unique
      UNIQUE (user_id, shopify_fulfillment_id);
  END IF;
END $$;
