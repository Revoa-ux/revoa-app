/*
  # Link Ad Accounts to Shopify Stores

  1. Changes
    - Add `shopify_store_id` column to `ad_accounts` table
    - Link ad accounts to Shopify stores for proper data attribution
    - This enables tracking ad spend → orders → COGS for specific stores

  2. Important
    - Allows NULL for backward compatibility with existing ad accounts
    - Users should link ad accounts to stores in Settings UI
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ad_accounts' AND column_name = 'shopify_store_id'
  ) THEN
    ALTER TABLE ad_accounts ADD COLUMN shopify_store_id uuid REFERENCES shopify_installations(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_ad_accounts_shopify_store_id ON ad_accounts(shopify_store_id);
  END IF;
END $$;
