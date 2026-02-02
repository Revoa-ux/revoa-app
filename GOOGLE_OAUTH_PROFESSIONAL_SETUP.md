# Google Ads OAuth - Professional Setup Complete

## What Changed

We've completely restructured the Google OAuth flow to use your professional domain (`members.revoa.app`) instead of the Supabase URL. This provides:

1. **Professional appearance**: Users see "revoa.app wants access" instead of "iipaykvimkbbnoobtpzz.supabase.co"
2. **Cleaner architecture**: OAuth redirects to your domain, which then communicates with Edge Functions
3. **Better security**: Your domain controls the OAuth flow

---

## Architecture Change

### Before (Unprofessional)
```
User authorizes → Google redirects to:
  https://iipaykvimkbbnoobtpzz.supabase.co/functions/v1/google-ads-oauth
  ❌ Shows Supabase URL on consent screen
```

### After (Professional)
```
User authorizes → Google redirects to:
  https://members.revoa.app/oauth/google-ads
  ✅ Shows revoa.app on consent screen
  → Page calls Edge Function to process the authorization code
  → Edge Function exchanges code for tokens and fetches accounts
  → Returns data to frontend
  → Frontend shows account selection
```

---

## What You Need to Do in Google Cloud Console

### Step 1: Update Redirect URI

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Select your OAuth 2.0 Client ID
3. Under "Authorized redirect URIs", **remove** the old Supabase URL:
   - ❌ Delete: `https://iipaykvimkbbnoobtpzz.supabase.co/functions/v1/google-ads-oauth`
4. **Add** your professional domain:
   - ✅ Add: `https://members.revoa.app/oauth/google-ads`
5. Click **Save**

### Step 2: Update Authorized Domains

1. In the same OAuth consent screen configuration
2. Under "Authorized domains":
   - ✅ Keep: `revoa.app` (already verified)
   - ❌ Remove: `iipaykvimkbbnoobtpzz.supabase.co` (no longer needed)
3. Click **Save**

---

## Final Google Cloud Console Settings

After completing the above steps, your configuration should be:

**Authorized domains:**
- `revoa.app`

**Authorized redirect URIs:**
- `https://members.revoa.app/oauth/google-ads`

That's it! Only ONE domain, ONE redirect URI.

---

## Files Modified

1. **New file**: `src/pages/OAuthGoogleAds.tsx`
   - Handles OAuth callback from Google
   - Receives authorization code and state
   - Calls Edge Function to process

2. **Updated**: `supabase/functions/google-ads-oauth/index.ts`
   - Added `process-callback` action (POST endpoint)
   - Changed redirect URI to use `members.revoa.app`
   - Returns JSON data instead of browser redirects

3. **Updated**: `src/App.tsx`
   - Added route: `/oauth/google-ads`

---

## How It Works Now

1. User clicks "Connect Google Ads" in your app
2. Frontend calls Edge Function with `action=connect`
3. Edge Function generates OAuth URL with redirect to `https://members.revoa.app/oauth/google-ads`
4. User sees consent screen showing **"revoa.app wants access"** (not Supabase URL)
5. User approves, Google redirects to `https://members.revoa.app/oauth/google-ads?code=...&state=...`
6. OAuthGoogleAds page receives the code and state
7. Page calls Edge Function with `action=process-callback` and the code/state
8. Edge Function exchanges code for tokens, fetches accounts
9. Edge Function returns account data
10. Frontend shows account selection modal
11. User selects accounts and they're saved to the database

---

## Testing

After updating Google Cloud Console:

1. Go to your Settings page
2. Click "Connect Google Ads"
3. You should now see "revoa.app wants access" (not the Supabase URL)
4. Authorize and verify accounts appear

---

## Troubleshooting

If you see errors:

1. **"redirect_uri_mismatch"**
   - Double-check that you added `https://members.revoa.app/oauth/google-ads` exactly in Google Cloud Console
   - Make sure you removed the old Supabase URL
   - Check for typos (no trailing slash, exact path)

2. **"invalid_request"**
   - Verify authorized domains includes `revoa.app`
   - Make sure domain is verified in Google Search Console

3. **Still showing Supabase URL**
   - Hard refresh your browser (Ctrl+Shift+R or Cmd+Shift+R)
   - Clear browser cache
   - The Edge Function has been deployed with the new redirect URI

---

## Benefits

- ✅ Professional branding on OAuth consent screen
- ✅ Your domain in control of OAuth flow
- ✅ Cleaner architecture with Edge Functions as APIs
- ✅ No Supabase URL exposed to users
- ✅ Easier to maintain and debug
- ✅ Future-proof if you migrate away from Supabase

---

## Next Steps

1. Update Google Cloud Console as described above
2. Test the OAuth flow
3. Verify the consent screen shows "revoa.app"
4. Enjoy your professional OAuth experience!
