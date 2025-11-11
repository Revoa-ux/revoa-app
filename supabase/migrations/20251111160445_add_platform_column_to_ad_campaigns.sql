/*
  # Add platform column to ad_campaigns table

  1. Changes
    - Add `platform` column (text, not null, default 'facebook') to identify the ad platform
  
  2. Notes
    - Default to 'facebook' for existing records
    - This allows supporting multiple ad platforms in the future
*/

DO $$ 
BEGIN
  -- Add platform column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'ad_campaigns' AND column_name = 'platform'
  ) THEN
    ALTER TABLE ad_campaigns ADD COLUMN platform text NOT NULL DEFAULT 'facebook';
  END IF;
END $$;
