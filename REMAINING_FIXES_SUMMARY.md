# Remaining Fixes Summary

## Completed ✅
1. **Guest Customer Display & Debug Logging** - Added console logging to debug customer data loading
2. **Quick Actions Redesign** - Moved all actions into their respective sections with visual edit indicators

## In Progress 🔄

### 4. Auto-Open Customer Sidebar on New Order Thread
- Need to detect when user switches to an order thread
- Auto-expand sidebar when thread has an order_id
- Modify Chat.tsx to check thread.order_id and set sidebar expansion

### 5. Fix CreateThreadModal Categories
- Current categories don't match database templates
- Need to remove "General" category
- Show all template categories from thread_category_auto_messages table:
  - Return
  - Replacement
  - Damaged
  - Defective
  - Inquiry (not "General")

### 6. Make "New Order Thread" Sticky in Dropdown
- In ChannelDropdown component
- "New Order Thread" option should always be visible at bottom
- Not scroll with the list of orders
- Requires CSS position: sticky or separate section

### 7. Fix Quote Acceptance Flow
- User UI ProductQuotes page
- After admin processes quote, status should update
- User should see "Accept Quote" button
- Allow user to sync to existing Shopify product or create new one
- Check product_quotes table and quote processing logic

## Key Files to Modify
- `/src/pages/admin/Chat.tsx` - Auto-open sidebar
- `/src/components/chat/CreateThreadModal.tsx` - Fix categories
- `/src/components/chat/ChannelDropdown.tsx` - Sticky new thread option
- `/src/pages/ProductQuotes.tsx` - Quote acceptance flow
