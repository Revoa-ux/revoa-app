/*
  # Add Chat Action States
  
  1. New Columns
    - `is_archived` (boolean) - Whether the conversation is archived by admin
    - `is_flagged` (boolean) - Whether the conversation is flagged for follow-up
    - `is_muted` (boolean) - Whether notifications are muted for this conversation
    - `archived_at` (timestamptz) - When the conversation was archived
    - `flagged_at` (timestamptz) - When the conversation was flagged
    - `muted_at` (timestamptz) - When the conversation was muted
  
  2. Purpose
    - Enable admins to organize and manage conversations
    - Track when actions were taken for analytics
    - Support filtering conversations by state
  
  3. Notes
    - All fields default to false/null for existing conversations
    - Timestamps help track action history
    - These states are admin-specific (not user-facing)
*/

-- Add action state columns
ALTER TABLE chats ADD COLUMN IF NOT EXISTS is_archived boolean DEFAULT false;
ALTER TABLE chats ADD COLUMN IF NOT EXISTS is_flagged boolean DEFAULT false;
ALTER TABLE chats ADD COLUMN IF NOT EXISTS is_muted boolean DEFAULT false;
ALTER TABLE chats ADD COLUMN IF NOT EXISTS archived_at timestamptz;
ALTER TABLE chats ADD COLUMN IF NOT EXISTS flagged_at timestamptz;
ALTER TABLE chats ADD COLUMN IF NOT EXISTS muted_at timestamptz;

-- Create indexes for filtering performance
CREATE INDEX IF NOT EXISTS idx_chats_archived ON chats(is_archived) WHERE is_archived = true;
CREATE INDEX IF NOT EXISTS idx_chats_flagged ON chats(is_flagged) WHERE is_flagged = true;
CREATE INDEX IF NOT EXISTS idx_chats_muted ON chats(is_muted) WHERE is_muted = true;