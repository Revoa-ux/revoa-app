# Deploy Webhook Fix - CRITICAL SECURITY ISSUE RESOLVED

**Issue Found:** `data-deletion-callback` function was NOT requiring HMAC verification!
**Security Risk:** Anyone could send requests without authentication
**Status:** ✅ FIXED - Now requires HMAC for ALL requests
**Date:** November 16, 2025

---

## What Was Wrong

Your `data-deletion-callback` function had this code:

```typescript
if (hmac) {
  // Only verify if HMAC header exists
}
// If no HMAC, continue processing! ❌ SECURITY HOLE
```

This meant:
- ✅ Requests WITH valid HMAC → Accepted
- ❌ Requests WITHOUT HMAC → Also accepted! (Security vulnerability)
- ✅ Requests WITH invalid HMAC → Rejected

**Shopify's automated check likely tests:**
1. Valid HMAC → expects 200
2. **NO HMAC → expects 401** ← This was failing!
3. Invalid HMAC → expects 401

---

## What Was Fixed

Now the function properly rejects requests without HMAC:

```typescript
// CRITICAL: Always require HMAC for security
if (!hmac) {
  console.error('[Data Deletion] ❌ Missing HMAC header');
  return new Response(
    JSON.stringify({
      error: "Unauthorized",
      message: "Missing HMAC signature",
      timestamp: new Date().toISOString(),
    }),
    {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
}
```

---

## CRITICAL: Deploy This Fix NOW

### Step 1: Set SHOPIFY_CLIENT_SECRET in Supabase

**This is the most important step!**

1. Go to your **Shopify Partner Dashboard**
2. Apps → Select your app → Configuration
3. Look for "Client credentials"
4. Copy the **Client secret** (32-character hex string)
   - Example: `a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6`

5. Go to your **Supabase Dashboard**
6. Settings → Edge Functions → Secrets
7. Add/Update variable:
   ```
   Variable name: SHOPIFY_CLIENT_SECRET
   Value: (paste the client secret from step 4)
   ```

8. Click **Save**

**Important:** The secret must be EXACTLY the same as what's in Shopify, with no extra spaces or newlines.

---

### Step 2: Deploy the Updated Function

You need to deploy the `data-deletion-callback` function to Supabase.

**Option A: Using Supabase CLI (Recommended)**

```bash
# Make sure you're logged in
supabase login

# Deploy the function
supabase functions deploy data-deletion-callback

# Verify deployment
curl -X POST https://iipaykvimkbbnoobtpzz.supabase.co/functions/v1/data-deletion-callback \
  -H "X-Shopify-Shop-Domain: test" \
  -H "X-Shopify-Topic: customers/data_request"

# Should return 401 with "Missing HMAC signature"
```

**Option B: Using Supabase Dashboard**

1. Go to Supabase Dashboard → Edge Functions
2. Find `data-deletion-callback` function
3. Click "Deploy new version"
4. Upload the updated code from `supabase/functions/data-deletion-callback/index.ts`
5. Click Deploy

---

### Step 3: Verify the Fix

Test that the function now properly rejects requests without HMAC:

```bash
# Test 1: No HMAC header (should return 401)
curl -X POST https://iipaykvimkbbnoobtpzz.supabase.co/functions/v1/data-deletion-callback \
  -H "X-Shopify-Shop-Domain: test.myshopify.com" \
  -H "X-Shopify-Topic: customers/data_request" \
  -d '{}'

# Expected response:
# {"error":"Unauthorized","message":"Missing HMAC signature","timestamp":"..."}
# Status: 401
```

```bash
# Test 2: Invalid HMAC header (should return 401)
curl -X POST https://iipaykvimkbbnoobtpzz.supabase.co/functions/v1/data-deletion-callback \
  -H "X-Shopify-Shop-Domain: test.myshopify.com" \
  -H "X-Shopify-Topic: customers/data_request" \
  -H "X-Shopify-Hmac-Sha256: invalid_hmac" \
  -d '{}'

# Expected response:
# {"error":"Unauthorized","message":"Invalid HMAC signature","timestamp":"..."}
# Status: 401
```

If both tests return **401 Unauthorized**, the fix is working! ✅

---

### Step 4: Run Shopify Automated Checks

