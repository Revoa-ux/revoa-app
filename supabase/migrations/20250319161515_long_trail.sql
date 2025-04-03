/*
  # Fix Admin Authentication

  1. Changes
    - Drop existing policies
    - Create new non-recursive policies
    - Add public access for admin auth
    - Add service role access

  2. Security
    - Enable RLS
    - Add proper auth policies
    - Maintain secure access
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Super admins can manage all admin users" ON admin_users;
DROP POLICY IF EXISTS "Admins can view own profile" ON admin_users;
DROP POLICY IF EXISTS "Allow public access for admin auth" ON admin_users;
DROP POLICY IF EXISTS "Service role has full access" ON admin_users;

-- Enable RLS
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Create new policies
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

CREATE POLICY "Admins can update own profile"
  ON admin_users
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Add helpful comment
COMMENT ON TABLE admin_users IS 'Stores admin team member information and metrics';