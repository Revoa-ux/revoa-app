# For Shopify App Store Reviewers

## Dashboard Empty State Behavior

### Expected Behavior
When testing this app with a **development store** or **new store with no orders/products**, you will see metrics showing **$0.00** values. This is the **correct and expected behavior**.

### Why This Happens
Our app properly fetches real data from your Shopify store via the Shopify Admin API. When a store has:
- No orders placed yet
- No products added
- No customers

The dashboard will correctly display zeros for all metrics. This demonstrates that:
1. ✅ The app is successfully connected to Shopify
2. ✅ API calls are working correctly
3. ✅ The app is reading real data (which happens to be empty)
4. ✅ No fake or mock data is being shown

### How to Verify Our Implementation Works

#### Option 1: Add Test Data to Your Dev Store
1. Add 1-2 products to the store
2. Create a test order
3. Refresh the Revoa dashboard
4. You will see real metrics appear

#### Option 2: Check Our Code Implementation
Our Shopify API integration is located in:
- `/src/lib/shopify/api.ts` - Main API functions
- `/src/lib/shopify/graphql.ts` - GraphQL queries
- `/supabase/functions/shopify-proxy/index.ts` - Secure API proxy

The code shows:
- Proper OAuth flow with correct scopes
- GraphQL Admin API integration
- Proper error handling for empty stores
- Clear user messaging when store has no data

### Key Implementation Details

#### 1. Shopify Connection Check
```typescript
// We check for 'installed' status (the correct enum value)
.eq('status', 'installed')
.is('uninstalled_at', null)
```

#### 2. Real Data Fetching
```typescript
// We fetch actual orders, products, and customers
const orders = await GraphQL.getOrders(250);
const products = await GraphQL.getProducts(250);
const totalRevenue = orders.reduce((sum, order) =>
  sum + parseFloat(order.totalPriceSet.shopMoney.amount), 0
);
```

#### 3. Empty Store Handling
```typescript
// Returns zeros for empty stores (not mock data)
const getDefaultMetrics = (): ShopifyMetrics => {
  return {
    totalOrders: 0,
    totalRevenue: 0,
    // ... all zeros
  }
};
```

#### 4. User-Friendly Messaging
When the dashboard shows zero values, we display:
> "Store Connected Successfully. Your Shopify store is connected and ready. Metrics will populate automatically as you receive orders and add products. This is expected for new or development stores."

### Production Store Behavior
When a merchant with a real production store (with actual orders and products) installs this app:
- All metrics will display real values immediately
- Charts will show historical trends
- All calculations (COGS, profit, AOV, etc.) will be accurate
- Data refreshes in real-time

### Testing on a Real Store
If you would like to see the app working with real data, we recommend:
1. Installing on a store with existing orders/products, OR
2. Creating 2-3 test orders in your dev store, OR
3. Contacting us for a demo with a populated store

### Compliance Notes
- ✅ No fake/mock data is ever shown to users
- ✅ All data comes directly from Shopify Admin API
- ✅ Empty stores show zeros (expected behavior)
- ✅ Clear messaging explains the empty state
- ✅ App gracefully handles stores with no data
- ✅ Proper error handling and user feedback

---

**Contact**: If you need any clarification or would like to see the app with a populated store, please reach out through the app submission portal.
