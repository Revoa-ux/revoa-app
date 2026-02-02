/*
  # Add Missing Foreign Key Indexes

  1. Performance Optimization
    - Add indexes for all foreign keys that are missing covering indexes
    - This improves query performance when joining tables
    - Prevents full table scans on foreign key lookups

  2. Indexes Added
    - `admin_users.user_id`
    - `import_jobs.triggered_by`
    - `messages.deleted_by`
    - `messages.status_updated_by`
    - `oauth_sessions.user_id`
    - `product_approval_history.reviewed_by`
    - `product_import_logs.imported_by`
    - `products.approved_by`

  3. Notes
    - Indexes are created concurrently to avoid locking tables
    - Only created if they don't already exist
*/

-- Add index for admin_users.user_id
CREATE INDEX IF NOT EXISTS idx_admin_users_user_id 
ON public.admin_users(user_id);

-- Add index for import_jobs.triggered_by
CREATE INDEX IF NOT EXISTS idx_import_jobs_triggered_by 
ON public.import_jobs(triggered_by);

-- Add index for messages.deleted_by
CREATE INDEX IF NOT EXISTS idx_messages_deleted_by 
ON public.messages(deleted_by);

-- Add index for messages.status_updated_by
CREATE INDEX IF NOT EXISTS idx_messages_status_updated_by 
ON public.messages(status_updated_by);

-- Add index for oauth_sessions.user_id
CREATE INDEX IF NOT EXISTS idx_oauth_sessions_user_id 
ON public.oauth_sessions(user_id);

-- Add index for product_approval_history.reviewed_by
CREATE INDEX IF NOT EXISTS idx_product_approval_history_reviewed_by 
ON public.product_approval_history(reviewed_by);

-- Add index for product_import_logs.imported_by
CREATE INDEX IF NOT EXISTS idx_product_import_logs_imported_by 
ON public.product_import_logs(imported_by);

-- Add index for products.approved_by
CREATE INDEX IF NOT EXISTS idx_products_approved_by 
ON public.products(approved_by);