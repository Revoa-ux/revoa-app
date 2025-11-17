# Fix HMAC Shopify Test Failure

## Problem
Shopify's automated test is failing on "Verifies webhooks with HMAC signatures" even though our code correctly rejects invalid HMAC.

## Root Cause Analysis
Based on Shopify's documentation, the issue might be:

1. **Wrong secret being used**: We should be using `SHOPIFY_API_SECRET` not `SHOPIFY_CLIENT_SECRET`
2. **Secret not synced to Supabase Edge Functions**
3. **Webhook URLs not synced to Shopify Partners Dashboard**

## Solution Steps

### Step 1: Verify Your Shopify App Credentials

Go to your Shopify Partner Dashboard:
1. Navigate to: **Apps** > **[Your App]** > **Configuration**
2. Under "App credentials", you'll see:
   - **Client ID**: `21f747d6719351a523236f5481e5a60c` (we have this)
   - **Client secret**: `8b8630af8cead966607dddb7ab5abee0` (we have this)
   - **API secret key**: ??? (CHECK IF THIS IS DIFFERENT)

**For webhook HMAC verification, Shopify uses the API secret key.**

### Step 2: Update Environment Variables

**In your local `.env` file:**

```bash
# Current (might be correct):
SHOPIFY_CLIENT_SECRET=8b8630af8cead966607dddb7ab5abee0

# If API secret key is different, add:
SHOPIFY_API_SECRET=<your_api_secret_key_here>
```

**In Supabase Dashboard:**

1. Go to: https://supabase.com/dashboard/project/iipaykvimkbbnoobtpzz/settings/functions
2. Click "Add secret"
3. Add both:
   - `SHOPIFY_CLIENT_SECRET` = `8b8630af8cead966607dddb7ab5abee0`
   - `SHOPIFY_API_SECRET` = `<same value or different if shown in Shopify>`

### Step 3: Update Webhook Verification Code

If `SHOPIFY_API_SECRET` exists and is different, update the shared HMAC module to use it for webhooks.

### Step 4: Deploy Configuration to Shopify

**Run this command locally:**

```bash
cd /path/to/your/project
shopify app deploy
```

This will:
- ✅ Sync your `shopify.app.toml` webhook subscriptions
- ✅ Register webhook URLs with Shopify
- ✅ Update any configuration changes

### Step 5: Re-run Shopify's Automated Test

1. Go to Shopify Partner Dashboard
2. Navigate to your app's compliance section
3. Click **"Run"** button next to automated checks
4. Wait for results

## Quick Test Command

**Test if your webhook correctly rejects invalid HMAC:**

```bash
curl -X POST \
  https://iipaykvimkbbnoobtpzz.supabase.co/functions/v1/data-deletion-callback \
  -H "Content-Type: application/json" \
  -H "X-Shopify-Shop-Domain: test.myshopify.com" \
  -H "X-Shopify-Topic: shop/redact" \
  -H "X-Shopify-Hmac-Sha256: invalid_hmac" \
  -d '{"shop_id":123}'
```

**Expected response:** `401 Unauthorized` with message about invalid HMAC

## What We Know Works

✅ All three webhook endpoints return 401 for invalid HMAC
✅ All three webhook endpoints accept valid HMAC (tested)
✅ Environment secret is configured in Supabase
✅ Code correctly uses Web Crypto API for HMAC verification

## What Needs Manual Action

❌ **You need to run `shopify app deploy`** - can't be done from Bolt/MCP
❌ **You need to verify Client Secret = API Secret** in Shopify Partners Dashboard
❌ **You need to re-run Shopify's automated test** after deploy

## Next Steps

1. **Check Shopify Partners Dashboard** for your API secret key
2. **Run `shopify app deploy`** to sync webhook configuration
3. **Re-run automated test** in Shopify Partners
4. **Share results** - screenshot the detailed error if it still fails
