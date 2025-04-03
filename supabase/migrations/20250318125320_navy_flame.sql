/*
  # Fix Admin User Creation

  1. Changes
    - Create initial super admin user
    - Add proper user_id reference
    - Add proper constraints and checks

  2. Security
    - Ensure proper user_id linking
    - Maintain data integrity
*/

-- First, ensure the user exists in auth.users
INSERT INTO auth.users (
  id,
  email,
  email_confirmed_at,
  created_at,
  updated_at
)
SELECT 
  gen_random_uuid(),
  'tyler@revoa.app',
  now(),
  now(),
  now()
WHERE NOT EXISTS (
  SELECT 1 FROM auth.users WHERE email = 'tyler@revoa.app'
)
RETURNING id;

-- Then create the admin user with the correct user_id reference
INSERT INTO admin_users (
  user_id,
  role,
  email,
  assigned_users_count,
  total_transaction_volume,
  created_at,
  updated_at
)
SELECT
  users.id,
  'super_admin',
  'tyler@revoa.app',
  0,
  0,
  now(),
  now()
FROM auth.users users
WHERE users.email = 'tyler@revoa.app'
AND NOT EXISTS (
  SELECT 1 FROM admin_users WHERE email = 'tyler@revoa.app'
);

-- Add helpful comment
COMMENT ON TABLE admin_users IS 'Stores admin team member information and metrics';