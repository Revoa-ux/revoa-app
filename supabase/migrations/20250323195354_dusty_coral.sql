-- Drop existing policies if they exist
DROP POLICY IF EXISTS "admin_auth_select_policy" ON admin_users;
DROP POLICY IF EXISTS "admin_service_role_policy" ON admin_users;
DROP POLICY IF EXISTS "admin_update_own_profile_policy" ON admin_users;

-- Create admin_users table if it doesn't exist
CREATE TABLE IF NOT EXISTS admin_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('admin', 'super_admin')),
  email text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending')),
  last_active_at timestamptz,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Enable RLS
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Create new RLS policies
CREATE POLICY "admin_auth_select_policy"
  ON admin_users
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "admin_service_role_policy"
  ON admin_users
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "admin_update_own_profile_policy"
  ON admin_users
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Create or update external admin user
DO $$ 
DECLARE
  admin_user_id uuid;
BEGIN
  -- Delete existing user if exists
  DELETE FROM auth.users WHERE email = 'tyler.jtw@gmail.com';
  
  -- Create new user
  INSERT INTO auth.users (
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    aud,
    role
  ) VALUES (
    'tyler.jtw@gmail.com',
    crypt('Twitk1017', gen_salt('bf')),
    NOW(),
    jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
    jsonb_build_object(
      'is_admin', true,
      'permissions', ARRAY['manage_users', 'manage_admins', 'manage_settings']
    ),
    NOW(),
    NOW(),
    'authenticated',
    'authenticated'
  )
  RETURNING id INTO admin_user_id;

  -- Create user profile
  INSERT INTO user_profiles (
    user_id,
    email,
    onboarding_completed,
    metadata,
    created_at,
    updated_at
  ) VALUES (
    admin_user_id,
    'tyler.jtw@gmail.com',
    true,
    jsonb_build_object(
      'signup_source', 'email',
      'initial_role', 'admin'
    ),
    NOW(),
    NOW()
  )
  ON CONFLICT (email) DO UPDATE
  SET
    user_id = EXCLUDED.user_id,
    onboarding_completed = EXCLUDED.onboarding_completed,
    metadata = EXCLUDED.metadata,
    updated_at = EXCLUDED.updated_at;

  -- Create admin user record
  INSERT INTO admin_users (
    user_id,
    role,
    email,
    status,
    metadata
  ) VALUES (
    admin_user_id,
    'super_admin',
    'tyler.jtw@gmail.com',
    'active',
    jsonb_build_object(
      'created_by', 'system',
      'created_at', NOW(),
      'permissions', ARRAY['manage_users', 'manage_admins', 'manage_settings']
    )
  )
  ON CONFLICT (email) DO UPDATE
  SET
    user_id = EXCLUDED.user_id,
    role = EXCLUDED.role,
    status = EXCLUDED.status,
    updated_at = NOW(),
    metadata = EXCLUDED.metadata;
END $$;

-- Add helpful comment
COMMENT ON TABLE admin_users IS 'Stores admin user roles and permissions';