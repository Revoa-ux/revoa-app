# Shopify Managed Pricing - Full Compliance Implementation

## Overview

This app is **fully compliant** with Shopify Managed Pricing policies. All billing operations are handled exclusively by Shopify's billing system.

## What We Do (Compliant)

### ✅ Display Pricing Information
- Show tier details and pricing for comparison
- Display current subscription status and usage
- Calculate price differences for display purposes only

### ✅ Redirect to Shopify for All Billing Changes
- Upgrade/downgrade buttons open Shopify's hosted pricing page
- Monthly/annual plan selection happens on Shopify's UI
- All payment processing handled by Shopify

### ✅ Listen to Webhook Updates
- Receive `APP_SUBSCRIPTIONS_UPDATE` webhook from Shopify
- Update local database to reflect subscription state
- Track billing intervals (monthly/annual) for analytics

## What We DON'T Do (By Design)

### ❌ No In-App Billing UI
- We never process payments in our app
- We never modify subscriptions programmatically
- We never calculate or apply proration

### ❌ No Direct Subscription API Calls
- We don't use `appSubscriptionCreate` mutation
- We don't use `appSubscriptionUpdate` mutation
- We don't use `appSubscriptionCancel` mutation

### ❌ No Trial/Interval Enforcement
- Trial periods are defined in Partner Dashboard
- Billing intervals (monthly/annual) are configured by Shopify
- Our code only reads these values, never sets them

## Implementation Details

### Trial Period Configuration
- **All tiers**: 14-day free trial
- Configured in Shopify Partner Dashboard
- App displays trial period but doesn't enforce it

### Billing Intervals Supported
- **Monthly plans**: Startup ($29), Momentum ($99), Scale ($299), Enterprise ($599)
- **Annual plans**: Configured in Partner Dashboard with matching names
- App detects interval from plan name (e.g., "Startup Annual" → annual)

### Plan Names in Partner Dashboard

**Monthly Plans:**
- "Startup" → $29/month, 14-day trial
- "Momentum" → $99/month, 14-day trial
- "Scale" → $299/month, 14-day trial
- "Enterprise" → $599/month, 14-day trial

**Annual Plans (Optional):**
- "Startup Annual" → $299/year, 14-day trial
- "Momentum Annual" → $999/year, 14-day trial
- "Scale Annual" → $2,999/year, 14-day trial
- "Enterprise Annual" → $5,999/year, 14-day trial

### Webhook Processing

The `shopify-subscription-webhook` function:
1. Verifies HMAC signature from Shopify
2. Extracts plan name and status from webhook payload
3. Normalizes plan name to tier (strips "Annual" suffix)
4. Detects billing interval from plan name
5. Updates `shopify_stores` table with new state
6. Records change in `subscription_history` table
7. Sends notification to merchant

### Database Schema

**shopify_stores table:**
- `current_tier`: 'startup' | 'momentum' | 'scale' | 'enterprise'
- `subscription_status`: 'ACTIVE' | 'PENDING' | 'CANCELLED' | etc.
- `billing_interval`: 'monthly' | 'annual' (for display only)
- `shopify_subscription_id`: Reference to Shopify's subscription

**subscription_history table:**
- Tracks all subscription changes over time
- Includes billing interval for each event
- Used for analytics and merchant history

## User Experience Flow

### 1. Installation
- Merchant installs app from Shopify App Store
- OAuth flow completes
- Test subscription automatically created by Shopify (dev stores)

### 2. Plan Selection
- Merchant clicks "Upgrade" or "View Plans" in app
- Redirected to: `https://admin.shopify.com/store/{store}/charges/{app}/pricing_plans`
- Merchant selects plan and billing interval on Shopify's UI
- Shopify handles payment processing and confirmation

### 3. Subscription Updates
- Shopify sends webhook to our app when subscription changes
- App updates local database to reflect new state
- Merchant sees updated tier/status in app immediately

### 4. Usage Monitoring
- App tracks order count (rolling 30-day window)
- Displays usage as percentage of plan limit
- Shows upgrade suggestions when approaching limit
- Upgrade buttons redirect to Shopify's pricing page

## Code Documentation

### Display-Only Functions

```typescript
// subscriptionService.ts

/**
 * Calculate cost difference for tier upgrade
 * NOTE: This is for DISPLAY purposes only. Actual billing handled by Shopify.
 */
export function calculateUpgradeCost(currentTier, targetTier): number

/**
 * Get Shopify plan selection URL
 * Returns URL to Shopify's hosted pricing page.
 * All billing operations MUST be performed on Shopify's UI.
 */
export function getShopifyPricingUrl(shopDomain): string
```

### Pricing Configuration

```typescript
// PricingTiers.tsx

// NOTE: Pricing configuration is for DISPLAY ONLY
// Actual billing is handled by Shopify Managed Pricing
// These values must match the plans configured in Partner Dashboard
export const pricingTiers: PricingTier[] = [...]
```

## Testing Checklist

### Development Store Testing
- [ ] Install app on dev store
- [ ] Verify test subscription created automatically
- [ ] Navigate to Shopify pricing page
- [ ] Select different plan
- [ ] Verify webhook received and processed
- [ ] Check database updated correctly
- [ ] Verify billing interval detected correctly

### Production Testing
- [ ] Verify all plans visible on Shopify pricing page
- [ ] Test monthly plan selection
- [ ] Test annual plan selection (if configured)
- [ ] Verify trial period works correctly
- [ ] Test plan upgrades
- [ ] Test plan downgrades
- [ ] Verify webhook delivery success rate

## Compliance Checklist

- [x] Using Managed Pricing (not Billing API)
- [x] All plans configured in Partner Dashboard
- [x] No in-app billing UI
- [x] All billing changes redirect to Shopify
- [x] Webhook receives and processes updates
- [x] Trial periods defined in Partner Dashboard
- [x] Billing intervals handled by Shopify
- [x] No programmatic subscription modifications
- [x] Display-only cost calculations documented
- [x] Annual plans supported via naming convention

## Support & Troubleshooting

### Webhook Not Updating
1. Check webhook registered in Partner Dashboard
2. Verify HMAC verification passes
3. Check edge function logs: `supabase functions logs shopify-subscription-webhook`
4. Ensure webhook topic is `APP_SUBSCRIPTIONS_UPDATE`

### Billing Interval Not Detected
1. Verify plan name includes "Annual" or "Yearly" keyword
2. Check webhook payload for actual plan name
3. Review `subscription_history` table for recorded interval
4. Update `normalizePlanName` function if needed

### Merchants Can't Change Plans
1. Ensure they're navigating to Shopify pricing page (not app UI)
2. Verify pricing page URL is correct
3. Check that plans are published in Partner Dashboard
4. Confirm merchant has necessary Shopify permissions

## References

- [Shopify Managed Pricing Documentation](https://shopify.dev/docs/apps/launch/billing-pricing/managed-pricing)
- [APP_SUBSCRIPTIONS_UPDATE Webhook](https://shopify.dev/docs/api/admin-graphql/latest/webhooks/APP_SUBSCRIPTIONS_UPDATE)
- Partner Dashboard: Apps → Your App → Distribution → Manage listing → Pricing

---

**Last Updated**: January 2026
**Compliance Status**: ✅ Fully Compliant
