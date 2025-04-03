/*
  # Add Admin Portal Tables

  1. New Tables
    - `admin_users`: Track admin team members and roles
    - `user_assignments`: Track user-to-admin assignments
    - `admin_activity_logs`: Track admin actions and metrics

  2. Security
    - Enable RLS
    - Add policies for secure access
    - Add audit logging
*/

-- Drop existing objects if they exist
DO $$ 
BEGIN
  -- Drop existing type if it exists
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'admin_role') THEN
    DROP TYPE admin_role CASCADE;
  END IF;
END $$;

-- Create admin roles enum
CREATE TYPE admin_role AS ENUM ('admin', 'super_admin');

-- Create admin users table
CREATE TABLE IF NOT EXISTS admin_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role admin_role NOT NULL DEFAULT 'admin',
  email text NOT NULL,
  assigned_users_count integer DEFAULT 0,
  avg_response_time interval,
  total_transaction_volume numeric(20,2) DEFAULT 0,
  last_active_at timestamptz,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  metadata jsonb DEFAULT '{}'::jsonb,
  UNIQUE(user_id),
  UNIQUE(email)
);

-- Create user assignments table
CREATE TABLE IF NOT EXISTS user_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  admin_id uuid NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  assigned_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  total_transactions numeric(20,2) DEFAULT 0,
  total_invoices integer DEFAULT 0,
  last_interaction_at timestamptz,
  metadata jsonb DEFAULT '{}'::jsonb,
  UNIQUE(user_id)
);

-- Create admin activity logs table
CREATE TABLE IF NOT EXISTS admin_activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  action_type text NOT NULL,
  action_details jsonb NOT NULL,
  response_time interval,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_activity_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for admin_users
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

CREATE POLICY "Admins can view own profile"
  ON admin_users
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_admin_users_role ON admin_users(role);
CREATE INDEX IF NOT EXISTS idx_user_assignments_admin_id ON user_assignments(admin_id);
CREATE INDEX IF NOT EXISTS idx_user_assignments_user_id ON user_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_activity_logs_admin_id ON admin_activity_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_activity_logs_created_at ON admin_activity_logs(created_at);

-- Create updated_at trigger for admin_users
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_admin_users_updated_at
  BEFORE UPDATE ON admin_users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Create function to log admin activity
CREATE OR REPLACE FUNCTION log_admin_activity()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO admin_activity_logs (
    admin_id,
    action_type,
    action_details,
    response_time
  ) VALUES (
    NEW.id,
    TG_ARGV[0],
    jsonb_build_object(
      'previous_state', row_to_json(OLD),
      'new_state', row_to_json(NEW),
      'changed_at', CURRENT_TIMESTAMP
    ),
    CASE 
      WHEN TG_ARGV[1] IS NOT NULL THEN 
        (CURRENT_TIMESTAMP - (NEW.metadata->>'action_start')::timestamptz)
      ELSE NULL
    END
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for logging admin activity
CREATE TRIGGER log_admin_user_changes
  AFTER UPDATE ON admin_users
  FOR EACH ROW
  EXECUTE FUNCTION log_admin_activity('user_updated');

-- Add helpful comments
COMMENT ON TABLE admin_users IS 'Stores admin team member information and metrics';
COMMENT ON TABLE user_assignments IS 'Tracks user assignments to admin team members';
COMMENT ON TABLE admin_activity_logs IS 'Audit log for admin actions and performance metrics';