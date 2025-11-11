/*
  # Add budget columns to ad_campaigns table

  1. Changes
    - Add `daily_budget` column (numeric, nullable) to track daily campaign budgets
    - Add `lifetime_budget` column (numeric, nullable) to track lifetime campaign budgets
    - Keep existing `budget` column for backward compatibility
  
  2. Notes
    - Both columns are nullable since campaigns may not have both types of budgets
    - Values are stored as decimal numbers representing currency amounts
*/

DO $$ 
BEGIN
  -- Add daily_budget column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'ad_campaigns' AND column_name = 'daily_budget'
  ) THEN
    ALTER TABLE ad_campaigns ADD COLUMN daily_budget numeric;
  END IF;

  -- Add lifetime_budget column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'ad_campaigns' AND column_name = 'lifetime_budget'
  ) THEN
    ALTER TABLE ad_campaigns ADD COLUMN lifetime_budget numeric;
  END IF;
END $$;
