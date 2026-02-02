/*
  # Fix Admin Authentication

  1. Changes
    - Update user_profiles table to store admin info
    - Add admin-specific columns
    - Update existing admin user

  2. Security
    - Maintain proper role assignments
    - Keep existing permissions
*/

-- Add admin-related columns to user_profiles if they don't exist
ALTER TABLE user_profiles 
  ADD COLUMN IF NOT EXISTS is_admin boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS admin_role text CHECK (admin_role IN ('admin', 'super_admin')),
  ADD COLUMN IF NOT EXISTS admin_permissions text[] DEFAULT ARRAY[]::text[],
  ADD COLUMN IF NOT EXISTS admin_status text DEFAULT 'active' CHECK (admin_status IN ('active', 'inactive', 'pending'));

-- Update existing admin user
UPDATE user_profiles
SET
  is_admin = true,
  admin_role = 'super_admin',
  admin_permissions = ARRAY['manage_users', 'manage_admins', 'manage_settings'],
  admin_status = 'active',
  onboarding_completed = true,
  metadata = jsonb_build_object(
    'signup_source', 'email',
    'initial_role', 'super_admin',
    'created_by', 'system',
    'created_at', NOW()
  )
WHERE email = 'tyler.jtw@gmail.com';

-- Add helpful comments
COMMENT ON COLUMN user_profiles.is_admin IS 'Indicates if the user has admin privileges';
COMMENT ON COLUMN user_profiles.admin_role IS 'The specific admin role assigned to the user';
COMMENT ON COLUMN user_profiles.admin_permissions IS 'Array of admin permissions granted to the user';
COMMENT ON COLUMN user_profiles.admin_status IS 'Current status of the admin account';