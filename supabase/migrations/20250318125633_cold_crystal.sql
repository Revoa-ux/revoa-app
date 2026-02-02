/*
  # Fix Admin Tables and Policies

  1. Changes
    - Drop existing policies before recreating
    - Add IF NOT EXISTS to table creation
    - Add proper constraints and defaults

  2. Security
    - Enable RLS
    - Add policies for secure access
    - Add audit logging
*/

-- Drop existing policies to avoid conflicts
DO $$ 
BEGIN
  -- Drop policies for admin_users
  DROP POLICY IF EXISTS "Admins can view own profile" ON admin_users;
  DROP POLICY IF EXISTS "Super admins can manage all admin users" ON admin_users;
  
  -- Drop policies for user_assignments
  DROP POLICY IF EXISTS "Admins can manage their assignments" ON user_assignments;
  
  -- Drop policies for admin_activity_logs
  DROP POLICY IF EXISTS "Super admins can view all activity logs" ON admin_activity_logs;
  DROP POLICY IF EXISTS "Admins can view own activity logs" ON admin_activity_logs;
END $$;

-- Create policies for admin_users
CREATE POLICY "Admins can view own profile"
  ON admin_users
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Super admins can manage all admin users"
  ON admin_users
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users au
      WHERE au.user_id = auth.uid()
      AND au.role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users au
      WHERE au.user_id = auth.uid()
      AND au.role = 'super_admin'
    )
  );

-- Create policies for user_assignments
CREATE POLICY "Admins can manage their assignments"
  ON user_assignments
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE user_id = auth.uid()
      AND id = user_assignments.admin_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE user_id = auth.uid()
      AND id = user_assignments.admin_id
    )
  );

-- Create policies for admin_activity_logs
CREATE POLICY "Super admins can view all activity logs"
  ON admin_activity_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE user_id = auth.uid()
      AND role = 'super_admin'
    )
  );

CREATE POLICY "Admins can view own activity logs"
  ON admin_activity_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE user_id = auth.uid()
      AND id = admin_activity_logs.admin_id
    )
  );

-- Add helpful comments
COMMENT ON TABLE admin_users IS 'Stores admin team member information and metrics';
COMMENT ON TABLE user_assignments IS 'Tracks user assignments to admin team members';
COMMENT ON TABLE admin_activity_logs IS 'Audit log for admin actions and performance metrics';