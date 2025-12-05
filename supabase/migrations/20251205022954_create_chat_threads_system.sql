/*
  # Chat Threads / Tickets System

  1. New Tables
    - `chat_threads`
      - `id` (uuid, primary key)
      - `chat_id` (uuid, references chats) - Parent conversation
      - `order_id` (uuid, nullable) - Link to specific order
      - `shopify_order_id` (text, nullable) - Shopify order reference
      - `title` (text) - Thread title/subject
      - `description` (text, nullable) - Issue description
      - `status` (text) - 'open', 'resolved', 'closed'
      - `created_by_user_id` (uuid) - Who created the thread
      - `created_by_admin` (boolean) - Created by admin or user
      - `closed_at` (timestamptz, nullable)
      - `closed_by_user_id` (uuid, nullable)
      - `metadata` (jsonb) - Additional data (priority, tags, etc.)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Updates to messages table
    - Add `thread_id` column to link messages to threads
    - Messages can belong to main chat OR a thread

  3. Security
    - Enable RLS on chat_threads
    - Users can view/create threads in their own chats
    - Admins can view/manage threads they're assigned to

  4. Notes
    - Threads are tied to orders for issue tracking
    - Users and admins can both create threads
    - Threads can be closed/resolved when issue is complete
    - Closing deletes the thread and archives messages
*/

-- Create chat_threads table
CREATE TABLE IF NOT EXISTS chat_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id uuid REFERENCES chats(id) ON DELETE CASCADE NOT NULL,
  order_id uuid REFERENCES shopify_orders(id) ON DELETE SET NULL,
  shopify_order_id text,
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'closed')),
  created_by_user_id uuid REFERENCES auth.users(id) NOT NULL,
  created_by_admin boolean DEFAULT false,
  closed_at timestamptz,
  closed_by_user_id uuid REFERENCES auth.users(id),
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add thread_id to messages table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'messages' AND column_name = 'thread_id'
  ) THEN
    ALTER TABLE messages ADD COLUMN thread_id uuid REFERENCES chat_threads(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_chat_threads_chat_id ON chat_threads(chat_id);
CREATE INDEX IF NOT EXISTS idx_chat_threads_order_id ON chat_threads(order_id);
CREATE INDEX IF NOT EXISTS idx_chat_threads_status ON chat_threads(status);
CREATE INDEX IF NOT EXISTS idx_chat_threads_created_at ON chat_threads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_thread_id ON messages(thread_id);

-- Enable RLS
ALTER TABLE chat_threads ENABLE ROW LEVEL SECURITY;

-- Users can view threads in their own chats
CREATE POLICY "Users can view own chat threads"
  ON chat_threads FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chats
      WHERE chats.id = chat_threads.chat_id
      AND chats.user_id = auth.uid()
    )
  );

-- Admins can view threads in assigned chats
CREATE POLICY "Admins can view assigned chat threads"
  ON chat_threads FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chats
      WHERE chats.id = chat_threads.chat_id
      AND chats.admin_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_super_admin = true
    )
  );

-- Users can create threads in their own chats
CREATE POLICY "Users can create threads in own chats"
  ON chat_threads FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM chats
      WHERE chats.id = chat_threads.chat_id
      AND chats.user_id = auth.uid()
    )
  );

-- Admins can create threads in assigned chats
CREATE POLICY "Admins can create threads in assigned chats"
  ON chat_threads FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM chats
      WHERE chats.id = chat_threads.chat_id
      AND chats.admin_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_super_admin = true
    )
  );

-- Users can update threads in their own chats
CREATE POLICY "Users can update threads in own chats"
  ON chat_threads FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chats
      WHERE chats.id = chat_threads.chat_id
      AND chats.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM chats
      WHERE chats.id = chat_threads.chat_id
      AND chats.user_id = auth.uid()
    )
  );

-- Admins can update threads in assigned chats
CREATE POLICY "Admins can update threads in assigned chats"
  ON chat_threads FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chats
      WHERE chats.id = chat_threads.chat_id
      AND chats.admin_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_super_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM chats
      WHERE chats.id = chat_threads.chat_id
      AND chats.admin_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_super_admin = true
    )
  );

-- Users can delete threads in their own chats (when closing)
CREATE POLICY "Users can delete threads in own chats"
  ON chat_threads FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chats
      WHERE chats.id = chat_threads.chat_id
      AND chats.user_id = auth.uid()
    )
  );

-- Admins can delete threads in assigned chats (when closing)
CREATE POLICY "Admins can delete threads in assigned chats"
  ON chat_threads FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chats
      WHERE chats.id = chat_threads.chat_id
      AND chats.admin_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_super_admin = true
    )
  );

-- Function to update thread updated_at timestamp
CREATE OR REPLACE FUNCTION update_chat_thread_updated_at()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS update_chat_threads_updated_at ON chat_threads;
CREATE TRIGGER update_chat_threads_updated_at
  BEFORE UPDATE ON chat_threads
  FOR EACH ROW
  EXECUTE FUNCTION update_chat_thread_updated_at();

-- Function to auto-close thread when status changes to 'closed'
CREATE OR REPLACE FUNCTION handle_thread_close()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status = 'closed' AND OLD.status != 'closed' THEN
    NEW.closed_at = now();
    IF NEW.closed_by_user_id IS NULL THEN
      NEW.closed_by_user_id = auth.uid();
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger to handle thread closing
DROP TRIGGER IF EXISTS handle_thread_close_trigger ON chat_threads;
CREATE TRIGGER handle_thread_close_trigger
  BEFORE UPDATE ON chat_threads
  FOR EACH ROW
  WHEN (NEW.status = 'closed' AND OLD.status != 'closed')
  EXECUTE FUNCTION handle_thread_close();
