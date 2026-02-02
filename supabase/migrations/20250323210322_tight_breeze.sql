-- Drop existing triggers and functions
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users CASCADE;
DROP TRIGGER IF EXISTS on_auth_user_revoa_admin ON auth.users CASCADE;
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS handle_revoa_admin() CASCADE;

-- Create function to handle new user creation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Auto-confirm email immediately
  UPDATE auth.users
  SET email_confirmed_at = NOW()
  WHERE id = NEW.id;
  
  -- Create user profile
  BEGIN
    INSERT INTO public.user_profiles (
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
      NEW.id,
      NEW.email,
      false,
      CASE 
        WHEN NEW.email = 'tyler.jtw@gmail.com' THEN true
        ELSE false
      END,
      CASE 
        WHEN NEW.email = 'tyler.jtw@gmail.com' THEN 'super_admin'
        ELSE NULL
      END,
      CASE
        WHEN NEW.email = 'tyler.jtw@gmail.com' THEN ARRAY['manage_users', 'manage_admins', 'manage_settings']
        ELSE NULL
      END,
      CASE
        WHEN NEW.email = 'tyler.jtw@gmail.com' THEN 'active'
        ELSE NULL
      END,
      jsonb_build_object(
        'signup_source', COALESCE(NEW.raw_app_meta_data->>'provider', 'email'),
        'initial_role', CASE 
          WHEN NEW.email = 'tyler.jtw@gmail.com' THEN 'super_admin'
          ELSE 'user'
        END,
        'created_at', NOW()
      ),
      NOW(),
      NOW()
    );
  EXCEPTION 
    WHEN unique_violation THEN
      -- If profile already exists, update it
      UPDATE public.user_profiles
      SET
        user_id = NEW.id,
        updated_at = NOW()
      WHERE email = NEW.email;
  END;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Update existing users to have confirmed emails
UPDATE auth.users
SET email_confirmed_at = COALESCE(email_confirmed_at, NOW())
WHERE email_confirmed_at IS NULL;

-- Ensure only the super admin has admin privileges
UPDATE user_profiles
SET
  is_admin = (email = 'tyler.jtw@gmail.com'),
  admin_role = CASE 
    WHEN email = 'tyler.jtw@gmail.com' THEN 'super_admin'
    ELSE NULL
  END,
  admin_permissions = CASE
    WHEN email = 'tyler.jtw@gmail.com' THEN ARRAY['manage_users', 'manage_admins', 'manage_settings']
    ELSE NULL
  END,
  admin_status = CASE
    WHEN email = 'tyler.jtw@gmail.com' THEN 'active'
    ELSE NULL
  END
WHERE is_admin = true OR admin_role IS NOT NULL;

-- Add helpful comments
COMMENT ON FUNCTION handle_new_user IS 'Automatically creates and manages user profiles with proper conflict handling';