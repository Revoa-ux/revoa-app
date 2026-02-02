/*
  # Create Campaign Intelligence Tables

  1. New Tables
    - `campaign_settings_history` - Track CBO/ABO, bidding, budget changes over time
    - `performance_snapshots` - Daily performance snapshots for 3-year historical analysis
    - `funnel_metrics` - Track conversion rates at each funnel stage per ad
    - `ad_account_health` - Track account status, rejections, feedback scores

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to access their own data
*/

-- ============================================================================
-- 1. CAMPAIGN SETTINGS HISTORY TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS campaign_settings_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  campaign_id uuid NOT NULL REFERENCES ad_campaigns(id) ON DELETE CASCADE,
  
  -- What changed
  change_type text NOT NULL, -- 'cbo_toggle', 'bidding_strategy', 'budget_change', 'objective_change'
  field_name text NOT NULL,
  old_value text,
  new_value text NOT NULL,
  
  -- Performance impact tracking
  roas_before numeric,
  roas_after numeric,
  spend_before numeric,
  spend_after numeric,
  performance_impact_days int DEFAULT 7, -- Days tracked after change
  
  -- Context
  changed_by text DEFAULT 'user', -- 'user', 'system', 'api'
  notes text,
  
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_campaign_settings_history_user_id ON campaign_settings_history(user_id);
CREATE INDEX IF NOT EXISTS idx_campaign_settings_history_campaign_id ON campaign_settings_history(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_settings_history_change_type ON campaign_settings_history(change_type);
CREATE INDEX IF NOT EXISTS idx_campaign_settings_history_created_at ON campaign_settings_history(created_at);

ALTER TABLE campaign_settings_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own campaign history"
  ON campaign_settings_history FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own campaign history"
  ON campaign_settings_history FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- 2. PERFORMANCE SNAPSHOTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS performance_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Entity reference
  entity_type text NOT NULL, -- 'campaign', 'ad_set', 'ad'
  entity_id uuid NOT NULL,
  ad_account_id uuid NOT NULL REFERENCES ad_accounts(id) ON DELETE CASCADE,
  
  -- Snapshot date
  snapshot_date date NOT NULL,
  
  -- Performance metrics
  spend numeric NOT NULL DEFAULT 0,
  impressions integer NOT NULL DEFAULT 0,
  clicks integer NOT NULL DEFAULT 0,
  conversions integer NOT NULL DEFAULT 0,
  conversion_value numeric NOT NULL DEFAULT 0,
  roas numeric NOT NULL DEFAULT 0,
  cpa numeric NOT NULL DEFAULT 0,
  ctr numeric NOT NULL DEFAULT 0,
  cpc numeric NOT NULL DEFAULT 0,
  frequency numeric,
  reach integer,
  
  -- Engagement metrics
  engagement_likes integer DEFAULT 0,
  engagement_comments integer DEFAULT 0,
  engagement_shares integer DEFAULT 0,
  engagement_rate numeric DEFAULT 0,
  
  -- Campaign structure context at time of snapshot
  is_cbo boolean,
  bidding_strategy text,
  learning_phase_status text,
  budget_amount numeric,
  budget_type text,
  
  created_at timestamptz NOT NULL DEFAULT now(),
  
  UNIQUE(entity_type, entity_id, snapshot_date)
);

CREATE INDEX IF NOT EXISTS idx_performance_snapshots_user_id ON performance_snapshots(user_id);
CREATE INDEX IF NOT EXISTS idx_performance_snapshots_entity ON performance_snapshots(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_performance_snapshots_date ON performance_snapshots(snapshot_date);
CREATE INDEX IF NOT EXISTS idx_performance_snapshots_ad_account ON performance_snapshots(ad_account_id);
CREATE INDEX IF NOT EXISTS idx_performance_snapshots_roas ON performance_snapshots(roas);

ALTER TABLE performance_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own snapshots"
  ON performance_snapshots FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own snapshots"
  ON performance_snapshots FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- 3. FUNNEL METRICS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS funnel_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ad_id uuid NOT NULL REFERENCES ads(id) ON DELETE CASCADE,
  ad_account_id uuid NOT NULL REFERENCES ad_accounts(id) ON DELETE CASCADE,
  
  -- Date range for metrics
  date_start date NOT NULL,
  date_end date NOT NULL,
  
  -- Funnel stages
  impressions integer NOT NULL DEFAULT 0,
  clicks integer NOT NULL DEFAULT 0,
  page_views integer NOT NULL DEFAULT 0,
  add_to_carts integer NOT NULL DEFAULT 0,
  initiate_checkouts integer NOT NULL DEFAULT 0,
  purchases integer NOT NULL DEFAULT 0,
  
  -- Conversion rates between stages
  ctr numeric NOT NULL DEFAULT 0, -- clicks / impressions
  click_to_page_view_rate numeric NOT NULL DEFAULT 0,
  page_view_to_atc_rate numeric NOT NULL DEFAULT 0,
  atc_to_checkout_rate numeric NOT NULL DEFAULT 0,
  checkout_to_purchase_rate numeric NOT NULL DEFAULT 0,
  overall_conversion_rate numeric NOT NULL DEFAULT 0, -- clicks / purchases
  
  -- Drop-off identification
  biggest_dropoff_stage text, -- 'click_to_view', 'view_to_atc', 'atc_to_checkout', 'checkout_to_purchase'
  biggest_dropoff_rate numeric,
  
  -- Associated product and landing page
  primary_product_id uuid,
  landing_page_url text,
  
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  UNIQUE(ad_id, date_start, date_end)
);

