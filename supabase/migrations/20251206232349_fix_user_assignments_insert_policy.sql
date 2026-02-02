/*
  # Fix user_assignments INSERT policies

  1. Changes
    - Drop existing INSERT policies with incorrect column reference
    - Recreate INSERT policies with correct column reference (id instead of user_id)
    
  2. Security
    - Maintains same security model: only admins and super admins can create assignments
    - Fixes the broken column reference that was preventing all inserts
*/

-- Drop the broken policies
DROP POLICY IF EXISTS "Admins can create assignments" ON user_assignments;
DROP POLICY IF EXISTS "Super admins can create assignments" ON user_assignments;

-- Recreate with correct column reference
CREATE POLICY "Admins can create assignments"
  ON user_assignments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
    )
  );

CREATE POLICY "Super admins can create assignments"
  ON user_assignments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_super_admin = true
    )
  );
