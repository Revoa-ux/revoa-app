# Shopify Welcome Link Configuration - Quick Setup

## What You Need to Do in Shopify Partner Dashboard

### 1. Set the Welcome Link

In your Shopify Partner Dashboard → Your App → App Setup:

**Find the "Welcome link" field and enter:**

```
https://members.revoa.app/welcome
```

This is the URL where merchants will land after installing your app from the Shopify App Store.

---

## Why This Matters

When a merchant installs your app from the Shopify App Store:

1. Shopify shows OAuth approval screen
2. Merchant approves permissions
3. Shopify completes OAuth in the background
4. **Shopify redirects to your Welcome link** ← This is the key step
5. Your app receives the merchant and completes setup

---

## What Happens at the Welcome Link

Your `/welcome` page:
- Validates the session token
- Signs the user in automatically
- Shows a celebration message
- Displays their shop name
- Redirects them to onboarding

---

## Other URLs to Verify

Make sure these are in your **Allowed redirection URL(s)** list:

```
https://members.revoa.app/welcome
https://members.revoa.app/onboarding/ads
https://members.revoa.app/dashboard
https://members.revoa.app/*
```

The wildcard (`/*`) allows all routes which is most convenient.

---

## OAuth Redirect URL

Should already be:
```
https://members.revoa.app/.netlify/functions/shopify-oauth
```

This is where Shopify sends the OAuth callback (different from the Welcome link).

---

## Testing Your Configuration

After setting the Welcome link:

1. Go to your app's test listing
2. Click "Install"
3. Approve permissions
4. You should land on `https://members.revoa.app/welcome?token=...`
5. Page should show "Setting up your account..."
6. Then redirect to onboarding

---

## If Something Goes Wrong

**Merchant sees error on Welcome page:**
- Check that token is in URL: `?token=xxx`
- Verify OAuth callback completed successfully
- Check Netlify function logs for errors

**Merchant not redirected after OAuth:**
- Verify Welcome link is set correctly in Shopify
- Check for typos in the URL
- Ensure URL is exactly: `https://members.revoa.app/welcome`

**Still stuck?**
- Check `netlify/functions/shopify-oauth.ts` logs
- Verify `SUPABASE_SERVICE_ROLE_KEY` is set in Netlify
- Ensure email sending is configured (non-blocking, but good to verify)

---

## Summary

**Action Required:**
Set Welcome link in Shopify Partner Dashboard to:
```
https://members.revoa.app/welcome
```

That's it! Your app is ready for App Store installations.
