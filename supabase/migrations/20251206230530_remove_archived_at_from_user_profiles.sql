/*
  # Remove archived_at column from user_profiles
  
  1. Changes
    - Remove archived_at column since users are paying customers and shouldn't be archived
    - Drop the associated index
  
  2. Notes
    - Users are paying Shopify app subscribers, archiving them doesn't make business sense
*/

DROP INDEX IF EXISTS idx_user_profiles_archived_at;

ALTER TABLE user_profiles
DROP COLUMN IF EXISTS archived_at;
