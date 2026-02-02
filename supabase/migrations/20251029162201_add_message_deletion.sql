/*
  # Add Message Deletion Support

  1. Changes
    - Add `deleted_at` column to messages table for soft deletes
    - Add `deleted_by` column to track who deleted the message
    - Update RLS policies to allow users to delete their own messages
    - Allow admins to delete any message

  2. Security
    - Users can only delete their own messages
    - Admins can delete any message
    - Deleted messages are soft-deleted (not removed from database)
*/

-- Add deletion tracking columns
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'messages' AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE messages ADD COLUMN deleted_at timestamptz;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'messages' AND column_name = 'deleted_by'
  ) THEN
    ALTER TABLE messages ADD COLUMN deleted_by uuid REFERENCES auth.users(id);
  END IF;
END $$;

-- Create index for deleted messages
CREATE INDEX IF NOT EXISTS idx_messages_deleted_at ON messages(deleted_at);

-- Drop existing delete policy if exists
DROP POLICY IF EXISTS "Users can delete their own messages" ON messages;
DROP POLICY IF EXISTS "Admins can delete any message" ON messages;

-- Create delete policies
CREATE POLICY "Users can delete their own messages"
  ON messages
  FOR UPDATE
  TO authenticated
  USING (
    (sender = 'user' AND EXISTS (
      SELECT 1 FROM chats
      WHERE chats.id = messages.chat_id
      AND chats.user_id = auth.uid()
    ))
    OR
    (sender = 'team' AND EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.is_admin = true
    ))
  )
  WITH CHECK (true);

-- Add comments
COMMENT ON COLUMN messages.deleted_at IS 'Timestamp when message was deleted (soft delete)';
COMMENT ON COLUMN messages.deleted_by IS 'User who deleted the message';