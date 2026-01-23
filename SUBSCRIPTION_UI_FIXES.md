# Subscription UI Fixes - Active Trial Not Showing

## Issues Fixed

### 1. Active Trial Showing as "No Active Subscription"

**Root Cause:**
Your database had `subscription_status: "CANCELLED"` while Shopify showed an active trial with 14 days remaining. This was a cache staleness issue.

**Solution:**
The freshness verification system I just implemented will automatically fix this:
- On every app load, `SubscriptionContext` calls `getSubscription(storeId, true)` with freshness check enabled
- If `last_verified_at` is older than 5 minutes, it automatically queries Shopify API
- Updates the database with fresh subscription state
- UI reflects the correct status

**Additional Fix:**
Added a **"Refresh Status"** button to the subscription banner so you can manually refresh from Shopify anytime.

### 2. Shopify App Store Integration Not Clickable

**Problem:**
Settings page showed "Install from Shopify App Store" as plain text instead of a clickable link.

**Solution:**
Converted it to a proper link button that opens:
- Production: `https://apps.shopify.com/revoa` (once your app is live)
- For now: Opens Shopify App Store where users can search for "Revoa"

## What to Test Right Now

### Quick Fix for Your Current Issue

**Option 1: Refresh the app**
1. Close and reopen your app (hard refresh with Cmd+Shift+R or Ctrl+Shift+F5)
2. The freshness check will automatically query Shopify
3. Your trial status should update to "Active"

**Option 2: Click "Refresh Status" button**
1. Look for the red banner at the top
2. Click the "Refresh Status" button (with rotating icon)
3. Watch it query Shopify and update in real-time
4. Banner should disappear if trial is active

### Verify Your Subscription State

Check your database to see current state:

```sql
SELECT
  store_url,
  subscription_status,
  current_tier,
  last_verified_at,
  trial_end_date,
  updated_at
FROM shopify_stores
WHERE store_url LIKE '%revoatest%';
```

**Expected after refresh:**
- `subscription_status`: Should change from `CANCELLED` to `ACTIVE`
- `last_verified_at`: Should be updated to current timestamp
- `current_tier`: Should be `startup`

## UI Changes Made

### 1. Subscription Blocked Banner (src/components/subscription/SubscriptionBlockedBanner.tsx)

**Before:**
```
[Banner] No Active Subscription - Select a plan
[Button] Upgrade Plan On Shopify
```

**After:**
```
[Banner] No Active Subscription - Select a plan
[Button] Refresh Status  |  [Button] Upgrade Plan On Shopify
```

**New button features:**
- Rotating refresh icon (spins while loading)
- Queries Shopify directly when clicked
- Shows success/error toast notification
- Disables while refreshing to prevent double-clicks

### 2. Settings Page Integration Section (src/pages/Settings.tsx)

**Before:**
```
Shopify Store
Install from Shopify App Store  (plain text)
```

**After:**
```
Shopify Store
Install from Shopify App Store →  (clickable blue link)
```

**Link behavior:**
- Opens `https://apps.shopify.com/revoa` in new tab
- Shows external link icon
- Blue underline on hover
- Only shows when not connected (production mode)

## How the Freshness System Works

### Automatic Freshness Checks

```typescript
// In SubscriptionContext.tsx
const subscription = await getSubscription(storeId, true); // ← checkFreshness enabled
```

### Cache Staleness Detection

```typescript
// In subscriptionService.ts
if (checkFreshness && data.last_verified_at) {
  const lastVerified = new Date(data.last_verified_at);
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

  if (lastVerified < fiveMinutesAgo) {
    // Cache is stale, refresh from Shopify
    const result = await supabase.functions.invoke('verify-shopify-subscription', {
      body: { chargeId: data.shopify_subscription_id, shop: shopDomain }
    });
  }
}
```

### Three Sync Mechanisms

1. **Webhooks** (primary): Shopify sends `APP_SUBSCRIPTIONS_UPDATE` webhook
2. **Freshness checks** (fallback): Auto-refreshes if cache is >5 min old
3. **Manual refresh** (user-triggered): "Refresh Status" button

## Why You Saw "CANCELLED" Status

