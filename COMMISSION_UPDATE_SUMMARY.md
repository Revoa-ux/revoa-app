# Commission Rate Update: 3% → 2%

## Summary

The platform commission rate has been updated from **3%** to **2%** to better account for supplier expenses and profit margins.

## Reasoning

Your supplier operates on a business model where:
- Products are marked up by **10%** (this covers their costs and profit)
- With a 3% platform fee, this left only ~7% for the supplier
- By reducing to 2%, the supplier retains ~8% net profit
- This is more sustainable for the supplier's business

## What Was Changed

### 1. Database Schema ✅
- Default `commission_rate` changed from 3.00 to 2.00 in `suppliers` table
- Any existing suppliers with 3% were automatically updated to 2%
- Database migration: `20251002_update_commission_to_2_percent.sql`

### 2. Edge Function ✅
- The Stripe Connect Edge Function (`stripe-connect`) already pulls commission rate dynamically from database
- No changes needed - automatically uses the new 2% rate

### 3. Service Layer ✅
- `stripeConnect.ts` - default commission rate updated to 2.00

### 4. UI Components ✅
- `Suppliers.tsx` - Add Supplier form now defaults to 2%
- `CheckoutModal.tsx` - Customer-facing text updated to mention 2% fee

### 5. Documentation ✅
- `STRIPE_CONNECT_SETUP.md` - Comprehensive guide updated throughout
- Added explanation of why 2% makes sense for the business model

## Payment Flow (Example with $100 Transaction)

**Before (3%):**
- Customer pays: $100
- Platform fee: $3
- Supplier receives: $97
- Supplier's net (after 10% markup): ~$7

**After (2%):**
- Customer pays: $100
- Platform fee: $2
- Supplier receives: $98
- Supplier's net (after 10% markup): ~$8

## Impact

### For You (Platform)
- ✅ Slightly lower revenue per transaction (2% vs 3%)
- ✅ More sustainable for supplier relationship
- ✅ Better alignment with supplier economics

### For Supplier
- ✅ 1% more per transaction
- ✅ Better profit margins
- ✅ More sustainable business model
- ✅ ~8% net profit vs ~7% previously

### For Customers
- ✅ No change in pricing
- ✅ Same checkout experience

## Testing

To verify the update:

1. **Create a new supplier:**
   - Go to Admin → Suppliers → Add Supplier
   - Verify default commission is 2%

2. **Check existing suppliers:**
   - View supplier list
   - Commission rate should show 2%

3. **Test a transaction:**
   - Create a payment
   - Verify platform fee is 2% of total
   - Verify supplier receives 98%

## Sales Tax Implications

No change to tax structure:
- Supplier remains the merchant of record
- Supplier handles all product sales tax
- You're only responsible for taxes on your 2% service fee (vs 3% before)
- This may slightly reduce your tax obligation

## Questions?

If you need to adjust the commission rate again in the future:
1. Update the `suppliers` table default value
2. Run a migration to update existing suppliers if needed
3. UI components will automatically reflect the new rate
