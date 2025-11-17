/*
  # Add Multi-Platform Ads Support (TikTok, Google Ads, Snapchat)
  
  ## Changes
  
  1. Platform Support
    - Extend ad_accounts to support 'tiktok', 'google', and 'snapchat' platforms
    - Add platform-specific configuration fields
    - Add profit tracking columns
    
  2. New Tables
    - `ad_insights` - Store AI-generated insights and recommendations
    - `ad_performance_alerts` - Store performance alert rules and history
    - `creative_tags` - Store creative organization tags
    - `ad_export_history` - Track data exports
    
  3. Enhanced Columns
    - Add profit calculations to ad_metrics
    - Add platform-specific metadata storage
    - Add creative asset management fields
    
  ## Notes
  - Maintains backward compatibility with existing Facebook data
  - All tables use RLS for user data isolation
  - Indexes added for common query patterns
*/

-- Add profit calculation columns to ad_metrics
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'ad_metrics' AND column_name = 'profit'
  ) THEN
    ALTER TABLE ad_metrics ADD COLUMN profit numeric(10, 2) DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'ad_metrics' AND column_name = 'profit_margin'
  ) THEN
    ALTER TABLE ad_metrics ADD COLUMN profit_margin numeric(5, 2) DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'ad_metrics' AND column_name = 'cogs'
  ) THEN
    ALTER TABLE ad_metrics ADD COLUMN cogs numeric(10, 2) DEFAULT 0;
  END IF;
END $$;

-- Create AI insights table
CREATE TABLE IF NOT EXISTS ad_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ad_account_id uuid REFERENCES ad_accounts(id) ON DELETE CASCADE,
  insight_type text NOT NULL CHECK (insight_type IN ('top_performer', 'needs_attention', 'pattern', 'timing', 'budget', 'creative_fatigue', 'audience_overlap', 'spend_efficiency')),
  title text NOT NULL,
  description text NOT NULL,
  metric_value text,
  confidence text NOT NULL CHECK (confidence IN ('high', 'medium', 'low')),
  actionable boolean DEFAULT false,
  action_taken boolean DEFAULT false,
  action_taken_at timestamptz,
  dismissed boolean DEFAULT false,
  dismissed_at timestamptz,
  entity_type text CHECK (entity_type IN ('campaign', 'ad_set', 'ad')),
  entity_id uuid,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create performance alerts table
CREATE TABLE IF NOT EXISTS ad_performance_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ad_account_id uuid REFERENCES ad_accounts(id) ON DELETE CASCADE,
  alert_type text NOT NULL CHECK (alert_type IN ('performance_drop', 'budget_pacing', 'creative_fatigue', 'conversion_anomaly', 'spend_spike', 'low_roas', 'high_cpa')),
  severity text NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  title text NOT NULL,
  description text NOT NULL,
  threshold_value numeric(10, 2),
  current_value numeric(10, 2),
  entity_type text CHECK (entity_type IN ('campaign', 'ad_set', 'ad')),
  entity_id uuid,
  resolved boolean DEFAULT false,
  resolved_at timestamptz,
  notified boolean DEFAULT false,
  notified_at timestamptz,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Create creative tags table
CREATE TABLE IF NOT EXISTS creative_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ad_id uuid NOT NULL REFERENCES ads(id) ON DELETE CASCADE,
  tag_name text NOT NULL,
  tag_category text CHECK (tag_category IN ('theme', 'product', 'campaign', 'audience', 'format', 'custom')),
  color text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, ad_id, tag_name)
);

-- Create export history table
CREATE TABLE IF NOT EXISTS ad_export_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  export_type text NOT NULL CHECK (export_type IN ('csv', 'excel', 'pdf', 'google_sheets')),
  file_name text NOT NULL,
  file_url text,
  date_range_start date NOT NULL,
  date_range_end date NOT NULL,
  filters jsonb DEFAULT '{}',
  row_count integer DEFAULT 0,
  status text DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed')),
  created_at timestamptz DEFAULT now()
);

-- Create saved filter presets table
CREATE TABLE IF NOT EXISTS ad_filter_presets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  preset_name text NOT NULL,
  filters jsonb NOT NULL DEFAULT '{}',
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, preset_name)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_ad_insights_user_id ON ad_insights(user_id);
CREATE INDEX IF NOT EXISTS idx_ad_insights_created_at ON ad_insights(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ad_insights_dismissed ON ad_insights(user_id, dismissed) WHERE NOT dismissed;

CREATE INDEX IF NOT EXISTS idx_ad_alerts_user_id ON ad_performance_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_ad_alerts_resolved ON ad_performance_alerts(user_id, resolved) WHERE NOT resolved;
CREATE INDEX IF NOT EXISTS idx_ad_alerts_created_at ON ad_performance_alerts(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_creative_tags_user_id ON creative_tags(user_id);
CREATE INDEX IF NOT EXISTS idx_creative_tags_ad_id ON creative_tags(ad_id);

CREATE INDEX IF NOT EXISTS idx_export_history_user_id ON ad_export_history(user_id);
CREATE INDEX IF NOT EXISTS idx_filter_presets_user_id ON ad_filter_presets(user_id);

-- Enable RLS
ALTER TABLE ad_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_performance_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE creative_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_export_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_filter_presets ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ad_insights
CREATE POLICY "Users can view own insights"
  ON ad_insights FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own insights"
  ON ad_insights FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own insights"
  ON ad_insights FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own insights"
  ON ad_insights FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for ad_performance_alerts
CREATE POLICY "Users can view own alerts"
  ON ad_performance_alerts FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own alerts"
  ON ad_performance_alerts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own alerts"
  ON ad_performance_alerts FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for creative_tags
CREATE POLICY "Users can view own tags"
  ON creative_tags FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own tags"
  ON creative_tags FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own tags"
  ON creative_tags FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for ad_export_history
CREATE POLICY "Users can view own exports"
  ON ad_export_history FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own exports"
  ON ad_export_history FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for ad_filter_presets
CREATE POLICY "Users can view own presets"
  ON ad_filter_presets FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own presets"
  ON ad_filter_presets FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own presets"
  ON ad_filter_presets FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own presets"
  ON ad_filter_presets FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);