# End-to-End Testing Workflow Guide

## Test Users
- **User (Customer)**: Maddie - `ammazonrev2@gmail.com`
- **Admin (Supplier)**: Tyler - `tyler@revoa.app`

## Pre-Test Setup

### 1. Clean Up Mock Data
Before starting the test, clean up any existing mock data between these users:

```sql
-- Get user IDs
SELECT id, email FROM auth.users WHERE email IN ('ammazonrev2@gmail.com', 'tyler@revoa.app');

-- Delete existing chat data (replace USER_IDs with actual IDs)
DELETE FROM messages WHERE chat_id IN (
  SELECT id FROM chats WHERE user_id = 'MADDIE_USER_ID'
);

DELETE FROM chat_threads WHERE chat_id IN (
  SELECT id FROM chats WHERE user_id = 'MADDIE_USER_ID'
);

DELETE FROM chats WHERE user_id = 'MADDIE_USER_ID';

-- Clean up any test quotes (optional, if you want fresh start)
DELETE FROM product_quotes WHERE user_id = 'MADDIE_USER_ID' AND status = 'PENDING';
```

## Testing Workflow

### Step 1: Quote Request (User: Maddie)
**Action**: Maddie requests a product quote

1. Log in as `ammazonrev2@gmail.com`
2. Navigate to "Request Quote" page
3. Fill in product details:
   - Product name
   - Description
   - Quantity needed
   - Target price (optional)
4. Submit the quote request
5. **Expected**: Quote appears in pending status

**Verification Points**:
- [ ] Quote created successfully
- [ ] Status shows as "PENDING"
- [ ] User can see the quote in their quotes list

---

### Step 2: Process Quote (Admin: Tyler)
**Action**: Tyler processes and accepts the quote

1. Log in as `tyler@revoa.app`
2. Navigate to Admin > "Quotes" page
3. Find Maddie's pending quote
4. Click "Process Quote"
5. Add product variants with:
   - SKU
   - Cost per item
   - Shipping rates
6. Set product policies:
   - Factory's Product Warranty (toggle on/off, set days)
   - Logistics Shipment Coverage (toggle on/off, select coverages)
7. Submit the processed quote

**Verification Points**:
- [ ] Quote status changes to "ACCEPTED"
- [ ] All variant details are saved
- [ ] Policy information is stored

---

### Step 3: User Notification & Chat Message
**Expected Automated Actions**:

1. **Email Notification**: Maddie receives email about new quote
2. **Chat Auto-Message**: In Supplier Chat, Maddie sees:
   - New message: "You have a new quote"
   - Click to view link/button
   - Message takes user to the quote details

**Verification Points**:
- [ ] Email sent to `ammazonrev2@gmail.com`
- [ ] Auto-message appears in Supplier Chat
- [ ] "View Quote" link works correctly
- [ ] Quote appears on "Get Quotes" page

---

### Step 4: Unread Message Badge
**Expected**: When new messages arrive

1. **User Side**: Red badge/dot appears on "Supplier Chat" sidebar link
2. Badge shows "New Messages" or count
3. Badge disappears after reading messages

**Verification Points**:
- [ ] Badge appears immediately on new message
- [ ] Badge is visible on sidebar
- [ ] Badge clears after viewing chat

---

### Step 5: User Accepts Quote & Syncs to Store (User: Maddie)
**Action**: Maddie accepts the quote and syncs to Shopify

1. Log in as `ammazonrev2@gmail.com`
2. Navigate to "Get Quotes" page
3. Find Tyler's processed quote
4. Click "Accept Quote"
5. Select "Sync to Store"
6. Choose a test product from Shopify store
7. Complete the sync process

**Verification Points**:
- [ ] Quote status changes to "SYNCED" or appropriate status
- [ ] Product linked to Shopify product
- [ ] Sync confirmation message appears

---

### Step 6: Create Test Order in Shopify
**Action**: Create a test order in the connected Shopify store

1. Go to Shopify admin for test store
2. Create a new order with:
   - Product that was synced from quote
   - Customer information
   - Shipping address
3. Process/complete the order

**Verification Points**:
- [ ] Order webhook received by Revoa
- [ ] Order appears in user's dashboard
- [ ] Order available for thread creation

---

### Step 7: Create Order Thread (User: Maddie)
**Action**: Create a new thread for the order

1. Log in as `ammazonrev2@gmail.com`
2. Navigate to "Supplier Chat"
3. Find the order in orders list
4. Click "Create Thread" or similar button
5. **Expected**:
   - New thread created
   - Instant auto-message appears: "Order #[number] thread created"
   - Customer sidebar shows order customer info
   - Order details visible in sidebar
   - Email templates available for this order

