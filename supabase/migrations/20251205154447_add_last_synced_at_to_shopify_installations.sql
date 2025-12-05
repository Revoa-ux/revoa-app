/*
  # Add Order Sync Tracking to Shopify Installations

  1. Changes
    - Add `last_synced_at` column to track when orders were last synced
    - Add `orders_synced_count` column to track total orders synced
    - Add index on last_synced_at for performance
  
  2. Purpose
    - Enable incremental order syncing (only fetch new orders since last sync)
    - Track sync statistics for user display
    - Improve sync performance by avoiding redundant fetches
*/

-- Add last_synced_at column to track when orders were last synced
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'shopify_installations' AND column_name = 'last_synced_at'
  ) THEN
    ALTER TABLE shopify_installations 
    ADD COLUMN last_synced_at timestamptz;
  END IF;
END $$;

-- Add orders_synced_count column to track total orders synced
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'shopify_installations' AND column_name = 'orders_synced_count'
  ) THEN
    ALTER TABLE shopify_installations 
    ADD COLUMN orders_synced_count integer DEFAULT 0;
  END IF;
END $$;

-- Add index on last_synced_at for efficient queries
CREATE INDEX IF NOT EXISTS idx_shopify_installations_last_synced_at 
ON shopify_installations(last_synced_at) 
WHERE last_synced_at IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN shopify_installations.last_synced_at IS 'Timestamp of last successful order sync for incremental syncing';
COMMENT ON COLUMN shopify_installations.orders_synced_count IS 'Total number of orders synced from this installation';