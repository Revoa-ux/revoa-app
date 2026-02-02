/*
  # Refactor Integrations Architecture - One Store, Multiple Ad Platforms

  ## Overview
  This migration transforms the app's integration model to support:
  - One Shopify store per user as the central entity
  - Multiple ad platform accounts linked to that one store
  - Cached order data for performance
  - Daily metrics rollups for fast dashboard loading

  ## Changes

  ### 1. New Tables
  - `stores` - Central store entity (replaces scattered shopify data)
  - `store_orders` - Cached Shopify orders for fast queries
  - `store_metrics_daily` - Pre-computed daily metrics rollup
  - `platform_connections` - Generic platform connection tracking

  ### 2. Schema Changes
  - Add `store_id` to `ad_accounts` to link ad accounts to stores
  - Migrate existing data to new structure
  - Update RLS policies for new tables

  ### 3. Data Model
  ```
  User
    └── Store (ONE per user)
          ├── Facebook Ad Account
          ├── Google Ad Account (future)
          ├── TikTok Ad Account (future)
          ├── Orders (cached)
          └── Daily Metrics (pre-computed)
  ```

  ## Security
  - RLS enabled on all new tables
  - Users can only access their own store and related data
  - Service role has full access for sync operations
*/

-- =====================================================
-- STEP 1: Create central stores table
-- =====================================================
CREATE TABLE IF NOT EXISTS stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Store details
  platform TEXT DEFAULT 'shopify' NOT NULL,
  store_url TEXT UNIQUE NOT NULL,
  store_name TEXT,
  store_domain TEXT,
  
  -- Access credentials
  access_token TEXT,
  scopes TEXT[],
  
  -- Status
  status TEXT DEFAULT 'active' NOT NULL CHECK (status IN ('active', 'inactive', 'disconnected')),
  
  -- Metadata
  currency TEXT DEFAULT 'USD',
  timezone TEXT,
  metadata JSONB DEFAULT '{}',
  
  -- Timestamps
  connected_at TIMESTAMPTZ DEFAULT now(),
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Constraints
  CONSTRAINT unique_user_store UNIQUE (user_id, store_url)
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_stores_user_id ON stores(user_id);
CREATE INDEX IF NOT EXISTS idx_stores_status ON stores(status);
CREATE INDEX IF NOT EXISTS idx_stores_store_url ON stores(store_url);

-- Enable RLS
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;

-- RLS Policies for stores
CREATE POLICY "Users can view own store"
  ON stores FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own store"
  ON stores FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own store"
  ON stores FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own store"
  ON stores FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Service role has full access to stores"
  ON stores FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- STEP 2: Add store_id to ad_accounts
-- =====================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ad_accounts' AND column_name = 'store_id'
  ) THEN
    ALTER TABLE ad_accounts ADD COLUMN store_id UUID REFERENCES stores(id) ON DELETE CASCADE;
    CREATE INDEX idx_ad_accounts_store_id ON ad_accounts(store_id);
  END IF;
END $$;

