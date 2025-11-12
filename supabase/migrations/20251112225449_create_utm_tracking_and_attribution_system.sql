/*
  # UTM Tracking and Attribution System

  ## Overview
  This migration creates the foundation for Revoa's intelligent attribution system that combines
  ad platform data with Shopify order data to provide accurate creative-level conversion tracking.

  ## New Tables

  ### 1. `shopify_orders` - Shopify Order Tracking
  Stores order data from Shopify with parsed UTM parameters for attribution
  
  **Columns:**
  - `id` (uuid, primary key)
  - `user_id` (uuid) - Links to the merchant/user
  - `shopify_order_id` (text, unique) - Shopify's order ID
  - `order_number` (text) - Human-readable order number
  - `total_price` (numeric) - Total order value
  - `currency` (text) - Order currency (USD, EUR, etc.)
  - `customer_email` (text) - Customer email for LTV tracking
  - `utm_source` (text) - Traffic source (facebook, google, tiktok)
  - `utm_medium` (text) - Traffic medium (cpc, social, email)
  - `utm_campaign` (text) - Campaign identifier
  - `utm_term` (text) - Ad/keyword identifier (KEY for ad matching)
  - `utm_content` (text) - Ad variation identifier
  - `landing_site` (text) - Full landing page URL with params
  - `referring_site` (text) - Referrer URL
  - `fbclid` (text) - Facebook click ID for CAPI
  - `gclid` (text) - Google click ID for Google Ads
  - `ttclid` (text) - TikTok click ID
  - `ordered_at` (timestamptz) - When order was placed
  - `created_at` (timestamptz)

  ### 2. `ad_conversions` - Ad to Conversion Mapping
  Links ad creatives to actual Shopify conversions for accurate CVR calculation
  
  **Columns:**
  - `id` (uuid, primary key)
  - `user_id` (uuid) - The merchant
  - `ad_id` (uuid) - References ads table
  - `order_id` (uuid) - References shopify_orders table
  - `platform` (text) - facebook, google, tiktok
  - `conversion_value` (numeric) - Order total
  - `attribution_method` (text) - how we matched: utm_match, fbclid, manual
  - `confidence_score` (numeric) - 0-1 confidence in attribution
  - `converted_at` (timestamptz) - When conversion happened
  - `created_at` (timestamptz)

  ### 3. `conversion_events` - CAPI Event Tracking
  Stores conversion events for sending to ad platforms via CAPI
  
  **Columns:**
  - `id` (uuid, primary key)
  - `user_id` (uuid)
  - `platform` (text) - Target platform (facebook, google, tiktok)
  - `event_name` (text) - Purchase, AddToCart, ViewContent
  - `event_time` (timestamptz) - When event occurred
  - `order_id` (uuid) - Optional: links to shopify_orders
  - `event_data` (jsonb) - Full event payload
  - `fbp` (text) - Facebook browser pixel ID
  - `fbc` (text) - Facebook click ID from cookie
  - `user_data` (jsonb) - Hashed customer data for matching
  - `sent_at` (timestamptz) - When we sent to platform
  - `response_code` (text) - API response
  - `status` (text) - pending, sent, failed
  - `created_at` (timestamptz)

  ### 4. `ai_patterns_global` - Cross-Account Learning
  Stores patterns learned across all Revoa users for the AI intelligence layer
  
  **Columns:**
  - `id` (uuid, primary key)
  - `pattern_type` (text) - campaign_structure, creative_type, timing, budget_scaling
  - `category` (text) - Product category, price range, etc.
  - `conditions` (jsonb) - When this pattern applies
  - `observation` (text) - What we observed
  - `impact_metric` (text) - ROAS, CVR, CTR, etc.
  - `impact_value` (numeric) - Size of effect (e.g., 2.3x lift)
  - `confidence_score` (numeric) - 0-1 based on sample size
  - `sample_size` (integer) - How many accounts this is based on
  - `last_validated_at` (timestamptz)
  - `created_at` (timestamptz)

  ### 5. `ai_patterns_account` - Account-Specific Learning
  Stores patterns learned from each individual merchant's account
  
  **Columns:**
  - `id` (uuid, primary key)
  - `user_id` (uuid) - The merchant this pattern applies to
  - `pattern_type` (text) - Same types as global
  - `observation` (text) - What we learned about this account
  - `impact_metric` (text)
  - `impact_value` (numeric)
  - `confidence_score` (numeric) - Builds over time with more data
  - `sample_size` (integer) - How many data points
  - `last_validated_at` (timestamptz)
  - `created_at` (timestamptz)

  ## Security
  - All tables have RLS enabled
  - Users can only access their own data
  - Pattern tables have special policies for AI system access

  ## Indexes
  - Optimized for fast lookups on utm_term, fbclid, order matching
  - Date range queries for attribution windows
  - Pattern matching queries
*/

-- ============================================================================
-- 1. SHOPIFY ORDERS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS shopify_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shopify_order_id text NOT NULL,
  order_number text NOT NULL,
  total_price numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  customer_email text,
  
  -- UTM Parameters
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_term text, -- KEY: This is what we'll match to ad names/IDs
  utm_content text,
  
  -- Landing page data
  landing_site text,
  referring_site text,
  
  -- Click IDs for CAPI
  fbclid text,
  gclid text,
  ttclid text,
  
  -- Timestamps
  ordered_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  
  UNIQUE(user_id, shopify_order_id)
);

