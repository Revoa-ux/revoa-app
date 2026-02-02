/*
  # Create Signup Confirmation System

  1. New Tables
    - `signup_confirmation_tokens`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `email` (text, the email to confirm)
      - `token` (text, unique token for verification)
      - `expires_at` (timestamptz, when the token expires)
      - `confirmed_at` (timestamptz, when user confirmed)
      - `created_at` (timestamptz, when token was created)

  2. Changes to user_profiles
    - Add `email_confirmed` column to track confirmation status

  3. Security
    - Enable RLS on signup_confirmation_tokens
    - Add policies for service role access only
    - Users cannot directly modify confirmation tokens
*/

-- Add email_confirmed column to user_profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'email_confirmed'
  ) THEN
    ALTER TABLE public.user_profiles ADD COLUMN email_confirmed boolean DEFAULT false;
  END IF;
END $$;

-- Create signup confirmation tokens table
CREATE TABLE IF NOT EXISTS public.signup_confirmation_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  token text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  confirmed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_signup_confirmation_tokens_user_id 
  ON public.signup_confirmation_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_signup_confirmation_tokens_token 
  ON public.signup_confirmation_tokens(token);
CREATE INDEX IF NOT EXISTS idx_signup_confirmation_tokens_expires_at 
  ON public.signup_confirmation_tokens(expires_at) WHERE confirmed_at IS NULL;

-- Enable RLS
ALTER TABLE public.signup_confirmation_tokens ENABLE ROW LEVEL SECURITY;

-- Only service role can access signup confirmation tokens
CREATE POLICY "Service role has full access to signup tokens"
  ON public.signup_confirmation_tokens
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Function to clean up expired tokens
CREATE OR REPLACE FUNCTION public.cleanup_expired_signup_tokens()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.signup_confirmation_tokens
  WHERE expires_at < NOW() AND confirmed_at IS NULL;
END;
$$;