CREATE INDEX IF NOT EXISTS idx_funnel_metrics_user_id ON funnel_metrics(user_id);
CREATE INDEX IF NOT EXISTS idx_funnel_metrics_ad_id ON funnel_metrics(ad_id);
CREATE INDEX IF NOT EXISTS idx_funnel_metrics_date_range ON funnel_metrics(date_start, date_end);
CREATE INDEX IF NOT EXISTS idx_funnel_metrics_dropoff ON funnel_metrics(biggest_dropoff_stage) WHERE biggest_dropoff_stage IS NOT NULL;

ALTER TABLE funnel_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own funnel metrics"
  ON funnel_metrics FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own funnel metrics"
  ON funnel_metrics FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own funnel metrics"
  ON funnel_metrics FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- 4. AD ACCOUNT HEALTH TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS ad_account_health (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ad_account_id uuid NOT NULL REFERENCES ad_accounts(id) ON DELETE CASCADE,
  
  -- Account status
  account_status text NOT NULL DEFAULT 'active', -- 'active', 'restricted', 'disabled', 'suspended'
  account_quality text, -- 'good', 'fair', 'poor'
  
  -- Health metrics
  feedback_score numeric, -- 0-5 scale for Meta
  payment_failures_count integer DEFAULT 0,
  ad_rejections_count integer DEFAULT 0,
  policy_violations_count integer DEFAULT 0,
  
  -- Risk assessment
  risk_level text DEFAULT 'low', -- 'low', 'medium', 'high', 'critical'
  risk_factors text[], -- Array of risk factor descriptions
  
  -- Spending limits and restrictions
  spending_limit numeric,
  is_spending_limited boolean DEFAULT false,
  restriction_notes text,
  
  -- Historical tracking
  last_payment_failure_at timestamptz,
  last_ad_rejection_at timestamptz,
  last_policy_violation_at timestamptz,
  account_age_days integer,
  
  -- Metadata
  restriction_history jsonb DEFAULT '[]'::jsonb,
  platform_notes text,
  
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  UNIQUE(ad_account_id)
);

CREATE INDEX IF NOT EXISTS idx_ad_account_health_user_id ON ad_account_health(user_id);
CREATE INDEX IF NOT EXISTS idx_ad_account_health_status ON ad_account_health(account_status);
CREATE INDEX IF NOT EXISTS idx_ad_account_health_risk_level ON ad_account_health(risk_level);
CREATE INDEX IF NOT EXISTS idx_ad_account_health_feedback_score ON ad_account_health(feedback_score) WHERE feedback_score IS NOT NULL;

ALTER TABLE ad_account_health ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own account health"
  ON ad_account_health FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own account health"
  ON ad_account_health FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own account health"
  ON ad_account_health FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- 5. SUPER ADMIN POLICIES FOR ALL NEW TABLES
-- ============================================================================

-- Campaign Settings History
CREATE POLICY "Super admins can view all campaign history"
  ON campaign_settings_history FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_super_admin = true
    )
  );

-- Performance Snapshots
CREATE POLICY "Super admins can view all snapshots"
  ON performance_snapshots FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_super_admin = true
    )
  );

-- Funnel Metrics
CREATE POLICY "Super admins can view all funnel metrics"
  ON funnel_metrics FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_super_admin = true
    )
  );

-- Ad Account Health
CREATE POLICY "Super admins can view all account health"
  ON ad_account_health FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_super_admin = true
    )
  );
