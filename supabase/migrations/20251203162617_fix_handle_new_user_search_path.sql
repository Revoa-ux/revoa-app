/*
  # Fix handle_new_user Search Path

  1. Problem
    - handle_new_user() function has empty search_path setting
    - Cannot find public.user_profiles table during execution
    - Causes signup failures

  2. Solution
    - Recreate function with proper search_path = public
    - Maintains SECURITY DEFINER for elevated privileges

  3. Security
    - Function continues to run with definer privileges
    - Proper search path allows it to access public schema
*/

-- Drop and recreate function with correct search_path
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
