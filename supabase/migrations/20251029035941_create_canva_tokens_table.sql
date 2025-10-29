/*
  # Create Canva OAuth Tokens Storage

  1. New Tables
    - `canva_tokens`
      - `id` (uuid, primary key)
      - `access_token` (text) - Current access token
      - `refresh_token` (text) - Refresh token for getting new access tokens
      - `token_type` (text) - Usually "Bearer"
      - `expires_at` (timestamptz) - When the access token expires
      - `scope` (text) - OAuth scopes granted
      - `created_at` (timestamptz) - When the tokens were first stored
      - `updated_at` (timestamptz) - When the tokens were last updated

  2. Security
    - Enable RLS on `canva_tokens` table
    - Only super admins can read/write tokens
    - Tokens are encrypted at rest by Supabase

  3. Notes
    - This is a singleton table (only one row should exist)
    - The refresh token is used by the AI agent to get fresh access tokens
    - Super admins can re-authorize if needed
*/

-- Create the canva_tokens table
CREATE TABLE IF NOT EXISTS canva_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  access_token text NOT NULL,
  refresh_token text NOT NULL,
  token_type text NOT NULL DEFAULT 'Bearer',
  expires_at timestamptz NOT NULL,
  scope text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE canva_tokens ENABLE ROW LEVEL SECURITY;

-- Only super admins can read tokens
CREATE POLICY "Super admins can read Canva tokens"
  ON canva_tokens
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_super_admin = true
    )
  );

-- Only super admins can insert tokens
CREATE POLICY "Super admins can insert Canva tokens"
  ON canva_tokens
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_super_admin = true
    )
  );

-- Only super admins can update tokens
CREATE POLICY "Super admins can update Canva tokens"
  ON canva_tokens
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_super_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_super_admin = true
    )
  );

-- Only super admins can delete tokens
CREATE POLICY "Super admins can delete Canva tokens"
  ON canva_tokens
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_super_admin = true
    )
  );

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_canva_tokens_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_canva_tokens_updated_at
  BEFORE UPDATE ON canva_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_canva_tokens_updated_at();
