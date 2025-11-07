/*
  # Add Facebook Tokens Table
  
  1. New Tables
    - `facebook_tokens`
      - Stores OAuth access tokens for Facebook API
      - Links to ad accounts and users
  
  2. Security
    - Enable RLS
    - Users can only access their own tokens
*/

-- Create facebook_tokens table
CREATE TABLE IF NOT EXISTS facebook_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ad_account_id text NOT NULL UNIQUE,
  access_token text NOT NULL,
  token_type text NOT NULL DEFAULT 'user',
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_facebook_tokens_user_id ON facebook_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_facebook_tokens_ad_account_id ON facebook_tokens(ad_account_id);
CREATE INDEX IF NOT EXISTS idx_facebook_tokens_expires_at ON facebook_tokens(expires_at);

ALTER TABLE facebook_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tokens"
  ON facebook_tokens FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tokens"
  ON facebook_tokens FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tokens"
  ON facebook_tokens FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own tokens"
  ON facebook_tokens FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);