/*
  # Create Super Admin User

  1. Changes
    - Create super admin user for tyler@revoa.app
    - Set up initial admin role and permissions
    - Set password for the account

  2. Security
    - Store hashed password securely
    - Grant super admin privileges
*/

-- First, create the auth user if it doesn't exist
INSERT INTO auth.users (
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  aud,
  role
)
SELECT 
  'tyler@revoa.app',
  crypt('Revoa2025!', gen_salt('bf')), -- Password: Revoa2025!
  now(),
  now(),
  now(),
  '{"provider": "email", "role": "super_admin"}'::jsonb,
  '{}'::jsonb,
  'authenticated',
  'authenticated'
WHERE NOT EXISTS (
  SELECT 1 FROM auth.users WHERE email = 'tyler@revoa.app'
)
RETURNING id;

-- Then create the admin user with super_admin role
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
  now(),
  now(),
  jsonb_build_object(
    'created_by', 'system',
    'is_initial_admin', true
  )
FROM auth.users users
WHERE users.email = 'tyler@revoa.app'
AND NOT EXISTS (
  SELECT 1 FROM admin_users WHERE email = 'tyler@revoa.app'
);

-- Add helpful comment
COMMENT ON TABLE admin_users IS 'Stores admin team member information and metrics';