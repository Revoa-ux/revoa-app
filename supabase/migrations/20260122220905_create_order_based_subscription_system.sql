/*
  # Order-Based Subscription Tracking System

  1. New Tables
    - `subscription_history`
      - Tracks all subscription status changes over time
      - Records tier changes, cancellations, upgrades, and downgrades
      - Includes Shopify subscription ID and pricing details
    
    - `monthly_order_counts`
      - Tracks rolling 30-day order counts per store
      - Used for automatic tier recommendations
      - Updated daily via scheduled job
  
  2. Schema Changes
    - Add subscription fields to `shopify_stores` table:
      - `current_tier` - Current pricing tier (startup, momentum, scale, enterprise)
      - `subscription_status` - Shopify subscription status
      - `shopify_subscription_id` - Reference to Shopify subscription
      - `trial_end_date` - End date of free trial
      - `current_period_end` - End of current billing cycle
      - `last_order_count_update` - Last time order count was calculated
      - `monthly_order_count` - Current rolling 30-day order count
  
  3. Security
    - Enable RLS on all new tables
    - Only authenticated users can view their own subscription data
    - Super admins can view all subscriptions
  
  4. Indexes
    - Index on store_id for fast subscription lookups
    - Index on subscription_status for filtering active subscriptions
    - Index on created_at for chronological queries
*/

-- Add subscription tracking columns to shopify_stores
ALTER TABLE shopify_stores 
ADD COLUMN IF NOT EXISTS current_tier text DEFAULT 'startup' CHECK (current_tier IN ('startup', 'momentum', 'scale', 'enterprise')),
ADD COLUMN IF NOT EXISTS subscription_status text DEFAULT 'PENDING' CHECK (subscription_status IN ('ACTIVE', 'PENDING', 'CANCELLED', 'EXPIRED', 'DECLINED', 'FROZEN')),
ADD COLUMN IF NOT EXISTS shopify_subscription_id text,
ADD COLUMN IF NOT EXISTS trial_end_date timestamptz,
ADD COLUMN IF NOT EXISTS current_period_end timestamptz,
ADD COLUMN IF NOT EXISTS last_order_count_update timestamptz DEFAULT now(),
ADD COLUMN IF NOT EXISTS monthly_order_count integer DEFAULT 0;

-- Create index for fast tier and status lookups
CREATE INDEX IF NOT EXISTS idx_shopify_stores_tier_status ON shopify_stores(current_tier, subscription_status);
CREATE INDEX IF NOT EXISTS idx_shopify_stores_subscription_id ON shopify_stores(shopify_subscription_id);

-- Create subscription history table
CREATE TABLE IF NOT EXISTS subscription_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid REFERENCES shopify_stores(id) ON DELETE CASCADE NOT NULL,
  shopify_subscription_id text,
  previous_tier text,
  new_tier text NOT NULL,
  previous_status text,
  new_status text NOT NULL,
  price_amount numeric,
  currency_code text DEFAULT 'USD',
  trial_days integer,
  event_type text NOT NULL CHECK (event_type IN ('created', 'activated', 'upgraded', 'downgraded', 'cancelled', 'expired', 'declined', 'frozen')),
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Add indexes for subscription history
CREATE INDEX IF NOT EXISTS idx_subscription_history_store_id ON subscription_history(store_id);
CREATE INDEX IF NOT EXISTS idx_subscription_history_created_at ON subscription_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_subscription_history_event_type ON subscription_history(event_type);

-- Enable RLS on subscription history
ALTER TABLE subscription_history ENABLE ROW LEVEL SECURITY;

-- Create monthly order counts table
CREATE TABLE IF NOT EXISTS monthly_order_counts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid REFERENCES shopify_stores(id) ON DELETE CASCADE NOT NULL,
  count_date date NOT NULL DEFAULT CURRENT_DATE,
  order_count integer NOT NULL DEFAULT 0,
  calculation_period_start timestamptz NOT NULL,
  calculation_period_end timestamptz NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(store_id, count_date)
);

