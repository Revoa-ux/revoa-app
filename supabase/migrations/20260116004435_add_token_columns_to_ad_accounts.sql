/*
  # Add Token Storage Columns to Ad Accounts
  
  1. Changes
    - Add `access_token` column to store OAuth access tokens
    - Add `refresh_token` column to store OAuth refresh tokens
    - Add `token_expires_at` column to track token expiration
    - Add `metadata` column for additional platform-specific data
    
  2. Notes
    - These columns are needed for all ad platforms (Google, Facebook, TikTok)
    - Tokens are encrypted at rest by Supabase
    - Expiration tracking enables automatic token refresh
*/

-- Add token storage columns to ad_accounts if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ad_accounts' AND column_name = 'access_token'
  ) THEN
    ALTER TABLE ad_accounts ADD COLUMN access_token text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ad_accounts' AND column_name = 'refresh_token'
  ) THEN
    ALTER TABLE ad_accounts ADD COLUMN refresh_token text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ad_accounts' AND column_name = 'token_expires_at'
  ) THEN
    ALTER TABLE ad_accounts ADD COLUMN token_expires_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ad_accounts' AND column_name = 'metadata'
  ) THEN
    ALTER TABLE ad_accounts ADD COLUMN metadata jsonb DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- Create index for token expiration lookups
CREATE INDEX IF NOT EXISTS idx_ad_accounts_token_expires_at ON ad_accounts(token_expires_at);
