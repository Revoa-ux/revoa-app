/*
  # Create Facebook Ads Integration Tables

  1. New Tables
    - `ad_accounts`
      - Stores Facebook ad account information
      - Links to users who connected the accounts

    - `facebook_tokens`
      - Stores OAuth access tokens for Facebook API
      - Links to ad accounts and users

    - `ad_campaigns`
      - Stores Facebook ad campaign data

    - `ad_sets`
      - Stores Facebook ad set data

    - `ads`
      - Stores individual Facebook ads

    - `ad_metrics`
      - Stores performance metrics for ads, ad sets, and campaigns

  2. Changes
    - Add `metadata` column to `oauth_sessions` for storing OAuth state data

  3. Security
    - Enable RLS on all new tables
    - Users can only access their own ad accounts and related data
*/

-- Add metadata column to oauth_sessions if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'oauth_sessions' AND column_name = 'metadata'
  ) THEN
    ALTER TABLE oauth_sessions ADD COLUMN metadata jsonb DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- Create ad_accounts table
CREATE TABLE IF NOT EXISTS ad_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform_account_id text NOT NULL UNIQUE,
  name text NOT NULL,
  platform text NOT NULL DEFAULT 'facebook',
  status text NOT NULL DEFAULT 'active',
  currency text,
  timezone text,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  last_synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ad_accounts_user_id ON ad_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_ad_accounts_platform ON ad_accounts(platform);
CREATE INDEX IF NOT EXISTS idx_ad_accounts_status ON ad_accounts(status);

ALTER TABLE ad_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own ad accounts"
  ON ad_accounts FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own ad accounts"
  ON ad_accounts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own ad accounts"
  ON ad_accounts FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own ad accounts"
  ON ad_accounts FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create facebook_tokens table
CREATE TABLE IF NOT EXISTS facebook_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ad_account_id text NOT NULL UNIQUE,
  access_token text NOT NULL,
  token_type text NOT NULL DEFAULT 'user',
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_facebook_tokens_user_id ON facebook_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_facebook_tokens_ad_account_id ON facebook_tokens(ad_account_id);
CREATE INDEX IF NOT EXISTS idx_facebook_tokens_expires_at ON facebook_tokens(expires_at);

ALTER TABLE facebook_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tokens"
  ON facebook_tokens FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tokens"
  ON facebook_tokens FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tokens"
  ON facebook_tokens FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own tokens"
  ON facebook_tokens FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create ad_campaigns table
CREATE TABLE IF NOT EXISTS ad_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform_campaign_id text NOT NULL UNIQUE,
  ad_account_id uuid NOT NULL REFERENCES ad_accounts(id) ON DELETE CASCADE,
  name text NOT NULL,
  status text NOT NULL,
  objective text,
  budget_remaining numeric,
  daily_budget numeric,
  lifetime_budget numeric,
  start_time timestamptz,
  stop_time timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ad_campaigns_ad_account_id ON ad_campaigns(ad_account_id);
CREATE INDEX IF NOT EXISTS idx_ad_campaigns_status ON ad_campaigns(status);

ALTER TABLE ad_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own campaigns"
  ON ad_campaigns FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM ad_accounts
      WHERE ad_accounts.id = ad_campaigns.ad_account_id
      AND ad_accounts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own campaigns"
  ON ad_campaigns FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM ad_accounts
      WHERE ad_accounts.id = ad_campaigns.ad_account_id
      AND ad_accounts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own campaigns"
  ON ad_campaigns FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM ad_accounts
      WHERE ad_accounts.id = ad_campaigns.ad_account_id
      AND ad_accounts.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM ad_accounts
      WHERE ad_accounts.id = ad_campaigns.ad_account_id
      AND ad_accounts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own campaigns"
  ON ad_campaigns FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM ad_accounts
      WHERE ad_accounts.id = ad_campaigns.ad_account_id
      AND ad_accounts.user_id = auth.uid()
    )
  );

-- Create ad_sets table
CREATE TABLE IF NOT EXISTS ad_sets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform_ad_set_id text NOT NULL UNIQUE,
  campaign_id uuid NOT NULL REFERENCES ad_campaigns(id) ON DELETE CASCADE,
  name text NOT NULL,
  status text NOT NULL,
  daily_budget numeric,
  lifetime_budget numeric,
  start_time timestamptz,
  end_time timestamptz,
  targeting jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ad_sets_campaign_id ON ad_sets(campaign_id);
CREATE INDEX IF NOT EXISTS idx_ad_sets_status ON ad_sets(status);

