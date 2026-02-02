/*
  # Fix Super Admin Update Policy - Add WITH CHECK Clause

  1. Changes
    - Add explicit WITH CHECK clause to "Super admins can update invitations" policy
    - This ensures super admins can update invitations to any status (including 'revoked')

  2. Security
    - Maintains same security - only super admins can update invitations
    - Explicitly allows the updated row to have any valid state
*/

-- Drop and recreate the super admin update policy with WITH CHECK clause
DROP POLICY IF EXISTS "Super admins can update invitations" ON admin_invitations;

CREATE POLICY "Super admins can update invitations"
ON admin_invitations FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_id = auth.uid()
    AND is_admin = true
    AND is_super_admin = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_id = auth.uid()
    AND is_admin = true
    AND is_super_admin = true
  )
);