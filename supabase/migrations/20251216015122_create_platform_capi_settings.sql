/*
  # Create Platform CAPI Settings Table
  
  This migration creates a table to store Conversions API (CAPI) settings for ad platforms.
  Users can configure their Pixel IDs and Access Tokens to enable server-side conversion tracking.

  1. New Tables
    - `platform_capi_settings`
      - `id` (uuid, primary key) - Unique identifier
      - `user_id` (uuid, foreign key) - Reference to auth.users
      - `platform` (text) - Platform identifier: 'facebook', 'google', 'tiktok'
      - `pixel_id` (text) - The platform's pixel/measurement ID
      - `access_token` (text) - The CAPI access token (stored securely)
      - `test_event_code` (text, nullable) - Optional test event code for debugging
      - `is_active` (boolean) - Whether CAPI is enabled for this platform
      - `last_verified_at` (timestamptz, nullable) - Last successful connection test
      - `created_at` (timestamptz) - Record creation timestamp
      - `updated_at` (timestamptz) - Last update timestamp

  2. Security
    - Enable RLS on `platform_capi_settings` table
    - Users can only view/manage their own CAPI settings
    - Settings are tied to authenticated users only

  3. Indexes
    - Index on user_id for fast lookups
    - Unique constraint on user_id + platform combination
*/

-- Create the platform_capi_settings table
CREATE TABLE IF NOT EXISTS platform_capi_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform text NOT NULL CHECK (platform IN ('facebook', 'google', 'tiktok')),
  pixel_id text NOT NULL,
  access_token text NOT NULL,
  test_event_code text,
  is_active boolean DEFAULT false,
  last_verified_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, platform)
);

-- Create index for faster user lookups
CREATE INDEX IF NOT EXISTS idx_platform_capi_settings_user_id 
  ON platform_capi_settings(user_id);

-- Enable Row Level Security
ALTER TABLE platform_capi_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own CAPI settings
CREATE POLICY "Users can view own CAPI settings"
  ON platform_capi_settings
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own CAPI settings
CREATE POLICY "Users can insert own CAPI settings"
  ON platform_capi_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own CAPI settings
CREATE POLICY "Users can update own CAPI settings"
  ON platform_capi_settings
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own CAPI settings
CREATE POLICY "Users can delete own CAPI settings"
  ON platform_capi_settings
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create trigger to update updated_at on changes
CREATE OR REPLACE FUNCTION update_platform_capi_settings_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_platform_capi_settings_updated_at
  BEFORE UPDATE ON platform_capi_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_platform_capi_settings_updated_at();
