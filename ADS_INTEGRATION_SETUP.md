# Facebook & TikTok Ads Integration - Complete Setup Guide

## Overview

Your Revoa app now has **full Facebook Ads and TikTok Ads integration** with:
- ✅ OAuth authentication flows
- ✅ Automatic campaign, ad set, and ad syncing
- ✅ Daily metrics tracking (impressions, clicks, spend, conversions, ROAS, etc.)
- ✅ Real-time dashboard integration
- ✅ Profit calculator with ad spend included
- ✅ Ad creative performance reports

## What's Been Built

### 1. Database Schema (5 Tables)

All tables are created with Row Level Security (RLS) enabled:

| Table | Purpose |
|-------|---------|
| `ad_accounts` | Stores connected Facebook/TikTok ad accounts |
| `ad_campaigns` | Campaign data from both platforms |
| `ad_sets` | Ad sets (Facebook) / Ad groups (TikTok) |
| `ads` | Individual ads with creative data |
| `ad_metrics` | Daily performance metrics for campaigns, ad sets, and ads |

### 2. Edge Functions (4 Functions)

| Function | Purpose | Endpoint |
|----------|---------|----------|
| `facebook-ads-oauth` | Facebook OAuth & account connection | `/functions/v1/facebook-ads-oauth` |
| `facebook-ads-sync` | Syncs Facebook campaigns & metrics | `/functions/v1/facebook-ads-sync` |
| `tiktok-ads-oauth` | TikTok OAuth & account connection | `/functions/v1/tiktok-ads-oauth` |
| `tiktok-ads-sync` | Syncs TikTok campaigns & metrics | `/functions/v1/tiktok-ads-sync` |

### 3. Frontend Integration

**Files Updated:**
- `src/lib/ads.ts` - Complete ads service with all API methods
- `src/components/onboarding/AdPlatformIntegration.tsx` - Real OAuth flows
- `src/pages/DashboardCopy.tsx` - Shows real ad spend, ROAS, CTR
- `src/pages/Audit.tsx` - Shows real ad creative performance

**Dashboard Metrics Now Include:**
- Ad Spend (real-time from connected accounts)
- ROAS (Return on Ad Spend)
- CTR (Click-Through Rate)
- Ad Impressions & Clicks
- Profit calculation includes ad costs

## Setup Instructions for Shopify App Store

### Step 1: Create Facebook App

1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Click "My Apps" → "Create App"
3. Choose "Business" as app type
4. Fill in app details:
   - **App Name:** Revoa - Shopify Ad Analytics
   - **Contact Email:** Your business email
5. Once created, go to "Settings" → "Basic"
6. Copy your **App ID** and **App Secret**

7. Add Facebook Login:
   - Click "Add Product" → Find "Facebook Login" → Click "Set Up"
   - Go to "Facebook Login" → "Settings"
   - Add Valid OAuth Redirect URIs:
     ```
     https://members.revoa.app/settings
     https://members.revoa.app/onboarding
     ```

8. Add Marketing API:
   - Click "Add Product" → Find "Marketing API" → Click "Set Up"
   - Request Advanced Access for:
     - `ads_read`
     - `ads_management`
     - `business_management`

9. Set App Mode to "Live"

### Step 2: Create TikTok For Business App

