/*
  # Create Admin Users Table and Policies

  1. Changes
    - Create admin_role enum type
    - Create admin_users table if not exists
    - Add RLS policies
    - Add activity logging

  2. Security
    - Enable RLS
    - Add proper access policies
    - Add audit logging
*/

-- First ensure we have the admin_role type
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'admin_role') THEN
    CREATE TYPE admin_role AS ENUM ('admin', 'super_admin');
  END IF;
END $$;

-- Create admin_users table if it doesn't exist
CREATE TABLE IF NOT EXISTS admin_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  role admin_role NOT NULL DEFAULT 'admin',
  email text NOT NULL UNIQUE,
  assigned_users_count integer DEFAULT 0,
  avg_response_time interval,
  total_transaction_volume numeric(20,2) DEFAULT 0,
  last_active_at timestamptz,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Enable RLS
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Allow public access for admin auth" ON admin_users;
DROP POLICY IF EXISTS "Service role has full access" ON admin_users;
DROP POLICY IF EXISTS "Admins can update own profile" ON admin_users;

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

-- Create admin activity logs table if it doesn't exist
CREATE TABLE IF NOT EXISTS admin_activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid REFERENCES admin_users(id) ON DELETE CASCADE,
  action_type text NOT NULL,
  action_details jsonb NOT NULL,
  response_time interval,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS on activity logs
ALTER TABLE admin_activity_logs ENABLE ROW LEVEL SECURITY;

-- Create activity log policies
CREATE POLICY "Service role has full access to logs"
  ON admin_activity_logs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Create function to log admin activity
CREATE OR REPLACE FUNCTION log_admin_activity()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO admin_activity_logs (
    admin_id,
    action_type,
    action_details
  ) VALUES (
    NEW.id,
    TG_ARGV[0],
    jsonb_build_object(
      'previous_state', row_to_json(OLD),
      'new_state', row_to_json(NEW),
      'changed_at', CURRENT_TIMESTAMP
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS log_admin_user_changes ON admin_users;

-- Create trigger for logging admin activity
CREATE TRIGGER log_admin_user_changes
  AFTER UPDATE ON admin_users
  FOR EACH ROW
  EXECUTE FUNCTION log_admin_activity('user_updated');

-- Add helpful comment
COMMENT ON TABLE admin_users IS 'Stores admin team member information and metrics';