-- Cleanup Test Data for E2E Testing
-- This script prepares the database for testing between Maddie and Tyler
-- Run this before starting the E2E test workflow

-- ============================================================================
-- STEP 1: Get User IDs (for reference)
-- ============================================================================
SELECT
  id,
  email,
  created_at,
  CASE
    WHEN email = 'ammazonrev2@gmail.com' THEN '👤 Maddie (User)'
    WHEN email = 'tyler@revoa.app' THEN '👔 Tyler (Admin)'
  END as role
FROM auth.users
WHERE email IN ('ammazonrev2@gmail.com', 'tyler@revoa.app')
ORDER BY email;

-- ============================================================================
-- STEP 2: Review existing data before deletion
-- ============================================================================

-- Check existing chats
SELECT
  c.id as chat_id,
  c.created_at,
  u.email as user_email,
  COUNT(DISTINCT m.id) as message_count,
  COUNT(DISTINCT t.id) as thread_count
FROM chats c
JOIN auth.users u ON c.user_id = u.id
LEFT JOIN messages m ON m.chat_id = c.id
LEFT JOIN chat_threads t ON t.chat_id = c.id
WHERE u.email IN ('ammazonrev2@gmail.com', 'tyler@revoa.app')
GROUP BY c.id, c.created_at, u.email;

-- Check existing quotes
SELECT
  pq.id,
  pq.status,
  pq.created_at,
  u.email as user_email,
  pq.product_name
FROM product_quotes pq
JOIN auth.users u ON pq.user_id = u.id
WHERE u.email = 'ammazonrev2@gmail.com'
ORDER BY pq.created_at DESC;

-- Check existing threads
SELECT
  t.id as thread_id,
  t.created_at,
  t.name as thread_name,
  u.email as user_email,
  so.order_number,
  so.customer_name,
  COUNT(m.id) as message_count
FROM chat_threads t
JOIN chats c ON t.chat_id = c.id
JOIN auth.users u ON c.user_id = u.id
LEFT JOIN shopify_orders so ON t.order_id = so.id
LEFT JOIN messages m ON m.thread_id = t.id
WHERE u.email = 'ammazonrev2@gmail.com'
GROUP BY t.id, t.created_at, t.name, u.email, so.order_number, so.customer_name;

-- ============================================================================
-- STEP 3: Clean up test data (CAREFUL - THIS DELETES DATA!)
-- ============================================================================

-- Uncomment the sections below to actually delete data
-- Make sure you've reviewed the data above first!

/*
-- Delete messages in threads first (due to foreign keys)
DELETE FROM messages
WHERE thread_id IN (
  SELECT t.id
  FROM chat_threads t
  JOIN chats c ON t.chat_id = c.id
  JOIN auth.users u ON c.user_id = u.id
  WHERE u.email = 'ammazonrev2@gmail.com'
);

-- Delete messages in main chats
DELETE FROM messages
WHERE chat_id IN (
  SELECT c.id
  FROM chats c
  JOIN auth.users u ON c.user_id = u.id
  WHERE u.email = 'ammazonrev2@gmail.com'
);

-- Delete thread assignments
DELETE FROM user_assignments
WHERE thread_id IN (
  SELECT t.id
  FROM chat_threads t
  JOIN chats c ON t.chat_id = c.id
  JOIN auth.users u ON c.user_id = u.id
  WHERE u.email = 'ammazonrev2@gmail.com'
);

-- Delete threads
DELETE FROM chat_threads
WHERE chat_id IN (
  SELECT c.id
  FROM chats c
  JOIN auth.users u ON c.user_id = u.id
  WHERE u.email = 'ammazonrev2@gmail.com'
);

-- Delete chats
DELETE FROM chats
WHERE user_id IN (
  SELECT id FROM auth.users
  WHERE email = 'ammazonrev2@gmail.com'
);

-- Optional: Clean up test quotes (only PENDING/DRAFT)
DELETE FROM product_quotes
WHERE user_id IN (
  SELECT id FROM auth.users
  WHERE email = 'ammazonrev2@gmail.com'
)
AND status IN ('PENDING', 'DRAFT');
*/

-- ============================================================================
-- STEP 4: Verify cleanup
-- ============================================================================

-- Check chats after cleanup
SELECT
  COUNT(*) as remaining_chats,
  u.email
FROM chats c
JOIN auth.users u ON c.user_id = u.id
WHERE u.email = 'ammazonrev2@gmail.com'
GROUP BY u.email;

-- Check messages after cleanup
SELECT
  COUNT(*) as remaining_messages,
  u.email
FROM messages m
JOIN chats c ON m.chat_id = c.id
JOIN auth.users u ON c.user_id = u.id
WHERE u.email = 'ammazonrev2@gmail.com'
GROUP BY u.email;

-- Check threads after cleanup
SELECT
  COUNT(*) as remaining_threads,
  u.email
FROM chat_threads t
JOIN chats c ON t.chat_id = c.id
JOIN auth.users u ON c.user_id = u.id
WHERE u.email = 'ammazonrev2@gmail.com'
GROUP BY u.email;

-- ============================================================================
-- STEP 5: Ensure clean state for testing
-- ============================================================================

-- Verify no orphaned data
SELECT
  'orphaned_messages' as issue_type,
  COUNT(*) as count
FROM messages
WHERE chat_id NOT IN (SELECT id FROM chats)
OR (thread_id IS NOT NULL AND thread_id NOT IN (SELECT id FROM chat_threads))

UNION ALL

SELECT
  'orphaned_threads' as issue_type,
  COUNT(*) as count
FROM chat_threads
WHERE chat_id NOT IN (SELECT id FROM chats)

UNION ALL

SELECT
  'orphaned_assignments' as issue_type,
  COUNT(*) as count
FROM user_assignments
WHERE thread_id NOT IN (SELECT id FROM chat_threads);

-- ============================================================================
-- NOTES
-- ============================================================================

/*
Before running cleanup:
1. Review all SELECT queries above to see what will be deleted
2. Make sure you want to delete this data
3. Uncomment the DELETE section in STEP 3
4. Run the script
5. Verify with STEP 4 queries that data is cleaned up

After cleanup:
- Maddie will have a fresh slate
- No existing chats or threads
- Can start E2E test from scratch
- Previous quotes may still exist (unless you uncomment that section)

Safety notes:
- Script targets only ammazonrev2@gmail.com data
- Won't affect other users
- Foreign key constraints ensure no orphaned data
- All DELETEs are commented by default
*/
