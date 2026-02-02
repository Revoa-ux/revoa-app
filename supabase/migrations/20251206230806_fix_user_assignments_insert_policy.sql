/*
  # Fix user assignments INSERT policy
  
  1. Changes
    - Remove restrictive INSERT policy that only allows self-assignment
    - Add policy allowing super admins to create any assignment
    - Add policy allowing admins to create assignments (for admin workflow)
  
  2. Security
    - Super admins can assign any user to any admin
    - Regular admins can create assignments through the system
*/

-- Drop the old restrictive policy
DROP POLICY IF EXISTS "Users can create own assignment" ON user_assignments;

-- Allow super admins to create any assignment
CREATE POLICY "Super admins can create assignments"
  ON user_assignments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.is_super_admin = true
    )
  );

-- Allow admins to create assignments (for workflow purposes)
CREATE POLICY "Admins can create assignments"
  ON user_assignments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.is_admin = true
    )
  );
