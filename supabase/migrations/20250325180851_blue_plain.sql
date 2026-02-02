-- Drop existing trigger and function if they exist
DROP TRIGGER IF EXISTS message_status_change ON messages;
DROP FUNCTION IF EXISTS log_message_status_change();

-- Create messages table if it doesn't exist
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id uuid NOT NULL,
  content text NOT NULL,
  type text NOT NULL CHECK (type IN ('text', 'image', 'file', 'link')),
  sender text NOT NULL CHECK (sender IN ('user', 'team')),
  timestamp timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  status text CHECK (status IN ('sending', 'sent', 'delivered', 'read', 'unread')),
  status_updated_at timestamptz,
  status_updated_by uuid REFERENCES auth.users(id),
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Create function to log status changes
CREATE OR REPLACE FUNCTION log_message_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    NEW.status_updated_at = NOW();
    NEW.status_updated_by = auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for status changes
CREATE TRIGGER message_status_change
  BEFORE UPDATE OF status ON messages
  FOR EACH ROW
  EXECUTE FUNCTION log_message_status_change();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender);
CREATE INDEX IF NOT EXISTS idx_messages_status ON messages(status);
CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp);

-- Drop existing policies
DROP POLICY IF EXISTS "Team members can read all messages" ON messages;
DROP POLICY IF EXISTS "Team members can send messages" ON messages;
DROP POLICY IF EXISTS "Team members can update message status" ON messages;

-- Create RLS policies
CREATE POLICY "Team members can read all messages"
  ON messages
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Team members can send messages"
  ON messages
  FOR INSERT
  TO authenticated
  WITH CHECK (sender = 'team');

CREATE POLICY "Team members can update message status"
  ON messages
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Add helpful comments
COMMENT ON TABLE messages IS 'Stores chat messages between users and team members';
COMMENT ON COLUMN messages.status IS 'Current status of the message';
COMMENT ON COLUMN messages.status_updated_at IS 'Timestamp of the last status update';
COMMENT ON COLUMN messages.status_updated_by IS 'User who last updated the status';