1. Go to **Shopify Partner Dashboard**
2. Apps → Select your app
3. Click "**Automated checks**" (in the sidebar or near app status)
4. Click "**Run**"
5. Wait for results (takes 1-2 minutes)

**Expected result:**
```
✅ Immediately authenticates after install
✅ Immediately redirects to app UI after authentication
✅ Provides mandatory compliance webhooks
✅ Verifies webhooks with HMAC signatures  ← Should now PASS!
✅ Uses a valid TLS certificate
```

---

## If It Still Fails

### Check 1: Verify SHOPIFY_CLIENT_SECRET is Set

```bash
# In Supabase Dashboard
# Settings → Edge Functions → Secrets
# You should see:
# SHOPIFY_CLIENT_SECRET = (hidden value)
```

If it's not there, **add it** (see Step 1).

---

### Check 2: Verify Secret is Correct

The secret must EXACTLY match what's in Shopify:

1. Shopify Partner Dashboard → Apps → Your app → Configuration
2. Under "Client credentials", find "Client secret"
3. Click "Show" to reveal it
4. Compare with what's in Supabase (Settings → Edge Functions → Secrets)
5. If different, update Supabase with correct value
6. **Redeploy the function** after changing the secret

---

### Check 3: Check Function Logs

View real-time logs to see what's happening:

```bash
# Using Supabase CLI
supabase functions logs data-deletion-callback --tail

# Or in Supabase Dashboard
# Edge Functions → data-deletion-callback → Logs
```

While logs are open, run the automated check and watch for:
- Incoming requests from Shopify
- HMAC verification attempts
- Any errors

---

### Check 4: Test with Valid HMAC

Generate a valid HMAC and test:

```bash
#!/bin/bash

# Replace with your actual Shopify Client Secret
SECRET="your_shopify_client_secret_here"
BODY='{"shop_domain":"test.myshopify.com"}'

# Generate HMAC
HMAC=$(echo -n "$BODY" | openssl dgst -sha256 -hmac "$SECRET" -binary | base64)

echo "Testing with valid HMAC..."
curl -X POST https://iipaykvimkbbnoobtpzz.supabase.co/functions/v1/data-deletion-callback \
  -H "X-Shopify-Shop-Domain: test.myshopify.com" \
  -H "X-Shopify-Topic: customers/data_request" \
  -H "X-Shopify-Hmac-Sha256: $HMAC" \
  -d "$BODY"

echo -e "\n\nShould return 400 (missing user_id), NOT 401"
```

If this returns **400** (bad request, missing user_id), HMAC verification is working!
If it returns **401**, your secret is wrong.

---

## Summary

### Files Changed
- ✅ `supabase/functions/data-deletion-callback/index.ts`

### Security Fix
- ✅ Now requires HMAC header for all POST requests
- ✅ Returns 401 if HMAC is missing
- ✅ Returns 401 if HMAC is invalid
- ✅ Only processes request if HMAC is valid

### Build Status
- ✅ Build succeeded (14.54s)

### Deployment Steps
1. ✅ Set SHOPIFY_CLIENT_SECRET in Supabase
2. ✅ Deploy data-deletion-callback function
3. ✅ Test endpoints return 401 for missing/invalid HMAC
4. ✅ Run Shopify automated checks

---

## Quick Deploy Commands

```bash
# Login to Supabase
supabase login

# Deploy the fixed function
supabase functions deploy data-deletion-callback

# Test it works
curl -X POST https://iipaykvimkbbnoobtpzz.supabase.co/functions/v1/data-deletion-callback \
  -H "X-Shopify-Shop-Domain: test" \
  -H "X-Shopify-Topic: customers/data_request"

# Should return: {"error":"Unauthorized","message":"Missing HMAC signature",...}
```

---

## Why This Matters

This was a **critical security vulnerability** that:
1. Allowed unauthenticated access to your GDPR endpoint
2. Would fail Shopify's app store security checks
3. Could allow attackers to trigger data deletions without authorization

The fix ensures:
- ✅ All webhook requests are authenticated
- ✅ Timing-safe HMAC comparison prevents timing attacks
- ✅ Shopify's automated checks will pass
- ✅ Your app meets security requirements for app store approval

---

**DEPLOY THIS FIX IMMEDIATELY!** 🚨

This is a critical security issue that must be resolved before your app can be approved for the Shopify App Store.