**Most likely scenario:**

1. You cancelled a previous subscription or trial
2. Database was updated to `CANCELLED`
3. You later selected a new trial plan in Shopify
4. Webhook may have been missed or delayed
5. App showed cached `CANCELLED` status until now

**Now fixed:**
- Freshness check detects stale cache
- Queries Shopify to get real status
- Updates database with current state
- UI shows correct trial status

## Testing Checklist

### Test 1: Automatic Freshness Check
- [ ] Hard refresh the app (Cmd+Shift+R)
- [ ] Watch console logs for: `[SubscriptionService] Cache is stale (>5 minutes), refreshing from Shopify...`
- [ ] Verify banner disappears (if trial is active)
- [ ] Check database: `subscription_status` changed to `ACTIVE`

### Test 2: Manual Refresh Button
- [ ] If banner shows, click "Refresh Status" button
- [ ] Watch icon spin during refresh
- [ ] See success toast: "Subscription status refreshed from Shopify"
- [ ] Banner should disappear if trial is active

### Test 3: Shopify App Store Link
- [ ] Go to Settings page
- [ ] Scroll to "Integrations" section
- [ ] If not connected (production), see clickable "Install from Shopify App Store" link
- [ ] Click link, should open `https://apps.shopify.com/revoa` in new tab

### Test 4: Verify Trial Status in Shopify
- [ ] Go to Shopify Admin → Apps → Manage
- [ ] Find Revoa
- [ ] Click pricing/billing
- [ ] Verify trial shows "14 days remaining"
- [ ] Return to Revoa app
- [ ] Refresh and verify UI matches Shopify state

## Console Log Messages to Watch For

### When cache is fresh (< 5 minutes):
```
[SubscriptionContext] Checking subscription for store: [store-id]
[SubscriptionContext] Subscription data: { exists: true, tier: 'startup', status: 'ACTIVE' }
```

### When cache is stale (> 5 minutes):
```
[SubscriptionContext] Checking subscription for store: [store-id]
[SubscriptionService] Cache is stale (>5 minutes), refreshing from Shopify...
[SubscriptionService] Successfully refreshed subscription from Shopify
[SubscriptionContext] Subscription data: { exists: true, tier: 'startup', status: 'ACTIVE' }
```

### When manually clicking refresh:
```
[SubscriptionContext] Checking subscription for store: [store-id]
[SubscriptionService] Cache is stale (>5 minutes), refreshing from Shopify...
[Verify Subscription] Processing subscription update: { name: 'Startup', status: 'active', shop: 'revoatest.myshopify.com' }
[SubscriptionService] Successfully refreshed subscription from Shopify
```

## Database Queries for Debugging

### Check current subscription state:
```sql
SELECT
  store_url,
  subscription_status,
  current_tier,
  last_verified_at,
  TO_CHAR(AGE(NOW(), last_verified_at), 'HH24:MI:SS') AS time_since_verified,
  created_at
FROM shopify_stores
WHERE store_url LIKE '%revoatest%';
```

### Check if cache is stale (>5 minutes):
```sql
SELECT
  store_url,
  subscription_status,
  last_verified_at,
  NOW() - last_verified_at > INTERVAL '5 minutes' AS is_stale
FROM shopify_stores
WHERE store_url LIKE '%revoatest%';
```

### Manually mark cache as stale (for testing):
```sql
UPDATE shopify_stores
SET last_verified_at = NOW() - INTERVAL '10 minutes'
WHERE store_url LIKE '%revoatest%';
```

Then refresh the app and watch it auto-refresh from Shopify.

## Summary

**What you need to do:**
1. Hard refresh your app (Cmd+Shift+R or Ctrl+Shift+F5)
2. Watch for the banner to disappear
3. If it doesn't, click "Refresh Status" button

**What the system does automatically:**
1. Detects cache older than 5 minutes
2. Queries Shopify for current subscription state
3. Updates database with fresh data
4. Reflects correct status in UI

**App Store link:**
- Now clickable in Settings → Integrations
- Opens https://apps.shopify.com/revoa
- Only shows when not connected (production mode)

Your active trial should now display correctly!
