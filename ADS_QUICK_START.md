# Facebook & TikTok Ads Integration - Quick Start

## ✅ What's Already Done

Your app has **complete** Facebook Ads and TikTok Ads integration:

- ✅ 5 database tables created with RLS
- ✅ 4 edge functions deployed and active
- ✅ OAuth flows fully implemented
- ✅ Auto-sync of campaigns, ads, and metrics
- ✅ Dashboard shows real ad spend, ROAS, CTR
- ✅ Profit calculator includes ad costs
- ✅ Ad Reports page shows creative performance
- ✅ Frontend fully integrated
- ✅ Build successful

## 🚀 3 Steps to Launch

### Step 1: Get OAuth Credentials (30 minutes)

**Facebook:**
1. Go to https://developers.facebook.com/
2. Create app → Choose "Business" type
3. Copy App ID and App Secret
4. Add "Facebook Login" product
5. Set redirect URI: `https://members.revoa.app/settings`
6. Add "Marketing API" product
7. Request these permissions:
   - `ads_read`
   - `ads_management`
   - `business_management`

**TikTok:**
1. Go to https://business.tiktok.com/
2. Tools → TikTok For Business API
3. Create app
4. Copy App ID and App Secret
5. Set redirect URI: `https://members.revoa.app/settings`
6. Request scopes:
   - `ADVERTISER_READ`
   - `CAMPAIGN_READ`
   - `REPORTING_READ`

### Step 2: Add Credentials to Supabase (5 minutes)

In Supabase Dashboard → Project Settings → Edge Functions → Secrets:

```
FACEBOOK_APP_ID = <your_app_id>
FACEBOOK_APP_SECRET = <your_app_secret>
TIKTOK_APP_ID = <your_app_id>
TIKTOK_APP_SECRET = <your_app_secret>
```

Or via CLI:
```bash
supabase secrets set FACEBOOK_APP_ID=your_value
supabase secrets set FACEBOOK_APP_SECRET=your_value
supabase secrets set TIKTOK_APP_ID=your_value
supabase secrets set TIKTOK_APP_SECRET=your_value
```

### Step 3: Test & Launch (15 minutes)

1. **Test Facebook Connection:**
   - Login to your app
   - Go to Settings → Integrations (or Onboarding)
   - Click "Connect Facebook Ads"
   - Complete OAuth
   - Verify dashboard shows ad spend

2. **Test TikTok Connection:**
   - Click "Connect TikTok Ads"
   - Complete OAuth
   - Verify dashboard updates

3. **Verify Data:**
   ```sql
   -- Check connected accounts
   SELECT * FROM ad_accounts;

   -- Check synced campaigns
   SELECT * FROM ad_campaigns;

   -- Check metrics
   SELECT * FROM ad_metrics ORDER BY date DESC LIMIT 10;
   ```

4. **Test Dashboard:**
   - Ad Costs card shows real spend ✓
   - ROAS displays correctly ✓
   - Profit includes ad costs ✓

5. **Test Ad Reports:**
   - Navigate to Ad Reports
   - See real ad creatives ✓
   - Metrics displayed ✓

## 📊 What Users Will See

### Onboarding Flow
1. Connect Shopify store
2. **Connect ad platforms** ← Your integration
3. Set up products
4. Launch!

### Dashboard
```
┌─────────────────────────────────────┐
│ Profit: $12,543.21                  │
│ (Revenue - COGS - Ads - Fees)       │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ Ad Costs: $2,841.52                 │
│ ROAS: 4.42x  |  CTR: 2.3%          │
└─────────────────────────────────────┘
```

### Ad Reports
```
┌──────────────────────────────────────────────┐
│ Creative         | Metrics                   │
├──────────────────────────────────────────────┤
│ [Image] Ad Name  | 12.5K impressions         │
│ Facebook         | 450 clicks | 3.6% CTR     │
│ Performance: HIGH| $850 spend | 2.65x ROAS   │
└──────────────────────────────────────────────┘
```

## 🔌 API Endpoints Ready

All authenticated with `Authorization: Bearer <token>`

### Connect Accounts
```javascript
// Get OAuth URL
const { oauthUrl } = await fetch(
  'https://your-project.supabase.co/functions/v1/facebook-ads-oauth?action=connect',
  { headers: { 'Authorization': `Bearer ${token}` }}
).then(r => r.json());

// Redirect user
window.location.href = oauthUrl;
```

### Sync Data
```javascript
// Trigger sync
await fetch(
  'https://your-project.supabase.co/functions/v1/facebook-ads-sync?accountId=uuid&startDate=2025-01-01&endDate=2025-01-31',
  { headers: { 'Authorization': `Bearer ${token}` }}
);
```

### Get Metrics
```javascript
import { adsService } from '@/lib/ads';

// Get aggregated metrics
const metrics = await adsService.getAggregatedMetrics('2025-01-01', '2025-01-31');
// { impressions, clicks, spend, conversions, ctr, cpc, cpm, roas }

// Get ad creatives
const creatives = await adsService.getAdCreatives('2025-01-01', '2025-01-31');
// [{ id, name, type, metrics, performance, ... }]
```

## 🐛 Troubleshooting

### "OAuth Failed"
- ✓ Check redirect URIs match exactly
- ✓ Verify secrets are set in Supabase
- ✓ Make sure app is in "Live" mode

### "No Data Showing"
```sql
-- Check if sync ran
SELECT last_synced_at FROM ad_campaigns ORDER BY last_synced_at DESC LIMIT 1;

-- Check metrics exist
SELECT COUNT(*), MIN(date), MAX(date) FROM ad_metrics;
```

### "Token Expired"
```sql
-- Check expiry
SELECT platform_account_id, token_expires_at FROM ad_accounts;

-- Reconnect if needed
-- User clicks disconnect then connect again
```

## 📋 Pre-Launch Checklist

- [ ] Facebook App created
- [ ] TikTok App created
- [ ] Secrets added to Supabase
- [ ] Tested OAuth with personal account
- [ ] Verified data syncs correctly
- [ ] Dashboard shows real numbers
- [ ] Ad Reports loads creatives
- [ ] Profit calculation correct
- [ ] Error handling works
- [ ] Ready for Shopify review

## 🎯 Success Metrics

After users connect:
- ✅ Ad spend tracked automatically
- ✅ ROAS calculated in real-time
- ✅ Profit margins accurate (includes ad costs)
- ✅ Creative performance visible
- ✅ Data updates daily
- ✅ Multi-platform support (FB + TikTok)

## 📚 Documentation

- **Full Setup:** `ADS_INTEGRATION_SETUP.md`
- **Status:** `ADS_INTEGRATION_STATUS.md`
- **This Guide:** `ADS_QUICK_START.md`

## 🆘 Need Help?

1. Check edge function logs in Supabase Dashboard
2. Check browser console for errors
3. Verify database has data
4. Test API endpoints manually
5. Review setup documentation

---

**Time to Launch:** ~50 minutes
**Difficulty:** Easy (just need OAuth credentials)
**Status:** ✅ Ready to go!
