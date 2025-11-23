/*
  # Add Campaign Intelligence Fields

  1. Campaign Structure Fields
    - Add CBO/ABO tracking to ad_campaigns
    - Add Advantage Plus, bidding strategy, learning phase status
    - Add budget type tracking (daily vs lifetime)
    - Add delivery and account health indicators

  2. Ad Set Intelligence Fields
    - Add optimization goal, bid strategy
    - Add placement types and targeting expansion flags
    - Add Advantage Audience tracking

  3. Ad Engagement & Quality Fields
    - Add engagement metrics (likes, comments, shares, saves)
    - Add quality and relevance scores
    - Add engagement rate ranking

  4. Changes
    - Extends ad_campaigns with campaign structure tracking
    - Extends ad_sets with optimization tracking
    - Extends ads with engagement and quality metrics
*/

-- ============================================================================
-- 1. EXTEND AD_CAMPAIGNS TABLE
-- ============================================================================

-- Add campaign structure intelligence fields
DO $$
BEGIN
  -- Campaign budget optimization (CBO vs ABO)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ad_campaigns' AND column_name = 'is_cbo'
  ) THEN
    ALTER TABLE ad_campaigns ADD COLUMN is_cbo boolean DEFAULT false;
  END IF;

  -- Advantage Plus campaigns (Meta specific)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ad_campaigns' AND column_name = 'is_advantage_plus'
  ) THEN
    ALTER TABLE ad_campaigns ADD COLUMN is_advantage_plus boolean DEFAULT false;
  END IF;

  -- Bidding strategy
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ad_campaigns' AND column_name = 'bidding_strategy'
  ) THEN
    ALTER TABLE ad_campaigns ADD COLUMN bidding_strategy text;
  END IF;

  -- Bid amount (for manual bidding)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ad_campaigns' AND column_name = 'bid_amount'
  ) THEN
    ALTER TABLE ad_campaigns ADD COLUMN bid_amount numeric;
  END IF;

  -- Budget type (daily vs lifetime)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ad_campaigns' AND column_name = 'budget_type'
  ) THEN
    ALTER TABLE ad_campaigns ADD COLUMN budget_type text DEFAULT 'daily';
  END IF;

  -- Learning phase status
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ad_campaigns' AND column_name = 'learning_phase_status'
  ) THEN
    ALTER TABLE ad_campaigns ADD COLUMN learning_phase_status text;
  END IF;

  -- Delivery status
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ad_campaigns' AND column_name = 'delivery_status'
  ) THEN
    ALTER TABLE ad_campaigns ADD COLUMN delivery_status text;
  END IF;

  -- Campaign created date on platform (for learning phase tracking)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ad_campaigns' AND column_name = 'platform_created_at'
  ) THEN
    ALTER TABLE ad_campaigns ADD COLUMN platform_created_at timestamptz;
  END IF;

  -- Last significant edit (resets learning phase)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ad_campaigns' AND column_name = 'last_significant_edit_at'
  ) THEN
    ALTER TABLE ad_campaigns ADD COLUMN last_significant_edit_at timestamptz;
  END IF;

  -- Campaign metadata for platform-specific fields
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ad_campaigns' AND column_name = 'metadata'
  ) THEN
    ALTER TABLE ad_campaigns ADD COLUMN metadata jsonb DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- Add indexes for new campaign fields
CREATE INDEX IF NOT EXISTS idx_ad_campaigns_is_cbo ON ad_campaigns(is_cbo);
CREATE INDEX IF NOT EXISTS idx_ad_campaigns_learning_phase ON ad_campaigns(learning_phase_status) WHERE learning_phase_status IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ad_campaigns_delivery_status ON ad_campaigns(delivery_status) WHERE delivery_status IS NOT NULL;

-- ============================================================================
-- 2. EXTEND AD_SETS TABLE
-- ============================================================================

DO $$
BEGIN
  -- Optimization goal
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ad_sets' AND column_name = 'optimization_goal'
  ) THEN
    ALTER TABLE ad_sets ADD COLUMN optimization_goal text;
  END IF;

  -- Placement types
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ad_sets' AND column_name = 'placement_types'
  ) THEN
    ALTER TABLE ad_sets ADD COLUMN placement_types text[];
  END IF;

  -- Targeting expansion (Advantage Audience)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ad_sets' AND column_name = 'is_advantage_audience'
  ) THEN
    ALTER TABLE ad_sets ADD COLUMN is_advantage_audience boolean DEFAULT false;
  END IF;

  -- Learning phase status at ad set level
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ad_sets' AND column_name = 'learning_phase_status'
  ) THEN
    ALTER TABLE ad_sets ADD COLUMN learning_phase_status text;
  END IF;

  -- Delivery status
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ad_sets' AND column_name = 'delivery_status'
  ) THEN
    ALTER TABLE ad_sets ADD COLUMN delivery_status text;
  END IF;

  -- Platform created date
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ad_sets' AND column_name = 'platform_created_at'
  ) THEN
    ALTER TABLE ad_sets ADD COLUMN platform_created_at timestamptz;
  END IF;

  -- Last significant edit
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ad_sets' AND column_name = 'last_significant_edit_at'
  ) THEN
    ALTER TABLE ad_sets ADD COLUMN last_significant_edit_at timestamptz;
  END IF;
END $$;

-- Add indexes for ad set fields
CREATE INDEX IF NOT EXISTS idx_ad_sets_optimization_goal ON ad_sets(optimization_goal) WHERE optimization_goal IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ad_sets_learning_phase ON ad_sets(learning_phase_status) WHERE learning_phase_status IS NOT NULL;

-- ============================================================================
-- 3. EXTEND ADS TABLE
-- ============================================================================

DO $$
BEGIN
  -- Engagement metrics
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ads' AND column_name = 'engagement_likes'
  ) THEN
    ALTER TABLE ads ADD COLUMN engagement_likes integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ads' AND column_name = 'engagement_comments'
  ) THEN
    ALTER TABLE ads ADD COLUMN engagement_comments integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ads' AND column_name = 'engagement_shares'
  ) THEN
    ALTER TABLE ads ADD COLUMN engagement_shares integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ads' AND column_name = 'engagement_saves'
  ) THEN
    ALTER TABLE ads ADD COLUMN engagement_saves integer DEFAULT 0;
  END IF;

  -- Quality scores
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ads' AND column_name = 'quality_score'
  ) THEN
    ALTER TABLE ads ADD COLUMN quality_score numeric;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ads' AND column_name = 'relevance_score'
  ) THEN
    ALTER TABLE ads ADD COLUMN relevance_score numeric;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ads' AND column_name = 'engagement_rate_ranking'
  ) THEN
    ALTER TABLE ads ADD COLUMN engagement_rate_ranking text;
  END IF;

  -- Add ad_account_id for direct reference
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ads' AND column_name = 'ad_account_id'
  ) THEN
    ALTER TABLE ads ADD COLUMN ad_account_id uuid REFERENCES ad_accounts(id) ON DELETE CASCADE;
  END IF;

  -- Platform created date
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ads' AND column_name = 'platform_created_at'
  ) THEN
    ALTER TABLE ads ADD COLUMN platform_created_at timestamptz;
  END IF;
END $$;

-- Add indexes for engagement metrics
CREATE INDEX IF NOT EXISTS idx_ads_engagement_likes ON ads(engagement_likes) WHERE engagement_likes > 0;
CREATE INDEX IF NOT EXISTS idx_ads_quality_score ON ads(quality_score) WHERE quality_score IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ads_ad_account_id ON ads(ad_account_id) WHERE ad_account_id IS NOT NULL;