ALTER TABLE ad_sets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own ad sets"
  ON ad_sets FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM ad_campaigns
      JOIN ad_accounts ON ad_accounts.id = ad_campaigns.ad_account_id
      WHERE ad_campaigns.id = ad_sets.campaign_id
      AND ad_accounts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own ad sets"
  ON ad_sets FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM ad_campaigns
      JOIN ad_accounts ON ad_accounts.id = ad_campaigns.ad_account_id
      WHERE ad_campaigns.id = ad_sets.campaign_id
      AND ad_accounts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own ad sets"
  ON ad_sets FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM ad_campaigns
      JOIN ad_accounts ON ad_accounts.id = ad_campaigns.ad_account_id
      WHERE ad_campaigns.id = ad_sets.campaign_id
      AND ad_accounts.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM ad_campaigns
      JOIN ad_accounts ON ad_accounts.id = ad_campaigns.ad_account_id
      WHERE ad_campaigns.id = ad_sets.campaign_id
      AND ad_accounts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own ad sets"
  ON ad_sets FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM ad_campaigns
      JOIN ad_accounts ON ad_accounts.id = ad_campaigns.ad_account_id
      WHERE ad_campaigns.id = ad_sets.campaign_id
      AND ad_accounts.user_id = auth.uid()
    )
  );

-- Create ads table
CREATE TABLE IF NOT EXISTS ads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform_ad_id text NOT NULL UNIQUE,
  ad_set_id uuid NOT NULL REFERENCES ad_sets(id) ON DELETE CASCADE,
  name text NOT NULL,
  status text NOT NULL,
  creative_id text,
  creative_title text,
  creative_body text,
  creative_image_url text,
  creative_video_url text,
  call_to_action text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ads_ad_set_id ON ads(ad_set_id);
CREATE INDEX IF NOT EXISTS idx_ads_status ON ads(status);

ALTER TABLE ads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own ads"
  ON ads FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM ad_sets
      JOIN ad_campaigns ON ad_campaigns.id = ad_sets.campaign_id
      JOIN ad_accounts ON ad_accounts.id = ad_campaigns.ad_account_id
      WHERE ad_sets.id = ads.ad_set_id
      AND ad_accounts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own ads"
  ON ads FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM ad_sets
      JOIN ad_campaigns ON ad_campaigns.id = ad_sets.campaign_id
      JOIN ad_accounts ON ad_accounts.id = ad_campaigns.ad_account_id
      WHERE ad_sets.id = ads.ad_set_id
      AND ad_accounts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own ads"
  ON ads FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM ad_sets
      JOIN ad_campaigns ON ad_campaigns.id = ad_sets.campaign_id
      JOIN ad_accounts ON ad_accounts.id = ad_campaigns.ad_account_id
      WHERE ad_sets.id = ads.ad_set_id
      AND ad_accounts.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM ad_sets
      JOIN ad_campaigns ON ad_campaigns.id = ad_sets.campaign_id
      JOIN ad_accounts ON ad_accounts.id = ad_campaigns.ad_account_id
      WHERE ad_sets.id = ads.ad_set_id
      AND ad_accounts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own ads"
  ON ads FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM ad_sets
      JOIN ad_campaigns ON ad_campaigns.id = ad_sets.campaign_id
      JOIN ad_accounts ON ad_accounts.id = ad_campaigns.ad_account_id
      WHERE ad_sets.id = ads.ad_set_id
      AND ad_accounts.user_id = auth.uid()
    )
  );

-- Create ad_metrics table
CREATE TABLE IF NOT EXISTS ad_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_account_id uuid NOT NULL REFERENCES ad_accounts(id) ON DELETE CASCADE,
  entity_id text NOT NULL,
  entity_type text NOT NULL,
  date date NOT NULL,
  impressions bigint DEFAULT 0,
  clicks bigint DEFAULT 0,
  spend numeric DEFAULT 0,
  reach bigint DEFAULT 0,
  conversions bigint DEFAULT 0,
  conversion_value numeric DEFAULT 0,
  ctr numeric DEFAULT 0,
  cpc numeric DEFAULT 0,
  cpm numeric DEFAULT 0,
  roas numeric DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(entity_id, date)
);

CREATE INDEX IF NOT EXISTS idx_ad_metrics_ad_account_id ON ad_metrics(ad_account_id);
CREATE INDEX IF NOT EXISTS idx_ad_metrics_entity_id ON ad_metrics(entity_id);
CREATE INDEX IF NOT EXISTS idx_ad_metrics_entity_type ON ad_metrics(entity_type);
CREATE INDEX IF NOT EXISTS idx_ad_metrics_date ON ad_metrics(date);

ALTER TABLE ad_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own metrics"
  ON ad_metrics FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM ad_accounts
      WHERE ad_accounts.id = ad_metrics.ad_account_id
      AND ad_accounts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own metrics"
  ON ad_metrics FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM ad_accounts
      WHERE ad_accounts.id = ad_metrics.ad_account_id
      AND ad_accounts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own metrics"
  ON ad_metrics FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM ad_accounts
      WHERE ad_accounts.id = ad_metrics.ad_account_id
      AND ad_accounts.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM ad_accounts
      WHERE ad_accounts.id = ad_metrics.ad_account_id
      AND ad_accounts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own metrics"
  ON ad_metrics FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM ad_accounts
      WHERE ad_accounts.id = ad_metrics.ad_account_id
      AND ad_accounts.user_id = auth.uid()
    )
  );
