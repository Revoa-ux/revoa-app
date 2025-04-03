/*
  # Fix Admin Authentication

  1. Changes
    - Drop existing policies
    - Create new simplified policies
    - Fix admin user creation
    - Add proper RLS policies

  2. Security
    - Enable RLS
    - Add proper policies
    - Set up initial admin
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Super admins can manage all admin users" ON admin_users;
DROP POLICY IF EXISTS "Admins can view own profile" ON admin_users;
DROP POLICY IF EXISTS "Allow public access for admin auth" ON admin_users;
DROP POLICY IF EXISTS "Service role has full access" ON admin_users;
DROP POLICY IF EXISTS "Admins can update own profile" ON admin_users;

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

-- Create function to safely create admin user
CREATE OR REPLACE FUNCTION create_admin_user(admin_email text, admin_role admin_role)
RETURNS void AS $$
DECLARE
  admin_user_id uuid;
BEGIN
  -- Get the user_id from auth.users
  SELECT id INTO admin_user_id
  FROM auth.users
  WHERE email = admin_email;

  -- Only proceed if we found the user
  IF admin_user_id IS NOT NULL THEN
    -- Create admin user if it doesn't exist
    INSERT INTO admin_users (
      user_id,
      role,
      email,
      assigned_users_count,
      total_transaction_volume,
      created_at,
      updated_at,
      metadata
    )
    VALUES (
      admin_user_id,
      admin_role,
      admin_email,
      0,
      0,
      CURRENT_TIMESTAMP,
      CURRENT_TIMESTAMP,
      jsonb_build_object(
        'created_by', 'system',
        'is_initial_admin', true
      )
    )
    ON CONFLICT (email) DO NOTHING;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create initial admin user
SELECT create_admin_user('tyler@revoa.app', 'super_admin'::admin_role);

-- Add helpful comment
COMMENT ON TABLE admin_users IS 'Stores admin team member information and metrics';