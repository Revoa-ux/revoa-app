/*
  # Add Tags to Chat Threads
  
  1. Changes
    - Add `tag` column to `chat_threads` table for categorizing threads
    - Tags like: "issue", "question", "shipping", "payment", "quality", "other"
  
  2. Notes
    - Tag is optional (nullable)
    - No foreign key constraint - just a simple text field
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chat_threads' AND column_name = 'tag'
  ) THEN
    ALTER TABLE chat_threads ADD COLUMN tag text;
  END IF;
END $$;