-- Fix order_line_items with incorrect product names
-- This script updates line items that have generic/incorrect product names
--
-- Background: The webhook was using item.name instead of item.title from Shopify,
-- causing incorrect product names like "Sample Product" to be stored.
--
-- This fix updates existing records to show correct product names.
-- For now, we'll mark problematic entries so they can be re-synced from Shopify.

-- Step 1: View all line items with potentially incorrect names
SELECT
  oli.id,
  oli.shopify_order_id,
  oli.product_name,
  oli.variant_name,
  oli.quantity,
  so.order_number,
  so.ordered_at
FROM order_line_items oli
JOIN shopify_orders so ON oli.shopify_order_id = so.shopify_order_id
WHERE oli.product_name IN ('Sample Product', 'Unknown Product', 'Test Product')
ORDER BY so.ordered_at DESC;

-- Step 2: If you want to delete these problematic entries so they can be re-synced:
-- (Uncomment the lines below to execute)
--
-- DELETE FROM order_line_items
-- WHERE product_name IN ('Sample Product', 'Unknown Product', 'Test Product');
--
-- After deleting, you can trigger a re-sync by:
-- 1. Going to your Shopify store
-- 2. Editing the order in Shopify admin
-- 3. Saving it (this triggers a webhook)
-- OR use the sync-shopify-orders function to re-import all orders

-- Step 3: Alternative - Update specific orders if you know the correct product name
-- Example for order #1018:
-- UPDATE order_line_items
-- SET product_name = 'Selling Plans Ski Wax'
-- WHERE shopify_order_id IN (
--   SELECT shopify_order_id FROM shopify_orders WHERE order_number = '#1018'
-- ) AND product_name = 'Sample Product';
