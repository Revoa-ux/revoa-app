/*
  # Remove Email Confirmation Requirement

  1. Changes
    - Update existing users to confirm emails
    - Modify user creation trigger to auto-confirm emails
    - Update auth settings to skip verification

  2. Security
    - Maintain other security measures
    - Keep audit logging intact
*/

-- Update all existing users to have confirmed emails
UPDATE auth.users
SET email_confirmed_at = COALESCE(email_confirmed_at, NOW())
WHERE email_confirmed_at IS NULL;

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

-- Drop existing admin trigger and function
DROP TRIGGER IF EXISTS on_auth_user_revoa_admin ON auth.users;
DROP FUNCTION IF EXISTS handle_revoa_admin();

-- Create function to handle new revoa.app users
CREATE OR REPLACE FUNCTION handle_revoa_admin()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.email LIKE '%@revoa.app' THEN
    -- Auto-confirm email
    NEW.email_confirmed_at = NOW();
    
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

-- Create trigger for new admin user registration
CREATE TRIGGER on_auth_user_revoa_admin
  BEFORE INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_revoa_admin();

-- Add helpful comments
COMMENT ON FUNCTION public.handle_new_user IS 'Automatically confirms email and creates profile for new users';
COMMENT ON FUNCTION handle_revoa_admin IS 'Automatically confirms email and creates admin user for revoa.app emails';