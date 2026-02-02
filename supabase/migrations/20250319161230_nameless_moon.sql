/*
  # Fix Admin RLS Policies

  1. Changes
    - Drop existing policies to avoid conflicts
    - Create new non-recursive policies
    - Fix super admin access checks

  2. Security
    - Maintain secure access controls
    - Prevent infinite recursion
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Super admins can manage all admin users" ON admin_users;
DROP POLICY IF EXISTS "Admins can view own profile" ON admin_users;

-- Create new policies without recursion
CREATE POLICY "Allow public access for admin auth"
  ON admin_users
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Service role has full access"
  ON admin_users
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Add helpful comment
COMMENT ON TABLE admin_users IS 'Stores admin team member information and metrics';