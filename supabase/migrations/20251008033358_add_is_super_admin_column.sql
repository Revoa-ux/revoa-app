/*
  # Add is_super_admin column to user_profiles

  1. Changes
    - Add `is_super_admin` boolean column to `user_profiles` table
    - Default to false for security
    - Set existing admins with 'super_admin' role to true

  2. Security
    - No RLS changes needed (inherits existing policies)
*/

-- Add the is_super_admin column
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS is_super_admin boolean DEFAULT false;

-- Update existing users who have super_admin in their admin_role or metadata
UPDATE user_profiles 
SET is_super_admin = true 
WHERE admin_role = 'super_admin' 
   OR is_admin = true 
   AND email IN (
     'revoafast@gmail.com',
     'super@revoa.app'
   );

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_is_super_admin 
ON user_profiles(is_super_admin) 
WHERE is_super_admin = true;