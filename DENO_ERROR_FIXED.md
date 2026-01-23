# CRITICAL FIX: "Deno is not defined" Error

**Date:** 2026-01-23
**Priority:** CRITICAL
**Status:** ✅ FIXED

## Root Cause

The error **"Deno is not defined"** was caused by using Edge Function APIs in browser/frontend code.

### The Problem

**File:** `src/lib/subscriptionService.ts` (Line 208)

```typescript
export function getShopifyPricingUrl(shopDomain: string): string {
  const appHandle = Deno.env.get('VITE_SHOPIFY_API_KEY') || 'revoa'; // ❌ ERROR
  return `https://admin.shopify.com/store/${shopDomain}/charges/${appHandle}/pricing_plans`;
}
```

### Why It Failed

1. `Deno.env.get()` is an **Edge Function API** (Deno/server-side runtime)
2. This function is called from `SubscriptionGuard` component
3. `SubscriptionGuard` runs in the **browser** (client-side)
4. Browser JavaScript doesn't have `Deno` global → `ReferenceError: Deno is not defined`
5. This caused app initialization to fail → blank white screen

### Call Stack

```
User loads app (tyler.jtw@gmail.com)
  → App initializes
    → SubscriptionGuard mounts
      → Calls getShopifyPricingUrl()
        → Tries to access Deno.env.get()
          → ERROR: Deno is not defined ❌
```

## The Fix

**File:** `src/lib/subscriptionService.ts` (Line 208)

Changed from Deno API to Vite environment variable API:

```diff
- const appHandle = Deno.env.get('VITE_SHOPIFY_API_KEY') || 'revoa';
+ const appHandle = import.meta.env.VITE_SHOPIFY_API_KEY || 'revoa';
```

### API Comparison

| Context | Environment API | Example |
|---------|----------------|---------|
| **Edge Functions** (Deno) | `Deno.env.get()` | `Deno.env.get('API_KEY')` |
| **Frontend** (Vite) | `import.meta.env` | `import.meta.env.VITE_API_KEY` |
| **Node.js** | `process.env` | `process.env.API_KEY` |

## Verification

### Build Success ✅
```bash
npm run build
# ✓ built in 28.21s
# SUCCESS
```

### No More Deno References in Frontend ✅
```bash
grep -r "Deno\.env" src/
# No matches found
```

## Why This Happened

The code was likely copied from an Edge Function or backend service without adapting it for the frontend context. Edge Functions use Deno runtime, but the browser uses standard JavaScript/Vite build tooling.

## Prevention

### Rules for Frontend Code:
1. ✅ Use `import.meta.env.VITE_*` for environment variables
2. ❌ Never use `Deno.env.get()` in frontend
3. ❌ Never use `process.env` in frontend (won't work in browser)
4. ✅ Prefix public env vars with `VITE_` so Vite exposes them

### Rules for Edge Functions:
1. ✅ Use `Deno.env.get()` for environment variables
2. ❌ Never use `import.meta.env` in Edge Functions
3. ❌ Never use `process.env` in Edge Functions (Deno, not Node)

## Related Issues

### Issue 1: Subscription Guard Not Bypassing for Dev User
If tyler.jtw@gmail.com should bypass subscription checks during development:

**Option A:** Add development bypass
```typescript
// In SubscriptionGuard.tsx
const isDevelopment = import.meta.env.DEV;
const isDevUser = user?.email === 'tyler.jtw@gmail.com';

if (isDevelopment && isDevUser) {
  return <>{children}</>;
}
```

**Option B:** Add super admin bypass in database
```sql
UPDATE user_profiles
SET is_super_admin = true
WHERE email = 'tyler.jtw@gmail.com';
```

Then in SubscriptionGuard:
```typescript
const { isAdmin, isSuperAdmin } = useAdmin();
if (isSuperAdmin) {
  return <>{children}</>;
}
```

## Files Changed

- ✅ `src/lib/subscriptionService.ts` - Fixed Deno.env → import.meta.env

## Testing Checklist

- [x] Build succeeds without errors
- [x] No Deno API calls in frontend code
- [x] Environment variables accessible via Vite
- [ ] Subscription guard displays for users without subscription
- [ ] Subscription guard bypassed for active subscriptions
- [ ] Pricing URL generates correctly

---

## Summary

Fixed "Deno is not defined" error by replacing `Deno.env.get()` with `import.meta.env` in frontend code. Edge Function APIs cannot be used in browser context.

The app should now:
1. Load without runtime errors
2. Properly check subscription status
3. Display subscription guard when needed
4. Generate correct Shopify pricing URLs
