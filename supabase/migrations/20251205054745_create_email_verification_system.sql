/*
  # Email Verification System with Resend

  1. New Tables
    - `email_verification_tokens`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `new_email` (text, email to verify)
      - `token` (text, verification token)
      - `expires_at` (timestamptz, expiration)
      - `verified_at` (timestamptz, when verified)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on `email_verification_tokens` table
    - Add policies for users to manage their own verification tokens
    - Tokens expire after 24 hours

  3. Indexes
    - Index on token for fast lookup
    - Index on user_id for user queries
    - Index on expires_at for cleanup
*/

-- Create email_verification_tokens table
CREATE TABLE IF NOT EXISTS email_verification_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  new_email text NOT NULL,
  token text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  verified_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_token ON email_verification_tokens(token);
CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_user_id ON email_verification_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_expires_at ON email_verification_tokens(expires_at);

-- Enable RLS
ALTER TABLE email_verification_tokens ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own verification tokens"
  ON email_verification_tokens
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own verification tokens"
  ON email_verification_tokens
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own verification tokens"
  ON email_verification_tokens
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Function to clean up expired tokens
CREATE OR REPLACE FUNCTION cleanup_expired_verification_tokens()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM email_verification_tokens
  WHERE expires_at < now() AND verified_at IS NULL;
END;
$$;