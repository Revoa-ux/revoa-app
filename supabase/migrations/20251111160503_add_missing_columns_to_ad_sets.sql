/*
  # Add missing columns to ad_sets table

  1. Changes
    - Add `campaign_id` column (uuid, foreign key to ad_campaigns) - alias for ad_campaign_id
    - Add `platform` column (text, not null, default 'facebook')
    - Add `daily_budget` column (numeric, nullable)
    - Add `lifetime_budget` column (numeric, nullable)
  
  2. Notes
    - campaign_id is an alias that references ad_campaign_id for API compatibility
    - All columns are added safely with IF NOT EXISTS checks
*/

DO $$ 
BEGIN
  -- Add campaign_id as alias for ad_campaign_id if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'ad_sets' AND column_name = 'campaign_id'
  ) THEN
    ALTER TABLE ad_sets ADD COLUMN campaign_id uuid REFERENCES ad_campaigns(id) ON DELETE CASCADE;
    -- Copy existing ad_campaign_id values to campaign_id
    UPDATE ad_sets SET campaign_id = ad_campaign_id WHERE campaign_id IS NULL;
  END IF;

  -- Add platform column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'ad_sets' AND column_name = 'platform'
  ) THEN
    ALTER TABLE ad_sets ADD COLUMN platform text NOT NULL DEFAULT 'facebook';
  END IF;

  -- Add daily_budget column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'ad_sets' AND column_name = 'daily_budget'
  ) THEN
    ALTER TABLE ad_sets ADD COLUMN daily_budget numeric;
  END IF;

  -- Add lifetime_budget column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'ad_sets' AND column_name = 'lifetime_budget'
  ) THEN
    ALTER TABLE ad_sets ADD COLUMN lifetime_budget numeric;
  END IF;
END $$;
