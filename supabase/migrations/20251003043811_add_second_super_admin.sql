/*
  # Add Second Super Admin Email

  1. Changes
    - Update handle_new_user() function to recognize ammazonrev2@gmail.com as super admin
    - Update existing user profiles to grant super admin access to ammazonrev2@gmail.com

  2. Security
    - Only two specific emails will have super admin access
    - All existing RLS policies remain unchanged
*/

-- Update function to handle new user creation with two super admin emails
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
        WHEN NEW.email IN ('tyler.jtw@gmail.com', 'ammazonrev2@gmail.com') THEN true
        ELSE false
      END,
      CASE 
        WHEN NEW.email IN ('tyler.jtw@gmail.com', 'ammazonrev2@gmail.com') THEN 'super_admin'
        ELSE NULL
      END,
      CASE
        WHEN NEW.email IN ('tyler.jtw@gmail.com', 'ammazonrev2@gmail.com') THEN ARRAY['manage_users', 'manage_admins', 'manage_settings']
        ELSE NULL
      END,
      CASE
        WHEN NEW.email IN ('tyler.jtw@gmail.com', 'ammazonrev2@gmail.com') THEN 'active'
        ELSE NULL
      END,
      jsonb_build_object(
        'signup_source', COALESCE(NEW.raw_app_meta_data->>'provider', 'email'),
        'initial_role', CASE 
          WHEN NEW.email IN ('tyler.jtw@gmail.com', 'ammazonrev2@gmail.com') THEN 'super_admin'
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

-- Update existing user profile if ammazonrev2@gmail.com already exists
UPDATE user_profiles
SET
  is_admin = true,
  admin_role = 'super_admin',
  admin_permissions = ARRAY['manage_users', 'manage_admins', 'manage_settings'],
  admin_status = 'active',
  updated_at = NOW()
WHERE email = 'ammazonrev2@gmail.com';
