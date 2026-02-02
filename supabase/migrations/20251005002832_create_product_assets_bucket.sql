/*
  # Create Product Assets Storage Bucket

  1. New Storage Bucket
    - `product-assets` - Public bucket for product images, videos, and GIFs
    - Publicly accessible (no auth required to read)
    - Only admins can upload

  2. Security
    - Public read access for all files
    - Upload restricted to authenticated admin users only
    - 50MB file size limit per file
    - Supports images (jpg, png, gif, webp) and videos (mp4, webm)
*/

-- Create the product-assets bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-assets',
  'product-assets',
  true,
  52428800, -- 50MB limit
  ARRAY[
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'video/mp4',
    'video/webm',
    'video/quicktime'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Public read access for product assets" ON storage.objects;
  DROP POLICY IF EXISTS "Admin upload access for product assets" ON storage.objects;
  DROP POLICY IF EXISTS "Admin update access for product assets" ON storage.objects;
  DROP POLICY IF EXISTS "Admin delete access for product assets" ON storage.objects;
END $$;

-- Allow public read access to all files
CREATE POLICY "Public read access for product assets"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'product-assets');

-- Allow admin users to upload files
CREATE POLICY "Admin upload access for product assets"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'product-assets'
  AND EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.user_id = auth.uid()
    AND user_profiles.is_admin = true
  )
);

-- Allow admin users to update/delete files
CREATE POLICY "Admin update access for product assets"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'product-assets'
  AND EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.user_id = auth.uid()
    AND user_profiles.is_admin = true
  )
);

CREATE POLICY "Admin delete access for product assets"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'product-assets'
  AND EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.user_id = auth.uid()
    AND user_profiles.is_admin = true
  )
);