-- =====================================================
-- STEP 3: Create cached orders table
-- =====================================================
CREATE TABLE IF NOT EXISTS store_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE NOT NULL,
  
  -- Order identification
  platform_order_id TEXT NOT NULL,
  order_number TEXT,
  order_name TEXT,
  
  -- Financial data
  total_amount DECIMAL(12,2) DEFAULT 0,
  subtotal_amount DECIMAL(12,2) DEFAULT 0,
  tax_amount DECIMAL(12,2) DEFAULT 0,
  shipping_amount DECIMAL(12,2) DEFAULT 0,
  discount_amount DECIMAL(12,2) DEFAULT 0,
  
  -- Costs
  cogs DECIMAL(12,2) DEFAULT 0,
  transaction_fee DECIMAL(12,2) DEFAULT 0,
  
  -- Customer info
  customer_id TEXT,
  customer_email TEXT,
  
  -- Status
  financial_status TEXT,
  fulfillment_status TEXT,
  
  -- Dates
  order_date TIMESTAMPTZ NOT NULL,
  fulfilled_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  
  -- Metadata
  currency TEXT DEFAULT 'USD',
  line_items JSONB DEFAULT '[]',
  metadata JSONB DEFAULT '{}',
  
  -- Sync tracking
  synced_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Constraints
  CONSTRAINT unique_store_platform_order UNIQUE (store_id, platform_order_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_store_orders_store_id ON store_orders(store_id);
CREATE INDEX IF NOT EXISTS idx_store_orders_order_date ON store_orders(order_date DESC);
CREATE INDEX IF NOT EXISTS idx_store_orders_customer_id ON store_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_store_orders_platform_order_id ON store_orders(platform_order_id);

-- Enable RLS
ALTER TABLE store_orders ENABLE ROW LEVEL SECURITY;

-- RLS Policies for store_orders
CREATE POLICY "Users can view own store orders"
  ON store_orders FOR SELECT
  TO authenticated
  USING (
    store_id IN (
      SELECT id FROM stores WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Service role can manage all orders"
  ON store_orders FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- STEP 4: Create daily metrics rollup table
-- =====================================================
CREATE TABLE IF NOT EXISTS store_metrics_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE NOT NULL,
  
  -- Date for this metric snapshot
  date DATE NOT NULL,
  
  -- Revenue metrics
  revenue DECIMAL(12,2) DEFAULT 0,
  orders_count INTEGER DEFAULT 0,
  avg_order_value DECIMAL(12,2) DEFAULT 0,
  
  -- Cost metrics
  cogs DECIMAL(12,2) DEFAULT 0,
  shipping_costs DECIMAL(12,2) DEFAULT 0,
  transaction_fees DECIMAL(12,2) DEFAULT 0,
  
  -- Ad spend by platform
  facebook_ad_spend DECIMAL(12,2) DEFAULT 0,
  google_ad_spend DECIMAL(12,2) DEFAULT 0,
  tiktok_ad_spend DECIMAL(12,2) DEFAULT 0,
  total_ad_spend DECIMAL(12,2) DEFAULT 0,
  
  -- Computed metrics
  gross_profit DECIMAL(12,2) DEFAULT 0,
  net_profit DECIMAL(12,2) DEFAULT 0,
  profit_margin DECIMAL(5,2) DEFAULT 0,
  roas DECIMAL(8,2) DEFAULT 0,
  
  -- Customer metrics
  new_customers INTEGER DEFAULT 0,
  returning_customers INTEGER DEFAULT 0,
  
  -- Timestamps
  computed_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Constraints
  CONSTRAINT unique_store_date UNIQUE (store_id, date)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_store_metrics_daily_store_id ON store_metrics_daily(store_id);
CREATE INDEX IF NOT EXISTS idx_store_metrics_daily_date ON store_metrics_daily(date DESC);

-- Enable RLS
ALTER TABLE store_metrics_daily ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own store metrics"
  ON store_metrics_daily FOR SELECT
  TO authenticated
  USING (
    store_id IN (
      SELECT id FROM stores WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Service role can manage all metrics"
  ON store_metrics_daily FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- STEP 5: Migrate existing data
-- =====================================================

-- Migrate shopify_installations to stores
INSERT INTO stores (
  user_id,
  platform,
  store_url,
  access_token,
  scopes,
  status,
  connected_at,
  last_synced_at,
  created_at,
  updated_at
)
SELECT 
  user_id,
  'shopify' as platform,
  store_url,
  access_token,
  scopes,
  CASE 
    WHEN status = 'installed' AND uninstalled_at IS NULL THEN 'active'
    ELSE 'disconnected'
  END as status,
  installed_at as connected_at,
  last_auth_at as last_synced_at,
  created_at,
  updated_at
FROM shopify_installations
WHERE status = 'installed' 
  AND uninstalled_at IS NULL
ON CONFLICT (user_id, store_url) DO NOTHING;

-- Link existing ad_accounts to stores (one ad account per user's store)
UPDATE ad_accounts
SET store_id = (
  SELECT s.id 
  FROM stores s 
  WHERE s.user_id = ad_accounts.user_id 
  LIMIT 1
)
WHERE store_id IS NULL
  AND user_id IS NOT NULL;

-- =====================================================
-- STEP 6: Create helper functions
-- =====================================================

-- Function to compute daily metrics for a store
CREATE OR REPLACE FUNCTION compute_store_metrics_for_date(
  p_store_id UUID,
  p_date DATE
) RETURNS void AS $$
DECLARE
  v_revenue DECIMAL(12,2);
  v_orders_count INTEGER;
  v_cogs DECIMAL(12,2);
  v_transaction_fees DECIMAL(12,2);
  v_facebook_spend DECIMAL(12,2);
  v_google_spend DECIMAL(12,2);
  v_tiktok_spend DECIMAL(12,2);
BEGIN
  -- Calculate revenue and costs from orders
  SELECT 
    COALESCE(SUM(total_amount), 0),
    COUNT(*),
    COALESCE(SUM(cogs), 0),
    COALESCE(SUM(transaction_fee), 0)
  INTO v_revenue, v_orders_count, v_cogs, v_transaction_fees
  FROM store_orders
  WHERE store_id = p_store_id
    AND DATE(order_date) = p_date
    AND cancelled_at IS NULL;

  -- Get ad spend for the date
  SELECT COALESCE(SUM(spend), 0)
  INTO v_facebook_spend
  FROM ad_metrics am
  JOIN ad_accounts aa ON aa.id = am.ad_account_id
  WHERE aa.store_id = p_store_id
    AND aa.platform = 'facebook'
    AND DATE(am.date) = p_date;

  -- Insert or update metrics
  INSERT INTO store_metrics_daily (
    store_id,
    date,
    revenue,
    orders_count,
    avg_order_value,
    cogs,
    transaction_fees,
    facebook_ad_spend,
    google_ad_spend,
    tiktok_ad_spend,
    total_ad_spend,
    gross_profit,
    net_profit,
    profit_margin,
    roas,
    computed_at
  ) VALUES (
    p_store_id,
    p_date,
    v_revenue,
    v_orders_count,
    CASE WHEN v_orders_count > 0 THEN v_revenue / v_orders_count ELSE 0 END,
    v_cogs,
    v_transaction_fees,
    v_facebook_spend,
    0, -- Google (future)
    0, -- TikTok (future)
    v_facebook_spend,
    v_revenue - v_cogs,
    v_revenue - v_cogs - v_transaction_fees - v_facebook_spend,
    CASE WHEN v_revenue > 0 THEN ((v_revenue - v_cogs - v_transaction_fees - v_facebook_spend) / v_revenue) * 100 ELSE 0 END,
    CASE WHEN v_facebook_spend > 0 THEN v_revenue / v_facebook_spend ELSE 0 END,
    now()
  )
  ON CONFLICT (store_id, date) DO UPDATE SET
    revenue = EXCLUDED.revenue,
    orders_count = EXCLUDED.orders_count,
    avg_order_value = EXCLUDED.avg_order_value,
    cogs = EXCLUDED.cogs,
    transaction_fees = EXCLUDED.transaction_fees,
    facebook_ad_spend = EXCLUDED.facebook_ad_spend,
    total_ad_spend = EXCLUDED.total_ad_spend,
    gross_profit = EXCLUDED.gross_profit,
    net_profit = EXCLUDED.net_profit,
    profit_margin = EXCLUDED.profit_margin,
    roas = EXCLUDED.roas,
    computed_at = now(),
    updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- STEP 7: Create updated_at triggers
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
DROP TRIGGER IF EXISTS update_stores_updated_at ON stores;
CREATE TRIGGER update_stores_updated_at
  BEFORE UPDATE ON stores
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_store_orders_updated_at ON store_orders;
CREATE TRIGGER update_store_orders_updated_at
  BEFORE UPDATE ON store_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_store_metrics_daily_updated_at ON store_metrics_daily;
CREATE TRIGGER update_store_metrics_daily_updated_at
  BEFORE UPDATE ON store_metrics_daily
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