1. Go to [TikTok For Business](https://business.tiktok.com/)
2. Navigate to "Tools" → "TikTok For Business API"
3. Click "Apply" to get API access
4. Once approved, create a new app:
   - **App Name:** Revoa - Shopify Ad Analytics
   - **Industry:** E-commerce
5. Get your **App ID** and **App Secret**

6. Configure OAuth settings:
   - Redirect URI:
     ```
     https://members.revoa.app/settings
     ```
   - Scopes needed:
     - `ADVERTISER_READ`
     - `CAMPAIGN_READ`
     - `AD_GROUP_READ`
     - `AD_READ`
     - `REPORTING_READ`

### Step 3: Add Environment Variables

Add these to your Supabase Edge Functions secrets:

```bash
# Facebook Ads
FACEBOOK_APP_ID=your_facebook_app_id
FACEBOOK_APP_SECRET=your_facebook_app_secret

# TikTok Ads
TIKTOK_APP_ID=your_tiktok_app_id
TIKTOK_APP_SECRET=your_tiktok_app_secret

# Already configured
VITE_APP_URL=https://members.revoa.app
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_anon_key
```

**To set secrets in Supabase:**
1. Go to Supabase Dashboard → Project Settings → Edge Functions
2. Add each secret with its value
3. Or use Supabase CLI:
   ```bash
   supabase secrets set FACEBOOK_APP_ID=your_value
   supabase secrets set FACEBOOK_APP_SECRET=your_value
   supabase secrets set TIKTOK_APP_ID=your_value
   supabase secrets set TIKTOK_APP_SECRET=your_value
   ```

### Step 4: Configure Facebook App Review (for Production)

For Shopify App Store approval, you need Facebook App Review:

1. In Facebook App Dashboard, go to "App Review"
2. Request permissions:
   - `ads_read` - Read ad account insights and campaigns
   - `ads_management` - Manage ad campaigns
   - `business_management` - Access business-owned data
3. Prepare submission materials:
   - **Screencast:** Show the OAuth flow and dashboard with ad metrics
   - **Step-by-step instructions:** How to connect Facebook Ads
   - **Use case:** "Allow Shopify merchants to view their Facebook ad performance within the Revoa analytics dashboard"

### Step 5: Configure TikTok App Review (for Production)

1. In TikTok For Business, complete app verification
2. Submit for production access with:
   - App description
   - Screenshots showing OAuth and metrics
   - Privacy policy URL
   - Terms of service URL

### Step 6: Test the Integration

**Test OAuth Flow:**
1. Log into your app as a test user
2. Go to Onboarding or Settings → Integrations
3. Click "Connect Facebook Ads"
4. Complete OAuth flow
5. Verify account appears in database:
   ```sql
   SELECT * FROM ad_accounts WHERE user_id = 'test_user_id';
   ```

**Test Data Sync:**
1. After connecting, trigger a sync:
   ```typescript
   await adsService.syncAdAccount(accountId);
   ```
2. Check data in database:
   ```sql
   SELECT COUNT(*) FROM ad_campaigns;
   SELECT COUNT(*) FROM ads;
   SELECT COUNT(*) FROM ad_metrics;
   ```

**Test Dashboard:**
1. Navigate to Dashboard
2. Verify "Ad Costs" card shows real spend
3. Verify ROAS and CTR are displayed
4. Check that profit calculation includes ad spend

**Test Ad Reports:**
1. Navigate to "Ad Reports" page
2. Verify creative table shows real ads
3. Check metrics (impressions, clicks, CTR, ROAS)
4. Test date range selector

## User Flow

### First-Time Setup (Onboarding)

1. User completes Shopify store connection
2. User reaches "Connect Your Ad Platforms" step
3. User clicks "Connect Facebook Ads" or "Connect TikTok Ads"
4. Redirect to platform OAuth page
5. User authorizes access
6. Redirect back to app
7. Edge function exchanges code for access token
8. Edge function fetches ad accounts and stores in database
9. Success message shown
10. Automatic initial sync triggered

### Ongoing Usage

1. **Dashboard:** Shows real-time ad spend, ROAS, CTR from connected accounts
2. **Ad Reports:** View all ad creatives with performance metrics
3. **Profit Calculator:** Automatically includes ad spend in profit calculations
4. **Auto-Sync:** Metrics update daily (or on-demand with refresh button)

## API Endpoints

All endpoints require authentication (`Authorization: Bearer <token>`)

### Facebook Ads OAuth

**Get OAuth URL:**
```
GET /functions/v1/facebook-ads-oauth?action=connect
Response: { "oauthUrl": "https://www.facebook.com/..." }
```

**Handle Callback:**
```
GET /functions/v1/facebook-ads-oauth?action=callback&code=<code>
Response: { "success": true, "accounts": 2 }
```

**Disconnect:**
```
DELETE /functions/v1/facebook-ads-oauth?action=disconnect
Body: { "accountId": "uuid" }
Response: { "success": true }
```

### Facebook Ads Sync

**Sync Data:**
```
GET /functions/v1/facebook-ads-sync?accountId=<uuid>&startDate=2025-01-01&endDate=2025-01-31
Response: { "success": true, "campaigns": 5, "message": "Synced 5 campaigns" }
```

### TikTok Ads (Same patterns)

Replace `facebook-ads-oauth` with `tiktok-ads-oauth`
Replace `facebook-ads-sync` with `tiktok-ads-sync`

## Database Queries

### Get Total Ad Spend

```sql
SELECT SUM(spend) as total_ad_spend
FROM ad_metrics
WHERE entity_type = 'campaign'
AND date >= '2025-01-01'
AND date <= '2025-01-31';
```

### Get Campaign Performance

```sql
SELECT
  ac.name,
  SUM(am.impressions) as impressions,
  SUM(am.clicks) as clicks,
  SUM(am.spend) as spend,
  SUM(am.conversions) as conversions,
  AVG(am.roas) as avg_roas
FROM ad_campaigns ac
JOIN ad_metrics am ON am.entity_id = ac.id AND am.entity_type = 'campaign'
WHERE am.date >= '2025-01-01'
GROUP BY ac.id, ac.name;
```

### Get Top Performing Ads

```sql
SELECT
  a.name,
  a.creative_data->'headline' as headline,
  SUM(am.impressions) as impressions,
  SUM(am.clicks) as clicks,
  AVG(am.ctr) as ctr,
  AVG(am.roas) as roas
FROM ads a
JOIN ad_metrics am ON am.entity_id = a.id AND am.entity_type = 'ad'
WHERE am.date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY a.id, a.name, a.creative_data
ORDER BY roas DESC
LIMIT 10;
```

## Troubleshooting

### OAuth Fails

1. Check redirect URIs match exactly in Facebook/TikTok app settings
2. Verify environment variables are set correctly
3. Check browser console for error messages
4. Verify state parameter matches

### Data Not Syncing

1. Check access token hasn't expired:
   ```sql
   SELECT token_expires_at FROM ad_accounts WHERE id = 'uuid';
   ```
2. Verify edge function logs in Supabase dashboard
3. Test API manually:
   ```bash
   curl -X GET "https://your-project.supabase.co/functions/v1/facebook-ads-sync?accountId=uuid" \
     -H "Authorization: Bearer <token>"
   ```

### Metrics Not Showing in Dashboard

1. Verify data exists:
   ```sql
   SELECT COUNT(*) FROM ad_metrics WHERE date >= CURRENT_DATE - 7;
   ```
2. Check browser console for errors
3. Verify date range is correct
4. Try refreshing the page

## Security Notes

- All access tokens are stored securely in database
- RLS policies ensure users only see their own data
- Tokens are encrypted at rest by Supabase
- OAuth uses state parameter to prevent CSRF attacks
- All API calls require authentication

## Shopify App Store Requirements

Before submitting to Shopify App Store:

1. ✅ OAuth flows must work correctly
2. ✅ Error handling for failed connections
3. ✅ Clear user instructions
4. ✅ Privacy policy explaining data usage
5. ✅ Facebook/TikTok App Review completed
6. ✅ Test with real ad accounts
7. ✅ Handle edge cases (no data, expired tokens, etc.)

## Support

For issues or questions:
1. Check Supabase Edge Function logs
2. Review browser console errors
3. Check database for synced data
4. Verify environment variables
5. Test OAuth flow manually

## Next Steps

1. Complete Facebook App Review
2. Complete TikTok App verification
3. Add environment variables
4. Test with real merchant accounts
5. Submit to Shopify App Store

---

**Status:** ✅ Fully integrated and ready for testing
**Last Updated:** 2025-10-29
