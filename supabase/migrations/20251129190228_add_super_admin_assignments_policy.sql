/*
  # Add Super Admin Policy for User Assignments
  
  Allows super admins to view all user assignments, not just their own.
*/

CREATE POLICY "Super admins can view all assignments"
ON user_assignments
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.user_id = auth.uid()
    AND user_profiles.is_super_admin = true
  )
);
