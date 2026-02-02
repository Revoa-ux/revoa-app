/*
  # Fix Super Admin Update Policy

  1. Changes
    - Drop existing super admin update policy
    - Create new policy with proper USING and WITH CHECK clauses
    - Ensure super admins can update any user's profile fields

  2. Security
    - Super admins have full update access to all user profiles
    - Regular users can still only update their own profiles
*/

-- Drop the existing policy
DROP POLICY IF EXISTS "Super admins can update admin status" ON user_profiles;

-- Create a comprehensive super admin update policy
CREATE POLICY "Super admins can update any profile"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (
    -- Allow if the user performing the action is a super admin
    EXISTS (
      SELECT 1 FROM user_profiles AS up
      WHERE up.user_id = auth.uid()
      AND up.is_super_admin = true
    )
  )
  WITH CHECK (
    -- Allow if the user performing the action is a super admin
    EXISTS (
      SELECT 1 FROM user_profiles AS up
      WHERE up.user_id = auth.uid()
      AND up.is_super_admin = true
    )
  );
