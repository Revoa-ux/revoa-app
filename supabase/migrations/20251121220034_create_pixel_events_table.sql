/*
  # Create Pixel Events Table

  ## Overview
  This migration creates the `pixel_events` table to store client-side tracking events
  from the Revoa tracking pixel. This enables first-party data collection for improved
  attribution accuracy.

  ## New Tables

  ### `pixel_events`
  Stores all tracking events from the Revoa pixel (PageView, AddToCart, Purchase, etc.)

  **Columns:**
  - `id` (uuid, primary key)
  - `user_id` (uuid) - The merchant/store owner
  - `session_id` (text) - Browser session identifier
  - `event_name` (text) - PageView, AddToCart, InitiateCheckout, Purchase
  - `event_time` (timestamptz) - When the event occurred
  - `event_data` (jsonb) - Event-specific data (product info, order details, etc.)
  - `page_url` (text) - Full URL where event occurred
  - `page_title` (text) - Page title
  - `page_path` (text) - URL path
  - `referrer` (text) - HTTP referrer
  - `utm_source` (text) - Traffic source
  - `utm_medium` (text) - Traffic medium
  - `utm_campaign` (text) - Campaign identifier
  - `utm_term` (text) - Ad/keyword identifier
  - `utm_content` (text) - Ad variation
  - `fbclid` (text) - Facebook click ID
  - `gclid` (text) - Google click ID
  - `ttclid` (text) - TikTok click ID
  - `msclkid` (text) - Microsoft click ID
  - `landing_page` (text) - First page visited with UTM params
  - `user_agent` (text) - Browser user agent
  - `screen_width` (integer) - Screen width
  - `screen_height` (integer) - Screen height
  - `created_at` (timestamptz)

  ## Indexes
  - `idx_pixel_events_user_session` - Query events by user and session
  - `idx_pixel_events_event_time` - Time-based queries
  - `idx_pixel_events_utm_term` - Attribution matching by utm_term
  - `idx_pixel_events_click_ids` - Match by fbclid/gclid/ttclid

  ## Security
  - RLS enabled
  - Users can only insert events for their own store
  - Users can query their own events
*/

-- Create pixel_events table
CREATE TABLE IF NOT EXISTS pixel_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  session_id text NOT NULL,
  event_name text NOT NULL,
  event_time timestamptz NOT NULL DEFAULT now(),
  event_data jsonb DEFAULT '{}',
  page_url text,
  page_title text,
  page_path text,
  referrer text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_term text,
  utm_content text,
  fbclid text,
  gclid text,
  ttclid text,
  msclkid text,
  landing_page text,
  user_agent text,
  screen_width integer,
  screen_height integer,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_pixel_events_user_session 
  ON pixel_events(user_id, session_id);

CREATE INDEX IF NOT EXISTS idx_pixel_events_event_time 
  ON pixel_events(event_time DESC);

CREATE INDEX IF NOT EXISTS idx_pixel_events_utm_term 
  ON pixel_events(utm_term) 
  WHERE utm_term IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_pixel_events_fbclid 
  ON pixel_events(fbclid) 
  WHERE fbclid IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_pixel_events_gclid 
  ON pixel_events(gclid) 
  WHERE gclid IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_pixel_events_event_name 
  ON pixel_events(event_name, event_time DESC);

-- Enable RLS
ALTER TABLE pixel_events ENABLE ROW LEVEL SECURITY;

-- Policy: Users can insert events for their own store
CREATE POLICY "Users can insert own pixel events"
  ON pixel_events
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Policy: Service role can insert (for pixel endpoint)
CREATE POLICY "Service role can insert pixel events"
  ON pixel_events
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Policy: Users can view their own events
CREATE POLICY "Users can view own pixel events"
  ON pixel_events
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy: Super admins can view all events
CREATE POLICY "Super admins can view all pixel events"
  ON pixel_events
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND is_super_admin = true
    )
  );