**Verification Points**:
- [ ] Thread created successfully
- [ ] Auto-message sent immediately
- [ ] Customer sidebar opens with correct customer
- [ ] Order information displays correctly
- [ ] Customer details match order
- [ ] Email templates loaded

---

### Step 8: Admin Views Thread (Admin: Tyler)
**Action**: Tyler sees the new thread in his chat with Maddie

1. Log in as `tyler@revoa.app`
2. Navigate to Admin > "Chat"
3. Select conversation with Maddie
4. **Expected**:
   - Thread dropdown appears in chat header
   - Lists: Main Chat + Order Thread(s)
   - Can switch between threads
5. Select the order thread
6. Click the "Info" (i) button
7. **Expected**:
   - Sidebar shows CUSTOMER info (not Maddie's user info)
   - Order details visible
   - Customer name, email, address
   - Order items and status

**Verification Points**:
- [ ] Thread dropdown visible in header
- [ ] Both main chat and order thread listed
- [ ] Can switch between threads smoothly
- [ ] Info button shows customer sidebar (not user sidebar)
- [ ] Customer details are correct
- [ ] Order information is accurate

---

### Step 9: Full Circle Verification
**Action**: Verify complete workflow integration

1. **User sends message in order thread**:
   - Maddie sends message in order thread
   - Tyler receives it in correct thread

2. **Admin replies in order thread**:
   - Tyler replies in order thread
   - Maddie receives it in correct thread

3. **Thread isolation**:
   - Messages in order thread don't appear in main chat
   - Messages in main chat don't appear in order thread

4. **Customer info persistence**:
   - Customer sidebar remains correct throughout
   - Order details stay linked to thread

**Verification Points**:
- [ ] Messages route correctly to threads
- [ ] Thread isolation works properly
- [ ] Customer info stays accurate
- [ ] No cross-contamination between threads
- [ ] All real-time updates work

---

## Common Issues to Watch For

### Database Issues
- Orphaned messages
- Incorrect chat_id or thread_id
- Missing foreign key relationships

### Real-time Issues
- Websocket disconnections
- Message delivery delays
- Badge update delays

### UI Issues
- Thread dropdown not updating
- Customer sidebar showing wrong data
- Email templates not loading

### Notification Issues
- Email not sent
- Auto-messages not created
- Badge not appearing

---

## SQL Queries for Debugging

### Check User IDs
```sql
SELECT id, email, created_at
FROM auth.users
WHERE email IN ('ammazonrev2@gmail.com', 'tyler@revoa.app');
```

### Check Chat Status
```sql
SELECT c.*, u.email
FROM chats c
JOIN auth.users u ON c.user_id = u.id
WHERE u.email = 'ammazonrev2@gmail.com';
```

### Check Messages
```sql
SELECT m.*, c.user_id
FROM messages m
JOIN chats c ON m.chat_id = c.id
JOIN auth.users u ON c.user_id = u.id
WHERE u.email = 'ammazonrev2@gmail.com'
ORDER BY m.created_at DESC
LIMIT 20;
```

### Check Threads
```sql
SELECT t.*, so.order_number, so.customer_name
FROM chat_threads t
JOIN chats c ON t.chat_id = c.id
JOIN shopify_orders so ON t.order_id = so.id
JOIN auth.users u ON c.user_id = u.id
WHERE u.email = 'ammazonrev2@gmail.com';
```

### Check Quotes
```sql
SELECT pq.*, u.email as user_email
FROM product_quotes pq
JOIN auth.users u ON pq.user_id = u.id
WHERE u.email = 'ammazonrev2@gmail.com'
ORDER BY pq.created_at DESC;
```

---

## Success Criteria

The test is successful when:

1. ✅ Quote request → processing → acceptance flow works smoothly
2. ✅ Notifications (email + chat message) are sent correctly
3. ✅ Unread message badge appears and clears properly
4. ✅ Quote sync to Shopify works
5. ✅ Order webhook creates order in system
6. ✅ Thread creation works with auto-message
7. ✅ Customer sidebar shows correct customer (not user)
8. ✅ Admin can see and switch between threads
9. ✅ Info button shows customer data in threads
10. ✅ Messages route correctly between main chat and threads

---

## Next Steps After Testing

If issues are found:
1. Document the specific failure point
2. Check browser console for errors
3. Check server logs for API errors
4. Verify database state with SQL queries
5. Test in incognito/private browsing to rule out cache issues

If everything works:
1. Document any edge cases discovered
2. Create user documentation
3. Prepare for production rollout
4. Set up monitoring for critical paths
