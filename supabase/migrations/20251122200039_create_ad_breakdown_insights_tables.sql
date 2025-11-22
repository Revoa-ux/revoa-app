/*
  # Create Ad Breakdown Insights Tables for Deep AI Analysis

  1. New Tables
    - `ad_insights_demographics`
      - Stores age and gender breakdown data for ads
      - Tracks performance metrics by demographic segment
      - Enables demographic pattern recognition
    
    - `ad_insights_placements`
      - Stores device type and placement breakdown data
      - Tracks performance by platform (feed, stories, reels, etc.)
      - Enables placement optimization insights
    
    - `ad_insights_geographic`
      - Stores country, region, and city-level performance
      - Enables geographic targeting optimization
      - Identifies high-value markets
    
    - `ad_insights_temporal`
      - Stores hour-of-day and day-of-week patterns
      - Enables dayparting and scheduling optimization
      - Detects time-based performance trends

  2. Indexes
    - Performance-optimized indexes on all foreign keys
    - Date range indexes for time-series queries
    - Composite indexes for common query patterns

  3. Security
    - Enable RLS on all tables
    - Users can only view their own ad insights
    - Super admins can view all data
*/

-- Ad Insights Demographics Table
CREATE TABLE IF NOT EXISTS ad_insights_demographics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ad_id uuid NOT NULL REFERENCES ads(id) ON DELETE CASCADE,
  platform text NOT NULL,
  platform_ad_id text NOT NULL,
  date date NOT NULL,
  age_range text NOT NULL,
  gender text NOT NULL,
  
  -- Performance Metrics
  impressions bigint DEFAULT 0,
  clicks bigint DEFAULT 0,
  spend numeric(10,2) DEFAULT 0,
  conversions bigint DEFAULT 0,
  revenue numeric(10,2) DEFAULT 0,
  profit numeric(10,2) DEFAULT 0,
  
  -- Calculated Metrics
  ctr numeric(5,2) DEFAULT 0,
  cpc numeric(10,2) DEFAULT 0,
  cpa numeric(10,2) DEFAULT 0,
  roas numeric(10,2) DEFAULT 0,
  
  -- Metadata
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Ensure unique constraint per day/demographic
  UNIQUE(ad_id, date, age_range, gender)
);

-- Ad Insights Placements Table
CREATE TABLE IF NOT EXISTS ad_insights_placements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ad_id uuid NOT NULL REFERENCES ads(id) ON DELETE CASCADE,
  platform text NOT NULL,
  platform_ad_id text NOT NULL,
  date date NOT NULL,
  
  -- Placement Details
  placement_type text NOT NULL, -- feed, story, reel, explore, etc.
  device_type text NOT NULL, -- mobile, desktop, tablet
  publisher_platform text, -- facebook, instagram, messenger, audience_network
  
  -- Performance Metrics
  impressions bigint DEFAULT 0,
  clicks bigint DEFAULT 0,
  spend numeric(10,2) DEFAULT 0,
  conversions bigint DEFAULT 0,
  revenue numeric(10,2) DEFAULT 0,
  profit numeric(10,2) DEFAULT 0,
  
  -- Calculated Metrics
  ctr numeric(5,2) DEFAULT 0,
  cpc numeric(10,2) DEFAULT 0,
  cpa numeric(10,2) DEFAULT 0,
  roas numeric(10,2) DEFAULT 0,
  
  -- Engagement Metrics
  engagement_rate numeric(5,2) DEFAULT 0,
  video_views bigint DEFAULT 0,
  
  -- Metadata
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(ad_id, date, placement_type, device_type, publisher_platform)
);

-- Ad Insights Geographic Table
CREATE TABLE IF NOT EXISTS ad_insights_geographic (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ad_id uuid NOT NULL REFERENCES ads(id) ON DELETE CASCADE,
  platform text NOT NULL,
  platform_ad_id text NOT NULL,
  date date NOT NULL,
  
  -- Geographic Details
  country_code text NOT NULL,
  country_name text NOT NULL,
  region text,
  city text,
  
  -- Performance Metrics
  impressions bigint DEFAULT 0,
  clicks bigint DEFAULT 0,
  spend numeric(10,2) DEFAULT 0,
  conversions bigint DEFAULT 0,
  revenue numeric(10,2) DEFAULT 0,
  profit numeric(10,2) DEFAULT 0,
  
  -- Calculated Metrics
  ctr numeric(5,2) DEFAULT 0,
  cpc numeric(10,2) DEFAULT 0,
  cpa numeric(10,2) DEFAULT 0,
  roas numeric(10,2) DEFAULT 0,
  
  -- Metadata
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(ad_id, date, country_code, region, city)
);

-- Ad Insights Temporal Table
CREATE TABLE IF NOT EXISTS ad_insights_temporal (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ad_id uuid NOT NULL REFERENCES ads(id) ON DELETE CASCADE,
  platform text NOT NULL,
  platform_ad_id text NOT NULL,
  date date NOT NULL,
  
  -- Time Details
  hour_of_day int NOT NULL CHECK (hour_of_day >= 0 AND hour_of_day <= 23),
  day_of_week int NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0=Sunday
  
  -- Performance Metrics
  impressions bigint DEFAULT 0,
  clicks bigint DEFAULT 0,
  spend numeric(10,2) DEFAULT 0,
  conversions bigint DEFAULT 0,
  revenue numeric(10,2) DEFAULT 0,
  profit numeric(10,2) DEFAULT 0,
  
  -- Calculated Metrics
  ctr numeric(5,2) DEFAULT 0,
  cpc numeric(10,2) DEFAULT 0,
  cpa numeric(10,2) DEFAULT 0,
  roas numeric(10,2) DEFAULT 0,
  
  -- Metadata
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(ad_id, date, hour_of_day)
);

-- Create Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_demographics_user_date ON ad_insights_demographics(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_demographics_ad_date ON ad_insights_demographics(ad_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_demographics_age_gender ON ad_insights_demographics(age_range, gender);

CREATE INDEX IF NOT EXISTS idx_placements_user_date ON ad_insights_placements(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_placements_ad_date ON ad_insights_placements(ad_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_placements_type_device ON ad_insights_placements(placement_type, device_type);

CREATE INDEX IF NOT EXISTS idx_geographic_user_date ON ad_insights_geographic(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_geographic_ad_date ON ad_insights_geographic(ad_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_geographic_country ON ad_insights_geographic(country_code);

CREATE INDEX IF NOT EXISTS idx_temporal_user_date ON ad_insights_temporal(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_temporal_ad_date ON ad_insights_temporal(ad_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_temporal_hour_day ON ad_insights_temporal(hour_of_day, day_of_week);

-- Enable Row Level Security
ALTER TABLE ad_insights_demographics ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_insights_placements ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_insights_geographic ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_insights_temporal ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Demographics
CREATE POLICY "Users can view own demographic insights"
  ON ad_insights_demographics FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own demographic insights"
  ON ad_insights_demographics FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own demographic insights"
  ON ad_insights_demographics FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for Placements
CREATE POLICY "Users can view own placement insights"
  ON ad_insights_placements FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own placement insights"
  ON ad_insights_placements FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own placement insights"
  ON ad_insights_placements FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for Geographic
CREATE POLICY "Users can view own geographic insights"
  ON ad_insights_geographic FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own geographic insights"
  ON ad_insights_geographic FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own geographic insights"
  ON ad_insights_geographic FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for Temporal
CREATE POLICY "Users can view own temporal insights"
  ON ad_insights_temporal FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own temporal insights"
  ON ad_insights_temporal FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own temporal insights"
  ON ad_insights_temporal FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
