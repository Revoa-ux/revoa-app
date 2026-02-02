/*
  # Add first_name and last_name to user_profiles

  1. Changes
    - Add first_name column to user_profiles
    - Add last_name column to user_profiles
    - Add phone column to user_profiles
    - Add company column to user_profiles
    
  2. Purpose
    - Store structured name data for profile settings
    - Support full profile information display
    - Sync with onboarding display_name field
    
  3. Notes
    - display_name field remains for onboarding compatibility
    - firstName + lastName can be used to generate or update display_name
*/

DO $$
BEGIN
  -- Add first_name if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'first_name'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN first_name text;
  END IF;

  -- Add last_name if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'last_name'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN last_name text;
  END IF;

  -- Add phone if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'phone'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN phone text;
  END IF;

  -- Add company if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'company'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN company text;
  END IF;
END $$;

-- Add comment
COMMENT ON COLUMN user_profiles.first_name IS 'User first name for profile display';
COMMENT ON COLUMN user_profiles.last_name IS 'User last name for profile display';
COMMENT ON COLUMN user_profiles.phone IS 'User phone number';
COMMENT ON COLUMN user_profiles.company IS 'User company name';