/*
  # Add last_synced_at column to ad_accounts

  1. Changes
    - Add `last_synced_at` column to `ad_accounts` table to track when the account was last synced
    - This allows the sync function to update the timestamp after each successful sync
*/

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ad_accounts' 
      AND column_name = 'last_synced_at'
  ) THEN
    ALTER TABLE ad_accounts 
    ADD COLUMN last_synced_at timestamptz;
  END IF;
END $$;