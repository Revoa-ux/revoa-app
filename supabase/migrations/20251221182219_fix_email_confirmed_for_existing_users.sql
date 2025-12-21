/*
  # Fix Email Confirmed for Existing Users

  1. Problem
    - The `email_confirmed` field was added to user_profiles but not populated
    - The `handle_new_user()` function doesn't set `email_confirmed`
    - Users (especially admins) are stuck in email confirmation loop

  2. Solution
    - Update all existing user_profiles to set email_confirmed = true
    - Update handle_new_user() to set email_confirmed for new users
    - Admins and super admins should always have email_confirmed = true

  3. Changes
    - Set email_confirmed = true for all existing users
    - Update handle_new_user() to include email_confirmed field
*/

-- Set email_confirmed = true for all existing users
UPDATE public.user_profiles
SET
  email_confirmed = true,
  updated_at = NOW()
WHERE email_confirmed = false OR email_confirmed IS NULL;

-- Update handle_new_user function to set email_confirmed
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Create user profile with matching id and user_id
  INSERT INTO public.user_profiles (
    id,
    user_id,
    email,
    email_confirmed,
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
    NEW.id,
    NEW.email,
    CASE
      -- Admins and super admins always have confirmed emails
      WHEN NEW.email IN ('tyler.jtw@gmail.com', 'ammazonrev2@gmail.com', 'tyler@revoa.app') THEN true
      -- Regular users default to true (can be changed to false if you want email verification)
      ELSE true
    END,
    false,
    CASE
      WHEN NEW.email IN ('tyler.jtw@gmail.com', 'ammazonrev2@gmail.com', 'tyler@revoa.app') THEN true
      ELSE false
    END,
    CASE
      WHEN NEW.email IN ('tyler.jtw@gmail.com', 'ammazonrev2@gmail.com', 'tyler@revoa.app') THEN 'super_admin'
      ELSE NULL
    END,
    CASE
      WHEN NEW.email IN ('tyler.jtw@gmail.com', 'ammazonrev2@gmail.com', 'tyler@revoa.app') THEN ARRAY['manage_users', 'manage_admins', 'manage_settings']
      ELSE NULL
    END,
    CASE
      WHEN NEW.email IN ('tyler.jtw@gmail.com', 'ammazonrev2@gmail.com', 'tyler@revoa.app') THEN 'active'
      ELSE NULL
    END,
    jsonb_build_object(
      'signup_source', COALESCE(NEW.raw_app_meta_data->>'provider', 'email'),
      'initial_role', CASE
        WHEN NEW.email IN ('tyler.jtw@gmail.com', 'ammazonrev2@gmail.com', 'tyler@revoa.app') THEN 'super_admin'
        ELSE 'user'
      END,
      'created_at', NOW()
    ),
    NOW(),
    NOW()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    email_confirmed = CASE
      -- Ensure admins always have email_confirmed = true
      WHEN EXCLUDED.is_admin = true THEN true
      ELSE public.user_profiles.email_confirmed
    END,
    updated_at = NOW();

  RETURN NEW;
END;
$$;