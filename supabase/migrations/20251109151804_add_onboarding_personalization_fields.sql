/*
  # Add Onboarding Personalization Fields
  
  1. Changes
    - Add `display_name` to store user's preferred name
    - Add `store_type` to store the type of store they run
    - Add `wants_growth_help` to track if they want expert help
    - Add `onboarding_completed_at` to track when onboarding was completed
    
  2. Notes
    - All fields are optional to support gradual onboarding
    - Uses existing onboarding_completed boolean field
*/

DO $$
BEGIN
  -- Add display_name if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'display_name'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN display_name text;
  END IF;

  -- Add store_type if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'store_type'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN store_type text;
  END IF;

  -- Add wants_growth_help if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'wants_growth_help'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN wants_growth_help boolean;
  END IF;

  -- Add onboarding_completed_at if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'onboarding_completed_at'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN onboarding_completed_at timestamptz;
  END IF;
END $$;
