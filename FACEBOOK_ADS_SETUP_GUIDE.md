# Facebook Ads Integration Setup Guide

## Overview

This guide will help you set up Facebook Marketing API integration for Revoa. Based on Facebook's documentation, there are **two access levels**:

- **Standard Access** (Default for Business apps) - Works with your own ad accounts only
- **Advanced Access** (Requires App Review) - Works with any user's ad accounts

For testing and initial setup, Standard Access is sufficient!

---

## Step 1: Get Your Facebook App Credentials

### 1.1 Go to Your Facebook App Dashboard
Visit: https://developers.facebook.com/apps/

### 1.2 Copy Your App ID and Secret
1. Click on your app
2. In the left sidebar, click **"Settings"** → **"Basic"**
3. Copy the **App ID**
4. Click **"Show"** next to **App Secret** and copy it

### 1.3 Add Credentials to Supabase
You need to add these as secrets in Supabase:

```bash
# Go to your Supabase Dashboard
# Navigate to: Project Settings → Edge Functions → Secrets

# Add these secrets:
FACEBOOK_APP_ID=your_app_id_here
FACEBOOK_APP_SECRET=your_app_secret_here
```

**OR** add them to your local `.env` file for testing:

```bash
FACEBOOK_APP_ID=your_app_id_here
FACEBOOK_APP_SECRET=your_app_secret_here
```

---

## Step 2: Configure OAuth Redirect URI

### 2.1 Add Redirect URI to Facebook App
1. In your Facebook App Dashboard, go to **Settings** → **Basic**
2. Scroll down to **"App Domains"**
3. Add: `supabase.co`

### 2.2 Configure OAuth Settings
1. In the left sidebar, look for **"Facebook Login"** or **"Products"**
2. If you don't see "Facebook Login", click **"Add Product"** and add it
3. Go to **Facebook Login** → **Settings**
4. Add this to **"Valid OAuth Redirect URIs"**:
   ```
   https://iipaykvimkbbnoobtpzz.supabase.co/functions/v1/facebook-ads-oauth
   ```

---

## Step 3: Set Up Data Deletion Callback (Required)

Facebook requires a data deletion callback URL for Business apps.

### 3.1 Add Data Deletion URL
1. In your Facebook App Dashboard, scroll down to **"Data Deletion Instructions URL"**
2. Select **"Data deletion callback URL"**
3. Enter: `https://iipaykvimkbbnoobtpzz.supabase.co/functions/v1/data-deletion-callback`
4. Click **"Save Changes"**

---

## Step 4: Verify Standard Access (No Review Needed!)

For **Business apps**, Standard Access is automatic. This means:

✅ You can access **your own** ad accounts immediately
✅ No app review needed for testing
✅ Works in Development Mode

To verify:
1. In your Facebook App Dashboard, look for **"Use Cases"** or **"App Review"**
2. Check that your app has **"Ads Management Standard Access"**
3. Your app should show "Standard Access" for Marketing API

---

## Step 5: Test the Integration

### 5.1 Make Sure You Have Ad Accounts
1. Go to https://business.facebook.com
2. Click **"Business Settings"**
3. Under **"Accounts"** → **"Ad Accounts"**, verify you have at least one ad account
4. Make sure **YOU** are an admin of that ad account

### 5.2 Test OAuth Flow
1. Log in to Revoa
2. Go to **Settings** → **Ad Platform Integration**
3. Click **"Connect Facebook Ads"**
4. You should see a Facebook OAuth screen
5. Grant permissions
6. You should see your ad accounts listed

---

## Step 6: Understanding Access Levels

### Standard Access (What You Have Now)
- ✅ Access your own ad accounts
- ✅ Perfect for testing and development
- ✅ No review process needed
- ❌ Can't access other users' ad accounts

### Advanced Access (For Production)
To enable other users to connect their ad accounts, you need Advanced Access:

1. In Facebook App Dashboard, go to **"App Review"** → **"Permissions and Features"**
2. Request **"Ads Management Advanced Access"**
3. You'll need to:
   - Provide a video demo of your app
   - Explain how you use the ads_management permission
   - Complete business verification
   - Wait for Facebook's review (1-2 weeks)

**Note:** You don't need this for testing with your own accounts!

---

## Troubleshooting

### Error: "Application does not have permission for this action"

**Solution:** Make sure you're using an ad account that YOU own. Standard Access only works with your own accounts.

### Error: "Provide valid app ID"

**Solutions:**
1. Verify `FACEBOOK_APP_ID` is set correctly in Supabase secrets
2. Make sure there are no extra spaces or quotes
3. Verify the App ID matches your Facebook app

### Error: "Invalid OAuth redirect URI"

**Solution:**
1. Go to Facebook App → Facebook Login → Settings
2. Add: `https://iipaykvimkbbnoobtpzz.supabase.co/functions/v1/facebook-ads-oauth`
3. Save changes and wait 5 minutes for propagation

### Can't Find Marketing API Settings

**Solution:**
- If you created a **Business app**, Standard Access is automatic
- You don't need to manually enable Marketing API
- Just add the OAuth redirect URI and you're ready to test

---

## Next Steps

1. ✅ Add Facebook credentials to Supabase secrets
2. ✅ Configure OAuth redirect URI
3. ✅ Add data deletion callback URL
4. ✅ Test with your own ad accounts
5. ⏳ (Optional) Apply for Advanced Access when ready for production

---

## Need Help?

If you're still having issues:

1. **Check Development Mode:** Make sure your app is in Development Mode (not Live)
2. **Verify Business Manager:** Ensure you have access to ad accounts in Business Manager
3. **Check App Type:** Confirm your app is a "Business" type app
4. **Review Logs:** Check Supabase Edge Function logs for detailed error messages

---

## Resources

- [Facebook Marketing API Docs](https://developers.facebook.com/docs/marketing-api/)
- [Ads Management Standard Access](https://developers.facebook.com/docs/features-reference/ads-management-standard-access/)
- [Facebook App Review Guide](https://developers.facebook.com/docs/app-review/)
