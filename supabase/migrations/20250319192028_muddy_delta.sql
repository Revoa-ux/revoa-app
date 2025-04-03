/*
  # Update Admin User Record

  1. Changes
    - Update existing admin user record
    - Set proper role and metadata
    - Handle conflicts correctly

  2. Security
    - Maintain data integrity
    - Use proper role assignment
*/

-- Update admin user record
UPDATE admin_users
SET
  role = 'super_admin'::admin_role,
  metadata = jsonb_build_object(
    'created_by', 'system',
    'is_initial_admin', true,
    'permissions', array['manage_users', 'manage_admins', 'manage_settings']
  ),
  updated_at = CURRENT_TIMESTAMP
WHERE email = 'tyler@revoa.app';

-- Add helpful comment
COMMENT ON TABLE admin_users IS 'Stores admin team member information and metrics';