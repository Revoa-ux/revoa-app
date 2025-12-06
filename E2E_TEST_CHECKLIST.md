# E2E Testing Quick Checklist

## Pre-Test Setup
- [ ] Run cleanup SQL script (`cleanup-test-data.sql`)
- [ ] Verify Maddie's account: `ammazonrev2@gmail.com`
- [ ] Verify Tyler's admin account: `tyler@revoa.app`
- [ ] Ensure Shopify test store is connected
- [ ] Clear browser cache (optional but recommended)

---

## 1. Quote Request (Maddie - User)
- [ ] Login as `ammazonrev2@gmail.com`
- [ ] Navigate to "Request Quote"
- [ ] Fill in product details
- [ ] Submit quote
- [ ] Verify quote appears as PENDING

---

## 2. Process Quote (Tyler - Admin)
- [ ] Login as `tyler@revoa.app`
- [ ] Go to Admin → Quotes
- [ ] Find Maddie's pending quote
- [ ] Click "Process Quote"
- [ ] Add variant details (SKU, cost, shipping)
- [ ] Configure Factory's Product Warranty
- [ ] Configure Logistics Shipment Coverage
- [ ] Submit processed quote
- [ ] Verify status changes to ACCEPTED

---

## 3. Verify Notifications
- [ ] Check email sent to `ammazonrev2@gmail.com`
- [ ] Check auto-message in Maddie's Supplier Chat
- [ ] Verify "View Quote" link works
- [ ] Confirm quote shows on "Get Quotes" page

---

## 4. Check Unread Badge
- [ ] New message badge appears on "Supplier Chat" link
- [ ] Badge shows count or "New Messages"
- [ ] Badge clears after viewing chat

---

## 5. Accept Quote & Sync (Maddie - User)
- [ ] Login as `ammazonrev2@gmail.com`
- [ ] Go to "Get Quotes"
- [ ] Accept Tyler's quote
- [ ] Click "Sync to Store"
- [ ] Select test product from Shopify
- [ ] Complete sync
- [ ] Verify sync confirmation

---

## 6. Create Test Order
- [ ] Go to Shopify test store admin
- [ ] Create new order with synced product
- [ ] Add customer details
- [ ] Complete the order
- [ ] Verify webhook received in Revoa
- [ ] Check order appears in dashboard

---

## 7. Create Order Thread (Maddie - User)
- [ ] Login as `ammazonrev2@gmail.com`
- [ ] Go to "Supplier Chat"
- [ ] Find the new order
- [ ] Click "Create Thread"
- [ ] Verify auto-message appears
- [ ] Check customer sidebar opens
- [ ] Confirm order details visible
- [ ] Verify email templates available

---

## 8. Admin Thread View (Tyler - Admin)
- [ ] Login as `tyler@revoa.app`
- [ ] Go to Admin → Chat
- [ ] Select Maddie's conversation
- [ ] Check thread dropdown appears in header
- [ ] Verify both "Main Chat" and order thread listed
- [ ] Switch to order thread
- [ ] Click info (i) button
- [ ] Verify customer sidebar shows (not user info)
- [ ] Confirm customer details correct
- [ ] Check order information accurate

---

## 9. Test Messages in Thread
### User sends message
- [ ] Maddie sends message in order thread
- [ ] Tyler receives it in correct thread
- [ ] Message doesn't appear in main chat

### Admin replies
- [ ] Tyler replies in order thread
- [ ] Maddie receives it in correct thread
- [ ] Message doesn't appear in main chat

### Thread isolation
- [ ] Main chat messages stay in main chat
- [ ] Thread messages stay in thread
- [ ] No cross-contamination

---

## 10. Final Verification
- [ ] Real-time updates working
- [ ] Customer info persists correctly
- [ ] Thread dropdown functions properly
- [ ] Info sidebar switches correctly
- [ ] No console errors
- [ ] No database errors
- [ ] All features accessible

---

## If Issues Found

### Immediate Actions
1. Note exact step where failure occurred
2. Screenshot the issue
3. Check browser console for errors
4. Check network tab for failed requests

### Investigation
1. Run relevant SQL debug queries
2. Check Supabase logs
3. Verify webhook delivery (if applicable)
4. Test in incognito mode

### Documentation
1. Document the issue clearly
2. Note reproduction steps
3. Include error messages
4. Add to issue tracker

---

## Success Criteria
**All items above checked = Full Circle Complete! 🎉**

---

## Quick SQL Checks During Testing

```sql
-- Check if chat exists
SELECT * FROM chats WHERE user_id = (
  SELECT id FROM auth.users WHERE email = 'ammazonrev2@gmail.com'
);

-- Check messages
SELECT * FROM messages WHERE chat_id = 'CHAT_ID' ORDER BY created_at DESC LIMIT 10;

-- Check threads
SELECT * FROM chat_threads WHERE chat_id = 'CHAT_ID';

-- Check quote status
SELECT status, * FROM product_quotes WHERE user_id = (
  SELECT id FROM auth.users WHERE email = 'ammazonrev2@gmail.com'
) ORDER BY created_at DESC LIMIT 1;
```
