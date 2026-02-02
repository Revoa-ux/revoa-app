/*
  # Create Profile Pictures Storage Bucket

  1. Storage
    - Creates `profile-pictures` bucket for storing user profile images
    - Public access for reading
    - Authenticated users can upload/update their own pictures

  2. Security
    - RLS policies ensure users can only manage their own profile pictures
    - Images are publicly readable
*/

-- Create the storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-pictures', 'profile-pictures', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for profile pictures
CREATE POLICY "Users can upload their own profile picture"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'profile-pictures' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can update their own profile picture"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'profile-pictures' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete their own profile picture"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'profile-pictures' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Profile pictures are publicly accessible"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'profile-pictures');
