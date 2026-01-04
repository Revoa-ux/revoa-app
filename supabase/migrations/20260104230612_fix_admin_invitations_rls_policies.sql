/*
  # Fix Admin Invitations RLS Policies

  1. Changes
    - Update all RLS policies to use `is_super_admin` boolean instead of `admin_role = 'super_admin'`
    - This fixes the issue where super admins cannot update/delete invitations

  2. Security
    - Super admins can create, view all, update, and delete invitations
    - Regular admins can only view invitations they created
*/

-- Drop old policies
DROP POLICY IF EXISTS "Super admins can create invitations" ON admin_invitations;
DROP POLICY IF EXISTS "Admins can view own invitations" ON admin_invitations;
DROP POLICY IF EXISTS "Super admins can view all invitations" ON admin_invitations;
DROP POLICY IF EXISTS "Super admins can update invitations" ON admin_invitations;
DROP POLICY IF EXISTS "Super admins can delete invitations" ON admin_invitations;

-- Super admins can create invitations
CREATE POLICY "Super admins can create invitations"
ON admin_invitations FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_id = auth.uid()
    AND is_admin = true
    AND is_super_admin = true
  )
);

-- Admins and super admins can view invitations they created
CREATE POLICY "Admins can view own invitations"
ON admin_invitations FOR SELECT
TO authenticated
USING (
  invited_by = auth.uid() AND
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_id = auth.uid()
    AND is_admin = true
  )
);

-- Super admins can view all invitations
CREATE POLICY "Super admins can view all invitations"
ON admin_invitations FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_id = auth.uid()
    AND is_admin = true
    AND is_super_admin = true
  )
);

-- Super admins can update invitations (e.g., revoke)
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
);

-- Super admins can delete invitations
CREATE POLICY "Super admins can delete invitations"
ON admin_invitations FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_id = auth.uid()
    AND is_admin = true
    AND is_super_admin = true
  )
);