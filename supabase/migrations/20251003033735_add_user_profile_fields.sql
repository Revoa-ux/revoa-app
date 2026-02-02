/*
  # Add User Profile Fields

  1. Changes
    - Add name field to user_profiles
    - Add store_type field (general, niche, single_product)
    - Add wants_growth_assistance boolean field
    
  2. Security
    - Existing RLS policies will apply to these new fields
*/

-- Add new fields to user_profiles
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' AND column_name = 'name'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN name text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' AND column_name = 'store_type'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN store_type text CHECK (store_type IN ('general', 'niche', 'single_product'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' AND column_name = 'wants_growth_assistance'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN wants_growth_assistance boolean DEFAULT false;
  END IF;
END $$;