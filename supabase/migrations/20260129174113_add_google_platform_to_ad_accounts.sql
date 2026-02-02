/*
  # Add Google platform to ad_accounts

  1. Changes
    - Update the platform check constraint to include 'google' as a valid platform value
    - This allows Google Ads accounts to be stored in the ad_accounts table

  2. Notes
    - Drops the existing constraint and recreates it with the new value
*/

ALTER TABLE ad_accounts DROP CONSTRAINT IF EXISTS ad_accounts_platform_check;

ALTER TABLE ad_accounts ADD CONSTRAINT ad_accounts_platform_check 
  CHECK (platform = ANY (ARRAY['facebook'::text, 'tiktok'::text, 'google'::text]));