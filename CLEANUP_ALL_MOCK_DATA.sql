-- ============================================
-- COMPREHENSIVE MOCK DATA CLEANUP
-- Run this in Supabase SQL Editor to remove ALL test/mock data
-- ============================================

-- 1. RESET BALANCE ACCOUNTS TO $0
-- ============================================
UPDATE balance_accounts
SET
  current_balance = 0.00,
  pending_balance = 0.00,
  available_balance = 0.00,
  updated_at = now()
WHERE current_balance > 0 OR pending_balance > 0 OR available_balance > 0;

-- 2. DELETE ALL TRANSACTIONS
-- ============================================
DELETE FROM balance_transactions;

-- 3. DELETE ALL INVOICES
-- ============================================
DELETE FROM invoices;

-- 4. DELETE ALL WAREHOUSE INVENTORY
-- ============================================
DELETE FROM warehouse_inventory;

-- 5. DELETE ALL AD METRICS (This is what's making the graphs show data!)
-- ============================================
DELETE FROM ad_metrics;
DELETE FROM ad_breakdown_insights;

-- 6. DELETE ALL SHOPIFY ORDERS (This is making Total Orders show 19-23!)
-- ============================================
DELETE FROM order_line_items;
DELETE FROM shopify_orders;
DELETE FROM shopify_fulfillments;
DELETE FROM shopify_returns;

-- 7. DELETE PIXEL EVENTS
-- ============================================
DELETE FROM pixel_events;

-- 8. DELETE CONVERSION TRACKING
-- ============================================
DELETE FROM conversion_tracking;

-- 9. RESET USER ANALYTICS CACHE
-- ============================================
DELETE FROM user_analytics_cache WHERE true;

-- 10. DELETE ANY ORDER ATTRIBUTION DATA
-- ============================================
DELETE FROM order_attribution;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check that everything is now zero/empty
SELECT 'Balance Accounts' as table_name,
       COUNT(*) as total_accounts,
       SUM(current_balance) as total_balance
FROM balance_accounts
UNION ALL
SELECT 'Shopify Orders', COUNT(*), SUM(total_price)
FROM shopify_orders
UNION ALL
SELECT 'Ad Metrics', COUNT(*), SUM(spend)
FROM ad_metrics
UNION ALL
SELECT 'Balance Transactions', COUNT(*), SUM(amount)
FROM balance_transactions
UNION ALL
SELECT 'Invoices', COUNT(*), SUM(total_amount)
FROM invoices;

-- ============================================
-- EXPECTED RESULT AFTER CLEANUP:
-- ============================================
-- All balances should be $0
-- All counts should be 0 (except user accounts)
-- Graphs should show "No data available"
-- All percentage changes should show 0.0%
