/*
  # Add completed_at column to oauth_sessions

  1. Changes
    - Add `completed_at` column to track when OAuth flow completes successfully
    - This allows the frontend to detect when Shopify connection is established
  
  2. Notes
    - Column is nullable since existing sessions may not have completion time
    - Used by both edge function (sets value) and frontend (checks value)
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'oauth_sessions' AND column_name = 'completed_at'
  ) THEN
    ALTER TABLE public.oauth_sessions ADD COLUMN completed_at timestamptz;
  END IF;
END $$;