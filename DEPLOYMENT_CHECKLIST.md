# Webhook HMAC Fix - Deployment Checklist

Use this checklist to ensure the fix is properly deployed and working.

## Pre-Deployment Checks

- [x] Build completes successfully
- [x] All webhook files updated with shared HMAC module
- [x] Timing-safe comparison implemented
- [x] Test suite created
- [x] Environment variables documented

## Deployment Steps

### 1. Deploy Edge Functions

```bash
# Option A: Use deployment script (recommended)
./DEPLOY_WEBHOOK_FIX.sh

# Option B: Manual deployment
supabase functions deploy shopify-order-webhook
supabase functions deploy shopify-uninstall-webhook
supabase functions deploy data-deletion-callback
```

- [ ] shopify-order-webhook deployed
- [ ] shopify-uninstall-webhook deployed
- [ ] data-deletion-callback deployed
- [ ] No deployment errors

### 2. Verify Environment Variables

**UPDATED:** Only one Shopify secret variable is needed.

Check that this is set in Supabase:

```bash
# Get this from Shopify Partner Dashboard → API credentials → Client secret
SHOPIFY_CLIENT_SECRET=your_shopify_client_secret_here
```

- [ ] SHOPIFY_CLIENT_SECRET is set in Supabase project settings
- [ ] Value matches Shopify Partner Dashboard Client Secret exactly
- [ ] Old variables (SHOPIFY_WEBHOOK_SECRET, SHOPIFY_API_SECRET) are NOT set (to avoid confusion)

Check that this is set in Netlify:

- [ ] SHOPIFY_CLIENT_SECRET is set in Netlify dashboard (Site settings → Environment variables)
- [ ] If you have SHOPIFY_API_SECRET in Netlify, rename it to SHOPIFY_CLIENT_SECRET

### 3. Test Webhook Endpoints

Test that webhooks reject invalid HMAC:

```bash
# Replace with your Supabase URL
curl -X POST https://iipaykvimkbbnoobtpzz.supabase.co/functions/v1/shopify-order-webhook \
  -H "Content-Type: application/json" \
  -H "X-Shopify-Hmac-Sha256: invalid" \
  -d '{"test": true}'
```

Expected response: `401 Unauthorized` or `500` with "Invalid HMAC" error

- [ ] shopify-order-webhook rejects invalid HMAC
- [ ] shopify-uninstall-webhook rejects invalid HMAC
- [ ] data-deletion-callback rejects invalid HMAC

### 4. Verify Webhooks in Shopify Partner Dashboard

Go to: **Apps** → **Revoa** → **Configuration** → **Webhooks**

Check that these webhooks are registered:

**Order Webhooks:**
- [ ] `orders/create` → shopify-order-webhook (API 2025-01)
- [ ] `orders/paid` → shopify-order-webhook (API 2025-01)
- [ ] `orders/fulfilled` → shopify-order-webhook (API 2025-01)
- [ ] `orders/cancelled` → shopify-order-webhook (API 2025-01)

**App Lifecycle:**
- [ ] `app/uninstalled` → shopify-uninstall-webhook (API 2025-01)

**GDPR Compliance:**
- [ ] `customers/data_request` → data-deletion-callback (API 2025-01)
- [ ] `customers/redact` → data-deletion-callback (API 2025-01)
- [ ] `shop/redact` → data-deletion-callback (API 2025-01)

### 5. Send Test Webhook from Shopify

In Partner Dashboard:

1. Find any registered webhook
2. Click **Send test notification**
3. Monitor logs: `supabase functions logs [function-name] --tail`

Expected log output:
```
[Order Webhook] Received request
[Order Webhook] Headers: { shop: 'test.myshopify.com', ... }
[Order Webhook] Body received, length: XXX
[Order Webhook] Using webhook secret for HMAC verification
[Order Webhook] HMAC verified successfully ✅
```

- [ ] Test notification sent
- [ ] Webhook received the request
- [ ] HMAC verified successfully
- [ ] Webhook processed without errors

