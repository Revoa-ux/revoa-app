/*
  # Create Super Admin User

  1. Changes
    - Create super admin user with specified credentials
    - Set proper role and permissions
    - Ensure email confirmation

  2. Security
    - Store password securely
    - Set up proper admin role
*/

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
    'super_admin'::admin_role,
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