/*
  # Add Super Admin Update Policy

  1. Changes
    - Add policy allowing super admins to update is_admin and is_super_admin fields for other users
    - This enables super admins to promote/demote other admins

  2. Security
    - Only super admins can update admin-related fields
    - Users can still update their own profiles
*/

-- Allow super admins to update admin status for other users
CREATE POLICY "Super admins can update admin status"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.is_super_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.is_super_admin = true
    )
  );
