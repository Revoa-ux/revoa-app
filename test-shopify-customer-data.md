# Shopify Customer Data Diagnostic

## Current Issue
Orders showing "Guest Customer" because `customer_first_name` and `customer_last_name` are NULL in database.

## Steps to Fix

### 1. Click the Sync Button
Go to Settings → Shopify Integration → Click "Sync"

### 2. If Still Showing Guest Customer
The orders in Shopify genuinely don't have customer names. Check in Shopify admin:
- Go to your Shopify admin
- Click on Orders
- Open order #1016, #1015, etc.
- Check if there's a customer name or if it says "Guest"

### 3. What the Sync Function Pulls (in order of priority):
1. `order.customer.first_name` / `order.customer.last_name`
2. `order.shipping_address.first_name` / `order.shipping_address.last_name`
3. `order.billing_address.first_name` / `order.billing_address.last_name`

If all three are empty in Shopify, it will correctly show "Guest Customer".

## Testing
After clicking Sync, run this query to verify:
```sql
SELECT order_number, customer_first_name, customer_last_name, customer_email
FROM shopify_orders
WHERE order_number IN ('#1016', '#1015', '#1014')
ORDER BY order_number DESC;
```
