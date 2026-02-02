/*
  # Enable Admin Access for @revoa.app Domain

  1. Changes
    - Add trigger to automatically create admin users for @revoa.app emails
    - Ensure tyler@revoa.app is super admin
    - Update RLS policies for domain-based access

  2. Security
    - Maintain secure access controls
    - Add proper role assignment
*/

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION handle_revoa_admin()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if email is from revoa.app domain
  IF NEW.email LIKE '%@revoa.app' THEN
    -- Create admin user record if it doesn't exist
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
      NEW.id,
      CASE 
        WHEN NEW.email = 'tyler@revoa.app' THEN 'super_admin'
        ELSE 'admin'
      END,
      NEW.email,
      0,
      0,
      NOW(),
      NOW(),
      jsonb_build_object(
        'created_by', 'system',
        'created_at', NOW(),
        'permissions', ARRAY['manage_users', 'manage_settings']
      )
    )
    ON CONFLICT (email) DO UPDATE
    SET
      user_id = EXCLUDED.user_id,
      role = EXCLUDED.role,
      updated_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user registration
DROP TRIGGER IF EXISTS on_auth_user_revoa_admin ON auth.users;
CREATE TRIGGER on_auth_user_revoa_admin
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_revoa_admin();

-- Update existing revoa.app users
DO $$
BEGIN
  -- Update existing users from revoa.app domain
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
  SELECT
    id,
    CASE 
      WHEN email = 'tyler@revoa.app' THEN 'super_admin'::admin_role
      ELSE 'admin'::admin_role
    END,
    email,
    0,
    0,
    NOW(),
    NOW(),
    jsonb_build_object(
      'created_by', 'system',
      'created_at', NOW(),
      'permissions', ARRAY['manage_users', 'manage_settings']
    )
  FROM auth.users
  WHERE email LIKE '%@revoa.app'
  ON CONFLICT (email) DO UPDATE
  SET
    role = EXCLUDED.role,
    updated_at = NOW();
END $$;

-- Update RLS policies
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

-- Add helpful comment
COMMENT ON TABLE admin_users IS 'Stores admin team member information and metrics';