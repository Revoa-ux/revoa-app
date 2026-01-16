/*
  # Google Ads Bid Adjustments and Extended Automation System
  
  This migration creates comprehensive support for Google Ads advanced bidding capabilities.
  
  ## 1. New Tables
  
  ### google_ads_bid_adjustments
  - Stores bid adjustment percentages for various dimensions
  - Supports device, audience, demographic, location, and placement adjustments
  - Tracks historical changes for rollback capability
  
  ### google_ads_keywords
  - Keyword-level data with Quality Score tracking
  - Match type and bid information
  - Performance metrics linkage
  
  ### google_ads_audiences
  - Audience targeting data and performance
  - Supports in-market, affinity, custom intent, remarketing lists
  
  ### google_ads_placements
  - Placement-level performance for Display/Video campaigns
  - URLs, apps, YouTube channels
  
  ### google_ads_ad_schedules
  - Day and hour bid adjustments
  - Performance by time segment
  
  ### google_ads_locations
  - Geographic targeting with bid adjustments
  - Country, region, city, postal code level
  
  ## 2. Schema Extensions
  
  - Extended ad_metrics with Google-specific fields (quality_score, search_impression_share)
  - Extended ad_campaigns with bidding_strategy field
  - Extended ad_sets with bid adjustment settings
  
  ## 3. Security
  
  - RLS enabled on all tables
  - User-scoped access policies
*/

-- Add Google Ads specific columns to ad_campaigns
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ad_campaigns' AND column_name = 'bidding_strategy_type'
  ) THEN
    ALTER TABLE ad_campaigns ADD COLUMN bidding_strategy_type text;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ad_campaigns' AND column_name = 'target_cpa'
  ) THEN
    ALTER TABLE ad_campaigns ADD COLUMN target_cpa numeric;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ad_campaigns' AND column_name = 'target_roas'
  ) THEN
    ALTER TABLE ad_campaigns ADD COLUMN target_roas numeric;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ad_campaigns' AND column_name = 'maximize_conversion_value'
  ) THEN
    ALTER TABLE ad_campaigns ADD COLUMN maximize_conversion_value boolean DEFAULT false;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ad_campaigns' AND column_name = 'enhanced_cpc_enabled'
  ) THEN
    ALTER TABLE ad_campaigns ADD COLUMN enhanced_cpc_enabled boolean DEFAULT false;
  END IF;
END $$;

-- Add Google Ads specific columns to ad_sets (ad groups)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ad_sets' AND column_name = 'cpc_bid_micros'
  ) THEN
    ALTER TABLE ad_sets ADD COLUMN cpc_bid_micros bigint;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ad_sets' AND column_name = 'target_cpa_micros'
  ) THEN
    ALTER TABLE ad_sets ADD COLUMN target_cpa_micros bigint;
  END IF;
END $$;

-- Add Google Ads specific columns to ad_metrics
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ad_metrics' AND column_name = 'quality_score'
  ) THEN
    ALTER TABLE ad_metrics ADD COLUMN quality_score integer;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ad_metrics' AND column_name = 'search_impression_share'
  ) THEN
    ALTER TABLE ad_metrics ADD COLUMN search_impression_share numeric;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ad_metrics' AND column_name = 'search_top_impression_share'
  ) THEN
    ALTER TABLE ad_metrics ADD COLUMN search_top_impression_share numeric;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ad_metrics' AND column_name = 'search_abs_top_impression_share'
  ) THEN
    ALTER TABLE ad_metrics ADD COLUMN search_abs_top_impression_share numeric;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ad_metrics' AND column_name = 'search_lost_impression_share_budget'
  ) THEN
    ALTER TABLE ad_metrics ADD COLUMN search_lost_impression_share_budget numeric;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ad_metrics' AND column_name = 'search_lost_impression_share_rank'
  ) THEN
    ALTER TABLE ad_metrics ADD COLUMN search_lost_impression_share_rank numeric;
  END IF;
END $$;