### 6. Test with Real Store (Optional but Recommended)

1. Install app on development store
2. Create a test order
3. Check function logs
4. Verify order appears in your database

- [ ] App installed on dev store
- [ ] Test order created
- [ ] Webhook triggered
- [ ] Order data saved correctly

### 7. Run Shopify Automated Checks

In Shopify Partner Dashboard:

1. Go to your app's listing page
2. Find **"Automated checks for common errors"**
3. Click **"Run"**
4. Wait for results

Expected results:
- [ ] ✅ Immediately authenticates after install
- [ ] ✅ Immediately redirects to app UI after authentication
- [ ] ✅ Provides mandatory compliance webhooks
- [ ] ✅ **Verifies webhooks with HMAC signatures** ← This should now pass!
- [ ] ✅ Uses a valid TLS certificate

### 8. Monitor Initial Webhook Deliveries

For the first 24 hours after deployment:

```bash
# Watch logs in real-time
supabase functions logs shopify-order-webhook --tail
```

Check for:
- [ ] No "Invalid HMAC signature" errors
- [ ] All webhooks processing successfully
- [ ] Response times under 5 seconds
- [ ] No duplicate processing (idempotency working)

## Post-Deployment Verification

### Webhook Delivery Success Rate

In Shopify Partner Dashboard → Webhooks → [Your Webhook]:

- [ ] Delivery success rate > 95%
- [ ] No timeout errors
- [ ] No authentication errors

### Function Performance

```bash
# Check function metrics in Supabase Dashboard
# Or use CLI:
supabase functions list
```

- [ ] Average execution time < 2 seconds
- [ ] No memory errors
- [ ] No function crashes

### Database Impact

Check that webhook processing doesn't cause database issues:

```sql
-- Check for orders being created correctly
SELECT COUNT(*) FROM shopify_orders
WHERE created_at > NOW() - INTERVAL '1 hour';

-- Check webhook logs
SELECT COUNT(*) FROM webhook_logs
WHERE processed_at > NOW() - INTERVAL '1 hour';
```

- [ ] Orders being created correctly
- [ ] Webhook logs being written
- [ ] No duplicate entries
- [ ] RLS policies working correctly

## Troubleshooting

If any checks fail, refer to:

1. **`WEBHOOK_HMAC_FIX.md`** - Detailed documentation
2. **Function logs** - `supabase functions logs [function-name]`
3. **Shopify webhook logs** - Partner Dashboard → Webhooks
4. **Test suite** - Run `deno run --allow-all supabase/functions/_shared/shopify-hmac.test.ts`

Common issues and solutions:

| Issue | Solution |
|-------|----------|
| Invalid HMAC signature | Verify SHOPIFY_CLIENT_SECRET matches Shopify Client Secret exactly |
| Webhook timeout | Check database query performance, optimize if needed |
| Function not found | Redeploy function: `supabase functions deploy [name]` |
| Environment variable missing | Set SHOPIFY_CLIENT_SECRET in Supabase Dashboard → Edge Functions → Secrets |
| Still using old variables | Remove SHOPIFY_WEBHOOK_SECRET and SHOPIFY_API_SECRET to avoid confusion |

## Final Submission Checklist

Before submitting to Shopify App Store:

- [ ] All automated checks pass ✅
- [ ] Webhooks tested with real data
- [ ] No errors in function logs (past 24 hours)
- [ ] Documentation updated
- [ ] Support email configured
- [ ] Privacy policy published
- [ ] Terms of service published

## Success Criteria

✅ All checks above are complete
✅ Shopify automated check for HMAC verification passes
✅ Webhooks deliver successfully (>95% success rate)
✅ No security vulnerabilities
✅ Ready for App Store submission

---

**Completion Date:** _________________

**Deployed By:** _________________

**Verified By:** _________________

**Notes:**
_____________________________________________
_____________________________________________
_____________________________________________
