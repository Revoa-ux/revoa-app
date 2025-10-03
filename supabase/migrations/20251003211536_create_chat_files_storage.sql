/*
  # Create Chat Files Storage

  1. Storage
    - Create 'chat-files' storage bucket for uploaded images and files
    - Allow authenticated users to upload files
    - Allow public read access to files
    
  2. Security
    - Users can upload files to their own folders
    - All authenticated users can read files (needed for chat functionality)
*/

-- Create storage bucket for chat files
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-files', 'chat-files', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload files to their own folder
CREATE POLICY "Users can upload chat files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'chat-files' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow public read access to all chat files
CREATE POLICY "Anyone can view chat files"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'chat-files');

-- Allow users to delete their own files
CREATE POLICY "Users can delete own chat files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'chat-files' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
