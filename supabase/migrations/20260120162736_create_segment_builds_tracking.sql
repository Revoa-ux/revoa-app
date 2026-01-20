/*
  # Create Segment Builds Tracking System

  1. New Tables
    - `segment_builds`
      - Tracks campaign/ad set creations from segment analysis
      - Stores selected segments and targeting applied
      - Links to created entities for performance tracking

  2. Security
    - Enable RLS on `segment_builds` table
    - Add policies for users to manage their own builds
*/

-- Create segment builds tracking table
CREATE TABLE IF NOT EXISTS segment_builds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Source information
  source_entity_type text NOT NULL CHECK (source_entity_type IN ('campaign', 'ad_set', 'ad')),
  source_entity_id uuid NOT NULL,
  source_entity_name text NOT NULL,
  platform text NOT NULL CHECK (platform IN ('facebook', 'google', 'tiktok')),

  -- Created entities
  created_campaign_id uuid,
  created_ad_set_ids uuid[] DEFAULT '{}',
  created_ad_ids uuid[] DEFAULT '{}',

  -- Targeting configuration
  selected_segments jsonb DEFAULT '{}', -- {demographics: [], geographic: [], placements: [], temporal: []}
  targeting_applied jsonb DEFAULT '{}', -- Actual Facebook API targeting spec

  -- Build configuration
  build_type text NOT NULL CHECK (build_type IN ('new_campaign', 'add_to_campaign', 'new_ad_set')),
  bid_strategy text,
  bid_amount numeric,
  budget_daily numeric,
  budget_lifetime numeric,
  created_wide_open boolean DEFAULT false,
  paused_source_entity boolean DEFAULT false,

  -- Ad selection
  included_ad_ids text[] DEFAULT '{}', -- Platform ad IDs that were included

  -- Metadata
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS segment_builds_user_id_idx ON segment_builds(user_id);
CREATE INDEX IF NOT EXISTS segment_builds_source_entity_idx ON segment_builds(source_entity_id);
CREATE INDEX IF NOT EXISTS segment_builds_created_at_idx ON segment_builds(created_at DESC);
CREATE INDEX IF NOT EXISTS segment_builds_platform_idx ON segment_builds(platform);

-- Enable RLS
ALTER TABLE segment_builds ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own segment builds"
  ON segment_builds
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own segment builds"
  ON segment_builds
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own segment builds"
  ON segment_builds
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own segment builds"
  ON segment_builds
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
