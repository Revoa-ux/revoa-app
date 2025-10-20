# Instagram Graph API Setup Guide

This guide will help you set up official Instagram Graph API integration for reliable, production-grade product discovery.

## Why Instagram Graph API?

**Current Issue:** Web scraping Instagram is unreliable (~5% success rate)
- Instagram blocks most unauthenticated requests
- Rate limiting after 2-3 requests
- Requires proxies, rotating IPs, CAPTCHA solving
- Not sustainable for production

**Solution:** Instagram Graph API (Official)
- 99% uptime and reliability
- No rate limiting issues (reasonable limits)
- Legal and officially supported
- Access to rich metadata (engagement, hashtags, etc.)

---

## Prerequisites

You'll need:
1. **Instagram Business Account** (not Personal)
2. **Facebook Business Page** connected to Instagram
3. **Meta/Facebook Developer Account**
4. ~30 minutes for setup

---

## Step 1: Create Instagram Business Account

If you already have an Instagram Business account, skip to Step 2.

1. Open Instagram app on your phone
2. Go to Settings → Account
3. Switch to Professional Account → Business
4. Connect to your Facebook Business Page

**Important:** The Instagram account MUST be a Business account. Personal accounts cannot access the API.

---

## Step 2: Create Facebook App

1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Click **"My Apps"** → **"Create App"**
3. Choose **"Business"** as the app type
4. Fill in app details:
   - **App Name:** "Revoa Product Discovery" (or your choice)
   - **App Contact Email:** Your email
   - **Business Account:** Select your business account
5. Click **"Create App"**

---

## Step 3: Add Instagram Basic Display

1. In your new app dashboard, click **"Add Product"**
2. Find **"Instagram Basic Display"** and click **"Set Up"**
3. Scroll down to **"User Token Generator"**
4. Click **"Add or Remove Instagram Accounts"**
5. Log in with your Instagram Business account
6. Authorize the app

---

## Step 4: Get Your Access Token

### Short-Lived Token (60 days)

1. In the app dashboard, go to **Instagram Basic Display → Basic Display → User Token Generator**
2. Click **"Generate Token"** next to your Instagram account
3. Copy the **Access Token** (starts with `IGQV...`)
4. This token lasts 60 days

### Long-Lived Token (60 days, renewable)

Convert your short-lived token to long-lived:

```bash
curl -i -X GET "https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=YOUR_APP_SECRET&access_token=SHORT_LIVED_TOKEN"
```

**Where to find:**
- `YOUR_APP_SECRET`: App Dashboard → Settings → Basic → App Secret
- `SHORT_LIVED_TOKEN`: The token from previous step

**Response:**
```json
{
  "access_token": "LONG_LIVED_TOKEN_HERE",
  "token_type": "bearer",
  "expires_in": 5183944
}
```

Save this `LONG_LIVED_TOKEN` - it's valid for ~60 days and can be refreshed.

---

## Step 5: Configure Environment Variables

Add these to your `.env` file and Supabase secrets:

```bash
# Instagram Graph API
INSTAGRAM_ACCESS_TOKEN=YOUR_LONG_LIVED_TOKEN_HERE
INSTAGRAM_BUSINESS_ACCOUNT_ID=YOUR_BUSINESS_ACCOUNT_ID
```

**To find your Business Account ID:**

```bash
curl -i -X GET "https://graph.instagram.com/me?fields=id,username&access_token=YOUR_ACCESS_TOKEN"
```

---

## Step 6: Update Python Script

The agent will automatically use the Instagram Graph API when these variables are set:

```python
# In scripts/revoa_import.py (already implemented)
INSTAGRAM_ACCESS_TOKEN = os.environ.get("INSTAGRAM_ACCESS_TOKEN")
INSTAGRAM_BUSINESS_ACCOUNT_ID = os.environ.get("INSTAGRAM_BUSINESS_ACCOUNT_ID")

if INSTAGRAM_ACCESS_TOKEN and INSTAGRAM_BUSINESS_ACCOUNT_ID:
    # Use official Graph API
    discovered_reels = discover_via_graph_api(...)
else:
    # Fall back to web scraping (unreliable)
    discovered_reels = discover_viral_reels(...)
```

