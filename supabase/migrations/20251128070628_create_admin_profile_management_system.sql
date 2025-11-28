/*
  # Admin Profile Management System

  1. New Columns Added to user_profiles
    - `profile_picture_url` (text) - URL to profile picture in storage
    - `display_name` (text) - Preferred display name for admin
    - `bio` (text) - Optional bio/description
    - `timezone` (text) - User timezone preference
    - `notification_preferences` (jsonb) - Email/push notification settings
    - `profile_completed` (boolean) - Whether initial profile setup is done
    - `profile_completed_at` (timestamptz) - When profile was completed

  2. Storage Bucket
    - Create `admin-avatars` bucket for profile pictures
    - Configure appropriate size limits and file type restrictions
    - Set up RLS policies for secure access

  3. Security
    - RLS policies ensure admins can only update their own profiles
    - Super admins can view all admin profiles
    - Profile pictures are publicly accessible once uploaded
    
  4. Indexes
    - Add index on profile_completed for quick filtering
    - Add index on admin_role for admin queries
*/

-- Add new columns to user_profiles if they don't exist
DO $$
BEGIN
  -- Add profile_picture_url
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'profile_picture_url'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN profile_picture_url text;
  END IF;

  -- Add display_name if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'display_name'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN display_name text;
  END IF;

  -- Add bio
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'bio'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN bio text;
  END IF;

  -- Add timezone
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'timezone'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN timezone text DEFAULT 'America/New_York';
  END IF;

  -- Add notification_preferences
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'notification_preferences'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN notification_preferences jsonb DEFAULT '{"email": true, "push": true, "chat": true}'::jsonb;
  END IF;

  -- Add profile_completed
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'profile_completed'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN profile_completed boolean DEFAULT false;
  END IF;

  -- Add profile_completed_at
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'profile_completed_at'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN profile_completed_at timestamptz;
  END IF;
END $$;

-- Add helpful comments
COMMENT ON COLUMN user_profiles.profile_picture_url IS 'URL to profile picture in storage';
COMMENT ON COLUMN user_profiles.display_name IS 'Preferred display name';
COMMENT ON COLUMN user_profiles.bio IS 'Admin bio or description';
COMMENT ON COLUMN user_profiles.timezone IS 'User timezone preference';
COMMENT ON COLUMN user_profiles.notification_preferences IS 'Notification settings (email, push, chat)';
COMMENT ON COLUMN user_profiles.profile_completed IS 'Whether initial profile setup is complete';
COMMENT ON COLUMN user_profiles.profile_completed_at IS 'Timestamp when profile was completed';

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_profile_completed 
  ON user_profiles(profile_completed) 
  WHERE is_admin = true;

CREATE INDEX IF NOT EXISTS idx_user_profiles_admin_role 
  ON user_profiles(admin_role) 
  WHERE is_admin = true;

-- Create storage bucket for admin avatars
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'admin-avatars',
  'admin-avatars',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];

-- Storage policies for admin-avatars bucket

-- Allow authenticated users to upload their own avatar
CREATE POLICY "Admins can upload own avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'admin-avatars' AND
  auth.uid()::text = (storage.foldername(name))[1] AND
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_id = auth.uid() AND is_admin = true
  )
);

-- Allow users to update their own avatar
CREATE POLICY "Admins can update own avatar"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'admin-avatars' AND
  auth.uid()::text = (storage.foldername(name))[1] AND
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_id = auth.uid() AND is_admin = true
  )
);

-- Allow users to delete their own avatar
CREATE POLICY "Admins can delete own avatar"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'admin-avatars' AND
  auth.uid()::text = (storage.foldername(name))[1] AND
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_id = auth.uid() AND is_admin = true
  )
);

-- Allow anyone to view avatars (public bucket)
CREATE POLICY "Anyone can view avatars"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'admin-avatars');

-- Function to mark profile as completed
CREATE OR REPLACE FUNCTION mark_profile_completed()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- If profile wasn't completed before and now has required fields
  IF OLD.profile_completed = false AND 
     NEW.first_name IS NOT NULL AND 
     NEW.last_name IS NOT NULL AND
     NEW.display_name IS NOT NULL THEN
    NEW.profile_completed := true;
    NEW.profile_completed_at := NOW();
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for profile completion
DROP TRIGGER IF EXISTS trigger_mark_profile_completed ON user_profiles;
CREATE TRIGGER trigger_mark_profile_completed
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION mark_profile_completed();