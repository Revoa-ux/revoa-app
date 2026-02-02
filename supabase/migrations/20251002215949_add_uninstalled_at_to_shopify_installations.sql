/*
  # Add uninstalled_at column to shopify_installations
  
  1. Changes
    - Add `uninstalled_at` column to track when app was uninstalled
    - This allows us to maintain history and handle reinstalls properly
  
  2. Notes
    - Column is nullable since existing installations haven't been uninstalled
    - Webhook handler will populate this when app/uninstalled is received
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'shopify_installations' AND column_name = 'uninstalled_at'
  ) THEN
    ALTER TABLE shopify_installations ADD COLUMN uninstalled_at timestamptz;
  END IF;
END $$;

COMMENT ON COLUMN shopify_installations.uninstalled_at IS 'Timestamp when the app was uninstalled from this store';
