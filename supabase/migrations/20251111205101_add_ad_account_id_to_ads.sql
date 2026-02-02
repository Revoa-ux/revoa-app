/*
  # Add ad_account_id to ads table

  1. Changes
    - Add ad_account_id column to ads table to link ads to their ad accounts
    - This enables proper deep linking to Facebook Ads Manager with the correct account context
    
  2. Notes
    - Column is nullable to support existing data
    - Will be populated by sync process going forward
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ads' AND column_name = 'ad_account_id'
  ) THEN
    ALTER TABLE ads ADD COLUMN ad_account_id uuid REFERENCES ad_accounts(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_ads_ad_account_id ON ads(ad_account_id);
  END IF;
END $$;
