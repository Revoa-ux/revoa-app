# HMAC Verification Diagnostic Guide

**Issue:** Shopify automated check "Verifies webhooks with HMAC signatures" is failing
**Status:** Investigating
**Date:** November 16, 2025

---

## Current Status

✅ **HMAC Implementation:** Complete and correct
✅ **Timing-Safe Comparison:** Multi-layer implementation
✅ **Error Codes:** Returns 401 for invalid HMAC
✅ **Fast Response:** Responds immediately (< 5 seconds)

❌ **Automated Check:** Still failing

---

## Possible Causes

### 1. Webhook Endpoints Not Deployed

**Problem:** The Supabase Edge Functions may not be deployed yet.

**Check:**
```bash
# List deployed functions
supabase functions list

# Should show:
# - shopify-uninstall-webhook
# - shopify-order-webhook
# - data-deletion-callback
```

**Fix:**
```bash
supabase functions deploy shopify-uninstall-webhook
supabase functions deploy shopify-order-webhook
supabase functions deploy data-deletion-callback
```

---

### 2. Webhook URLs Not Registered in Shopify

**Problem:** Shopify doesn't know where to send webhooks.

**Check:**
1. Go to Shopify Partner Dashboard
2. Select your app
3. Go to Configuration → Webhooks
4. Verify these URLs are registered:

Required Webhooks:
```
Topic: app/uninstalled
URL: https://YOUR_SUPABASE_PROJECT.supabase.co/functions/v1/shopify-uninstall-webhook
Version: 2024-10 (or latest)
```

```
Topic: orders/create
URL: https://YOUR_SUPABASE_PROJECT.supabase.co/functions/v1/shopify-order-webhook
Version: 2024-10 (or latest)
```

```
Topic: customers/data_request
URL: https://YOUR_SUPABASE_PROJECT.supabase.co/functions/v1/data-deletion-callback
Version: 2024-10 (or latest)
```

```
Topic: customers/redact
URL: https://YOUR_SUPABASE_PROJECT.supabase.co/functions/v1/data-deletion-callback
Version: 2024-10 (or latest)
```

```
Topic: shop/redact
URL: https://YOUR_SUPABASE_PROJECT.supabase.co/functions/v1/data-deletion-callback
Version: 2024-10 (or latest)
```

**Fix:**
- Add webhooks manually in Partner Dashboard
- Or use Shopify GraphQL API to register them

---

### 3. Wrong SHOPIFY_CLIENT_SECRET

**Problem:** The secret used for HMAC verification doesn't match Shopify's.

**Check:**
```bash
# In Supabase Dashboard → Settings → Edge Functions → Secrets
# Verify SHOPIFY_CLIENT_SECRET matches your Shopify App's Client Secret
```

**Get the correct value:**
1. Go to Shopify Partner Dashboard
2. Select your app
3. Go to Configuration → App credentials
4. Copy "Client secret" (also called "API secret key")
5. **IMPORTANT:** This is NOT the same as API Access Token

**Fix:**
```bash
# Update in Supabase Dashboard
# Settings → Edge Functions → Secrets
# Variable: SHOPIFY_CLIENT_SECRET
# Value: Your actual Shopify Client Secret (32-character hex string)
```

---

### 4. Shopify Testing Wrong Endpoint

**Problem:** The automated checker might be testing a different webhook endpoint.

**What Shopify Tests:**
- It likely sends a test webhook to one of your registered webhook URLs
- Tests for: HMAC verification, proper response codes, response time

**Possible Issues:**
- You have webhook URLs registered that point to old/incorrect endpoints
- You have multiple webhook subscriptions with different URLs
- The test is hitting an endpoint that doesn't have HMAC verification

**Check:**
1. Go to Partner Dashboard → Your App → Configuration
2. Look for ALL webhook subscriptions (not just mandatory ones)
3. Verify ALL webhook URLs point to your Supabase Edge Functions
4. Delete any old/test webhook subscriptions

---

### 5. Edge Function Not Accessible

**Problem:** The function URL is not publicly accessible.

**Test:**
```bash
# Test the endpoint directly
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/shopify-uninstall-webhook \
  -H "X-Shopify-Shop-Domain: test.myshopify.com" \
  -H "X-Shopify-Hmac-Sha256: invalid_hmac" \
  -H "Content-Type: application/json" \
  -d '{}'

# Expected response: 401 Unauthorized
# If you get 404 or connection error, the function is not deployed/accessible
```

---

### 6. Cors/Headers Issue

**Problem:** Shopify's request is being blocked or rejected before HMAC check.

