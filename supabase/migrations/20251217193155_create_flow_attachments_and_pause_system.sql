/*
  # Create Flow Attachments and Pause System

  1. New Tables
    - `flow_attachments`
      - `id` (uuid, primary key)
      - `session_id` (uuid, foreign key to thread_flow_sessions)
      - `file_url` (text) - Supabase Storage path
      - `file_name` (text) - Original filename
      - `file_type` (text) - MIME type
      - `file_size` (integer) - Size in bytes
      - `uploaded_by` (uuid, foreign key to auth.users)
      - `uploaded_at` (timestamptz)
      - `created_at` (timestamptz)

  2. Schema Changes
    - Add `paused_at` (timestamptz) to thread_flow_sessions
    - Add `pause_reason` (text) to thread_flow_sessions
    - Add `pause_note` (text) to thread_flow_sessions

  3. Security
    - Enable RLS on flow_attachments
    - Add policies for authenticated users to manage attachments
    - Add indexes for performance on foreign keys and dates

  4. Storage
    - Reference to flow-attachments bucket (created separately)
*/

-- Create flow_attachments table
CREATE TABLE IF NOT EXISTS flow_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES thread_flow_sessions(id) ON DELETE CASCADE,
  file_url text NOT NULL,
  file_name text NOT NULL,
  file_type text NOT NULL,
  file_size integer NOT NULL,
  uploaded_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  uploaded_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Add pause fields to thread_flow_sessions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'thread_flow_sessions' AND column_name = 'paused_at'
  ) THEN
    ALTER TABLE thread_flow_sessions ADD COLUMN paused_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'thread_flow_sessions' AND column_name = 'pause_reason'
  ) THEN
    ALTER TABLE thread_flow_sessions ADD COLUMN pause_reason text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'thread_flow_sessions' AND column_name = 'pause_note'
  ) THEN
    ALTER TABLE thread_flow_sessions ADD COLUMN pause_note text;
  END IF;
END $$;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_flow_attachments_session_id ON flow_attachments(session_id);
CREATE INDEX IF NOT EXISTS idx_flow_attachments_uploaded_by ON flow_attachments(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_flow_attachments_uploaded_at ON flow_attachments(uploaded_at DESC);
CREATE INDEX IF NOT EXISTS idx_thread_flow_sessions_paused_at ON thread_flow_sessions(paused_at) WHERE paused_at IS NOT NULL;

-- Enable RLS
ALTER TABLE flow_attachments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for flow_attachments

-- Users can view attachments for sessions they have access to
CREATE POLICY "Users can view flow attachments for their threads"
  ON flow_attachments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM thread_flow_sessions tfs
      JOIN chat_threads ct ON tfs.thread_id = ct.id
      JOIN chats c ON ct.chat_id = c.id
      WHERE tfs.id = flow_attachments.session_id
      AND c.user_id = auth.uid()
    )
  );

-- Admins can view all attachments
CREATE POLICY "Admins can view all flow attachments"
  ON flow_attachments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND is_admin = true
    )
  );

-- Super admins can view all attachments
CREATE POLICY "Super admins can view all flow attachments"
  ON flow_attachments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND is_super_admin = true
    )
  );

-- Users can insert attachments to their own sessions
CREATE POLICY "Users can upload attachments to their flow sessions"
  ON flow_attachments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM thread_flow_sessions tfs
      JOIN chat_threads ct ON tfs.thread_id = ct.id
      JOIN chats c ON ct.chat_id = c.id
      WHERE tfs.id = session_id
      AND c.user_id = auth.uid()
    )
    AND uploaded_by = auth.uid()
  );

-- Admins can insert attachments to any session
CREATE POLICY "Admins can upload attachments to any flow session"
  ON flow_attachments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND is_admin = true
    )
    AND uploaded_by = auth.uid()
  );

-- Users can delete their own attachments
CREATE POLICY "Users can delete their own flow attachments"
  ON flow_attachments FOR DELETE
  TO authenticated
  USING (uploaded_by = auth.uid());

-- Admins can delete any attachments
CREATE POLICY "Admins can delete any flow attachments"
  ON flow_attachments FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND is_admin = true
    )
  );
