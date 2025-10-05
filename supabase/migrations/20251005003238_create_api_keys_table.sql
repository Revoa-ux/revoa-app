/*
  # Create API Keys Table for AI Agent Integration

  1. New Table
    - `api_keys` - Stores long-lived API keys for integrations like AI agents
    
  2. Columns
    - `id` - UUID primary key
    - `name` - Friendly name (e.g., "AI Product Importer")
    - `key_hash` - Hashed API key (for security)
    - `key_prefix` - First 8 chars of key (for identification)
    - `created_by` - Admin user who created it
    - `last_used_at` - Last time key was used
    - `expires_at` - Optional expiration
    - `is_active` - Enable/disable without deleting
    - `permissions` - JSONB array of permissions
    - `created_at` - Timestamp

  3. Security
    - Only super admins can create/manage API keys
    - Keys are hashed (only shown once during creation)
    - RLS policies protect the table
*/

-- Create api_keys table
CREATE TABLE IF NOT EXISTS api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  key_hash text NOT NULL UNIQUE,
  key_prefix text NOT NULL,
  created_by uuid REFERENCES user_profiles(user_id) NOT NULL,
  last_used_at timestamptz,
  expires_at timestamptz,
  is_active boolean DEFAULT true NOT NULL,
  permissions jsonb DEFAULT '["import_products", "upload_assets"]'::jsonb,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

-- Only super admins can view API keys
CREATE POLICY "Super admins can view API keys"
ON api_keys
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.user_id = auth.uid()
    AND user_profiles.is_admin = true
    AND user_profiles.admin_role = 'super_admin'
  )
);

-- Only super admins can create API keys
CREATE POLICY "Super admins can create API keys"
ON api_keys
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.user_id = auth.uid()
    AND user_profiles.is_admin = true
    AND user_profiles.admin_role = 'super_admin'
  )
);

-- Only super admins can update API keys
CREATE POLICY "Super admins can update API keys"
ON api_keys
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.user_id = auth.uid()
    AND user_profiles.is_admin = true
    AND user_profiles.admin_role = 'super_admin'
  )
);

-- Only super admins can delete API keys
CREATE POLICY "Super admins can delete API keys"
ON api_keys
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.user_id = auth.uid()
    AND user_profiles.is_admin = true
    AND user_profiles.admin_role = 'super_admin'
  )
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_is_active ON api_keys(is_active);
CREATE INDEX IF NOT EXISTS idx_api_keys_created_by ON api_keys(created_by);
