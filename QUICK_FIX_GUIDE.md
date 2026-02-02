# Quick Fix Guide: Thread Sidebar Product Names

## The Problem
Thread sidebars showing "Sample Product" instead of actual Shopify product names.

## The Fix (Already Applied)
Updated two files to use the correct Shopify field:
- `supabase/functions/shopify-order-webhook/index.ts` (line 67)
- `supabase/functions/sync-shopify-orders/index.ts` (line 366)

Changed: `item.name || item.title` → `item.title || item.name`

## Next Steps

### 1. Deploy the Functions
```bash
# If you have Supabase CLI installed:
supabase functions deploy shopify-order-webhook
supabase functions deploy sync-shopify-orders

# Or push to production if you have auto-deployment
```

### 2. Fix Existing Bad Data (Optional)

**Quick Clean:**
```sql
-- Delete bad entries
DELETE FROM order_line_items
WHERE product_name IN ('Sample Product', 'Unknown Product', 'Test Product');
```

Then trigger a Shopify order re-sync from your Settings page.

**Manual Fix for Order #1018:**
```sql
-- Update specific order
UPDATE order_line_items
SET product_name = 'Selling Plans Ski Wax'
WHERE shopify_order_id IN (
  SELECT shopify_order_id FROM shopify_orders WHERE order_number = '#1018'
) AND product_name = 'Sample Product';
```

### 3. Test
1. Create a new test order in Shopify
2. Create a thread for it
3. Check the sidebar - product name should be correct

## That's It!
New orders will automatically have the correct product names once the functions are deployed.
