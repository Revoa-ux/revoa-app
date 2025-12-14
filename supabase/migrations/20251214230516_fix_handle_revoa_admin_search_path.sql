/*
  # Fix handle_revoa_admin Search Path

  1. Problem
    - The handle_revoa_admin() function has an empty search_path
    - This causes signup failures because it cannot find the admin_users table
    - Error: "Failed to create account" for all new signups

  2. Solution
    - Recreate the function with proper search_path = public
    - Maintains SECURITY DEFINER for elevated privileges

  3. Security
    - Function continues to run with definer privileges
    - Proper search path allows it to access public schema tables
*/

CREATE OR REPLACE FUNCTION public.handle_revoa_admin()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email LIKE '%@revoa.app' THEN
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
$$;
