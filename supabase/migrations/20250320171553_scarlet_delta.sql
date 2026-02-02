-- Drop existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create or replace function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
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
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Update all existing users to have confirmed emails
UPDATE auth.users
SET email_confirmed_at = COALESCE(email_confirmed_at, NOW())
WHERE email_confirmed_at IS NULL;

-- Create or update admin user
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
    -- Create new user
    INSERT INTO auth.users (
      instance_id,
      id,
      email,
      encrypted_password,
      email_confirmed_at,
      created_at,
      updated_at,
      raw_app_meta_data,
      raw_user_meta_data,
      aud,
      role
    )
    SELECT
      instance_id,
      gen_random_uuid(),
      'tyler@revoa.app',
      crypt('Revoa2025!', gen_salt('bf')),
      NOW(),
      NOW(),
      NOW(),
      '{"provider": "email", "providers": ["email"]}'::jsonb,
      '{}'::jsonb,
      'authenticated',
      'authenticated'
    RETURNING id INTO admin_user_id;
  ELSE
    -- Update existing user
    UPDATE auth.users
    SET 
      encrypted_password = crypt('Revoa2025!', gen_salt('bf')),
      email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
      updated_at = NOW(),
      raw_app_meta_data = '{"provider": "email", "providers": ["email"]}'::jsonb
    WHERE id = admin_user_id;
  END IF;

  -- Now ensure admin user exists
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
    NOW(),
    NOW(),
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