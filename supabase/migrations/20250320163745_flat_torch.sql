/*
  # Fix Admin User Authentication

  1. Changes
    - Create admin user in auth.users table
    - Create corresponding admin_users record
    - Set proper password and role

  2. Security
    - Store password securely
    - Set up proper admin role
*/

-- First, ensure the user exists in auth.users
DO $$ 
DECLARE
  admin_user_id uuid;
BEGIN
  -- Try to get existing user id first
  SELECT id INTO admin_user_id
  FROM auth.users
  WHERE email = 'tyler@revoa.app';

  -- If user doesn't exist, create them
  IF admin_user_id IS NULL THEN
    INSERT INTO auth.users (
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
    )
    VALUES (
      'tyler@revoa.app',
      crypt('Revoa2025!', gen_salt('bf')), -- Password: Revoa2025!
      now(),
      now(),
      now(),
      '{"provider": "email", "providers": ["email"]}'::jsonb,
      '{}'::jsonb,
      'authenticated',
      'authenticated',
      '00000000-0000-0000-0000-000000000000'
    )
    RETURNING id INTO admin_user_id;
  ELSE
    -- Update existing user's password
    UPDATE auth.users
    SET 
      encrypted_password = crypt('Revoa2025!', gen_salt('bf')),
      updated_at = now(),
      raw_app_meta_data = '{"provider": "email", "providers": ["email"]}'::jsonb
    WHERE id = admin_user_id;
  END IF;

  -- Now create or update the admin user record
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
    'super_admin'::admin_role,
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
    user_id = admin_user_id,
    role = 'super_admin',
    updated_at = now(),
    metadata = jsonb_build_object(
      'created_by', 'system',
      'is_initial_admin', true,
      'permissions', array['manage_users', 'manage_admins', 'manage_settings']
    );
END $$;

-- Add helpful comment
COMMENT ON TABLE admin_users IS 'Stores admin team member information and metrics';