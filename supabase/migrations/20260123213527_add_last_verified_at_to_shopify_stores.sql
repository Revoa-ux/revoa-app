/*
  # Add Last Verified At Tracking to Shopify Stores
  
  1. Changes
    - Add `last_verified_at` column to `shopify_stores` table
    - Tracks when subscription state was last verified with Shopify
    - Used for freshness detection and stale cache prevention
    - Defaults to NOW() for existing stores
  
  2. Purpose
    - Enable staleness detection (refresh if >5 minutes old)
    - Ensure UI always has recent Shopify subscription state
    - Support "Shopify as source of truth" architecture
*/

-- Add last_verified_at column
ALTER TABLE shopify_stores 
ADD COLUMN IF NOT EXISTS last_verified_at timestamptz DEFAULT now();

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_shopify_stores_last_verified 
ON shopify_stores(last_verified_at);

-- Add comment for documentation
COMMENT ON COLUMN shopify_stores.last_verified_at IS 
'Timestamp of last successful verification with Shopify API. Used to detect stale cache and trigger re-verification.';