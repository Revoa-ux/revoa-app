/*
  # Fix Admin Authentication

  1. Changes
    - Update admin user password
    - Ensure email is confirmed
    - Set proper role and permissions
    - Fix RLS policies

  2. Security
    - Store password securely
    - Enable immediate access
*/

-- Update admin user password and confirm email
UPDATE auth.users
SET 
  encrypted_password = crypt('Revoa2025!', gen_salt('bf')),
  email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
  updated_at = NOW(),
  raw_app_meta_data = jsonb_build_object(
    'provider', 'email',
    'providers', ARRAY['email']
  )
WHERE email = 'tyler@revoa.app';

-- Ensure admin user exists in admin_users table
INSERT INTO admin_users (
  user_id,
  role,
  email,
  assigned_users_count,
  total_transaction_volume,
  created_at,
  updated_at,
  metadata
)
SELECT
  users.id,
  'super_admin',
  'tyler@revoa.app',
  0,
  0,
  NOW(),
  NOW(),
  jsonb_build_object(
    'created_by', 'system',
    'is_initial_admin', true,
    'permissions', array['manage_users', 'manage_admins', 'manage_settings']
  )
FROM auth.users users
WHERE users.email = 'tyler@revoa.app'
ON CONFLICT (email) DO UPDATE
SET
  user_id = EXCLUDED.user_id,
  role = 'super_admin',
  updated_at = NOW(),
  metadata = EXCLUDED.metadata;

-- Drop and recreate admin auth policies
DROP POLICY IF EXISTS "Allow public access for admin auth" ON admin_users;
DROP POLICY IF EXISTS "Service role has full access" ON admin_users;
DROP POLICY IF EXISTS "Admins can update own profile" ON admin_users;

CREATE POLICY "Allow public access for admin auth"
  ON admin_users
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Service role has full access"
  ON admin_users
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admins can update own profile"
  ON admin_users
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());