-- Create Google Ads bid adjustments table
CREATE TABLE IF NOT EXISTS google_ads_bid_adjustments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ad_account_id uuid NOT NULL REFERENCES ad_accounts(id) ON DELETE CASCADE,
  entity_type text NOT NULL CHECK (entity_type IN ('campaign', 'ad_group')),
  entity_id uuid NOT NULL,
  adjustment_type text NOT NULL CHECK (adjustment_type IN ('device', 'audience', 'demographic', 'location', 'placement', 'ad_schedule')),
  criterion_id text,
  criterion_name text,
  criterion_type text,
  bid_modifier numeric NOT NULL DEFAULT 0,
  is_excluded boolean DEFAULT false,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_bid_adjustments_entity ON google_ads_bid_adjustments(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_bid_adjustments_user ON google_ads_bid_adjustments(user_id);
CREATE INDEX IF NOT EXISTS idx_bid_adjustments_account ON google_ads_bid_adjustments(ad_account_id);
CREATE INDEX IF NOT EXISTS idx_bid_adjustments_type ON google_ads_bid_adjustments(adjustment_type);

-- Enable RLS
ALTER TABLE google_ads_bid_adjustments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DO $$ BEGIN
  CREATE POLICY "Users can view own bid adjustments"
    ON google_ads_bid_adjustments FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can insert own bid adjustments"
    ON google_ads_bid_adjustments FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can update own bid adjustments"
    ON google_ads_bid_adjustments FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can delete own bid adjustments"
    ON google_ads_bid_adjustments FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Create Google Ads keywords table
CREATE TABLE IF NOT EXISTS google_ads_keywords (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ad_account_id uuid NOT NULL REFERENCES ad_accounts(id) ON DELETE CASCADE,
  ad_group_id uuid NOT NULL REFERENCES ad_sets(id) ON DELETE CASCADE,
  platform_keyword_id text NOT NULL,
  keyword_text text NOT NULL,
  match_type text NOT NULL CHECK (match_type IN ('EXACT', 'PHRASE', 'BROAD')),
  status text DEFAULT 'ENABLED',
  cpc_bid_micros bigint,
  quality_score integer,
  quality_score_creative integer,
  quality_score_landing_page integer,
  quality_score_expected_ctr integer,
  is_negative boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(ad_group_id, platform_keyword_id)
);

CREATE INDEX IF NOT EXISTS idx_keywords_user ON google_ads_keywords(user_id);
CREATE INDEX IF NOT EXISTS idx_keywords_ad_group ON google_ads_keywords(ad_group_id);
CREATE INDEX IF NOT EXISTS idx_keywords_account ON google_ads_keywords(ad_account_id);
CREATE INDEX IF NOT EXISTS idx_keywords_quality ON google_ads_keywords(quality_score);

ALTER TABLE google_ads_keywords ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users can view own keywords"
    ON google_ads_keywords FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can insert own keywords"
    ON google_ads_keywords FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can update own keywords"
    ON google_ads_keywords FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can delete own keywords"
    ON google_ads_keywords FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Create Google Ads keyword metrics table
CREATE TABLE IF NOT EXISTS google_ads_keyword_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  keyword_id uuid NOT NULL REFERENCES google_ads_keywords(id) ON DELETE CASCADE,
  date date NOT NULL,
  impressions integer DEFAULT 0,
  clicks integer DEFAULT 0,
  spend numeric DEFAULT 0,
  conversions numeric DEFAULT 0,
  conversion_value numeric DEFAULT 0,
  ctr numeric DEFAULT 0,
  cpc numeric DEFAULT 0,
  roas numeric DEFAULT 0,
  quality_score integer,
  search_impression_share numeric,
  created_at timestamptz DEFAULT now(),
  UNIQUE(keyword_id, date)
);

CREATE INDEX IF NOT EXISTS idx_keyword_metrics_date ON google_ads_keyword_metrics(date);
CREATE INDEX IF NOT EXISTS idx_keyword_metrics_keyword ON google_ads_keyword_metrics(keyword_id);

ALTER TABLE google_ads_keyword_metrics ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users can view own keyword metrics"
    ON google_ads_keyword_metrics FOR SELECT
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM google_ads_keywords k
        WHERE k.id = google_ads_keyword_metrics.keyword_id
        AND k.user_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can insert own keyword metrics"
    ON google_ads_keyword_metrics FOR INSERT
    TO authenticated
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM google_ads_keywords k
        WHERE k.id = google_ads_keyword_metrics.keyword_id
        AND k.user_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Create Google Ads audiences table
CREATE TABLE IF NOT EXISTS google_ads_audiences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ad_account_id uuid NOT NULL REFERENCES ad_accounts(id) ON DELETE CASCADE,
  entity_type text NOT NULL CHECK (entity_type IN ('campaign', 'ad_group')),
  entity_id uuid NOT NULL,
  platform_audience_id text NOT NULL,
  audience_name text NOT NULL,
  audience_type text NOT NULL CHECK (audience_type IN ('IN_MARKET', 'AFFINITY', 'CUSTOM_INTENT', 'REMARKETING', 'SIMILAR', 'COMBINED', 'CUSTOM_AUDIENCE')),
  bid_modifier numeric DEFAULT 0,
  is_excluded boolean DEFAULT false,
  status text DEFAULT 'ENABLED',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(entity_type, entity_id, platform_audience_id)
);

