# GDPR Webhooks - Quick Reference

## What We Fixed
**The `data-deletion-callback` function was allowing test webhooks through with invalid HMAC signatures.**

Shopify's automated test checks that you **reject** invalid HMACs with 401, not accept them!

## Current Status: ✅ FIXED & DEPLOYED

---

## The Three GDPR Webhooks

| Webhook | When | What Happens | Response |
|---------|------|--------------|----------|
| `customers/data_request` | Customer asks for their data | Log request, provide data to merchant within 30 days | 200 + confirmation code |
| `customers/redact` | Customer requests deletion | Redact PII from orders (email → `[REDACTED]`) | 200 + confirmation code |
| `shop/redact` | 48 hours after uninstall | Delete ALL merchant data | 200 + confirmation code |

## Security Requirements

### ✅ MUST return 401 for invalid HMAC
```
Invalid HMAC → 401 Unauthorized
(Even for test webhooks!)
```

### ✅ MUST return 200 for valid HMAC
```
Valid HMAC → 200 OK + confirmation code
```

## Why You Haven't Seen These Webhooks

You tested **`app/uninstalled`** which works perfectly!

The GDPR webhooks only fire:
- 48 hours after uninstall (`shop/redact`)
- When customers make GDPR requests (rare)

## Verification Queries

```sql
-- Check uninstall webhooks (should have entries)
SELECT * FROM webhook_logs WHERE topic = 'app/uninstalled';

-- Check GDPR webhooks (empty until real events occur)
SELECT * FROM webhook_logs
WHERE topic IN ('shop/redact', 'customers/redact', 'customers/data_request');

-- Check uninstalled stores
SELECT store_url, status, uninstalled_at, access_token IS NULL
FROM shopify_installations
WHERE status = 'uninstalled';
```

## What Shopify Tests

When you submit to App Store:
1. ✅ Send webhook with valid HMAC → check for 200
2. ✅ Send webhook with invalid HMAC → check for 401
3. ✅ Verify all three endpoints configured

**All three will now pass!**

---

**Bottom Line:** Your app is GDPR compliant and will pass Shopify's automated testing. The fix ensures you properly reject invalid signatures, which is both a security and compliance requirement.
