/*
  # Add Campaign and Ad Set Settings Columns

  1. Changes to ad_campaigns table
    - Add `bid_strategy` column for tracking bidding strategy (highest_volume, cost_per_result_goal, bid_cap, roas_goal)
    - Add `is_cbo` column for explicit CBO tracking (if not exists)
    - Add `buying_type` column for auction vs reservation
    - Add `special_ad_categories` column for housing/credit/employment restrictions

  2. Changes to ad_sets table
    - Add `conversion_location` column (website, app, messenger, whatsapp, calls)
    - Add `conversion_event` column (purchase, add_to_cart, initiate_checkout, lead, etc.)
    - Add `performance_goal` column (max_conversions, max_value)
    - Add `optimization_goal` column (moved from campaign for clarity)
    - Add `attribution_setting` column (1_day_click, 7_day_click, 1_day_view, etc.)
    - Add `bid_amount` column for cost cap / bid cap values
    - Add `roas_average_floor` column for ROAS goal campaigns

  3. Create campaign_baseline_deviations table
    - Track deviations from recommended baseline settings
    - Store deviation severity and performance correlation

  4. Security
    - Enable RLS on new table
    - Add policies for authenticated users
*/

-- ============================================================================
-- 1. ADD COLUMNS TO ad_campaigns TABLE
-- ============================================================================

DO $$
BEGIN
  -- Add bid_strategy column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ad_campaigns' AND column_name = 'bid_strategy'
  ) THEN
    ALTER TABLE ad_campaigns ADD COLUMN bid_strategy text;
    COMMENT ON COLUMN ad_campaigns.bid_strategy IS 'Bidding strategy: highest_volume, cost_per_result_goal, bid_cap, roas_goal';
  END IF;

  -- Add is_cbo column if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ad_campaigns' AND column_name = 'is_cbo'
  ) THEN
    ALTER TABLE ad_campaigns ADD COLUMN is_cbo boolean DEFAULT false;
    COMMENT ON COLUMN ad_campaigns.is_cbo IS 'Whether campaign uses Campaign Budget Optimization';
  END IF;

  -- Add buying_type column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ad_campaigns' AND column_name = 'buying_type'
  ) THEN
    ALTER TABLE ad_campaigns ADD COLUMN buying_type text DEFAULT 'AUCTION';
    COMMENT ON COLUMN ad_campaigns.buying_type IS 'Buying type: AUCTION or RESERVED';
  END IF;

  -- Add special_ad_categories column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ad_campaigns' AND column_name = 'special_ad_categories'
  ) THEN
    ALTER TABLE ad_campaigns ADD COLUMN special_ad_categories text[];
    COMMENT ON COLUMN ad_campaigns.special_ad_categories IS 'Special ad categories: HOUSING, CREDIT, EMPLOYMENT, etc.';
  END IF;
END $$;

-- ============================================================================
-- 2. ADD COLUMNS TO ad_sets TABLE
-- ============================================================================

DO $$
BEGIN
  -- Add conversion_location column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ad_sets' AND column_name = 'conversion_location'
  ) THEN
    ALTER TABLE ad_sets ADD COLUMN conversion_location text DEFAULT 'website';
    COMMENT ON COLUMN ad_sets.conversion_location IS 'Where conversions happen: website, app, messenger, whatsapp, calls';
  END IF;

  -- Add conversion_event column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ad_sets' AND column_name = 'conversion_event'
  ) THEN
    ALTER TABLE ad_sets ADD COLUMN conversion_event text DEFAULT 'purchase';
    COMMENT ON COLUMN ad_sets.conversion_event IS 'Conversion event to optimize for: purchase, add_to_cart, initiate_checkout, lead';
  END IF;

  -- Add performance_goal column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ad_sets' AND column_name = 'performance_goal'
  ) THEN
    ALTER TABLE ad_sets ADD COLUMN performance_goal text DEFAULT 'max_conversions';
    COMMENT ON COLUMN ad_sets.performance_goal IS 'Performance goal: max_conversions or max_value';
  END IF;

  -- Add optimization_goal column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ad_sets' AND column_name = 'optimization_goal'
  ) THEN
    ALTER TABLE ad_sets ADD COLUMN optimization_goal text;
    COMMENT ON COLUMN ad_sets.optimization_goal IS 'Optimization goal: OFFSITE_CONVERSIONS, LINK_CLICKS, etc.';
  END IF;

  -- Add attribution_setting column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ad_sets' AND column_name = 'attribution_setting'
  ) THEN
    ALTER TABLE ad_sets ADD COLUMN attribution_setting text DEFAULT '7d_click_1d_view';
    COMMENT ON COLUMN ad_sets.attribution_setting IS 'Attribution window: 1d_click, 7d_click, 1d_view, 7d_click_1d_view';
  END IF;

  -- Add bid_amount column (for cost cap / bid cap)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ad_sets' AND column_name = 'bid_amount'
  ) THEN
    ALTER TABLE ad_sets ADD COLUMN bid_amount numeric;
    COMMENT ON COLUMN ad_sets.bid_amount IS 'Bid amount for cost cap or bid cap strategies';
  END IF;

  -- Add roas_average_floor column (for ROAS goal)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ad_sets' AND column_name = 'roas_average_floor'
  ) THEN
    ALTER TABLE ad_sets ADD COLUMN roas_average_floor numeric;
    COMMENT ON COLUMN ad_sets.roas_average_floor IS 'Minimum ROAS floor for ROAS goal bid strategy';
  END IF;

  -- Add learning_phase_status column to ad_sets
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ad_sets' AND column_name = 'learning_phase_status'
  ) THEN
    ALTER TABLE ad_sets ADD COLUMN learning_phase_status text;
    COMMENT ON COLUMN ad_sets.learning_phase_status IS 'Learning phase status: LEARNING, LEARNING_LIMITED, ACTIVE';
  END IF;
