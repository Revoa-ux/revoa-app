# Facebook Ads Integration - Quick Start

## What You Need to Know

✅ Your **Business app** has **Standard Access** automatically
✅ This means you can test with **YOUR OWN ad accounts** right now
✅ **NO app review needed** for testing

---

## 3-Step Setup (5 minutes)

### Step 1: Get Your Credentials
1. Go to https://developers.facebook.com/apps/
2. Click your app → **Settings** → **Basic**
3. Copy **App ID** and **App Secret**

### Step 2: Add to Supabase
Go to Supabase Dashboard → Project Settings → Edge Functions → Secrets

Add these:
```
FACEBOOK_APP_ID=your_app_id_here
FACEBOOK_APP_SECRET=your_app_secret_here
```

### Step 3: Configure OAuth Redirect
1. In Facebook App → **Facebook Login** → **Settings**
2. Add to "Valid OAuth Redirect URIs":
   ```
   https://iipaykvimkbbnoobtpzz.supabase.co/functions/v1/facebook-ads-oauth
   ```

---

## That's It!

Now test it:
1. Log in to Revoa
2. Go to Settings → Ad Platform Integration
3. Click "Connect Facebook Ads"
4. Grant permissions
5. You should see your ad accounts!

---

## Important Notes

- **Standard Access** = You can only see YOUR OWN ad accounts
- This is perfect for testing and development
- For production (other users' accounts), you'll need **Advanced Access** later

See `FACEBOOK_ADS_SETUP_GUIDE.md` for detailed instructions.
