/*
  # Fix Admin User Password

  1. Changes
    - Update password for tyler.jtw@gmail.com
    - Ensure email is confirmed
    - Update metadata and permissions

  2. Security
    - Store password securely using crypt
    - Maintain existing permissions
*/

-- Update admin user password and metadata
UPDATE auth.users
SET 
  encrypted_password = crypt('Twitk1017', gen_salt('bf')),
  email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
  raw_app_meta_data = jsonb_build_object(
    'provider', 'email',
    'providers', ARRAY['email']
  ),
  raw_user_meta_data = jsonb_build_object(
    'is_admin', true,
    'permissions', ARRAY['manage_users', 'manage_admins', 'manage_settings']
  ),
  updated_at = NOW()
WHERE email = 'tyler.jtw@gmail.com';

-- Ensure user profile exists with admin privileges
INSERT INTO user_profiles (
  user_id,
  email,
  onboarding_completed,
  is_admin,
  admin_role,
  admin_permissions,
  admin_status,
  metadata,
  created_at,
  updated_at
)
SELECT
  id,
  email,
  true,
  true,
  'super_admin',
  ARRAY['manage_users', 'manage_admins', 'manage_settings'],
  'active',
  jsonb_build_object(
    'signup_source', 'email',
    'initial_role', 'super_admin',
    'created_by', 'system',
    'created_at', NOW()
  ),
  NOW(),
  NOW()
FROM auth.users
WHERE email = 'tyler.jtw@gmail.com'
ON CONFLICT (email) DO UPDATE
SET
  onboarding_completed = EXCLUDED.onboarding_completed,
  is_admin = EXCLUDED.is_admin,
  admin_role = EXCLUDED.admin_role,
  admin_permissions = EXCLUDED.admin_permissions,
  admin_status = EXCLUDED.admin_status,
  metadata = EXCLUDED.metadata,
  updated_at = EXCLUDED.updated_at;