CREATE INDEX IF NOT EXISTS idx_audiences_user ON google_ads_audiences(user_id);
CREATE INDEX IF NOT EXISTS idx_audiences_entity ON google_ads_audiences(entity_type, entity_id);

ALTER TABLE google_ads_audiences ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users can view own audiences"
    ON google_ads_audiences FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can insert own audiences"
    ON google_ads_audiences FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can update own audiences"
    ON google_ads_audiences FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can delete own audiences"
    ON google_ads_audiences FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Create Google Ads audience metrics table
CREATE TABLE IF NOT EXISTS google_ads_audience_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  audience_id uuid NOT NULL REFERENCES google_ads_audiences(id) ON DELETE CASCADE,
  date date NOT NULL,
  impressions integer DEFAULT 0,
  clicks integer DEFAULT 0,
  spend numeric DEFAULT 0,
  conversions numeric DEFAULT 0,
  conversion_value numeric DEFAULT 0,
  ctr numeric DEFAULT 0,
  cpc numeric DEFAULT 0,
  roas numeric DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(audience_id, date)
);

CREATE INDEX IF NOT EXISTS idx_audience_metrics_date ON google_ads_audience_metrics(date);

ALTER TABLE google_ads_audience_metrics ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users can view own audience metrics"
    ON google_ads_audience_metrics FOR SELECT
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM google_ads_audiences a
        WHERE a.id = google_ads_audience_metrics.audience_id
        AND a.user_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can insert own audience metrics"
    ON google_ads_audience_metrics FOR INSERT
    TO authenticated
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM google_ads_audiences a
        WHERE a.id = google_ads_audience_metrics.audience_id
        AND a.user_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Create Google Ads placements table
CREATE TABLE IF NOT EXISTS google_ads_placements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ad_account_id uuid NOT NULL REFERENCES ad_accounts(id) ON DELETE CASCADE,
  entity_type text NOT NULL CHECK (entity_type IN ('campaign', 'ad_group')),
  entity_id uuid NOT NULL,
  platform_placement_id text,
  placement_url text NOT NULL,
  placement_type text NOT NULL CHECK (placement_type IN ('WEBSITE', 'MOBILE_APP', 'YOUTUBE_VIDEO', 'YOUTUBE_CHANNEL')),
  bid_modifier numeric DEFAULT 0,
  is_excluded boolean DEFAULT false,
  status text DEFAULT 'ENABLED',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_placements_user ON google_ads_placements(user_id);
CREATE INDEX IF NOT EXISTS idx_placements_entity ON google_ads_placements(entity_type, entity_id);

ALTER TABLE google_ads_placements ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users can view own placements"
    ON google_ads_placements FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can insert own placements"
    ON google_ads_placements FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can update own placements"
    ON google_ads_placements FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can delete own placements"
    ON google_ads_placements FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Create Google Ads placement metrics table
CREATE TABLE IF NOT EXISTS google_ads_placement_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  placement_id uuid NOT NULL REFERENCES google_ads_placements(id) ON DELETE CASCADE,
  date date NOT NULL,
  impressions integer DEFAULT 0,
  clicks integer DEFAULT 0,
  spend numeric DEFAULT 0,
  conversions numeric DEFAULT 0,
  conversion_value numeric DEFAULT 0,
  ctr numeric DEFAULT 0,
  cpc numeric DEFAULT 0,
  roas numeric DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(placement_id, date)
);

CREATE INDEX IF NOT EXISTS idx_placement_metrics_date ON google_ads_placement_metrics(date);

ALTER TABLE google_ads_placement_metrics ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users can view own placement metrics"
    ON google_ads_placement_metrics FOR SELECT
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM google_ads_placements p
        WHERE p.id = google_ads_placement_metrics.placement_id
        AND p.user_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can insert own placement metrics"
    ON google_ads_placement_metrics FOR INSERT
    TO authenticated
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM google_ads_placements p
        WHERE p.id = google_ads_placement_metrics.placement_id
        AND p.user_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Create Google Ads ad schedules table
CREATE TABLE IF NOT EXISTS google_ads_ad_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ad_account_id uuid NOT NULL REFERENCES ad_accounts(id) ON DELETE CASCADE,
  campaign_id uuid NOT NULL REFERENCES ad_campaigns(id) ON DELETE CASCADE,
  day_of_week text NOT NULL CHECK (day_of_week IN ('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY')),
  start_hour integer NOT NULL CHECK (start_hour >= 0 AND start_hour <= 23),
  end_hour integer NOT NULL CHECK (end_hour >= 0 AND end_hour <= 24),
  bid_modifier numeric DEFAULT 0,
  is_enabled boolean DEFAULT true,
  platform_schedule_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(campaign_id, day_of_week, start_hour, end_hour)
);

