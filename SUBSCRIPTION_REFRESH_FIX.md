# Subscription Refresh After Billing - Fix Complete

## The Problem

When users selected a plan on Shopify and were redirected back to the app, the subscription WAS being updated in the database (via webhook), but the React SubscriptionContext wasn't refreshing. This caused the UI to remain blurred even though the subscription was active.

## Root Cause

The SubscriptionContext only checked subscription status when:
1. Component mounted
2. `user.id` changed
3. `shopify.installation.id` changed

It did NOT check when:
- User returned from Shopify billing page
- Webhook updated the database
- URL changed

## The Solution

### 1. URL Parameter Detection

**File: `src/pages/ShopifyWelcome.tsx`**

When redirecting from the welcome page to the dashboard after successful subscription verification, we now add a URL parameter:

```typescript
navigate('/?subscription_updated=true', { replace: true });
```

### 2. Automatic Polling on Return

**File: `src/contexts/SubscriptionContext.tsx`**

Added TWO new useEffects:

**A) URL Parameter Detection:**
1. Detects the `subscription_updated=true` URL parameter
2. Immediately checks subscription status
3. Polls every 2 seconds for 10 seconds to catch late webhook updates
4. Removes the URL parameter after detecting it

**B) Referrer Detection:**
1. Checks if user just came from `admin.shopify.com`
2. If yes, automatically polls for subscription updates
3. Polls every 2 seconds for 10 seconds
4. Catches cases where Shopify redirects directly to root URL

```typescript
// Mechanism 1: URL parameter detection (for /shopify/welcome redirects)
useEffect(() => {
  const urlParams = new URLSearchParams(window.location.search);
  const subscriptionUpdated = urlParams.get('subscription_updated');

  if (subscriptionUpdated === 'true' && shopify.installation?.id) {
    window.history.replaceState({}, '', window.location.pathname);
    checkSubscription();

    let pollCount = 0;
    const maxPolls = 5;
    const pollInterval = setInterval(async () => {
      pollCount++;
      await checkSubscription();
      if (pollCount >= maxPolls) {
        clearInterval(pollInterval);
      }
    }, 2000);

    return () => clearInterval(pollInterval);
  }
}, [window.location.search, shopify.installation?.id]);

// Mechanism 2: Referrer detection (for direct redirects from Shopify admin)
useEffect(() => {
  checkSubscription();

  const referrer = document.referrer;
  const cameFromShopifyAdmin = referrer.includes('admin.shopify.com');

  if (cameFromShopifyAdmin && shopify.installation?.id) {
    console.log('[SubscriptionContext] Detected return from Shopify admin, polling...');

    let pollCount = 0;
    const maxPolls = 5;
    const pollInterval = setInterval(async () => {
      pollCount++;
      await checkSubscription();
      if (pollCount >= maxPolls) {
        clearInterval(pollInterval);
      }
    }, 2000);

    return () => clearInterval(pollInterval);
  }
}, [user?.id, shopify.installation?.id]);
```

### 3. Enhanced Logging

Added detailed console logging to help debug subscription status:

```typescript
console.log('[SubscriptionContext] Subscription data:', {
  exists: !!subscription,
  tier: subscription?.currentTier,
  status: subscription?.subscriptionStatus,
  shopifySubId: subscription?.shopifySubscriptionId
});
```

## How It Works

### Flow 1: Redirect via /shopify/welcome

1. User clicks "Upgrade Plan On Shopify" button
2. Opens `https://admin.shopify.com/store/{store}/charges/revoa/pricing_plans`
3. User selects a plan on Shopify
4. Shopify redirects to `/shopify/welcome?charge_id=XXX&shop=YYY`
5. ShopifyWelcome calls `verify-shopify-subscription` edge function
6. Edge function verifies charge with Shopify API
7. Edge function updates database with subscription status
8. ShopifyWelcome redirects to `/?subscription_updated=true`
9. SubscriptionContext detects URL parameter
10. Immediately checks subscription + polls for 10 seconds
11. UI automatically unblurs when subscription detected

### Flow 2: Redirect directly to app (Managed Pricing)

1. User clicks "Upgrade Plan On Shopify" button
2. Opens Shopify pricing page
3. User selects a plan
4. Shopify redirects to root app URL (no /shopify/welcome)
5. SubscriptionContext detects `document.referrer` contains `admin.shopify.com`
6. Automatically starts polling for subscription updates
7. Polls every 2 seconds for 10 seconds
8. Webhook arrives and updates database
9. Next poll detects active subscription
10. UI automatically unblurs

## Why Polling?

Polling for 10 seconds ensures we catch subscription updates even if:
- The webhook arrives slightly delayed
- Database replication takes a few seconds
- Edge function hasn't completed yet

This provides a seamless user experience without requiring a manual refresh.

## Testing

To test the fix:

1. Have an account with no active subscription (UI should be blurred)
2. Click "Upgrade Plan On Shopify" button
3. Select a plan on Shopify's pricing page
4. Complete the billing flow
5. Get redirected back to the app
6. UI should automatically unblur within 2-10 seconds
7. Check browser console for detailed logs

Expected console output:
```
[SubscriptionContext] Subscription updated, refreshing...
[SubscriptionContext] Checking subscription for store: abc-123
[SubscriptionContext] Polling subscription status (1/5)...
[SubscriptionContext] Subscription data: { exists: true, tier: 'startup', status: 'ACTIVE', ... }
[SubscriptionContext] Subscription active: true Status: ACTIVE
```

## Fallback

If the automatic refresh doesn't work:
1. The webhook will still update the database
2. User can manually refresh the page
3. SubscriptionContext will check on mount and detect the active subscription

## Files Modified

1. `src/pages/ShopifyWelcome.tsx` - Added URL parameter on redirect
2. `src/contexts/SubscriptionContext.tsx` - Added dual polling mechanism (URL + referrer) and logging
3. `.env.example` - Added missing Shopify environment variables

## Additional Notes

- Polling is limited to 10 seconds to avoid unnecessary API calls
- URL parameter is immediately removed to keep URL clean
- Logging can be removed in production if desired
- Works with both new subscriptions and reinstalls
- Compatible with all subscription tiers