END $$;

-- ============================================================================
-- 3. CREATE CAMPAIGN BASELINE DEVIATIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS campaign_baseline_deviations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Entity reference
  entity_type text NOT NULL, -- 'campaign' or 'ad_set'
  entity_id uuid NOT NULL,
  entity_name text,
  platform text NOT NULL DEFAULT 'facebook',
  
  -- Deviation details
  setting_name text NOT NULL, -- 'bid_strategy', 'conversion_location', 'conversion_event', etc.
  current_value text,
  recommended_value text NOT NULL,
  
  -- Severity and status
  severity text NOT NULL DEFAULT 'informational', -- 'informational', 'warning', 'critical'
  is_active boolean DEFAULT true,
  
  -- Performance correlation
  performance_impact_detected boolean DEFAULT false,
  roas_before_deviation numeric,
  roas_after_deviation numeric,
  performance_correlation_notes text,
  
  -- Timestamps
  detected_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  last_checked_at timestamptz DEFAULT now(),
  
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_baseline_deviations_user_id ON campaign_baseline_deviations(user_id);
CREATE INDEX IF NOT EXISTS idx_baseline_deviations_entity ON campaign_baseline_deviations(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_baseline_deviations_severity ON campaign_baseline_deviations(severity);
CREATE INDEX IF NOT EXISTS idx_baseline_deviations_active ON campaign_baseline_deviations(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_baseline_deviations_setting ON campaign_baseline_deviations(setting_name);

ALTER TABLE campaign_baseline_deviations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own deviations"
  ON campaign_baseline_deviations FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own deviations"
  ON campaign_baseline_deviations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own deviations"
  ON campaign_baseline_deviations FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own deviations"
  ON campaign_baseline_deviations FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Super admin policies
CREATE POLICY "Super admins can view all deviations"
  ON campaign_baseline_deviations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_super_admin = true
    )
  );

-- ============================================================================
-- 4. CREATE PIXEL STRENGTH TRACKING TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS pixel_health_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Score components
  attribution_rate numeric NOT NULL DEFAULT 0, -- attributed_orders / total_orders * 100
  pixel_event_volume integer NOT NULL DEFAULT 0,
  expected_event_volume integer DEFAULT 0,
  session_tracking_accuracy numeric DEFAULT 0, -- matched_sessions / total_sessions * 100
  
  -- Overall score
  health_score numeric NOT NULL DEFAULT 0, -- 0-100
  health_grade text NOT NULL DEFAULT 'unknown', -- 'strong', 'moderate', 'weak', 'critical', 'unknown'
  
  -- Date range for calculation
  calculated_for_start date NOT NULL,
  calculated_for_end date NOT NULL,
  
  -- Issues detected
  issues_detected text[],
  recommendations text[],
  
  -- Metadata
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  UNIQUE(user_id, calculated_for_start, calculated_for_end)
);

CREATE INDEX IF NOT EXISTS idx_pixel_health_user_id ON pixel_health_scores(user_id);
CREATE INDEX IF NOT EXISTS idx_pixel_health_grade ON pixel_health_scores(health_grade);
CREATE INDEX IF NOT EXISTS idx_pixel_health_date ON pixel_health_scores(calculated_for_start, calculated_for_end);

ALTER TABLE pixel_health_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own pixel health"
  ON pixel_health_scores FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own pixel health"
  ON pixel_health_scores FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own pixel health"
  ON pixel_health_scores FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Super admin policies
CREATE POLICY "Super admins can view all pixel health"
  ON pixel_health_scores FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_super_admin = true
    )
  );
