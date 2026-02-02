-- Drop existing admin-related objects
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
  DELETE FROM user_profiles WHERE email = 'tyler.jtw@gmail.com';
  
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
    crypt('Twitk1017', gen_salt('bf')), -- Set password here
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
  );
END $$;