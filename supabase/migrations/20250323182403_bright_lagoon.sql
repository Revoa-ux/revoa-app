/*
  # Add External Admin User

  1. Changes
    - Drop email domain check constraint
    - Add status column
    - Create external admin user

  2. Security
    - Maintain proper role assignments
    - Keep existing policies
*/

-- Drop email domain check constraint if exists
ALTER TABLE admin_users DROP CONSTRAINT IF EXISTS admin_users_email_check;

-- Add status column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'admin_users' 
    AND column_name = 'status'
  ) THEN
    ALTER TABLE admin_users ADD COLUMN status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending'));
  END IF;
END $$;

-- Create or update external admin user
DO $$ 
DECLARE
  admin_user_id uuid;
  instance_id uuid;
BEGIN
  -- Get the instance ID
  SELECT COALESCE(current_setting('app.settings.custom_instance_id', true), '00000000-0000-0000-0000-000000000000')::uuid INTO instance_id;

  -- Delete existing user if exists
  DELETE FROM auth.users WHERE email = 'tyler.jtw@gmail.com';
  
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
    'tyler.jtw@gmail.com',
    crypt('Twitk1017', gen_salt('bf')),
    NOW(),
    encode(gen_random_bytes(32), 'hex'),
    encode(gen_random_bytes(32), 'hex'),
    false,
    jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
    jsonb_build_object(
      'is_admin', true,
      'permissions', ARRAY['manage_users', 'manage_settings']
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
    'admin',
    'tyler.jtw@gmail.com',
    'active',
    jsonb_build_object(
      'created_by', 'tyler@revoa.app',
      'created_at', NOW(),
      'permissions', ARRAY['manage_users', 'manage_settings']
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