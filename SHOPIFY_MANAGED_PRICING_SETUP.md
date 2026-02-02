# Shopify Managed Pricing Setup Guide

Complete setup guide for implementing order-based subscription billing using Shopify Managed Pricing.

## Overview

Revoa uses **Shopify Managed Pricing** for subscription billing. This means:
- ✅ Shopify hosts the plan selection page
- ✅ Billing automatically appears on merchant's Shopify invoice
- ✅ No complex billing API implementation needed
- ✅ Automatic handling of trials, proration, and test charges
- ✅ Full compliance with Shopify App Store requirements

## Pricing Tiers

| Tier | Order Limit | Monthly Fee | Annual Fee | Trial Period |
|------|-------------|-------------|------------|--------------|
| Startup | Up to 100 orders/mo | $29/mo | $299/year | 14 days |
| Momentum | Up to 300 orders/mo | $99/mo | $999/year | 14 days |
| Scale | Up to 1,000 orders/mo | $299/mo | $2,999/year | 14 days |
| Enterprise | Unlimited orders | $599/mo | $5,999/year | 14 days |

## Step 1: Configure Managed Pricing in Partner Dashboard

### 1.1 Enable Managed Pricing

1. Go to [Shopify Partner Dashboard](https://partners.shopify.com)
2. Navigate to **Apps** > Select your app > **Distribution**
3. Click **Manage listing** under "Shopify App Store listing"
4. Under **Pricing content**, click **Manage**
5. Click **Settings** (gear icon)
6. Select **Managed Pricing** (if not already enabled)
7. Click **Switch** to confirm

### 1.2 Create Public Plans

Create 8 public plans (4 monthly + 4 annual) with these exact specifications:

#### Monthly Plans

##### Plan 1: Startup (Monthly)
- **Billing**: Monthly
- **Monthly charge**: $29.00
- **Free trial duration**: 14 days
- **Welcome link**: `/shopify/welcome`
- **Display name**: Startup
- **Top features**:
  - Email support
  - 14-day free trial
  - All features included
  - No commission on sales
  - Cancel anytime

##### Plan 2: Momentum (Monthly)
- **Billing**: Monthly
- **Monthly charge**: $99.00
- **Free trial duration**: 14 days
- **Welcome link**: `/shopify/welcome`
- **Display name**: Momentum
- **Top features**:
  - Priority support
  - 14-day free trial
  - All Startup features
  - Access to exclusive community
  - No commission on sales
  - Advanced analytics

##### Plan 3: Scale (Monthly)
- **Billing**: Monthly
- **Monthly charge**: $299.00
- **Free trial duration**: 14 days
- **Welcome link**: `/shopify/welcome`
- **Display name**: Scale
- **Top features**:
  - 14-day free trial
  - Dedicated 7-8 figure ecommerce coach
  - Access to our CRO and Ad Specialists
  - All Momentum features
  - No commission on sales
  - White-glove onboarding

##### Plan 4: Enterprise (Monthly)
- **Billing**: Monthly
- **Monthly charge**: $599.00
- **Free trial duration**: 14 days
- **Welcome link**: `/shopify/welcome`
- **Display name**: Enterprise
- **Top features**:
  - 14-day free trial
  - Custom packaging
  - Store inventory in our warehouse for free
  - Advanced supply-chain logistics
  - All Scale features
  - Dedicated account manager

#### Annual Plans (Optional but Recommended)

##### Plan 5: Startup Annual
- **Billing**: Annual
- **Annual charge**: $299.00
- **Free trial duration**: 14 days
- **Welcome link**: `/shopify/welcome`
- **Display name**: Startup Annual
- **Top features**:
  - Save 14% vs monthly
  - Email support
  - 14-day free trial
  - All features included
  - No commission on sales
  - Cancel anytime

##### Plan 6: Momentum Annual
- **Billing**: Annual
- **Annual charge**: $999.00
- **Free trial duration**: 14 days
- **Welcome link**: `/shopify/welcome`
- **Display name**: Momentum Annual
- **Top features**:
  - Save 16% vs monthly
  - Priority support
  - 14-day free trial
  - All Startup features
  - Access to exclusive community
  - No commission on sales
  - Advanced analytics

##### Plan 7: Scale Annual
- **Billing**: Annual
- **Annual charge**: $2,999.00
- **Free trial duration**: 14 days
- **Welcome link**: `/shopify/welcome`
- **Display name**: Scale Annual
- **Top features**:
  - Save 17% vs monthly
  - 14-day free trial
  - Dedicated 7-8 figure ecommerce coach
  - Access to our CRO and Ad Specialists
  - All Momentum features
  - No commission on sales
  - White-glove onboarding

##### Plan 8: Enterprise Annual
- **Billing**: Annual
- **Annual charge**: $5,999.00
- **Free trial duration**: 14 days
- **Welcome link**: `/shopify/welcome`
- **Display name**: Enterprise Annual
- **Top features**:
  - Save 17% vs monthly
  - 14-day free trial
  - Custom packaging
  - Store inventory in our warehouse for free
  - Advanced supply-chain logistics
  - All Scale features
  - Dedicated account manager

### 1.3 Translate Plan Descriptions (if needed)

If you have multiple app listing languages:
1. Go to each language's app listing
2. Update the plan descriptions to match the language
3. Plan pricing/billing stays the same across all languages

## Step 2: Register Webhook in Partner Dashboard

1. Go to **Apps** > Select your app > **Configuration**
2. Scroll to **Webhooks** section
3. Click **Add webhook**
4. Configure:
   - **Topic**: `APP_SUBSCRIPTIONS_UPDATE`
   - **URL**: `https://[your-supabase-project].supabase.co/functions/v1/shopify-subscription-webhook`
   - **API Version**: Latest stable version
5. Click **Save**

The webhook will receive notifications when:
- Subscription is activated
- Subscription status changes
- Plan is upgraded/downgraded
- Subscription is cancelled

## Step 3: Test Subscription Flow

### 3.1 Create Development Store Test

1. Install your app on a development store
2. The app should immediately redirect to OAuth
3. After OAuth, the store will have a test subscription automatically created
4. Verify in database that `shopify_stores.subscription_status` = 'ACTIVE'
5. Verify `shopify_stores.current_tier` = 'startup'

### 3.2 Test Plan Selection Page

The Shopify-hosted pricing page URL format:
```
https://admin.shopify.com/store/{store_handle}/charges/{app_handle}/pricing_plans
```

Example:
```
https://admin.shopify.com/store/my-dev-store/charges/revoa/pricing_plans
```

Test:
1. Navigate to this URL (replace with your store and app handle)
2. Verify all plans are displayed (4 monthly + 4 annual if configured)
3. Try selecting a monthly plan
4. Try selecting an annual plan
5. Verify redirect to welcome link after approval
6. Check database for updated tier and billing_interval

### 3.3 Test Webhook Delivery

1. Change subscription status in Shopify admin (if possible)
2. Check edge function logs: `supabase functions logs shopify-subscription-webhook`
3. Verify `subscription_history` table has new entries
4. Verify `shopify_stores` table updated correctly

## Step 4: Configure Order Counting Automation

### 4.1 Set Up Daily Cron Job

The `update-order-counts` edge function should run daily. Set up using:

**Option A: Supabase Cron (Recommended)**
```sql
-- Add to migration
SELECT cron.schedule(
  'daily-order-count-update',
  '0 2 * * *', -- Run at 2 AM UTC daily
  $$
  SELECT
    net.http_post(
      url := '[your-supabase-url]/functions/v1/update-order-counts',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
      )
    )
  $$
);
```

**Option B: External Cron Service**
Use a service like Cron-job.org or EasyCron to call:
```
POST https://[your-supabase-project].supabase.co/functions/v1/update-order-counts
Authorization: Bearer [SERVICE_ROLE_KEY]
```

### 4.2 Manual Order Count Update

To manually update order counts for testing:
```bash
curl -X POST \
  https://[your-supabase-project].supabase.co/functions/v1/update-order-counts \
  -H "Authorization: Bearer [SERVICE_ROLE_KEY]" \
  -H "Content-Type: application/json"
```

## Step 5: App Store Compliance

### 5.1 Required Documentation

For App Store submission, provide:

**Test Credentials:**
```
Development Store URL: [your-dev-store].myshopify.com
Admin Email: [email]
Admin Password: [password]

Test Subscription Flow:
1. Install app from dev store
2. App will auto-create test subscription
3. Visit pricing page to test plan selection
4. Subscription updates are logged in database
```

**Demo Screencast:**
Record a video showing:
1. App installation and OAuth flow
2. Subscription automatically created
3. Navigate to pricing page
4. Select different plan
5. Approve charge
6. Show order usage tracking
7. Demonstrate upgrade flow

### 5.2 Compliance Checklist

- [x] Using Managed Pricing (not Billing API)
- [x] All plans configured in Partner Dashboard
- [x] Pricing accurate and complete
- [x] No pricing info in images/logo
- [x] Webhook registered for APP_SUBSCRIPTIONS_UPDATE
- [x] Test charges work on development stores
- [x] Emergency developer contact added
- [x] OAuth authenticates immediately after install
- [x] Embedded app uses App Bridge (not cookies)
- [x] All scopes justified and documented

## Step 6: Testing Checklist

### Before Launch

- [ ] Install on fresh dev store
- [ ] Verify automatic subscription creation
- [ ] Test plan selection page loads
- [ ] Test upgrading between tiers (monthly)
- [ ] Test selecting annual plan
- [ ] Test switching between monthly and annual
- [ ] Test downgrading (if applicable)
- [ ] Verify webhook receives updates
- [ ] Check database updates correctly (tier + billing_interval)
- [ ] Test 14-day trial period countdown
- [ ] Test order counting accuracy
- [ ] Test upgrade notifications at 80% usage
- [ ] Test urgent notifications at 95% usage
- [ ] Verify subscription status widget displays correctly
- [ ] Test usage meter shows accurate data
- [ ] Verify comparison modal works
- [ ] Test upgrade banner dismissal

### After Launch

- [ ] Monitor webhook delivery success rate
- [ ] Check daily order count updates running
- [ ] Verify notification emails sending
- [ ] Monitor subscription status changes
- [ ] Track tier upgrade conversion rates
- [ ] Review subscription history logs

## Troubleshooting

### Webhook Not Receiving Updates

1. Check webhook URL is correct in Partner Dashboard
2. Verify edge function is deployed: `supabase functions list`
3. Check function logs: `supabase functions logs shopify-subscription-webhook`
4. Test HMAC verification with sample payload
5. Ensure webhook topic is `APP_SUBSCRIPTIONS_UPDATE`

### Order Count Not Updating

1. Check cron job is running: Query `cron.job_run_details` table
2. Manually trigger: Call `update-order-counts` edge function
3. Verify `shopify_orders` table has data
4. Check `monthly_order_counts` table for history
5. Run: `SELECT calculate_monthly_order_count('[store-id]');`

### Subscription Status Not Showing

1. Verify store exists in `shopify_stores` table
2. Check `subscription_status` column value
3. Ensure `current_tier` is set correctly
4. Look for errors in `subscription_history` table
5. Verify OAuth flow completed successfully

### Plan Selection Page 404

1. Verify Managed Pricing is enabled in Partner Dashboard
2. Check app handle matches in URL
3. Ensure store is using correct Shopify admin URL format
4. Try accessing from Shopify admin directly
5. Confirm plans are created in Partner Dashboard

## API Reference

### Database Functions

```sql
-- Calculate order count for a store
SELECT calculate_monthly_order_count('store-id-here');

-- Update order count and create history
SELECT update_store_order_count('store-id-here');

-- Get recommended tier based on order count
SELECT get_recommended_tier(150); -- Returns 'momentum'
```

### Edge Functions

```bash
# Update order counts (requires service role key)
POST /functions/v1/update-order-counts

# Process subscription webhook (called by Shopify)
POST /functions/v1/shopify-subscription-webhook
```

### Frontend Services

```typescript
// Get current subscription
const subscription = await getSubscription(storeId);

// Update order count
const count = await updateOrderCount(storeId);

// Get order analysis
const analysis = await getOrderCountAnalysis(storeId);

// Check if needs upgrade notification
const notification = shouldNotifyUpgrade(orderCount, currentTier);

// Get subscription history
const history = await getSubscriptionHistory(storeId, 10);
```

## Support

For issues or questions:
- Check edge function logs in Supabase dashboard
- Review subscription_history table for status changes
- Monitor webhook delivery in Partner Dashboard
- Contact Shopify Partner Support for billing questions

## Next Steps

1. ✅ Complete Partner Dashboard setup
2. ✅ Deploy edge functions
3. ✅ Configure webhooks
4. ✅ Set up daily cron job
5. ✅ Test on development store
6. ✅ Record demo screencast
7. ✅ Submit for App Store review

Your order-based subscription system is now ready! 🎉
