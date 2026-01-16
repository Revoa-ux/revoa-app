# Google Ads OAuth Redirect URI Fix

## What Was Fixed

The edge function now properly handles non-JSON responses from Google and provides detailed logging to diagnose redirect URI mismatches.

**The issue:** When the redirect URI doesn't match exactly what's configured in Google Cloud Console, Google returns an HTML error page instead of JSON. The code was trying to parse this HTML as JSON, causing the error you saw.

## Required Google Cloud Console Configuration

### Step 1: Check Your Supabase URL

Your Supabase project URL is: `https://iipaykvimkbbnoobtpzz.supabase.co`

### Step 2: Update Authorized Redirect URIs

Go to Google Cloud Console → APIs & Services → Credentials → Your OAuth Client

**ONLY ONE redirect URI should be configured:**

```
https://iipaykvimkbbnoobtpzz.supabase.co/functions/v1/google-ads-oauth
```

**Remove this URI if present:**
```
https://members.revoa.app/onboarding/ads
```

This frontend URL is NOT used in the OAuth flow. The flow is:
1. User authorizes → Google redirects to Supabase Edge Function
2. Edge Function processes everything → Redirects to frontend callback page
3. Frontend callback page handles the result

### Step 3: Verify Configuration

Make sure:
- ✓ No trailing slashes in the redirect URI
- ✓ Exact URL match (case-sensitive)
- ✓ Uses `https://` protocol
- ✓ Client ID and Secret match your environment variables
- ✓ OAuth consent screen is properly configured

### Step 4: Wait for Propagation (if needed)

After making changes in Google Cloud Console:
- Wait 5-10 minutes for changes to propagate
- Clear browser cache/cookies
- Try connecting again

## Testing the Fix

1. **Start fresh:** Clear any existing OAuth sessions or local storage
2. **Click "Connect Google Ads"** in the onboarding flow
3. **Check the authorization URL:** It should include `redirect_uri=https%3A%2F%2Fiipaykvimkbbnoobtpzz.supabase.co%2Ffunctions%2Fv1%2Fgoogle-ads-oauth`
4. **Complete authorization** on Google's consent screen
5. **Check Supabase Edge Function logs** for detailed diagnostic information

## What You'll See in Logs

### Successful Token Exchange:
```
[Google Ads OAuth] Token exchange details:
  - Redirect URI: https://iipaykvimkbbnoobtpzz.supabase.co/functions/v1/google-ads-oauth
  - Supabase URL: https://iipaykvimkbbnoobtpzz.supabase.co
  - Authorization code received: 4/0Ad...
[Google Ads OAuth] Token response status: 200
[Google Ads OAuth] Token response content-type: application/json
[Google Ads OAuth] ✓ Token exchange successful
```

### Failed Token Exchange (HTML Error):
```
[Google Ads OAuth] Token response status: 400
[Google Ads OAuth] Token response content-type: text/html
[Google Ads OAuth] ❌ Non-JSON response from Google (likely HTML error page)
[Google Ads OAuth] Response preview: <!DOCTYPE html>...
```

### Token Exchange with Wrong Redirect URI:
```
[Google Ads OAuth] Token exchange failed
[Google Ads OAuth] Error response: {
  "error": "redirect_uri_mismatch",
  "error_description": "The redirect URI in the request, https://..., does not match..."
}
[Google Ads OAuth] Expected redirect_uri: https://iipaykvimkbbnoobtpzz.supabase.co/functions/v1/google-ads-oauth
[Google Ads OAuth] Please verify this EXACT URL is in Google Cloud Console authorized redirect URIs
```

## Next Steps After Fixing Redirect URI

Once the redirect URI is correctly configured, the next issue to debug is the "0 accounts found" problem. This is a separate issue that we'll need to investigate by checking:

1. Google Ads account structure (MCC vs regular account)
2. Developer token approval status
3. Account linkage and permissions
4. Whether `login-customer-id` header is needed for the API call

## Quick Checklist

- [ ] Google Cloud Console has ONLY the Supabase edge function URL as redirect URI
- [ ] No frontend URL in the redirect URIs list
- [ ] Wait 5-10 minutes after making changes
- [ ] Clear browser cache
- [ ] Try connecting again
- [ ] Check Supabase edge function logs for detailed output

## Common Mistakes

❌ **Wrong:** Including `https://members.revoa.app/onboarding/ads` as a redirect URI
✓ **Correct:** Only `https://iipaykvimkbbnoobtpzz.supabase.co/functions/v1/google-ads-oauth`

❌ **Wrong:** Adding trailing slash: `.../google-ads-oauth/`
✓ **Correct:** No trailing slash: `.../google-ads-oauth`

❌ **Wrong:** Using HTTP instead of HTTPS
✓ **Correct:** Always use HTTPS for OAuth redirect URIs
