/*
  # Create AI Pattern Cache and Discovery System

  1. New Tables
    - `rex_pattern_cache`
      - Stores discovered patterns to avoid re-analysis
      - Tracks pattern confidence and validation
      - Enables learning from historical patterns
    
    - `rex_analysis_history`
      - Complete audit trail of all AI analyses
      - Tracks what was analyzed, when, and results
      - Enables performance monitoring and improvement

  2. Features
    - Pattern caching with TTL
    - Confidence scoring and validation
    - Historical pattern tracking
    - Analysis performance metrics

  3. Security
    - Enable RLS on all tables
    - Users can only access their own patterns
    - Super admins can view all patterns for system monitoring
*/

-- Rex Pattern Cache Table
CREATE TABLE IF NOT EXISTS rex_pattern_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Pattern Identity
  pattern_type text NOT NULL, -- demographic, placement, geographic, temporal, customer_behavior, creative, cross_metric
  entity_type text NOT NULL, -- campaign, ad_set, ad, account
  entity_id text NOT NULL,
  pattern_key text NOT NULL, -- Unique identifier for the pattern
  
  -- Pattern Details
  pattern_name text NOT NULL,
  pattern_description text NOT NULL,
  pattern_data jsonb NOT NULL, -- Complete pattern data
  
  -- Analysis Metrics
  data_points_analyzed int NOT NULL DEFAULT 0,
  analysis_depth text NOT NULL, -- surface, moderate, deep
  confidence_score numeric(5,2) NOT NULL, -- 0.00 to 100.00
  statistical_significance numeric(5,4), -- p-value
  
  -- Pattern Metrics
  performance_impact numeric(10,2), -- Expected impact in dollars
  urgency_level text NOT NULL, -- low, medium, high, critical
  risk_level text NOT NULL, -- low, medium, high
  
  -- Validation
  is_validated boolean DEFAULT false,
  validation_date timestamptz,
  validation_accuracy numeric(5,2), -- How accurate was the prediction
  times_suggested int DEFAULT 0,
  times_accepted int DEFAULT 0,
  times_dismissed int DEFAULT 0,
  
  -- Timestamps
  first_discovered_at timestamptz DEFAULT now(),
  last_validated_at timestamptz,
  expires_at timestamptz NOT NULL, -- When to re-analyze
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Unique pattern per entity
  UNIQUE(user_id, pattern_key, entity_id)
);

-- Rex Analysis History Table
CREATE TABLE IF NOT EXISTS rex_analysis_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Analysis Details
  analysis_type text NOT NULL, -- full_scan, entity_check, pattern_validation, suggestion_generation
  entity_type text, -- campaign, ad_set, ad, account
  entity_id text,
  
  -- Execution Metrics
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  duration_ms int,
  status text NOT NULL, -- running, completed, failed, cancelled
  
  -- Results
  patterns_found int DEFAULT 0,
  suggestions_generated int DEFAULT 0,
  data_points_analyzed int DEFAULT 0,
  entities_scanned int DEFAULT 0,
  
  -- Performance
  insights_actionable int DEFAULT 0,
  insights_high_confidence int DEFAULT 0,
  estimated_value_discovered numeric(10,2) DEFAULT 0,
  
  -- Errors
  error_message text,
  error_stack text,
  
  -- Metadata
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

-- Rex Discovered Insights Table (patterns that led to suggestions)
CREATE TABLE IF NOT EXISTS rex_discovered_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  suggestion_id uuid REFERENCES rex_suggestions(id) ON DELETE SET NULL,
  
  -- Insight Details
  insight_type text NOT NULL,
  insight_category text NOT NULL, -- optimization, warning, opportunity, anomaly
  title text NOT NULL,
  description text NOT NULL,
  
  -- Supporting Data
  primary_metric text NOT NULL,
  primary_value numeric(10,2) NOT NULL,
  comparison_value numeric(10,2),
  improvement_percentage numeric(5,2),
  
  -- Breakdown Data
  demographics_data jsonb,
  placements_data jsonb,
  geographic_data jsonb,
  temporal_data jsonb,
  customer_behavior_data jsonb,
  
  -- Evidence
  sample_data_points jsonb, -- Sample of actual data that led to insight
  methodology text, -- How this insight was discovered
  confidence_intervals jsonb, -- Statistical confidence ranges
  
  -- Impact
  projected_impact_7d numeric(10,2),
  projected_impact_30d numeric(10,2),
  risk_if_ignored text,
  opportunity_cost numeric(10,2),
  
  -- Validation
  was_accurate boolean,
  actual_impact numeric(10,2),
  validated_at timestamptz,
  
  -- Metadata
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create Indexes
CREATE INDEX IF NOT EXISTS idx_pattern_cache_user_entity ON rex_pattern_cache(user_id, entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_pattern_cache_type_confidence ON rex_pattern_cache(pattern_type, confidence_score DESC);
CREATE INDEX IF NOT EXISTS idx_pattern_cache_expires ON rex_pattern_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_pattern_cache_urgency ON rex_pattern_cache(urgency_level, confidence_score DESC);

CREATE INDEX IF NOT EXISTS idx_analysis_history_user_date ON rex_analysis_history(user_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_analysis_history_status ON rex_analysis_history(status, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_analysis_history_type ON rex_analysis_history(analysis_type, completed_at DESC);

CREATE INDEX IF NOT EXISTS idx_discovered_insights_user ON rex_discovered_insights(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_discovered_insights_suggestion ON rex_discovered_insights(suggestion_id);
CREATE INDEX IF NOT EXISTS idx_discovered_insights_category ON rex_discovered_insights(insight_category, confidence_intervals);

-- Enable Row Level Security
ALTER TABLE rex_pattern_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE rex_analysis_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE rex_discovered_insights ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Pattern Cache
CREATE POLICY "Users can view own pattern cache"
  ON rex_pattern_cache FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own pattern cache"
  ON rex_pattern_cache FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own pattern cache"
  ON rex_pattern_cache FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own pattern cache"
  ON rex_pattern_cache FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for Analysis History
CREATE POLICY "Users can view own analysis history"
  ON rex_analysis_history FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own analysis history"
  ON rex_analysis_history FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for Discovered Insights
CREATE POLICY "Users can view own discovered insights"
  ON rex_discovered_insights FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own discovered insights"
  ON rex_discovered_insights FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own discovered insights"
  ON rex_discovered_insights FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Function to clean up expired patterns
CREATE OR REPLACE FUNCTION cleanup_expired_patterns()
RETURNS void
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM rex_pattern_cache
  WHERE expires_at < now();
END;
$$;
