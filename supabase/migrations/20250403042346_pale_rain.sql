-- Create admin_users table if it doesn't exist
CREATE TABLE IF NOT EXISTS admin_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('admin', 'super_admin')),
  email text NOT NULL UNIQUE,
  last_active_at timestamptz,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Enable RLS
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Update admin user password and confirm email
UPDATE auth.users
SET 
  encrypted_password = crypt(encode(gen_random_bytes(16), 'hex'), gen_salt('bf')),
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
  created_at,
  updated_at,
  metadata
)
SELECT
  users.id,
  'super_admin',
  'tyler@revoa.app',
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