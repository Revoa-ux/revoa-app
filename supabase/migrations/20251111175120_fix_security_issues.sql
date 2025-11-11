/*
  # Fix Security Issues

  1. Missing Indexes
    - Add indexes for all unindexed foreign keys to improve query performance
    - Remove unused indexes that provide no benefit

  2. RLS Policy Optimization
    - Optimize auth function calls in RLS policies by wrapping in SELECT
    - This prevents re-evaluation for each row and improves performance at scale

  3. Function Security
    - Fix search_path for functions to prevent security vulnerabilities

  4. Security Improvements
    - Address all Supabase security recommendations
*/

-- ============================================================================
-- PART 1: ADD MISSING FOREIGN KEY INDEXES
-- ============================================================================

-- ad_sets.campaign_id (renamed from ad_campaign_id)
CREATE INDEX IF NOT EXISTS idx_ad_sets_ad_campaign_id ON ad_sets(ad_campaign_id);

-- admin_users.user_id
CREATE INDEX IF NOT EXISTS idx_admin_users_user_id ON admin_users(user_id);

-- import_jobs.created_by
CREATE INDEX IF NOT EXISTS idx_import_jobs_created_by ON import_jobs(created_by);

-- import_jobs.triggered_by  
CREATE INDEX IF NOT EXISTS idx_import_jobs_triggered_by ON import_jobs(triggered_by);

-- marketplace_transactions.supplier_id
CREATE INDEX IF NOT EXISTS idx_marketplace_transactions_supplier_id ON marketplace_transactions(supplier_id);

-- messages.deleted_by
CREATE INDEX IF NOT EXISTS idx_messages_deleted_by ON messages(deleted_by);

-- messages.status_updated_by
CREATE INDEX IF NOT EXISTS idx_messages_status_updated_by ON messages(status_updated_by);

-- oauth_sessions.user_id
CREATE INDEX IF NOT EXISTS idx_oauth_sessions_user_id ON oauth_sessions(user_id);

-- product_approval_history.reviewed_by
CREATE INDEX IF NOT EXISTS idx_product_approval_history_reviewed_by ON product_approval_history(reviewed_by);

-- product_import_logs.imported_by
CREATE INDEX IF NOT EXISTS idx_product_import_logs_imported_by ON product_import_logs(imported_by);

-- products.approved_by
CREATE INDEX IF NOT EXISTS idx_products_approved_by ON products(approved_by);

-- products.supplier_id
CREATE INDEX IF NOT EXISTS idx_products_supplier_id ON products(supplier_id);

-- user_invoice_history.invoice_id
CREATE INDEX IF NOT EXISTS idx_user_invoice_history_invoice_id ON user_invoice_history(invoice_id);

-- ============================================================================
-- PART 2: REMOVE UNUSED INDEXES
-- ============================================================================

DROP INDEX IF EXISTS idx_ad_accounts_shopify_store_id;
DROP INDEX IF EXISTS idx_ad_accounts_store_id;
DROP INDEX IF EXISTS idx_shopify_returns_order_id;
DROP INDEX IF EXISTS idx_shopify_returns_returned_at;
DROP INDEX IF EXISTS idx_shopify_returns_return_id;
DROP INDEX IF EXISTS idx_stores_store_url;
DROP INDEX IF EXISTS idx_store_orders_store_id;
DROP INDEX IF EXISTS idx_store_orders_order_date;
DROP INDEX IF EXISTS idx_store_orders_customer_id;
DROP INDEX IF EXISTS idx_store_orders_platform_order_id;
DROP INDEX IF EXISTS idx_store_metrics_daily_store_id;
DROP INDEX IF EXISTS idx_store_metrics_daily_date;
DROP INDEX IF EXISTS idx_webhook_logs_webhook_id;
DROP INDEX IF EXISTS idx_webhook_logs_processed_at;
DROP INDEX IF EXISTS idx_webhook_logs_shop_domain;

-- ============================================================================
-- PART 3: OPTIMIZE RLS POLICIES - shopify_returns
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own returns" ON shopify_returns;
DROP POLICY IF EXISTS "Users can insert own returns" ON shopify_returns;
DROP POLICY IF EXISTS "Users can update own returns" ON shopify_returns;
DROP POLICY IF EXISTS "Users can delete own returns" ON shopify_returns;

CREATE POLICY "Users can view own returns"
  ON shopify_returns FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can insert own returns"
  ON shopify_returns FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can update own returns"
  ON shopify_returns FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can delete own returns"
  ON shopify_returns FOR DELETE
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- ============================================================================
-- PART 4: OPTIMIZE RLS POLICIES - stores
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own store" ON stores;
DROP POLICY IF EXISTS "Users can insert own store" ON stores;
DROP POLICY IF EXISTS "Users can update own store" ON stores;
DROP POLICY IF EXISTS "Users can delete own store" ON stores;

CREATE POLICY "Users can view own store"
  ON stores FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can insert own store"
  ON stores FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can update own store"
  ON stores FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can delete own store"
  ON stores FOR DELETE
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- ============================================================================
-- PART 5: OPTIMIZE RLS POLICIES - store_orders
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own store orders" ON store_orders;

CREATE POLICY "Users can view own store orders"
  ON store_orders FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM stores
      WHERE stores.id = store_orders.store_id
      AND stores.user_id = (SELECT auth.uid())
    )
  );

-- ============================================================================
-- PART 6: OPTIMIZE RLS POLICIES - store_metrics_daily
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own store metrics" ON store_metrics_daily;

CREATE POLICY "Users can view own store metrics"
  ON store_metrics_daily FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM stores
      WHERE stores.id = store_metrics_daily.store_id
      AND stores.user_id = (SELECT auth.uid())
    )
  );

-- ============================================================================
-- PART 7: FIX FUNCTION SEARCH PATHS
-- ============================================================================

-- Fix cleanup_old_webhook_logs function
CREATE OR REPLACE FUNCTION cleanup_old_webhook_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM webhook_logs
  WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$;

-- Fix update_shopify_returns_updated_at function
CREATE OR REPLACE FUNCTION update_shopify_returns_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Fix compute_store_metrics_for_date function
CREATE OR REPLACE FUNCTION compute_store_metrics_for_date(
  p_store_id uuid,
  p_date date
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_orders integer;
  v_total_revenue numeric;
  v_total_cost numeric;
BEGIN
  -- Get aggregated data for the date
  SELECT
    COUNT(*),
    COALESCE(SUM(total_price), 0),
    COALESCE(SUM(total_cost), 0)
  INTO v_total_orders, v_total_revenue, v_total_cost
  FROM store_orders
  WHERE store_id = p_store_id
  AND DATE(order_date) = p_date;

  -- Upsert into metrics table
  INSERT INTO store_metrics_daily (
    store_id,
    date,
    total_orders,
    total_revenue,
    total_cost,
    created_at,
    updated_at
  )
  VALUES (
    p_store_id,
    p_date,
    v_total_orders,
    v_total_revenue,
    v_total_cost,
    NOW(),
    NOW()
  )
  ON CONFLICT (store_id, date)
  DO UPDATE SET
    total_orders = EXCLUDED.total_orders,
    total_revenue = EXCLUDED.total_revenue,
    total_cost = EXCLUDED.total_cost,
    updated_at = NOW();
END;
$$;

-- Fix update_updated_at_column function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;
