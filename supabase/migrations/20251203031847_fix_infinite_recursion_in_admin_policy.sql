/*
  # Fix Infinite Recursion in Admin Policy

  1. Changes
    - Drop the recursive super admin update policy
    - Create a security definer function to check super admin status without recursion
    - Create new policy using the function

  2. Security
    - Function safely checks super admin status without causing recursion
    - Super admins can update any user profile
    - Regular users can only update their own profiles
*/

-- Drop the problematic policy
DROP POLICY IF EXISTS "Super admins can update any profile" ON user_profiles;

-- Create a security definer function to check if current user is super admin
-- This function runs with elevated privileges and doesn't trigger RLS
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT COALESCE(
    (SELECT is_super_admin 
     FROM user_profiles 
     WHERE user_id = auth.uid()
     LIMIT 1),
    false
  );
$$;

-- Create policy using the function (no recursion)
CREATE POLICY "Super admins can update any profile"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (is_super_admin() = true)
  WITH CHECK (is_super_admin() = true);
