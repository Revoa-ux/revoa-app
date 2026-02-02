-- Drop admin_users table and related objects
DROP TABLE IF EXISTS admin_users CASCADE;

-- Add admin-related columns to user_profiles if they don't exist
ALTER TABLE user_profiles 
  ADD COLUMN IF NOT EXISTS is_admin boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS admin_role text CHECK (admin_role IN ('admin', 'super_admin')),
  ADD COLUMN IF NOT EXISTS admin_permissions text[] DEFAULT ARRAY[]::text[],
  ADD COLUMN IF NOT EXISTS admin_status text DEFAULT 'active' CHECK (admin_status IN ('active', 'inactive', 'pending'));

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

  -- Create user profile with admin privileges
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
  ) VALUES (
    admin_user_id,
    'tyler.jtw@gmail.com',
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
  )
  ON CONFLICT (email) DO UPDATE
  SET
    user_id = EXCLUDED.user_id,
    onboarding_completed = EXCLUDED.onboarding_completed,
    is_admin = EXCLUDED.is_admin,
    admin_role = EXCLUDED.admin_role,
    admin_permissions = EXCLUDED.admin_permissions,
    admin_status = EXCLUDED.admin_status,
    metadata = EXCLUDED.metadata,
    updated_at = EXCLUDED.updated_at;
END $$;

-- Add helpful comment
COMMENT ON COLUMN user_profiles.is_admin IS 'Indicates if the user has admin privileges';
COMMENT ON COLUMN user_profiles.admin_role IS 'The specific admin role assigned to the user';
COMMENT ON COLUMN user_profiles.admin_permissions IS 'Array of admin permissions granted to the user';
COMMENT ON COLUMN user_profiles.admin_status IS 'Current status of the admin account';