---

## Step 7: Test the Integration

Run a test to verify everything works:

```bash
# Test API access
curl -i -X GET "https://graph.instagram.com/v18.0/{BUSINESS_ACCOUNT_ID}?fields=id,username,followers_count&access_token={ACCESS_TOKEN}"
```

**Expected Response:**
```json
{
  "id": "17841401234567890",
  "username": "your_business_username",
  "followers_count": 1234
}
```

---

## API Endpoints We'll Use

### 1. Search Hashtags
```bash
GET https://graph.instagram.com/ig_hashtag_search
  ?user_id={BUSINESS_ACCOUNT_ID}
  &q=viral_products
  &access_token={ACCESS_TOKEN}
```

### 2. Get Top Media for Hashtag
```bash
GET https://graph.instagram.com/{HASHTAG_ID}/top_media
  ?user_id={BUSINESS_ACCOUNT_ID}
  &fields=id,media_type,media_url,permalink,like_count,comments_count
  &access_token={ACCESS_TOKEN}
```

### 3. Get Media Details
```bash
GET https://graph.instagram.com/{MEDIA_ID}
  ?fields=id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count,video_views
  &access_token={ACCESS_TOKEN}
```

---

## Rate Limits

Instagram Graph API rate limits (per app):
- **200 calls per hour** per user
- **4800 calls per hour** total for app

This is MORE than enough for:
- 50 hashtag searches per hour
- 20 reels fetched per search
- 1000 reels analyzed per hour

Way better than web scraping's ~5% success rate!

---

## Token Refresh (Important!)

Long-lived tokens expire after 60 days. To refresh:

```bash
curl -i -X GET "https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token={LONG_LIVED_TOKEN}"
```

**Set up a cron job to refresh every 30 days:**
```bash
# Add to your server cron
0 0 1 * * /path/to/refresh_instagram_token.sh
```

---

## Cost

- **Free tier:** Up to 200 API calls/hour/user (plenty for your needs)
- **No credit card required** for basic usage
- Scales if you need more (paid plans available)

---

## Security Best Practices

1. **Never commit tokens to Git**
   - Use `.env` for local development
   - Use Supabase secrets for production

2. **Rotate tokens regularly**
   - Refresh every 30 days automatically
   - Invalidate old tokens when rotating

3. **Use environment-specific tokens**
   - Development token for local testing
   - Production token for live environment

---

## Troubleshooting

### "Invalid OAuth access token"
- Token expired (refresh it)
- Token belongs to different app
- Wrong app secret used

### "User does not have permission"
- Account is not a Business account
- Instagram account not connected to Facebook Page
- Missing required permissions in app review

### "Rate limit exceeded"
- Slow down requests
- Implement exponential backoff
- Cache responses for 15-30 minutes

---

## Next Steps

Once configured:

1. Test the API manually (curl commands above)
2. Add env variables to `.env` and Supabase
3. Run the AI agent - it will auto-detect and use the Graph API
4. Monitor rate limits in Facebook Developer Dashboard

---

## Support Resources

- [Instagram Graph API Documentation](https://developers.facebook.com/docs/instagram-api)
- [Getting Started Guide](https://developers.facebook.com/docs/instagram-api/getting-started)
- [Instagram Basic Display API](https://developers.facebook.com/docs/instagram-basic-display-api)
- [API Rate Limits](https://developers.facebook.com/docs/graph-api/overview/rate-limiting)

---

## Summary

**Before (Web Scraping):**
- ❌ 0-5% success rate
- ❌ Constantly blocked
- ❌ Requires proxies/IP rotation
- ❌ Not sustainable

**After (Graph API):**
- ✅ 99% success rate
- ✅ Official and legal
- ✅ 200+ requests/hour
- ✅ Rich metadata included
- ✅ Production-ready

**Setup Time:** ~30 minutes
**Cost:** Free for your usage volume
**Worth It:** Absolutely!
