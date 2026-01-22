/*
  # Shopify App Store Installation Support

  1. Changes to user_profiles
    - Add signup_source column to track where user signed up from
    - Add password_set boolean to track if user has set their own password
    - Add password_set_at timestamp for when password was set

  2. Changes to shopify_installations
    - Add shop_owner_email to store email from Shopify at installation time
    - Add installation_source to track manual vs app_store installation

  3. Changes to oauth_sessions
    - Make user_id nullable to support account creation during OAuth
    - Add installation_source tracking
    - Add shop_owner_email for pre-account-creation tracking
*/

-- Update user_profiles table
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS signup_source text DEFAULT 'direct',
  ADD COLUMN IF NOT EXISTS password_set boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS password_set_at timestamptz;

COMMENT ON COLUMN user_profiles.signup_source IS 'Origin of user signup: direct, shopify_app_store, admin_invite';
COMMENT ON COLUMN user_profiles.password_set IS 'Whether user has set their own password (false for auto-generated)';
COMMENT ON COLUMN user_profiles.password_set_at IS 'Timestamp when user set their password';

-- Update shopify_installations table
ALTER TABLE shopify_installations
  ADD COLUMN IF NOT EXISTS shop_owner_email text,
  ADD COLUMN IF NOT EXISTS installation_source text DEFAULT 'manual';

COMMENT ON COLUMN shopify_installations.shop_owner_email IS 'Email of shop owner from Shopify at time of installation';
COMMENT ON COLUMN shopify_installations.installation_source IS 'Source: app_store or settings_page';

-- Update oauth_sessions table
ALTER TABLE oauth_sessions
  ALTER COLUMN user_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS installation_source text DEFAULT 'settings_page',
  ADD COLUMN IF NOT EXISTS shop_owner_email text;

COMMENT ON COLUMN oauth_sessions.user_id IS 'NULL for app store installs (created during OAuth callback)';
COMMENT ON COLUMN oauth_sessions.installation_source IS 'Whether OAuth initiated from app_store or settings_page';
COMMENT ON COLUMN oauth_sessions.shop_owner_email IS 'Shop owner email for app_store installs (before account creation)';