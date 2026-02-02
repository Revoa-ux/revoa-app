/*
  # Add missing columns to ads table

  1. Changes
    - Add `platform` column (text, not null, default 'facebook')
    - Add `creative_id` column (text, nullable) to store Facebook creative ID
    - Add `creative_name` column (text, nullable) to store creative name
    - Add `creative_thumbnail_url` column (text, nullable) to store creative preview image
  
  2. Notes
    - All columns are added safely with IF NOT EXISTS checks
    - Creative fields allow tracking visual ad content from Facebook
*/

DO $$ 
BEGIN
  -- Add platform column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'ads' AND column_name = 'platform'
  ) THEN
    ALTER TABLE ads ADD COLUMN platform text NOT NULL DEFAULT 'facebook';
  END IF;

  -- Add creative_id column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'ads' AND column_name = 'creative_id'
  ) THEN
    ALTER TABLE ads ADD COLUMN creative_id text;
  END IF;

  -- Add creative_name column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'ads' AND column_name = 'creative_name'
  ) THEN
    ALTER TABLE ads ADD COLUMN creative_name text;
  END IF;

  -- Add creative_thumbnail_url column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'ads' AND column_name = 'creative_thumbnail_url'
  ) THEN
    ALTER TABLE ads ADD COLUMN creative_thumbnail_url text;
  END IF;
END $$;