CREATE INDEX IF NOT EXISTS idx_schedules_campaign ON google_ads_ad_schedules(campaign_id);
CREATE INDEX IF NOT EXISTS idx_schedules_user ON google_ads_ad_schedules(user_id);

ALTER TABLE google_ads_ad_schedules ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users can view own schedules"
    ON google_ads_ad_schedules FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can insert own schedules"
    ON google_ads_ad_schedules FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can update own schedules"
    ON google_ads_ad_schedules FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can delete own schedules"
    ON google_ads_ad_schedules FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Create Google Ads locations table
CREATE TABLE IF NOT EXISTS google_ads_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ad_account_id uuid NOT NULL REFERENCES ad_accounts(id) ON DELETE CASCADE,
  campaign_id uuid NOT NULL REFERENCES ad_campaigns(id) ON DELETE CASCADE,
  platform_location_id text NOT NULL,
  location_name text NOT NULL,
  location_type text NOT NULL CHECK (location_type IN ('COUNTRY', 'REGION', 'CITY', 'POSTAL_CODE', 'PROXIMITY')),
  bid_modifier numeric DEFAULT 0,
  is_excluded boolean DEFAULT false,
  status text DEFAULT 'ENABLED',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(campaign_id, platform_location_id)
);

CREATE INDEX IF NOT EXISTS idx_locations_campaign ON google_ads_locations(campaign_id);
CREATE INDEX IF NOT EXISTS idx_locations_user ON google_ads_locations(user_id);

ALTER TABLE google_ads_locations ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users can view own locations"
    ON google_ads_locations FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can insert own locations"
    ON google_ads_locations FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can update own locations"
    ON google_ads_locations FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can delete own locations"
    ON google_ads_locations FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Create Google Ads location metrics table
CREATE TABLE IF NOT EXISTS google_ads_location_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id uuid NOT NULL REFERENCES google_ads_locations(id) ON DELETE CASCADE,
  date date NOT NULL,
  impressions integer DEFAULT 0,
  clicks integer DEFAULT 0,
  spend numeric DEFAULT 0,
  conversions numeric DEFAULT 0,
  conversion_value numeric DEFAULT 0,
  ctr numeric DEFAULT 0,
  cpc numeric DEFAULT 0,
  roas numeric DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(location_id, date)
);

CREATE INDEX IF NOT EXISTS idx_location_metrics_date ON google_ads_location_metrics(date);

ALTER TABLE google_ads_location_metrics ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users can view own location metrics"
    ON google_ads_location_metrics FOR SELECT
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM google_ads_locations l
        WHERE l.id = google_ads_location_metrics.location_id
        AND l.user_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can insert own location metrics"
    ON google_ads_location_metrics FOR INSERT
    TO authenticated
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM google_ads_locations l
        WHERE l.id = google_ads_location_metrics.location_id
        AND l.user_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Create Google Ads device metrics table (for device-level performance)
CREATE TABLE IF NOT EXISTS google_ads_device_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_type text NOT NULL CHECK (entity_type IN ('campaign', 'ad_group')),
  entity_id uuid NOT NULL,
  device text NOT NULL CHECK (device IN ('MOBILE', 'DESKTOP', 'TABLET', 'CONNECTED_TV')),
  date date NOT NULL,
  impressions integer DEFAULT 0,
  clicks integer DEFAULT 0,
  spend numeric DEFAULT 0,
  conversions numeric DEFAULT 0,
  conversion_value numeric DEFAULT 0,
  ctr numeric DEFAULT 0,
  cpc numeric DEFAULT 0,
  roas numeric DEFAULT 0,
  bid_modifier numeric DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(entity_type, entity_id, device, date)
);

