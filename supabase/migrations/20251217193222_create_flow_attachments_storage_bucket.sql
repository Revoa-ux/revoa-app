/*
  # Create Flow Attachments Storage Bucket

  1. Storage
    - Create `flow-attachments` bucket for storing photos and videos
    - Set bucket to private (not publicly accessible)
    - Enable authenticated uploads

  2. Security
    - Users can upload files to their own flow sessions
    - Admins can upload files to any flow session
    - Users can view files for their own threads
    - Admins can view all files
    - Users can delete their own files
    - Admins can delete any files
*/

-- Create storage bucket for flow attachments
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'flow-attachments',
  'flow-attachments',
  false,
  52428800, -- 50MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm']
)
ON CONFLICT (id) DO NOTHING;

-- Policy: Users can upload files to their own flow sessions
CREATE POLICY "Users can upload files to their flow sessions"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'flow-attachments'
    AND (storage.foldername(name))[1] IN (
      SELECT tfs.id::text
      FROM thread_flow_sessions tfs
      JOIN chat_threads ct ON tfs.thread_id = ct.id
      JOIN chats c ON ct.chat_id = c.id
      WHERE c.user_id = auth.uid()
    )
  );

-- Policy: Admins can upload files to any flow session
CREATE POLICY "Admins can upload files to any flow session"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'flow-attachments'
    AND EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND is_admin = true
    )
  );

-- Policy: Users can view files from their own threads
CREATE POLICY "Users can view their flow attachment files"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'flow-attachments'
    AND (
      (storage.foldername(name))[1] IN (
        SELECT tfs.id::text
        FROM thread_flow_sessions tfs
        JOIN chat_threads ct ON tfs.thread_id = ct.id
        JOIN chats c ON ct.chat_id = c.id
        WHERE c.user_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM user_profiles
        WHERE id = auth.uid()
        AND (is_admin = true OR is_super_admin = true)
      )
    )
  );

-- Policy: Users can delete their own files
CREATE POLICY "Users can delete their own flow attachment files"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'flow-attachments'
    AND (
      (storage.foldername(name))[1] IN (
        SELECT tfs.id::text
        FROM thread_flow_sessions tfs
        JOIN chat_threads ct ON tfs.thread_id = ct.id
        JOIN chats c ON ct.chat_id = c.id
        WHERE c.user_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM user_profiles
        WHERE id = auth.uid()
        AND (is_admin = true OR is_super_admin = true)
      )
    )
  );

-- Policy: Users can update their own files
CREATE POLICY "Users can update their own flow attachment files"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'flow-attachments'
    AND (
      (storage.foldername(name))[1] IN (
        SELECT tfs.id::text
        FROM thread_flow_sessions tfs
        JOIN chat_threads ct ON tfs.thread_id = ct.id
        JOIN chats c ON ct.chat_id = c.id
        WHERE c.user_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM user_profiles
        WHERE id = auth.uid()
        AND (is_admin = true OR is_super_admin = true)
      )
    )
  );
