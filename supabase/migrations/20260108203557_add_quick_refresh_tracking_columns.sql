/*
  # Add Quick Refresh Tracking Columns

  1. Changes
    - Adds `last_quick_refresh_at` to track when quick refresh was last run
    - Adds `last_existence_check_at` to track when we last checked for new items
    - These enable rate limiting to prevent too many Facebook API calls

  2. Purpose
    - Prevent rate limit errors from Facebook API
    - Only check for new campaigns/ads hourly instead of every refresh
    - Throttle quick refreshes to max once per 30 seconds
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ad_accounts' AND column_name = 'last_quick_refresh_at'
  ) THEN
    ALTER TABLE ad_accounts ADD COLUMN last_quick_refresh_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ad_accounts' AND column_name = 'last_existence_check_at'
  ) THEN
    ALTER TABLE ad_accounts ADD COLUMN last_existence_check_at timestamptz;
  END IF;
END $$;