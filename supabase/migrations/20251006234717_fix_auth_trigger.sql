/*
  # Fix Auth Trigger

  Fix the handle_new_user trigger to properly handle auth.users updates
  
  1. Changes
    - Remove the UPDATE on auth.users (causes permission issues)
    - Email is already confirmed by Supabase on signup
  
  2. Security
    - Maintains RLS policies
    - Keeps admin auto-assignment for specific emails
*/

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Create user profile
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
    updated_at = NOW();

  RETURN NEW;
END;
$$;
