# Thread Sidebar Product Names Fix

## Problem Identified
The thread sidebars were displaying incorrect product names (like "Sample Product") instead of the actual Shopify product names (like "Selling Plans Ski Wax"). The order data was being imported, but the product names were wrong.

## Root Cause
The Shopify webhook and sync functions were checking `item.name` BEFORE `item.title` when importing product data. In Shopify's API:
- `item.title` = The correct product title (what you see in Shopify admin)
- `item.name` = Can contain concatenated or test data

The code was prioritizing the wrong field.

## What Was Fixed

### 1. Shopify Order Webhook (`supabase/functions/shopify-order-webhook/index.ts`)
**Line 67 - Changed from:**
```javascript
product_name: item.name || item.title || 'Unknown Product',
```

**Changed to:**
```javascript
product_name: item.title || item.name || 'Unknown Product',
```

### 2. Shopify Order Sync (`supabase/functions/sync-shopify-orders/index.ts`)
**Line 366 - Changed from:**
```javascript
product_name: item.name || item.title || 'Unknown Product',
```

**Changed to:**
```javascript
product_name: item.title || item.name || 'Unknown Product',
```

## How to Deploy the Fix

The functions have been updated in your codebase. To deploy them:

### Option 1: Automatic Deployment (if you have CI/CD set up)
Simply push your changes to your main branch and they'll be deployed automatically.

### Option 2: Manual Deployment via Supabase CLI
```bash
supabase functions deploy shopify-order-webhook
supabase functions deploy sync-shopify-orders
```

## Fixing Existing Data

### Option A: Delete and Re-sync
Run the SQL script provided in `fix-line-items-product-names.sql` to delete incorrect entries:

```sql
DELETE FROM order_line_items
WHERE product_name IN ('Sample Product', 'Unknown Product', 'Test Product');
```

Then trigger a full re-sync from Shopify:
- Go to your Settings page
- Click "Sync Orders" on your Shopify integration

### Option B: Manual Update
If you know the correct product name, you can update specific orders:

```sql
UPDATE order_line_items
SET product_name = 'Selling Plans Ski Wax'
WHERE shopify_order_id IN (
  SELECT shopify_order_id FROM shopify_orders WHERE order_number = '#1018'
) AND product_name = 'Sample Product';
```

## Testing the Fix

1. **Create a new test order in Shopify** with a real product
2. **Wait for the webhook** to process (usually instant)
3. **Create a thread** for that order in your Chat page
4. **Check the sidebar** - the product name should now display correctly

### For Order #1018 Specifically
Since it already exists with bad data:
1. Delete the bad line items using the SQL script
2. Re-trigger the webhook by editing the order in Shopify
3. Or manually update it with the correct product name

## What Should Now Work

1. **New orders** coming in via webhook will have correct product names
2. **Re-synced orders** will have correct product names
3. **Thread sidebars** will display the actual product names from Shopify
4. **Items Purchased section** will show proper product details

## Verification Checklist

- [ ] Deploy the updated edge functions
- [ ] Clean up existing bad data (optional but recommended)
- [ ] Test with a new order
- [ ] Verify thread sidebar shows correct product name
- [ ] Check that order amount still matches
- [ ] Confirm all order details are intact

## Additional Notes

- This fix does NOT affect order totals, pricing, or any financial data
- Only the display name of products in the sidebar is affected
- All other order data (customer info, addresses, amounts) remains unchanged
- The fix is backward compatible - old field structure will still work as fallback
