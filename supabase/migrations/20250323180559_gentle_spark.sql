/*
  # Fix Admin User Creation

  1. Changes
    - Drop existing triggers and functions
    - Create admin_users table
    - Add trigger for handling revoa.app emails
    - Fix user profile creation

  2. Security
    - Enable RLS
    - Add proper policies
    - Maintain secure access
*/

-- Drop existing triggers and functions with CASCADE
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users CASCADE;
DROP TRIGGER IF EXISTS on_auth_user_revoa_admin ON auth.users CASCADE;
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS handle_revoa_admin() CASCADE;
DROP TABLE IF EXISTS admin_users CASCADE;

-- Create admin_users table
CREATE TABLE admin_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('admin', 'super_admin')),
  email text NOT NULL UNIQUE CHECK (email LIKE '%@revoa.app'),
  last_active_at timestamptz,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Enable RLS
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
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

-- Create function to handle new user creation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Auto-confirm email immediately
  UPDATE auth.users
  SET email_confirmed_at = NOW()
  WHERE id = NEW.id;
  
  -- Create user profile
  INSERT INTO public.user_profiles (
    user_id,
    email,
    onboarding_completed,
    metadata,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    NEW.email,
    false,
    jsonb_build_object(
      'signup_source', COALESCE(NEW.raw_app_meta_data->>'provider', 'email'),
      'initial_role', COALESCE(NEW.raw_app_meta_data->>'role', 'user')
    ),
    NOW(),
    NOW()
  )
  ON CONFLICT (email) DO UPDATE
  SET
    user_id = EXCLUDED.user_id,
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to handle new revoa.app users
CREATE OR REPLACE FUNCTION handle_revoa_admin()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.email LIKE '%@revoa.app' THEN
    -- Create admin user record
    INSERT INTO admin_users (
      user_id,
      role,
      email,
      metadata
    ) VALUES (
      NEW.id,
      CASE 
        WHEN NEW.email = 'tyler@revoa.app' THEN 'super_admin'
        ELSE 'admin'
      END,
      NEW.email,
      jsonb_build_object(
        'created_by', 'system',
        'created_at', NOW(),
        'permissions', CASE
          WHEN NEW.email = 'tyler@revoa.app' 
          THEN ARRAY['manage_users', 'manage_admins', 'manage_settings']
          ELSE ARRAY['manage_users', 'manage_settings']
        END
      )
    )
    ON CONFLICT (email) DO UPDATE
    SET
      user_id = EXCLUDED.user_id,
      role = EXCLUDED.role,
      updated_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers for new user registration
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

CREATE TRIGGER on_auth_user_revoa_admin
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_revoa_admin();

-- Create or update the admin user
DO $$ 
DECLARE
  admin_user_id uuid;
  instance_id uuid;
BEGIN
  -- Get the instance ID
  SELECT COALESCE(current_setting('app.settings.custom_instance_id', true), '00000000-0000-0000-0000-000000000000')::uuid INTO instance_id;

  -- Delete existing records in correct order
  DELETE FROM admin_users WHERE email = 'tyler@revoa.app';
  DELETE FROM user_profiles WHERE email = 'tyler@revoa.app';
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
    jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
    '{}'::jsonb,
    NOW(),
    NOW(),
    'authenticated',
    'authenticated'
  );

  -- Create admin user record
  INSERT INTO admin_users (
    user_id,
    role,
    email,
    metadata
  ) VALUES (
    admin_user_id,
    'super_admin',
    'tyler@revoa.app',
    jsonb_build_object(
      'created_by', 'system',
      'is_initial_admin', true,
      'permissions', array['manage_users', 'manage_admins', 'manage_settings']
    )
  )
  ON CONFLICT (email) DO UPDATE
  SET
    user_id = EXCLUDED.user_id,
    role = EXCLUDED.role,
    updated_at = NOW(),
    metadata = EXCLUDED.metadata;
END $$;

-- Add helpful comment
COMMENT ON TABLE admin_users IS 'Stores admin user roles and permissions';