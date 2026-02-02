/*
  # Simplify Admin Roles

  1. Changes
    - Drop admin_users table and related objects
    - Add role column to auth.users
    - Migrate existing admin users
    - Update RLS policies

  2. Security
    - Maintain proper role assignments
    - Keep existing permissions
*/

-- Drop existing admin-related objects
DROP TRIGGER IF EXISTS on_auth_user_revoa_admin ON auth.users CASCADE;
DROP FUNCTION IF EXISTS handle_revoa_admin() CASCADE;
DROP TABLE IF EXISTS admin_users CASCADE;

-- Add role column to auth.users if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'auth' 
    AND table_name = 'users' 
    AND column_name = 'admin_role'
  ) THEN
    ALTER TABLE auth.users ADD COLUMN admin_role text CHECK (admin_role IN ('admin', 'super_admin'));
  END IF;
END $$;

-- Create function to handle new revoa.app users
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Auto-confirm email immediately
  NEW.email_confirmed_at = NOW();
  
  -- Set admin role for revoa.app emails
  IF NEW.email LIKE '%@revoa.app' THEN
    NEW.admin_role = CASE 
      WHEN NEW.email = 'tyler@revoa.app' THEN 'super_admin'
      ELSE 'admin'
    END;
    
    -- Store admin metadata
    NEW.raw_user_meta_data = jsonb_build_object(
      'is_admin', true,
      'permissions', CASE
        WHEN NEW.email = 'tyler@revoa.app' 
        THEN ARRAY['manage_users', 'manage_admins', 'manage_settings']
        ELSE ARRAY['manage_users', 'manage_settings']
      END
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user registration
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  BEFORE INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Update existing admin users
UPDATE auth.users
SET 
  admin_role = CASE 
    WHEN email = 'tyler@revoa.app' THEN 'super_admin'
    WHEN email LIKE '%@revoa.app' THEN 'admin'
    ELSE NULL
  END,
  raw_user_meta_data = CASE
    WHEN email = 'tyler@revoa.app' THEN 
      jsonb_build_object(
        'is_admin', true,
        'permissions', ARRAY['manage_users', 'manage_admins', 'manage_settings']
      )
    WHEN email LIKE '%@revoa.app' THEN
      jsonb_build_object(
        'is_admin', true,
        'permissions', ARRAY['manage_users', 'manage_settings']
      )
    ELSE raw_user_meta_data
  END,
  updated_at = NOW()
WHERE email LIKE '%@revoa.app';

-- Create or update the super admin user
DO $$ 
DECLARE
  admin_user_id uuid;
  instance_id uuid;
BEGIN
  -- Get the instance ID
  SELECT COALESCE(current_setting('app.settings.custom_instance_id', true), '00000000-0000-0000-0000-000000000000')::uuid INTO instance_id;

  -- Delete existing user if exists
  DELETE FROM auth.users WHERE email = 'tyler@revoa.app';
  
  -- Generate new UUID for user
  SELECT gen_random_uuid() INTO admin_user_id;
  
  -- Create new user with generated ID
  INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    confirmation_token,
    recovery_token,
    is_super_admin,
    admin_role,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    aud,
    role
  ) VALUES (
    admin_user_id,
    instance_id,
    'tyler@revoa.app',
    crypt('Twitk1017', gen_salt('bf')),
    NOW(),
    encode(gen_random_bytes(32), 'hex'),
    encode(gen_random_bytes(32), 'hex'),
    false,
    'super_admin',
    jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
    jsonb_build_object(
      'is_admin', true,
      'permissions', ARRAY['manage_users', 'manage_admins', 'manage_settings']
    ),
    NOW(),
    NOW(),
    'authenticated',
    'authenticated'
  );

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
    'tyler@revoa.app',
    true,
    jsonb_build_object(
      'signup_source', 'email',
      'initial_role', 'super_admin'
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
END $$;