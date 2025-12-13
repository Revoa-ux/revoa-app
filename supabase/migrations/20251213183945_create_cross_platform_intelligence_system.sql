/*
  # Cross-Platform Intelligence System
  
  1. New Tables
    - `cross_platform_metrics` - Stores aggregated platform-level metrics with net profit
      - Daily snapshots per platform (Meta, Google, TikTok)
      - NET PROFIT as primary metric (revenue - COGS - ad spend)
      - Hourly breakdown data for time-of-day analysis
      
    - `cross_platform_patterns` - Stores detected patterns
      - Day-of-week patterns
      - Week-over-week trends
      - Seasonal patterns (when 90+ days data available)
      - Budget correlation patterns
      
    - `platform_action_logs` - Audit trail for API write actions
      - Track all budget changes, scheduling updates, etc.
      - Enable rollback capability
      
  2. Modifications
    - Add `suggestion_category` to rex_suggestions for filtering
    - Add `data_confidence` to track analysis reliability
    
  3. Security
    - Enable RLS on all new tables
    - Users can only access their own data
*/

-- Create cross_platform_metrics table
CREATE TABLE IF NOT EXISTS cross_platform_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform text NOT NULL CHECK (platform IN ('facebook', 'google', 'tiktok')),
  date date NOT NULL,
  
  -- Core financial metrics (NET PROFIT centric)
  revenue numeric DEFAULT 0,
  cogs numeric DEFAULT 0,
  ad_spend numeric DEFAULT 0,
  net_profit numeric GENERATED ALWAYS AS (revenue - cogs - ad_spend) STORED,
  profit_margin numeric GENERATED ALWAYS AS (
    CASE WHEN revenue > 0 THEN ((revenue - cogs - ad_spend) / revenue) * 100 ELSE 0 END
  ) STORED,
  roas numeric DEFAULT 0,
  net_roas numeric GENERATED ALWAYS AS (
    CASE WHEN ad_spend > 0 THEN (revenue - cogs - ad_spend) / ad_spend ELSE 0 END
  ) STORED,
  
  -- Performance metrics
  impressions bigint DEFAULT 0,
  clicks bigint DEFAULT 0,
  conversions bigint DEFAULT 0,
  ctr numeric DEFAULT 0,
  cpc numeric DEFAULT 0,
  cpa numeric DEFAULT 0,
  
  -- Hourly breakdown (JSON array with 24 entries)
  hourly_net_profit jsonb DEFAULT '[]'::jsonb,
  hourly_spend jsonb DEFAULT '[]'::jsonb,
  hourly_conversions jsonb DEFAULT '[]'::jsonb,
  
  -- Metadata
  data_quality_score numeric DEFAULT 100,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  UNIQUE(user_id, platform, date)
);

CREATE INDEX IF NOT EXISTS idx_cross_platform_metrics_user_id ON cross_platform_metrics(user_id);
CREATE INDEX IF NOT EXISTS idx_cross_platform_metrics_platform ON cross_platform_metrics(platform);
CREATE INDEX IF NOT EXISTS idx_cross_platform_metrics_date ON cross_platform_metrics(date);
CREATE INDEX IF NOT EXISTS idx_cross_platform_metrics_user_platform_date ON cross_platform_metrics(user_id, platform, date);

ALTER TABLE cross_platform_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own cross platform metrics"
  ON cross_platform_metrics FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own cross platform metrics"
  ON cross_platform_metrics FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own cross platform metrics"
  ON cross_platform_metrics FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own cross platform metrics"
  ON cross_platform_metrics FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create cross_platform_patterns table
CREATE TABLE IF NOT EXISTS cross_platform_patterns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Pattern type and scope
  pattern_type text NOT NULL CHECK (pattern_type IN (
    'day_of_week',
    'week_over_week', 
    'month_over_month',
    'seasonal',
    'budget_correlation',
    'cross_platform_correlation',
    'time_of_day'
  )),
  
  -- Which platforms this pattern applies to (null = all)
  platforms text[] DEFAULT ARRAY['facebook', 'google', 'tiktok'],
  
  -- Pattern data (structure varies by type)
  pattern_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  
  -- Analysis metadata
  data_points_analyzed int DEFAULT 0,
  confidence_score numeric DEFAULT 0 CHECK (confidence_score >= 0 AND confidence_score <= 100),
  data_range_start date,
  data_range_end date,
  
  -- Validity
  is_active boolean DEFAULT true,
  expires_at timestamptz,
  
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cross_platform_patterns_user_id ON cross_platform_patterns(user_id);
CREATE INDEX IF NOT EXISTS idx_cross_platform_patterns_type ON cross_platform_patterns(pattern_type);
CREATE INDEX IF NOT EXISTS idx_cross_platform_patterns_active ON cross_platform_patterns(is_active);