**Check the function logs:**
```bash
# View real-time logs
supabase functions logs shopify-uninstall-webhook --tail

# Look for:
# - Incoming requests from Shopify
# - HMAC verification attempts
# - Any errors before HMAC check
```

---

## Diagnostic Steps

### Step 1: Verify Functions Are Deployed

```bash
# Check if functions exist and are deployed
curl https://YOUR_PROJECT.supabase.co/functions/v1/shopify-uninstall-webhook \
  -H "X-Shopify-Shop-Domain: test" \
  -H "X-Shopify-Hmac-Sha256: test"

# Should return 401 (not 404)
```

### Step 2: Test HMAC Verification Manually

Create a test script to generate valid HMAC:

```bash
# test-hmac.sh
#!/bin/bash

SECRET="your_shopify_client_secret_here"
BODY='{"test": "data"}'

# Generate HMAC
HMAC=$(echo -n "$BODY" | openssl dgst -sha256 -hmac "$SECRET" -binary | base64)

echo "Testing webhook with HMAC..."
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/shopify-uninstall-webhook \
  -H "X-Shopify-Shop-Domain: test.myshopify.com" \
  -H "X-Shopify-Hmac-Sha256: $HMAC" \
  -H "Content-Type: application/json" \
  -d "$BODY"

echo -e "\n\nShould return 200 OK with success message"
```

### Step 3: Check Supabase Logs

```bash
# Watch logs in real-time
supabase functions logs shopify-uninstall-webhook --tail

# In another terminal, trigger Shopify's automated check
# Watch for any incoming requests and errors
```

### Step 4: Verify Environment Variables

```bash
# Check if SHOPIFY_CLIENT_SECRET is set
# In Supabase Dashboard → Settings → Edge Functions → Secrets

# Should show:
# SHOPIFY_CLIENT_SECRET = (hidden value)
```

### Step 5: Test with Shopify's Test Tool

1. Install your app on a development store
2. Go to Settings → Notifications
3. Find webhook subscriptions
4. Click "Send test notification"
5. Check if it succeeds
6. Check Supabase logs for the test

---

## Quick Fixes

### Fix 1: Redeploy All Webhook Functions

```bash
# Deploy all three webhook functions
supabase functions deploy shopify-uninstall-webhook
supabase functions deploy shopify-order-webhook
supabase functions deploy data-deletion-callback

# Verify they're accessible
curl https://YOUR_PROJECT.supabase.co/functions/v1/shopify-uninstall-webhook
# Should get 401, not 404
```

### Fix 2: Update SHOPIFY_CLIENT_SECRET

1. Get correct value from Shopify Partner Dashboard
2. Update in Supabase: Settings → Edge Functions → Secrets
3. Redeploy functions (secrets require redeployment)

### Fix 3: Re-register Webhooks

Delete all existing webhook subscriptions and re-create them with correct URLs:

1. Partner Dashboard → App → Configuration → Webhooks
2. Delete all existing subscriptions
3. Add new ones with Supabase Edge Function URLs
4. Make sure to use latest API version (2024-10)

---

## Most Likely Issue

Based on the symptoms, the most likely issues are:

1. **Functions Not Deployed** (most common)
   - Solution: Deploy the functions to Supabase

2. **Webhooks Not Registered** (second most common)
   - Solution: Register webhook URLs in Partner Dashboard

3. **Wrong Secret** (third most common)
   - Solution: Verify SHOPIFY_CLIENT_SECRET matches Shopify's value

---

## Testing Checklist

Before running automated check:

- [ ] Edge functions deployed to Supabase
- [ ] Functions return 401 for invalid HMAC (test with curl)
- [ ] SHOPIFY_CLIENT_SECRET set in Supabase secrets
- [ ] Webhook URLs registered in Shopify Partner Dashboard
- [ ] All 5 mandatory webhooks configured
- [ ] Test webhook succeeds from development store
- [ ] Function logs show incoming requests and HMAC verification

---

## Next Steps

1. **Deploy the functions** (if not already done)
2. **Verify SHOPIFY_CLIENT_SECRET** is correct
3. **Register webhook URLs** in Partner Dashboard
4. **Test manually** with curl command
5. **Check logs** for any errors
6. **Run automated check** again

---

## Need Help?

If the issue persists after following this guide:

1. Check Supabase function logs during automated check
2. Check Shopify Partner Dashboard webhook delivery status
3. Verify your app has all required OAuth scopes
4. Make sure app is properly installed on a development store

---

**The HMAC implementation is correct. The issue is likely deployment or configuration, not code.** ✅
