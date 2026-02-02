/*
  # Fix handle_new_user ID Mismatch

  1. Problem
    - handle_new_user() function doesn't explicitly set the id column
    - id defaults to gen_random_uuid() which creates a different UUID than user_id
    - Causes RLS policies to fail since they check id = auth.uid()

  2. Solution
    - Update function to explicitly set id = NEW.id (auth user ID)
    - This ensures id and user_id are always the same

  3. Impact
    - New users will have matching id and user_id
    - Fixes chat initialization and RLS policy issues
*/

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
