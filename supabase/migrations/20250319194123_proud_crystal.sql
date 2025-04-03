/*
  # Create Initial Admin User

  1. Changes
    - Create initial super admin user
    - Set up proper role and permissions
    - Add metadata for tracking

  2. Security
    - Ensure proper role assignment
    - Set up initial permissions
*/

-- First ensure we have the admin_role type
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'admin_role') THEN
    CREATE TYPE admin_role AS ENUM ('admin', 'super_admin');
  END IF;
END $$;

-- Create initial admin user record
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
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP,
  jsonb_build_object(
    'created_by', 'system',
    'is_initial_admin', true,
    'permissions', array['manage_users', 'manage_admins', 'manage_settings']
  )
FROM auth.users users
WHERE users.email = 'tyler@revoa.app'
ON CONFLICT (user_id) DO UPDATE
SET
  role = 'super_admin',
  metadata = jsonb_build_object(
    'created_by', 'system',
    'is_initial_admin', true,
    'permissions', array['manage_users', 'manage_admins', 'manage_settings']
  ),
  updated_at = CURRENT_TIMESTAMP;

-- Drop existing policies
DROP POLICY IF EXISTS "Allow public access for admin auth" ON admin_users;
DROP POLICY IF EXISTS "Service role has full access" ON admin_users;
DROP POLICY IF EXISTS "Admins can update own profile" ON admin_users;

-- Create new policies
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

-- Add helpful comment
COMMENT ON TABLE admin_users IS 'Stores admin team member information and metrics';