-- Add indexes for monthly order counts
CREATE INDEX IF NOT EXISTS idx_monthly_order_counts_store_date ON monthly_order_counts(store_id, count_date DESC);

-- Enable RLS on monthly order counts
ALTER TABLE monthly_order_counts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for subscription_history

-- Users can view their own subscription history
CREATE POLICY "Users can view own subscription history"
  ON subscription_history
  FOR SELECT
  TO authenticated
  USING (
    store_id IN (
      SELECT id FROM shopify_stores WHERE id IN (
        SELECT store_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  );

-- Super admins can view all subscription history
CREATE POLICY "Super admins can view all subscription history"
  ON subscription_history
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND is_super_admin = true
    )
  );

-- System can insert subscription history (service role)
CREATE POLICY "System can insert subscription history"
  ON subscription_history
  FOR INSERT
  WITH CHECK (true);

-- RLS Policies for monthly_order_counts

-- Users can view their own order counts
CREATE POLICY "Users can view own order counts"
  ON monthly_order_counts
  FOR SELECT
  TO authenticated
  USING (
    store_id IN (
      SELECT id FROM shopify_stores WHERE id IN (
        SELECT store_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  );

-- Super admins can view all order counts
CREATE POLICY "Super admins can view all order counts"
  ON monthly_order_counts
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND is_super_admin = true
    )
  );

-- System can insert/update order counts (service role)
CREATE POLICY "System can insert order counts"
  ON monthly_order_counts
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "System can update order counts"
  ON monthly_order_counts
  FOR UPDATE
  USING (true);

-- Function to calculate rolling 30-day order count for a store
CREATE OR REPLACE FUNCTION calculate_monthly_order_count(store_id_param uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  order_count integer;
BEGIN
  SELECT COUNT(*)
  INTO order_count
  FROM shopify_orders
  WHERE user_id = store_id_param
    AND ordered_at >= NOW() - INTERVAL '30 days'
    AND ordered_at <= NOW();
  
  RETURN COALESCE(order_count, 0);
END;
$$;

-- Function to update order count for a store
CREATE OR REPLACE FUNCTION update_store_order_count(store_id_param uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_count integer;
  period_start timestamptz;
  period_end timestamptz;
BEGIN
  period_start := NOW() - INTERVAL '30 days';
  period_end := NOW();
  
  -- Calculate current order count
  new_count := calculate_monthly_order_count(store_id_param);
  
  -- Update shopify_stores table
  UPDATE shopify_stores
  SET 
    monthly_order_count = new_count,
    last_order_count_update = NOW()
  WHERE id = store_id_param;
  
  -- Insert into monthly_order_counts history
  INSERT INTO monthly_order_counts (store_id, count_date, order_count, calculation_period_start, calculation_period_end)
  VALUES (store_id_param, CURRENT_DATE, new_count, period_start, period_end)
  ON CONFLICT (store_id, count_date) 
  DO UPDATE SET 
    order_count = EXCLUDED.order_count,
    calculation_period_end = EXCLUDED.calculation_period_end;
END;
$$;

-- Function to get recommended tier based on order count
CREATE OR REPLACE FUNCTION get_recommended_tier(order_count integer)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF order_count <= 100 THEN
    RETURN 'startup';
  ELSIF order_count <= 300 THEN
    RETURN 'momentum';
  ELSIF order_count <= 1000 THEN
    RETURN 'scale';
  ELSE
    RETURN 'enterprise';
  END IF;
END;
$$;

-- Add comment documentation
COMMENT ON TABLE subscription_history IS 'Tracks all subscription status changes and tier upgrades/downgrades';
COMMENT ON TABLE monthly_order_counts IS 'Daily snapshots of rolling 30-day order counts per store';
COMMENT ON FUNCTION calculate_monthly_order_count IS 'Calculates the number of orders in the last 30 days for a given store';
COMMENT ON FUNCTION update_store_order_count IS 'Updates the monthly order count for a store and creates history record';
COMMENT ON FUNCTION get_recommended_tier IS 'Returns the recommended tier based on order count thresholds';
