-- Fix messages table RLS policies to allow users and admins to send/read messages
--
-- Drop existing restrictive policies and add proper ones

-- Drop old policies
DROP POLICY IF EXISTS "Team members can read all messages" ON messages;
DROP POLICY IF EXISTS "Team members can send messages" ON messages;
DROP POLICY IF EXISTS "Team members can update message status" ON messages;

-- Users can read messages from their chats
CREATE POLICY "Users can read own chat messages"
  ON messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chats
      WHERE chats.id = messages.chat_id
      AND chats.user_id = auth.uid()
    )
  );

-- Admins can read messages from chats they're assigned to
CREATE POLICY "Admins can read assigned chat messages"
  ON messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chats
      WHERE chats.id = messages.chat_id
      AND chats.admin_id = auth.uid()
      AND EXISTS (
        SELECT 1 FROM user_profiles
        WHERE user_id = auth.uid()
        AND is_admin = true
      )
    )
  );

-- Users can send messages (as 'user')
CREATE POLICY "Users can send messages"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (
    sender = 'user' AND
    EXISTS (
      SELECT 1 FROM chats
      WHERE chats.id = messages.chat_id
      AND chats.user_id = auth.uid()
    )
  );

-- Admins can send messages (as 'team')
CREATE POLICY "Admins can send messages"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (
    sender = 'team' AND
    EXISTS (
      SELECT 1 FROM chats
      WHERE chats.id = messages.chat_id
      AND chats.admin_id = auth.uid()
      AND EXISTS (
        SELECT 1 FROM user_profiles
        WHERE user_id = auth.uid()
        AND is_admin = true
      )
    )
  );

-- Users can update their own message status
CREATE POLICY "Users can update message status"
  ON messages FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chats
      WHERE chats.id = messages.chat_id
      AND chats.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM chats
      WHERE chats.id = messages.chat_id
      AND chats.user_id = auth.uid()
    )
  );

-- Admins can update message status
CREATE POLICY "Admins can update message status"
  ON messages FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chats
      WHERE chats.id = messages.chat_id
      AND chats.admin_id = auth.uid()
      AND EXISTS (
        SELECT 1 FROM user_profiles
        WHERE user_id = auth.uid()
        AND is_admin = true
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM chats
      WHERE chats.id = messages.chat_id
      AND chats.admin_id = auth.uid()
      AND EXISTS (
        SELECT 1 FROM user_profiles
        WHERE user_id = auth.uid()
        AND is_admin = true
      )
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp DESC);