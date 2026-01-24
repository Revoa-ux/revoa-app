-- Clean up all mock/test data from the database
-- Run this script to remove test data and reset accounts to zero

-- Reset all balance accounts to $0
UPDATE balance_accounts
SET
  current_balance = 0.00,
  pending_balance = 0.00,
  available_balance = 0.00,
  updated_at = now()
WHERE current_balance > 0 OR pending_balance > 0 OR available_balance > 0;

-- Delete all test transactions
DELETE FROM balance_transactions
WHERE description LIKE '%test%'
   OR description LIKE '%mock%'
   OR description LIKE '%demo%';

-- Delete all test invoices
DELETE FROM invoices
WHERE invoice_number LIKE '%TEST%'
   OR invoice_number LIKE '%MOCK%'
   OR invoice_number LIKE '%DEMO%';

-- Reset COGS and analytics data if needed
-- (Only uncomment if you want to clear ALL historical data)
-- DELETE FROM shopify_orders WHERE true;
-- DELETE FROM order_line_items WHERE true;
-- DELETE FROM ad_metrics WHERE true;

-- Verify cleanup
SELECT
  'balance_accounts' as table_name,
  COUNT(*) as total_records,
  SUM(current_balance) as total_balance,
  SUM(pending_balance) as total_pending,
  SUM(available_balance) as total_available
FROM balance_accounts
UNION ALL
SELECT
  'balance_transactions' as table_name,
  COUNT(*) as total_records,
  SUM(amount) as total_amount,
  NULL as total_pending,
  NULL as total_available
FROM balance_transactions
UNION ALL
SELECT
  'invoices' as table_name,
  COUNT(*) as total_records,
  SUM(total_amount) as total_amount,
  NULL as total_pending,
  NULL as total_available
FROM invoices;
