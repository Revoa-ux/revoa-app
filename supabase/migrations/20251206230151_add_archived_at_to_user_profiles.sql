/*
  # Add archived_at field to user_profiles
  
  1. Changes
    - Add archived_at timestamp column to user_profiles table for soft deletion
    - Add index on archived_at for efficient filtering
  
  2. Notes
    - NULL = active user
    - NOT NULL = archived user with timestamp
*/

ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS archived_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_user_profiles_archived_at ON user_profiles(archived_at);
