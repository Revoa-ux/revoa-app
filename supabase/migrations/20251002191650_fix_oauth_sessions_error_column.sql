/*
  # Add error column to oauth_sessions table

  1. Changes
    - Add error column to oauth_sessions table to track OAuth errors
    - Column is nullable text field to store error messages

  2. Notes
    - This column is used by the Netlify function to communicate OAuth status back to the frontend
*/

-- Add error column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'oauth_sessions' AND column_name = 'error'
  ) THEN
    ALTER TABLE oauth_sessions ADD COLUMN error text;
  END IF;
END $$;