CREATE INDEX IF NOT EXISTS idx_shopify_orders_user_id ON shopify_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_shopify_orders_utm_term ON shopify_orders(utm_term) WHERE utm_term IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_shopify_orders_utm_source ON shopify_orders(utm_source) WHERE utm_source IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_shopify_orders_fbclid ON shopify_orders(fbclid) WHERE fbclid IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_shopify_orders_ordered_at ON shopify_orders(ordered_at);
CREATE INDEX IF NOT EXISTS idx_shopify_orders_customer_email ON shopify_orders(customer_email) WHERE customer_email IS NOT NULL;

ALTER TABLE shopify_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own orders"
  ON shopify_orders FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own orders"
  ON shopify_orders FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own orders"
  ON shopify_orders FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- 2. AD CONVERSIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS ad_conversions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ad_id uuid REFERENCES ads(id) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES shopify_orders(id) ON DELETE CASCADE,
  platform text NOT NULL DEFAULT 'facebook',
  conversion_value numeric NOT NULL DEFAULT 0,
  attribution_method text NOT NULL, -- utm_match, fbclid, manual, auto
  confidence_score numeric NOT NULL DEFAULT 1.0 CHECK (confidence_score >= 0 AND confidence_score <= 1),
  converted_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  
  UNIQUE(order_id, ad_id)
);

CREATE INDEX IF NOT EXISTS idx_ad_conversions_user_id ON ad_conversions(user_id);
CREATE INDEX IF NOT EXISTS idx_ad_conversions_ad_id ON ad_conversions(ad_id);
CREATE INDEX IF NOT EXISTS idx_ad_conversions_order_id ON ad_conversions(order_id);
CREATE INDEX IF NOT EXISTS idx_ad_conversions_converted_at ON ad_conversions(converted_at);
CREATE INDEX IF NOT EXISTS idx_ad_conversions_platform ON ad_conversions(platform);

ALTER TABLE ad_conversions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own conversions"
  ON ad_conversions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own conversions"
  ON ad_conversions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own conversions"
  ON ad_conversions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- 3. CONVERSION EVENTS TABLE (CAPI)
-- ============================================================================
CREATE TABLE IF NOT EXISTS conversion_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform text NOT NULL, -- facebook, google, tiktok
  event_name text NOT NULL, -- Purchase, AddToCart, ViewContent, etc
  event_time timestamptz NOT NULL,
  order_id uuid REFERENCES shopify_orders(id) ON DELETE SET NULL,
  event_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  fbp text, -- Facebook browser pixel
  fbc text, -- Facebook click parameter
  user_data jsonb, -- Hashed customer data
  sent_at timestamptz,
  response_code text,
  status text NOT NULL DEFAULT 'pending', -- pending, sent, failed
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_conversion_events_user_id ON conversion_events(user_id);
CREATE INDEX IF NOT EXISTS idx_conversion_events_platform ON conversion_events(platform);
CREATE INDEX IF NOT EXISTS idx_conversion_events_status ON conversion_events(status);
CREATE INDEX IF NOT EXISTS idx_conversion_events_event_time ON conversion_events(event_time);
CREATE INDEX IF NOT EXISTS idx_conversion_events_order_id ON conversion_events(order_id) WHERE order_id IS NOT NULL;

ALTER TABLE conversion_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own conversion events"
  ON conversion_events FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own conversion events"
  ON conversion_events FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own conversion events"
  ON conversion_events FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- 4. AI PATTERNS GLOBAL TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS ai_patterns_global (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern_type text NOT NULL, -- campaign_structure, creative_type, timing, budget_scaling, breakpoints
  category text, -- product_category, price_range, audience_type
  conditions jsonb NOT NULL DEFAULT '{}'::jsonb,
  observation text NOT NULL,
  impact_metric text NOT NULL, -- ROAS, CVR, CTR, CPC, scaling_efficiency
  impact_value numeric NOT NULL, -- Quantified impact (e.g., 2.3 for 2.3x ROAS lift)
  confidence_score numeric NOT NULL DEFAULT 0.5 CHECK (confidence_score >= 0 AND confidence_score <= 1),
  sample_size integer NOT NULL DEFAULT 0,
  last_validated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_patterns_global_pattern_type ON ai_patterns_global(pattern_type);
CREATE INDEX IF NOT EXISTS idx_ai_patterns_global_category ON ai_patterns_global(category) WHERE category IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ai_patterns_global_confidence ON ai_patterns_global(confidence_score);

ALTER TABLE ai_patterns_global ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read global patterns
CREATE POLICY "Anyone can view global patterns"
  ON ai_patterns_global FOR SELECT
  TO authenticated
  USING (true);

-- Only system (service role) can insert/update global patterns
-- This will be done via edge functions

-- ============================================================================
-- 5. AI PATTERNS ACCOUNT TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS ai_patterns_account (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pattern_type text NOT NULL,
  observation text NOT NULL,
  impact_metric text NOT NULL,
  impact_value numeric NOT NULL,
  confidence_score numeric NOT NULL DEFAULT 0.1 CHECK (confidence_score >= 0 AND confidence_score <= 1),
  sample_size integer NOT NULL DEFAULT 0,
  last_validated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_patterns_account_user_id ON ai_patterns_account(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_patterns_account_pattern_type ON ai_patterns_account(pattern_type);
CREATE INDEX IF NOT EXISTS idx_ai_patterns_account_confidence ON ai_patterns_account(confidence_score);

ALTER TABLE ai_patterns_account ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own patterns"
  ON ai_patterns_account FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own patterns"
  ON ai_patterns_account FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own patterns"
  ON ai_patterns_account FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
