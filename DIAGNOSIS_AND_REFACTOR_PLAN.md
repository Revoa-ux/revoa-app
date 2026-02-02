# System Diagnosis & Refactor Plan

## Current Issues Identified

### 1. **No Data Showing in Dashboard**

#### Shopify Sales Data:
- **System Design**: Currently fetches orders in real-time via GraphQL through `shopify-proxy` edge function
- **Problem**: No persistent storage of order data - relies on live API calls every time
- **Why it's failing**:
  - Could be RLS policies blocking access
  - Could be GraphQL queries timing out
  - Could be the store actually has no sales yet
  - No error handling/logging to identify the issue

#### Facebook Ad Spend:
- **System Design**: Stores campaigns in `ad_campaigns`, `ad_sets`, `ads`, and `ad_metrics` tables
- **Current State**: 0 campaigns, 0 ad sets, 0 ads, 0 metrics
- **Why**: Your NordikHome ad account (`act_1799737293827038`) genuinely has no campaigns created yet
- **Proof**: Sync function returned "Successfully synced 0 campaigns..."

### 2. **Architecture Problems**

#### Current State:
- Multiple Shopify stores per user (revoa4.myshopify.com, revoatest.myshopify.com)
- Multiple Facebook ad accounts per user
- No clear relationship between stores and ad accounts
- Confusing UX - which store's data are we showing?
- No way to know which ad spend goes with which store

#### What It Should Be:
**1 Store = 1 Complete Integration Set**
```
Store (revoa4.myshopify.com)
  ├── Facebook Ads Account
  ├── Google Ads Account (future)
  ├── TikTok Ads Account (future)
  └── All metrics tied to THIS store
```

### 3. **Data Model Issues**

#### Current Tables:
- `shopify_installations` - Has user_id ✓
- `shopify_stores` - NO user_id ✗ (orphaned data)
- `ad_accounts` - Has user_id but no store_id
- `ad_metrics` - Disconnected from stores

#### What's Missing:
- **Store** as the central entity
- Clear foreign keys linking everything to a store
- Historical data persistence (currently re-fetches everything)

---

## Proposed Refactor

### Phase 1: Fix Data Architecture

#### New Table Structure:
```sql
-- Central store entity
CREATE TABLE stores (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users,
  store_url TEXT UNIQUE NOT NULL,
  platform TEXT DEFAULT 'shopify',
  access_token TEXT,
  status TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);

-- Link ad accounts to stores
ALTER TABLE ad_accounts
  ADD COLUMN store_id UUID REFERENCES stores(id);

-- Historical orders table (cached for performance)
CREATE TABLE orders (
  id UUID PRIMARY KEY,
  store_id UUID REFERENCES stores(id),
  platform_order_id TEXT,
  total_revenue DECIMAL,
  cogs DECIMAL,
  order_date TIMESTAMPTZ,
  status TEXT,
  synced_at TIMESTAMPTZ
);

-- Store-level metrics rollup (daily)
CREATE TABLE store_metrics_daily (
  id UUID PRIMARY KEY,
  store_id UUID REFERENCES stores(id),
  date DATE,
  revenue DECIMAL,
  orders_count INTEGER,
  cogs DECIMAL,
  ad_spend DECIMAL,
  profit DECIMAL,
  roas DECIMAL
);
```

### Phase 2: Redesign Integrations UI

#### New Settings Page - "Integrations" Section:
```
┌─────────────────────────────────────────────────┐
│ Your Store                                       │
├─────────────────────────────────────────────────┤
│ 🏪 revoa4.myshopify.com              Connected ✓│
│ Last synced: 2 minutes ago                       │
│ [Sync Now] [Disconnect]                          │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│ Advertising Platforms                            │
├─────────────────────────────────────────────────┤
│ 📘 Facebook Ads                       Connected ✓│
│ Account: NordikHome                              │
│ Last synced: 5 minutes ago                       │
│ [Sync Now] [Disconnect]                          │
├─────────────────────────────────────────────────┤
│ 🔴 Google Ads                     Not Connected  │
│ Connect your Google Ads to track spend           │
│ [Connect]                                        │
├─────────────────────────────────────────────────┤
│ 🎵 TikTok Ads                     Not Connected  │
│ Connect your TikTok Ads to track spend           │
│ [Connect]                                        │
└─────────────────────────────────────────────────┘
```

### Phase 3: Fix Data Flow

#### Current Flow (BROKEN):
```
Dashboard → getDashboardMetrics() → shopify-proxy → GraphQL → ???
```

#### New Flow:
```
1. Background Sync (every 15 min):
   shopify-sync edge function → Fetch orders → Store in DB
   facebook-ads-sync → Fetch metrics → Store in DB

2. Dashboard Load:
   Query pre-synced data from DB → Fast response

3. Manual Sync:
   User clicks "Sync Now" → Trigger sync → Update UI
```

---

## Immediate Action Items

### Step 1: Debug Current State
1. Check if shopify-proxy is actually being called
2. Check RLS policies on all tables
3. Add comprehensive logging
4. Test with actual store that has orders

### Step 2: Create Migration
1. Add `store_id` to `ad_accounts`
2. Create `orders` table for caching
3. Create `store_metrics_daily` for rollups
4. Migrate existing data

### Step 3: Rebuild Integrations Page
1. Clean, card-based design
2. Show connection status for each platform
3. Link each ad account to the store
4. Show last sync time

### Step 4: Create Background Sync Job
1. Edge function that runs on schedule
2. Syncs Shopify orders → DB
3. Syncs Facebook metrics → DB
4. Computes daily rollups

---

## Testing Checklist

- [ ] User with 0 orders sees appropriate empty state
- [ ] User with orders sees correct revenue
- [ ] User with Facebook ads sees correct spend
- [ ] Multiple stores work correctly
- [ ] Ad account links to correct store
- [ ] Sync button triggers immediate refresh
- [ ] RLS policies prevent data leakage
- [ ] Dashboard loads in < 2 seconds