CREATE INDEX IF NOT EXISTS idx_device_metrics_entity ON google_ads_device_metrics(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_device_metrics_date ON google_ads_device_metrics(date);
CREATE INDEX IF NOT EXISTS idx_device_metrics_user ON google_ads_device_metrics(user_id);

ALTER TABLE google_ads_device_metrics ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users can view own device metrics"
    ON google_ads_device_metrics FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can insert own device metrics"
    ON google_ads_device_metrics FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Create Google Ads demographic metrics table
CREATE TABLE IF NOT EXISTS google_ads_demographic_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_type text NOT NULL CHECK (entity_type IN ('campaign', 'ad_group')),
  entity_id uuid NOT NULL,
  age_range text CHECK (age_range IN ('AGE_18_24', 'AGE_25_34', 'AGE_35_44', 'AGE_45_54', 'AGE_55_64', 'AGE_65_UP', 'UNDETERMINED')),
  gender text CHECK (gender IN ('MALE', 'FEMALE', 'UNDETERMINED')),
  date date NOT NULL,
  impressions integer DEFAULT 0,
  clicks integer DEFAULT 0,
  spend numeric DEFAULT 0,
  conversions numeric DEFAULT 0,
  conversion_value numeric DEFAULT 0,
  ctr numeric DEFAULT 0,
  cpc numeric DEFAULT 0,
  roas numeric DEFAULT 0,
  age_bid_modifier numeric DEFAULT 0,
  gender_bid_modifier numeric DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_demographic_metrics_entity ON google_ads_demographic_metrics(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_demographic_metrics_date ON google_ads_demographic_metrics(date);
CREATE INDEX IF NOT EXISTS idx_demographic_metrics_user ON google_ads_demographic_metrics(user_id);

ALTER TABLE google_ads_demographic_metrics ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users can view own demographic metrics"
    ON google_ads_demographic_metrics FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can insert own demographic metrics"
    ON google_ads_demographic_metrics FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Create Google Ads hourly metrics table (for ad schedule analysis)
CREATE TABLE IF NOT EXISTS google_ads_hourly_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  campaign_id uuid NOT NULL REFERENCES ad_campaigns(id) ON DELETE CASCADE,
  date date NOT NULL,
  hour integer NOT NULL CHECK (hour >= 0 AND hour <= 23),
  day_of_week text NOT NULL,
  impressions integer DEFAULT 0,
  clicks integer DEFAULT 0,
  spend numeric DEFAULT 0,
  conversions numeric DEFAULT 0,
  conversion_value numeric DEFAULT 0,
  ctr numeric DEFAULT 0,
  cpc numeric DEFAULT 0,
  roas numeric DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(campaign_id, date, hour)
);

CREATE INDEX IF NOT EXISTS idx_hourly_metrics_campaign ON google_ads_hourly_metrics(campaign_id);
CREATE INDEX IF NOT EXISTS idx_hourly_metrics_date ON google_ads_hourly_metrics(date);
CREATE INDEX IF NOT EXISTS idx_hourly_metrics_user ON google_ads_hourly_metrics(user_id);

ALTER TABLE google_ads_hourly_metrics ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users can view own hourly metrics"
    ON google_ads_hourly_metrics FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can insert own hourly metrics"
    ON google_ads_hourly_metrics FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Create bid adjustment action history table for tracking changes
CREATE TABLE IF NOT EXISTS google_ads_bid_adjustment_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ad_account_id uuid NOT NULL REFERENCES ad_accounts(id) ON DELETE CASCADE,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  adjustment_type text NOT NULL,
  criterion_id text,
  criterion_name text,
  old_bid_modifier numeric,
  new_bid_modifier numeric,
  action_source text NOT NULL CHECK (action_source IN ('manual', 'automation', 'rex_suggestion')),
  automation_rule_id uuid,
  executed_at timestamptz DEFAULT now(),
  can_rollback boolean DEFAULT true,
  rolled_back_at timestamptz,
  rollback_reason text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bid_history_user ON google_ads_bid_adjustment_history(user_id);
CREATE INDEX IF NOT EXISTS idx_bid_history_entity ON google_ads_bid_adjustment_history(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_bid_history_date ON google_ads_bid_adjustment_history(executed_at);

ALTER TABLE google_ads_bid_adjustment_history ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users can view own bid history"
    ON google_ads_bid_adjustment_history FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can insert own bid history"
    ON google_ads_bid_adjustment_history FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can update own bid history"
    ON google_ads_bid_adjustment_history FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Add new Google Ads specific columns to rule_actions if not exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'ad_automation_actions'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'ad_automation_actions' AND column_name = 'bid_adjustment_type'
    ) THEN
      ALTER TABLE ad_automation_actions ADD COLUMN bid_adjustment_type text;
    END IF;
    
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'ad_automation_actions' AND column_name = 'bid_adjustment_value'
    ) THEN
      ALTER TABLE ad_automation_actions ADD COLUMN bid_adjustment_value numeric;
    END IF;
    
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'ad_automation_actions' AND column_name = 'target_criterion_type'
    ) THEN
      ALTER TABLE ad_automation_actions ADD COLUMN target_criterion_type text;
    END IF;
    
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'ad_automation_actions' AND column_name = 'target_criterion_ids'
    ) THEN
      ALTER TABLE ad_automation_actions ADD COLUMN target_criterion_ids text[];
    END IF;
  END IF;
END $$;