ALTER TABLE cross_platform_patterns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own patterns"
  ON cross_platform_patterns FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own patterns"
  ON cross_platform_patterns FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own patterns"
  ON cross_platform_patterns FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own patterns"
  ON cross_platform_patterns FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create platform_action_logs table for audit trail
CREATE TABLE IF NOT EXISTS platform_action_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Action details
  platform text NOT NULL CHECK (platform IN ('facebook', 'google', 'tiktok')),
  action_type text NOT NULL CHECK (action_type IN (
    'update_budget',
    'pause_entity',
    'enable_entity',
    'duplicate_entity',
    'update_schedule',
    'update_targeting',
    'reallocate_budget'
  )),
  
  -- Entity being acted upon
  entity_type text NOT NULL CHECK (entity_type IN ('campaign', 'ad_set', 'ad')),
  entity_id text NOT NULL,
  entity_name text,
  platform_entity_id text,
  
  -- Action data
  previous_state jsonb,
  new_state jsonb,
  action_parameters jsonb,
  
  -- Execution status
  status text NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',
    'executing',
    'completed',
    'failed',
    'rolled_back'
  )),
  error_message text,
  
  -- Source tracking
  triggered_by text CHECK (triggered_by IN (
    'user_manual',
    'suggestion_action',
    'automation_rule'
  )),
  suggestion_id uuid,
  automation_rule_id uuid,
  
  -- Rollback support
  is_rollback_available boolean DEFAULT true,
  rolled_back_at timestamptz,
  rollback_action_id uuid REFERENCES platform_action_logs(id),
  
  -- Timestamps
  executed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_platform_action_logs_user_id ON platform_action_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_platform_action_logs_platform ON platform_action_logs(platform);
CREATE INDEX IF NOT EXISTS idx_platform_action_logs_status ON platform_action_logs(status);
CREATE INDEX IF NOT EXISTS idx_platform_action_logs_entity ON platform_action_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_platform_action_logs_suggestion ON platform_action_logs(suggestion_id);

ALTER TABLE platform_action_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own action logs"
  ON platform_action_logs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own action logs"
  ON platform_action_logs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own action logs"
  ON platform_action_logs FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Add suggestion_category to rex_suggestions if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'rex_suggestions' AND column_name = 'suggestion_category'
  ) THEN
    ALTER TABLE rex_suggestions ADD COLUMN suggestion_category text DEFAULT 'campaign_level' 
      CHECK (suggestion_category IN ('campaign_level', 'cross_platform'));
  END IF;
END $$;

-- Add data_confidence to rex_suggestions if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'rex_suggestions' AND column_name = 'data_confidence'
  ) THEN
    ALTER TABLE rex_suggestions ADD COLUMN data_confidence jsonb DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- Add data_range columns to rex_suggestions if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'rex_suggestions' AND column_name = 'data_range_days'
  ) THEN
    ALTER TABLE rex_suggestions ADD COLUMN data_range_days int;
  END IF;
END $$;

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_rex_suggestions_category ON rex_suggestions(suggestion_category);

-- Add function to calculate budget efficiency
CREATE OR REPLACE FUNCTION calculate_marginal_profit(
  p_user_id uuid,
  p_platform text,
  p_days int DEFAULT 30
)
RETURNS TABLE (
  spend_bucket numeric,
  avg_net_profit numeric,
  marginal_return numeric,
  data_points int
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH daily_data AS (
    SELECT 
      cpm.ad_spend,
      cpm.net_profit,
      NTILE(10) OVER (ORDER BY cpm.ad_spend) as spend_decile
    FROM cross_platform_metrics cpm
    WHERE cpm.user_id = p_user_id
      AND cpm.platform = p_platform
      AND cpm.date >= CURRENT_DATE - p_days
      AND cpm.ad_spend > 0
  )
  SELECT 
    AVG(daily_data.ad_spend)::numeric as spend_bucket,
    AVG(daily_data.net_profit)::numeric as avg_net_profit,
    (AVG(daily_data.net_profit) / NULLIF(AVG(daily_data.ad_spend), 0))::numeric as marginal_return,
    COUNT(*)::int as data_points
  FROM daily_data
  GROUP BY daily_data.spend_decile
  ORDER BY daily_data.spend_decile;
END;
$$;
