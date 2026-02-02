/*
  # Fix Admin Authentication

  1. Changes
    - Create auth user with proper instance_id and confirmation
    - Set up admin user with correct role and permissions
    - Fix password hashing and storage

  2. Security
    - Ensure proper password encryption
    - Set up correct auth flags
    - Enable immediate access
*/

-- First, ensure we have the admin_role type
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

  -- Try to get existing user id first
  SELECT id INTO admin_user_id
  FROM auth.users
  WHERE email = 'tyler@revoa.app';

  -- If user doesn't exist, create them
  IF admin_user_id IS NULL THEN
    INSERT INTO auth.users (
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
    )
    VALUES (
      instance_id,
      'tyler@revoa.app',
      crypt('Revoa2025!', gen_salt('bf')),
      now(),
      encode(gen_random_bytes(32), 'hex'),
      encode(gen_random_bytes(32), 'hex'),
      false,
      jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
      '{}'::jsonb,
      now(),
      now(),
      'authenticated',
      'authenticated'
    )
    RETURNING id INTO admin_user_id;
  ELSE
    -- Update existing user's password and metadata
    UPDATE auth.users
    SET 
      encrypted_password = crypt('Revoa2025!', gen_salt('bf')),
      email_confirmed_at = COALESCE(email_confirmed_at, now()),
      updated_at = now(),
      raw_app_meta_data = jsonb_build_object('provider', 'email', 'providers', ARRAY['email'])
    WHERE id = admin_user_id;
  END IF;

  -- Create or update the admin user record
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
  VALUES (
    admin_user_id,
    'super_admin',
    'tyler@revoa.app',
    0,
    0,
    now(),
    now(),
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
    updated_at = EXCLUDED.updated_at,
    metadata = EXCLUDED.metadata;

END $$;

-- Add helpful comment
COMMENT ON TABLE admin_users IS 'Stores admin team member information and metrics';