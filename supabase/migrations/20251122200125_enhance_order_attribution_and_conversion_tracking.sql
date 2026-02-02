/*
  # Enhance Order Attribution and Conversion Tracking

  1. New Tables
    - `enriched_conversions`
      - Complete view of every conversion with full attribution
      - Links orders to ads with detailed customer behavior data
      - Stores UTM parameters, device info, geographic data
      - Tracks customer lifetime value and purchase patterns
  
  2. Changes
    - Add customer behavior tracking fields
    - Add margin and profit calculations
    - Add device and geographic enrichment
    - Add multi-touch attribution support

  3. Security
    - Enable RLS with user-based access control
    - Protect sensitive customer data
*/

-- Enriched Conversions Table
CREATE TABLE IF NOT EXISTS enriched_conversions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Order Information
  shopify_order_id text NOT NULL,
  order_number text NOT NULL,
  order_value numeric(10,2) NOT NULL,
  currency text DEFAULT 'USD',
  ordered_at timestamptz NOT NULL,
  
  -- Product Information
  product_ids text[],
  product_names text[],
  product_costs numeric(10,2)[], -- Cost of goods sold
  total_cogs numeric(10,2) DEFAULT 0, -- Total cost of goods sold
  net_margin numeric(10,2) DEFAULT 0, -- order_value - total_cogs - fees
  margin_percentage numeric(5,2) DEFAULT 0,
  
  -- Attribution
  ad_id uuid REFERENCES ads(id) ON DELETE SET NULL,
  campaign_id uuid REFERENCES ad_campaigns(id) ON DELETE SET NULL,
  ad_set_id uuid REFERENCES ad_sets(id) ON DELETE SET NULL,
  platform text,
  platform_ad_id text,
  platform_campaign_id text,
  platform_ad_set_id text,
  
  -- UTM Parameters
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_term text,
  utm_content text,
  
  -- Click IDs
  fbclid text,
  gclid text,
  ttclid text,
  
  -- Attribution Details
  attribution_method text, -- utm_match, fbclid, click_id, pixel, manual
  attribution_confidence numeric(3,2) DEFAULT 1.0, -- 0.0 to 1.0
  touch_points jsonb, -- Multi-touch attribution data
  
  -- Customer Information
  customer_email text,
  customer_id text,
  customer_type text, -- new, returning, vip
  is_first_purchase boolean DEFAULT false,
  previous_purchase_count int DEFAULT 0,
  customer_lifetime_value numeric(10,2) DEFAULT 0,
  days_since_last_purchase int,
  
  -- Device & Platform
  device_type text, -- mobile, desktop, tablet
  browser text,
  operating_system text,
  
  -- Geographic Information
  country_code text,
  country_name text,
  region text,
  city text,
  ip_address text,
  
  -- Timestamps
  click_timestamp timestamptz,
  landing_timestamp timestamptz,
  conversion_timestamp timestamptz,
  time_to_conversion interval, -- time from click to purchase
  
  -- Source URLs
  landing_site text,
  referring_site text,
  landing_page text,
  
  -- Metadata
  metadata jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Unique constraint on order
  UNIQUE(user_id, shopify_order_id)
);

-- Customer Lifetime Tracking Table
CREATE TABLE IF NOT EXISTS customer_lifetime_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_email text NOT NULL,
  customer_id text,
  
  -- Lifetime Metrics
  total_orders int DEFAULT 0,
  total_revenue numeric(10,2) DEFAULT 0,
  total_profit numeric(10,2) DEFAULT 0,
  average_order_value numeric(10,2) DEFAULT 0,
  
  -- First Order Attribution
  first_order_ad_id uuid REFERENCES ads(id) ON DELETE SET NULL,
  first_order_platform text,
  first_order_date timestamptz,
  first_order_value numeric(10,2),
  
  -- Purchase Patterns
  last_purchase_date timestamptz,
  days_between_purchases numeric(5,1), -- Average days
  purchase_frequency numeric(5,2), -- Orders per month
  
  -- Engagement
  email_opt_in boolean DEFAULT false,
  sms_opt_in boolean DEFAULT false,
  
  -- Metadata
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(user_id, customer_email)
);

-- Create Indexes
CREATE INDEX IF NOT EXISTS idx_enriched_conversions_user_date ON enriched_conversions(user_id, ordered_at DESC);
CREATE INDEX IF NOT EXISTS idx_enriched_conversions_ad ON enriched_conversions(ad_id, ordered_at DESC);
CREATE INDEX IF NOT EXISTS idx_enriched_conversions_campaign ON enriched_conversions(campaign_id, ordered_at DESC);
CREATE INDEX IF NOT EXISTS idx_enriched_conversions_customer ON enriched_conversions(user_id, customer_email);
CREATE INDEX IF NOT EXISTS idx_enriched_conversions_attribution ON enriched_conversions(attribution_method, attribution_confidence);
CREATE INDEX IF NOT EXISTS idx_enriched_conversions_utm_source ON enriched_conversions(utm_source, utm_campaign);
CREATE INDEX IF NOT EXISTS idx_enriched_conversions_device ON enriched_conversions(device_type, country_code);

CREATE INDEX IF NOT EXISTS idx_customer_lifetime_user ON customer_lifetime_tracking(user_id, customer_email);
CREATE INDEX IF NOT EXISTS idx_customer_lifetime_ad ON customer_lifetime_tracking(first_order_ad_id);

-- Enable Row Level Security
ALTER TABLE enriched_conversions ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_lifetime_tracking ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Enriched Conversions
CREATE POLICY "Users can view own conversions"
  ON enriched_conversions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own conversions"
  ON enriched_conversions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own conversions"
  ON enriched_conversions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for Customer Lifetime Tracking
CREATE POLICY "Users can view own customer lifetime data"
  ON customer_lifetime_tracking FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own customer lifetime data"
  ON customer_lifetime_tracking FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own customer lifetime data"
  ON customer_lifetime_tracking FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Function to update customer lifetime metrics
CREATE OR REPLACE FUNCTION update_customer_lifetime_metrics()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Insert or update customer lifetime tracking
  INSERT INTO customer_lifetime_tracking (
    user_id,
    customer_email,
    customer_id,
    total_orders,
    total_revenue,
    total_profit,
    average_order_value,
    first_order_ad_id,
    first_order_platform,
    first_order_date,
    first_order_value,
    last_purchase_date
  )
  VALUES (
    NEW.user_id,
    NEW.customer_email,
    NEW.customer_id,
    1,
    NEW.order_value,
    NEW.net_margin,
    NEW.order_value,
    NEW.ad_id,
    NEW.platform,
    NEW.ordered_at,
    NEW.order_value,
    NEW.ordered_at
  )
  ON CONFLICT (user_id, customer_email) DO UPDATE SET
    total_orders = customer_lifetime_tracking.total_orders + 1,
    total_revenue = customer_lifetime_tracking.total_revenue + NEW.order_value,
    total_profit = customer_lifetime_tracking.total_profit + NEW.net_margin,
    average_order_value = (customer_lifetime_tracking.total_revenue + NEW.order_value) / (customer_lifetime_tracking.total_orders + 1),
    last_purchase_date = NEW.ordered_at,
    updated_at = now();
  
  RETURN NEW;
END;
$$;

-- Trigger to update customer lifetime metrics
CREATE TRIGGER trigger_update_customer_lifetime
  AFTER INSERT ON enriched_conversions
  FOR EACH ROW
  EXECUTE FUNCTION update_customer_lifetime_metrics();
