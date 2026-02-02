/*
  # Fix Ad Accounts Unique Constraint

  ## Problem
  The `ad_accounts` table has a simple UNIQUE constraint on `platform_account_id`,
  but the OAuth function tries to upsert with a compound key `(user_id, platform, platform_account_id)`.
  This causes upsert operations to fail.

  ## Solution
  1. Drop the simple UNIQUE constraint on `platform_account_id`
  2. Add a compound UNIQUE constraint on `(user_id, platform, platform_account_id)`
  
  This allows:
  - The same platform account ID to be connected by different users
  - Proper upsert behavior when reconnecting accounts
*/

-- Drop the simple unique constraint on platform_account_id
ALTER TABLE ad_accounts DROP CONSTRAINT IF EXISTS ad_accounts_platform_account_id_key;

-- Add compound unique constraint
ALTER TABLE ad_accounts 
  ADD CONSTRAINT ad_accounts_user_platform_account_unique 
  UNIQUE (user_id, platform, platform_account_id);
