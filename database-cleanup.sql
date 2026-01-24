-- =====================================================
-- DATABASE CLEANUP - Remove All Mock/Test Data
-- Run this ONLY if you have test data in your database
-- =====================================================

-- This script removes any mock data that might be causing
-- graphs to show curved lines or metrics to show non-zero values

-- 1. DELETE ALL SHOPIFY ORDERS (most common source of mock data)
-- -------------------------------------------------------------
DELETE FROM order_line_items;
DELETE FROM shopify_orders;
DELETE FROM shopify_fulfillments;
DELETE FROM shopify_returns;

-- 2. DELETE ALL AD METRICS
-- -------------------------------------------------------------
DELETE FROM ad_metrics;
DELETE FROM ad_breakdown_insights;

-- 3. RESET ALL BALANCE ACCOUNTS TO $0
-- -------------------------------------------------------------
UPDATE balance_accounts
SET
  current_balance = 0.00,
  pending_balance = 0.00,
  available_balance = 0.00,
  updated_at = now()
WHERE current_balance > 0 OR pending_balance > 0 OR available_balance > 0;

-- 4. DELETE TRANSACTIONS & INVOICES
-- -------------------------------------------------------------
DELETE FROM balance_transactions;
DELETE FROM invoices;
DELETE FROM pending_payment_confirmations;

-- 5. DELETE ALL WAREHOUSE INVENTORY (showing 18 items worth $537,848)
-- -------------------------------------------------------------
-- This removes mock inventory data showing in "Inventory Status" card
DELETE FROM warehouse_inventory;

-- 6. DELETE PIXEL & CONVERSION TRACKING
-- -------------------------------------------------------------
DELETE FROM pixel_events;
DELETE FROM conversion_tracking;
DELETE FROM order_attribution;

-- 7. CLEAR ANALYTICS CACHE
-- -------------------------------------------------------------
DELETE FROM user_analytics_cache;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Run these to verify everything is now zero/empty:

SELECT
  'Shopify Orders' as table_name,
  COUNT(*) as count,
  COALESCE(SUM(total_price), 0) as total_value
FROM shopify_orders
UNION ALL
SELECT 'Ad Metrics', COUNT(*), COALESCE(SUM(spend), 0)
FROM ad_metrics
UNION ALL
SELECT 'Balance Accounts', COUNT(*), COALESCE(SUM(current_balance), 0)
FROM balance_accounts
UNION ALL
SELECT 'Invoices', COUNT(*), COALESCE(SUM(total_amount), 0)
FROM invoices;

-- Expected result:
-- - Shopify Orders: count = 0, total_value = 0
-- - Ad Metrics: count = 0, total_value = 0
-- - Balance Accounts: count = (number of users), total_value = 0
-- - Invoices: count = 0, total_value = 0

-- =====================================================
-- AFTER CLEANUP
-- =====================================================
-- ✓ Analytics dashboard shows all $0 / 0 values
-- ✓ All trend indicators show 0.0% in gray
-- ✓ All graphs show "No trend data for this period"
-- ✓ No more fake curved lines
-- ✓ Platform ready for real production data
