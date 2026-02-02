# Testing Environment Ready ✅

## Changes Made

### 1. UI Improvements
- ✅ Removed blue focus ring from message input boxes
  - Admin chat input (ChatInput component)
  - User chat input (Chat page)
- ✅ Product Policies section improvements
  - Split into two separate cards
  - Responsive layout (side-by-side on desktop, stacked on mobile)
  - Title size matches Product Variants
  - Factory's Product Warranty toggle (default OFF)
  - Logistics Shipment Coverage toggle (default OFF)

### 2. Testing Documentation Created
Three comprehensive documents for E2E testing:

#### 📋 E2E_TESTING_WORKFLOW.md
- Complete step-by-step testing guide
- Detailed verification points for each step
- SQL queries for debugging
- Common issues to watch for
- Success criteria

#### 🗑️ cleanup-test-data.sql
- Safe data cleanup script
- Review queries before deletion
- Targets only test user data
- Verification queries included

#### ✅ E2E_TEST_CHECKLIST.md
- Quick reference checklist
- Simple checkbox format
- All 10 testing steps
- Quick SQL checks

---

## Test Environment

### Test Accounts
| Role | Email | Name |
|------|-------|------|
| User (Customer) | `ammazonrev2@gmail.com` | Maddie |
| Admin (Supplier) | `tyler@revoa.app` | Tyler |

---

## Testing Workflow Summary

```
1. Maddie → Request Quote
   ↓
2. Tyler → Process Quote
   ↓
3. System → Send Notifications (Email + Chat)
   ↓
4. System → Show Unread Badge
   ↓
5. Maddie → Accept Quote & Sync to Store
   ↓
6. Shopify → Create Test Order
   ↓
7. Maddie → Create Order Thread
   ↓
8. Tyler → View Thread in Chat Dropdown
   ↓
9. Both → Exchange Messages in Thread
   ↓
10. Verify → Customer Sidebar Shows Correct Data
```

---

## Before You Start Testing

### 1. Clean Up Mock Data
```bash
# Open Supabase SQL Editor
# Copy and run queries from cleanup-test-data.sql
# Review what will be deleted first!
# Uncomment DELETE sections after review
```

### 2. Verify Connections
- [ ] Shopify test store is connected
- [ ] Email service is configured
- [ ] Webhooks are active
- [ ] Database is accessible

### 3. Prepare Browser
- [ ] Clear cache (optional)
- [ ] Open two browser windows/profiles
  - Window 1: Maddie (User)
  - Window 2: Tyler (Admin)

---

## What Gets Tested

### Core Features
1. ✅ Quote Request → Processing → Acceptance
2. ✅ Email notifications
3. ✅ Chat auto-messages
4. ✅ Unread message badges
5. ✅ Quote sync to Shopify
6. ✅ Order webhook processing
7. ✅ Thread creation
8. ✅ Customer sidebar (not user sidebar)
9. ✅ Thread dropdown navigation
10. ✅ Message routing and isolation

### Integration Points
- Frontend ↔ Backend API
- Backend ↔ Supabase Database
- Webhook ↔ Shopify
- Real-time ↔ WebSocket
- Email ↔ Email Service

---

## Expected Behavior

### When Quote is Processed
1. User receives email notification
2. Auto-message appears in Supplier Chat
3. Message includes "View Quote" link
4. Unread badge appears on sidebar

### When Thread is Created
1. Auto-message sent immediately
2. Customer sidebar opens (NOT user sidebar)
3. Order details displayed
4. Email templates loaded
5. Thread appears in admin's dropdown

### In Thread View (Admin)
1. Dropdown shows: "Main Chat" + Thread name(s)
2. Can switch between threads
3. Info button shows **customer** data (not user)
4. Messages stay isolated per thread

---

## Common Issues & Solutions

### Issue: No auto-message after quote acceptance
**Check**:
- `threadAutoMessageService` is running
- Database trigger is active
- WebSocket connection is active

### Issue: Badge doesn't appear
**Check**:
- Notification service is enabled
- Real-time subscriptions working
- Browser has notifications enabled

### Issue: Customer sidebar shows user info
**Check**:
- Thread has `order_id` set
- Order has customer data
- Sidebar logic checks for thread context

### Issue: Messages appear in wrong thread
**Check**:
- Message `thread_id` is set correctly
- Frontend sends correct thread context
- Database constraints are enforced

---

## Debugging Tools

### Browser Console
```javascript
// Check current thread
console.log(currentThread);

// Check WebSocket connection
console.log(supabase.getChannels());

// Check messages
console.log(messages);
```

### SQL Queries
See `E2E_TESTING_WORKFLOW.md` for complete debugging queries

---

## Success Indicators

### ✅ Test Passes When:
- All 10 steps complete without errors
- Notifications sent correctly
- Messages route properly
- Customer data displays correctly
- Real-time updates work
- No console errors
- No database errors

### ❌ Test Fails When:
- Any step cannot be completed
- Data doesn't sync properly
- Wrong information displayed
- Real-time updates fail
- Console shows errors

---

## After Testing

### If Successful
1. ✅ Document any edge cases found
2. ✅ Note performance observations
3. ✅ Mark system as production-ready
4. ✅ Prepare user documentation
5. ✅ Set up monitoring

### If Issues Found
1. 🔍 Document exact failure point
2. 🔍 Gather error logs
3. 🔍 Create bug report
4. 🔍 Prioritize fixes
5. 🔍 Re-test after fixes

---

## Quick Start

### Option 1: Step-by-Step
Use `E2E_TESTING_WORKFLOW.md` for detailed guidance

### Option 2: Checklist
Use `E2E_TEST_CHECKLIST.md` for quick checkbox format

### Option 3: Clean Start
1. Run `cleanup-test-data.sql`
2. Follow workflow or checklist
3. Document results

---

## Files Reference

| File | Purpose |
|------|---------|
| `E2E_TESTING_WORKFLOW.md` | Detailed step-by-step guide |
| `E2E_TEST_CHECKLIST.md` | Quick checkbox reference |
| `cleanup-test-data.sql` | Database cleanup script |
| `TESTING_READY.md` | This overview document |

---

## Contact & Support

If you encounter issues during testing:
1. Check the debugging section in workflow guide
2. Review SQL queries for data verification
3. Check browser console and network tab
4. Review Supabase logs
5. Document and report findings

---

**The system is ready for comprehensive end-to-end testing! 🚀**

Start with data cleanup, then follow either the detailed workflow or quick checklist.
