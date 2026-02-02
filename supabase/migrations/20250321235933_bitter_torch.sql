/*
  # Fix Admin User Creation

  1. Changes
    - Generate UUID for auth user
    - Create auth user with explicit ID
    - Create admin user with proper role casting

  2. Security
    - Maintain proper role assignments
    - Keep existing policies
*/

-- Drop existing triggers and functions
DROP TRIGGER IF EXISTS on_auth_user_revoa_admin ON auth.users;
DROP FUNCTION IF EXISTS handle_revoa_admin();

-- First ensure we have the admin_role type
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'admin_role') THEN
    CREATE TYPE admin_role AS ENUM ('admin', 'super_admin');
  END IF;
END $$;

-- Create or update the auth user
DO $$ 
DECLARE
  admin_user_id uuid;
BEGIN
  -- Generate new UUID for user
  SELECT gen_random_uuid() INTO admin_user_id;

  -- Delete existing user if exists
  DELETE FROM admin_users WHERE email = 'tyler@revoa.app';
  DELETE FROM auth.users WHERE email = 'tyler@revoa.app';
  
  -- Create new user with generated ID
  INSERT INTO auth.users (
    id,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_app_meta_data,
    raw_user_meta_data,
    aud,
    role,
    instance_id
  ) VALUES (
    admin_user_id,
    'tyler@revoa.app',
    crypt('Revoa2025!', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
    '{}'::jsonb,
    'authenticated',
    'authenticated',
    '00000000-0000-0000-0000-000000000000'
  );

  -- Create admin user record
  INSERT INTO admin_users (
    user_id,
    role,
    email,
    assigned_users_count,
    total_transaction_volume,
    created_at,
    updated_at,
    metadata
  ) VALUES (
    admin_user_id,
    'super_admin'::admin_role,
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
  );
END $$;

-- Create function to handle new revoa.app users
CREATE OR REPLACE FUNCTION handle_revoa_admin()
RETURNS TRIGGER AS $$
DECLARE
  admin_role_val admin_role;
BEGIN
  -- Auto-confirm email for revoa.app users
  IF NEW.email LIKE '%@revoa.app' THEN
    NEW.email_confirmed_at = NOW();
    
    -- Determine role with proper type casting
    admin_role_val := CASE 
      WHEN NEW.email = 'tyler@revoa.app' THEN 'super_admin'::admin_role
      ELSE 'admin'::admin_role
    END;
    
    -- Create admin user record
    INSERT INTO admin_users (
      user_id,
      role,
      email,
      assigned_users_count,
      total_transaction_volume,
      created_at,
      updated_at,
      metadata
    ) VALUES (
      NEW.id,
      admin_role_val,
      NEW.email,
      0,
      0,
      NOW(),
      NOW(),
      jsonb_build_object(
        'created_by', 'system',
        'created_at', NOW(),
        'permissions', ARRAY['manage_users', 'manage_settings']
      )
    )
    ON CONFLICT (email) DO UPDATE
    SET
      user_id = EXCLUDED.user_id,
      role = admin_role_val,
      updated_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user registration
CREATE TRIGGER on_auth_user_revoa_admin
  BEFORE INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_revoa_admin();

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

-- Add helpful comment
COMMENT ON TABLE admin_users IS 'Stores admin team member information and metrics';