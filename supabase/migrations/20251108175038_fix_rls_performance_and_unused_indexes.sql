/*
  # Fix RLS Performance and Remove Unused Indexes
  
  1. RLS Policy Optimization
    - Update facebook_tokens policies to use (select auth.uid()) for better performance
    - This prevents re-evaluation of auth.uid() for each row
  
  2. Index Cleanup
    - Remove unused indexes that provide no benefit
    - Keep only indexes that are actively used by queries
    - Reduces database size and maintenance overhead
  
  3. Performance Impact
    - Improved query performance for RLS checks
    - Reduced index maintenance overhead
    - Lower storage requirements
*/

-- =====================================================
-- 1. FIX FACEBOOK_TOKENS RLS POLICIES FOR PERFORMANCE
-- =====================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own tokens" ON facebook_tokens;
DROP POLICY IF EXISTS "Users can insert own tokens" ON facebook_tokens;
DROP POLICY IF EXISTS "Users can update own tokens" ON facebook_tokens;
DROP POLICY IF EXISTS "Users can delete own tokens" ON facebook_tokens;

-- Recreate with optimized auth check
CREATE POLICY "Users can view own tokens"
  ON facebook_tokens FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own tokens"
  ON facebook_tokens FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own tokens"
  ON facebook_tokens FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete own tokens"
  ON facebook_tokens FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- =====================================================
-- 2. REMOVE UNUSED INDEXES
-- =====================================================

-- Messages table
DROP INDEX IF EXISTS idx_messages_status;
DROP INDEX IF EXISTS idx_messages_timestamp;
DROP INDEX IF EXISTS idx_messages_deleted_at;
DROP INDEX IF EXISTS idx_messages_deleted_by;
DROP INDEX IF EXISTS idx_messages_status_updated_by;

-- Invoices table
DROP INDEX IF EXISTS idx_invoices_status;
DROP INDEX IF EXISTS idx_invoices_due_date;

-- User invoice history
DROP INDEX IF EXISTS idx_user_invoice_history_invoice_id;
DROP INDEX IF EXISTS idx_user_invoice_history_status;
DROP INDEX IF EXISTS idx_user_invoice_history_due_date;

-- Shopify
DROP INDEX IF EXISTS idx_shopify_installations_status;
DROP INDEX IF EXISTS idx_shopify_sync_logs_event_type;

-- Facebook tokens (keep user_id but drop others since they're not used yet)
DROP INDEX IF EXISTS idx_facebook_tokens_ad_account_id;
DROP INDEX IF EXISTS idx_facebook_tokens_expires_at;

-- Products
DROP INDEX IF EXISTS idx_products_category;
DROP INDEX IF EXISTS idx_products_source;
DROP INDEX IF EXISTS idx_products_supplier_id;
DROP INDEX IF EXISTS idx_products_approved_by;

-- Notifications
DROP INDEX IF EXISTS idx_notifications_type;
DROP INDEX IF EXISTS idx_notifications_read;

-- Import jobs
DROP INDEX IF EXISTS idx_import_jobs_status;
DROP INDEX IF EXISTS idx_import_jobs_created_by;
DROP INDEX IF EXISTS idx_import_jobs_triggered_by;

-- User profiles
DROP INDEX IF EXISTS idx_user_profiles_is_super_admin;

-- Admin activity logs
DROP INDEX IF EXISTS idx_admin_activity_logs_admin_id;
DROP INDEX IF EXISTS idx_admin_activity_logs_created_at;

-- Data deletion
DROP INDEX IF EXISTS idx_data_deletion_confirmation_code;
DROP INDEX IF EXISTS idx_data_deletion_user_id;
DROP INDEX IF EXISTS idx_data_deletion_status;

-- Chats
DROP INDEX IF EXISTS idx_chats_user_id;
DROP INDEX IF EXISTS idx_chats_last_message_at;

-- Ad accounts and campaigns
DROP INDEX IF EXISTS idx_ad_accounts_user_id;
DROP INDEX IF EXISTS idx_ad_campaigns_account_id;
DROP INDEX IF EXISTS idx_ad_sets_campaign_id;
DROP INDEX IF EXISTS idx_ads_adset_id;
DROP INDEX IF EXISTS idx_ad_metrics_entity;
DROP INDEX IF EXISTS idx_ad_metrics_date;

-- Suppliers
DROP INDEX IF EXISTS idx_suppliers_email;
DROP INDEX IF EXISTS idx_suppliers_stripe_account_id;
DROP INDEX IF EXISTS idx_suppliers_status;

-- Marketplace transactions
DROP INDEX IF EXISTS idx_marketplace_transactions_supplier_id;
DROP INDEX IF EXISTS idx_marketplace_transactions_status;
DROP INDEX IF EXISTS idx_marketplace_transactions_payment_intent;

-- Admin users
DROP INDEX IF EXISTS idx_admin_users_user_id;

-- OAuth sessions
DROP INDEX IF EXISTS idx_oauth_sessions_user_id;

-- Product approval history
DROP INDEX IF EXISTS idx_product_approval_history_reviewed_by;

-- Product import logs
DROP INDEX IF EXISTS idx_product_import_logs_imported_by;

-- Product media
DROP INDEX IF EXISTS idx_product_images_type;
DROP INDEX IF EXISTS idx_product_media_type;
DROP INDEX IF EXISTS idx_product_creatives_type;
DROP INDEX IF EXISTS idx_product_creatives_platform;
DROP INDEX IF EXISTS idx_product_creatives_is_inspiration;

-- API keys
DROP INDEX IF EXISTS idx_api_keys_key_hash;
DROP INDEX IF EXISTS idx_api_keys_is_active;

-- Keep idx_facebook_tokens_user_id as it's useful for user lookups