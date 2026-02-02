# Stripe Connect Setup Guide

This guide will help you set up Stripe Connect for your marketplace platform with automatic 2% commission.

## Overview

Your marketplace uses **Stripe Connect** to process payments. Here's how it works:

- **Supplier** receives payments directly to their Stripe account
- **Platform** (you) automatically collects 2% commission on each transaction
- **Supplier** is responsible for sales tax (they are the merchant of record)
- **You** are only liable for taxes on your 2% service fee

## Why 2%?

The 2% commission is calculated to account for the supplier's business model:
- Supplier marks up products by 10% (that's their profit margin)
- Platform takes 2% of the total transaction
- This leaves the supplier with ~8% net profit after covering their expenses

## Prerequisites

1. A Stripe account
2. Stripe Connect enabled in your account
3. Your supplier's business information

## Step 1: Enable Stripe Connect

1. Log in to your [Stripe Dashboard](https://dashboard.stripe.com)
2. Go to **Settings** → **Connect**
3. Click **Get Started** to enable Stripe Connect
4. Choose **Platform** as your account type

## Step 2: Get Your API Keys

1. In your Stripe Dashboard, go to **Developers** → **API keys**
2. Copy your **Publishable key** and **Secret key**
3. Add these to your `.env` file:

```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
```

**IMPORTANT:** The Stripe Connect Edge Function will automatically use these keys. Secrets are configured automatically - you do NOT need to manually configure them.

## Step 3: Set Up Webhook Endpoint

1. In your Stripe Dashboard, go to **Developers** → **Webhooks**
2. Click **Add endpoint**
3. Enter your webhook URL:
   ```
   https://your-project.supabase.co/functions/v1/stripe-connect/webhook
   ```
4. Select the following events:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `charge.refunded`
5. Copy the **Signing secret**
6. Add it to your `.env` file:
   ```env
   STRIPE_WEBHOOK_SECRET=whsec_...
   ```

## Step 4: Add Your Supplier

1. Log in to your admin dashboard
2. Navigate to **Suppliers**
3. Click **Add Supplier**
4. Fill in the supplier details:
   - Business Name
   - Email Address
   - Commission Rate (default: 2%)
5. Click **Create Supplier**

## Step 5: Connect Supplier to Stripe

1. In the Suppliers list, find your supplier
2. Click **Connect Stripe** button
3. This will redirect to Stripe's onboarding flow
4. Have your supplier complete the onboarding:
   - Business information
   - Bank account details
   - Tax information
5. After completion, the supplier status will update to **Active**

## Step 6: Link Products to Supplier

Products will automatically be linked to your first supplier. If you need to change the supplier for a product:

1. Go to the database (Supabase dashboard)
2. Update the `supplier_id` column in the `products` table

## How Payments Work

### For Customers:

1. Customer selects a product and proceeds to checkout
2. Customer enters payment information
3. Payment is processed through Stripe

### Behind the Scenes:

1. Payment Intent is created with:
   - **Total Amount**: $100 (example)
   - **Platform Fee**: $2 (2% of $100)
   - **Supplier Amount**: $98 (remaining after fee)

2. Stripe processes the payment:
   - Customer is charged $100
   - $98 goes to supplier's Stripe account
   - $2 goes to your platform's Stripe account

3. Transaction is recorded in your database with all details

### For Suppliers:

- Receives 98% of each transaction
- Marks up products by ~10% to cover costs and profit
- Net profit: ~8% after platform fee
- Stripe handles payouts to their bank account
- Responsible for their own sales tax obligations
- Can view their earnings in Stripe Dashboard

### For You (Platform):

- Automatically receives 2% of each transaction
- No liability for product sales tax
- Can view all transactions in admin dashboard
- Minimal payment processing responsibility

## Sales Tax Responsibility

**Important:** With Stripe Connect:

- **Supplier** is the merchant of record
- **Supplier** handles all sales tax collection and remittance
- **You** only need to handle taxes on your 2% service fee (if applicable)
- This varies by state/location - consult a tax professional

## Testing

Use Stripe's test mode to verify your setup:

### Test Card Numbers:
- **Success**: `4242 4242 4242 4242`
- **Decline**: `4000 0000 0000 0002`
- **Requires Auth**: `4000 0027 6000 3184`

### Test Details:
- **Expiry**: Any future date (e.g., 12/25)
- **CVC**: Any 3 digits (e.g., 123)
- **ZIP**: Any 5 digits (e.g., 12345)

## Viewing Transactions

### Admin Dashboard

Navigate to **Transactions** to view:
- Total transaction volume
- Platform fees earned
- Supplier payouts
- Individual transaction details
- Payment status

### Supplier Dashboard

Your supplier can view their earnings:
1. Log in to [Stripe Dashboard](https://dashboard.stripe.com)
2. View payouts, transactions, and earnings
3. Manage their connected account settings

## Troubleshooting

### Supplier Can't Complete Onboarding

- Ensure the supplier has valid business information
- Check that the email is correct
- Try the onboarding link again (it may expire)

### Payments Failing

- Verify your Stripe API keys are correct
- Check that the supplier's account is active
- Ensure the supplier has completed onboarding

### Webhook Issues

- Verify the webhook URL is correct
- Check that the signing secret is properly set
- Test the webhook in Stripe Dashboard

## Security Notes

1. **Never expose your Secret Key** - it's only used server-side
2. **Always use HTTPS** for webhook endpoints
3. **Verify webhook signatures** (handled automatically)
4. **Store sensitive data securely** in environment variables

## Going Live

Before processing real payments:

1. Switch from test mode to live mode in Stripe
2. Update your API keys to live keys (start with `sk_live_` and `pk_live_`)
3. Update your webhook endpoint to use live keys
4. Complete Stripe's business verification
5. Test thoroughly with small amounts first

## Support

- **Stripe Documentation**: https://stripe.com/docs/connect
- **Stripe Support**: https://support.stripe.com
- **Your Developer**: Contact your development team for technical issues

## Summary

Your marketplace is now set up to:
- ✅ Process payments securely through Stripe
- ✅ Automatically collect 2% commission
- ✅ Transfer 98% to suppliers
- ✅ Account for supplier's 10% markup and expenses
- ✅ Minimize sales tax liability
- ✅ Track all transactions
- ✅ Provide supplier payment transparency
