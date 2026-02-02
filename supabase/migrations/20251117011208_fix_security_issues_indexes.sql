/*
  # Fix Security Issues - Part 1: Indexes

  1. Add Missing Foreign Key Indexes
    - Add indexes on foreign key columns that were missing covering indexes
    - Improves query performance for JOIN operations
    
  2. Remove Unused Indexes
    - Drop indexes that have not been used to reduce maintenance overhead
    - Frees up storage space and reduces write operation costs

  Note: This is part 1 of the security fixes, focusing on index optimization.
*/

-- Add missing foreign key indexes
CREATE INDEX IF NOT EXISTS idx_ad_accounts_shopify_store_id ON public.ad_accounts(shopify_store_id);
CREATE INDEX IF NOT EXISTS idx_ad_accounts_store_id ON public.ad_accounts(store_id);
CREATE INDEX IF NOT EXISTS idx_ad_sets_campaign_id ON public.ad_sets(campaign_id);
CREATE INDEX IF NOT EXISTS idx_invoice_line_items_order_line_item_id ON public.invoice_line_items(order_line_item_id);
CREATE INDEX IF NOT EXISTS idx_invoices_supplier_id ON public.invoices(supplier_id);
CREATE INDEX IF NOT EXISTS idx_order_line_items_product_id ON public.order_line_items(product_id);
CREATE INDEX IF NOT EXISTS idx_payment_intents_confirmed_by_admin_id ON public.payment_intents(confirmed_by_admin_id);
CREATE INDEX IF NOT EXISTS idx_payment_intents_supplier_id ON public.payment_intents(supplier_id);

-- Remove unused indexes
DROP INDEX IF EXISTS idx_balance_transactions_created_at;
DROP INDEX IF EXISTS idx_balance_transactions_reference;
DROP INDEX IF EXISTS idx_order_line_items_user_id;
DROP INDEX IF EXISTS idx_order_line_items_shopify_order_id;
DROP INDEX IF EXISTS idx_order_line_items_status;
DROP INDEX IF EXISTS idx_invoice_line_items_invoice_id;
DROP INDEX IF EXISTS idx_payment_intents_user_id;
DROP INDEX IF EXISTS idx_payment_intents_status;
DROP INDEX IF EXISTS idx_payment_intents_stripe_pi;
DROP INDEX IF EXISTS idx_admin_users_user_id;
DROP INDEX IF EXISTS idx_import_jobs_created_by;
DROP INDEX IF EXISTS idx_import_jobs_triggered_by;
DROP INDEX IF EXISTS idx_marketplace_transactions_supplier_id;
DROP INDEX IF EXISTS idx_messages_deleted_by;
DROP INDEX IF EXISTS idx_messages_status_updated_by;
DROP INDEX IF EXISTS idx_product_approval_history_reviewed_by;
DROP INDEX IF EXISTS idx_product_import_logs_imported_by;
DROP INDEX IF EXISTS idx_products_approved_by;
DROP INDEX IF EXISTS idx_products_supplier_id;
DROP INDEX IF EXISTS idx_user_invoice_history_invoice_id;
DROP INDEX IF EXISTS idx_ads_ad_account_id;
DROP INDEX IF EXISTS idx_shopify_orders_user_id;
DROP INDEX IF EXISTS idx_shopify_orders_utm_term;
DROP INDEX IF EXISTS idx_shopify_orders_utm_source;
DROP INDEX IF EXISTS idx_shopify_orders_fbclid;
DROP INDEX IF EXISTS idx_shopify_orders_ordered_at;
DROP INDEX IF EXISTS idx_shopify_orders_customer_email;
DROP INDEX IF EXISTS idx_ad_conversions_user_id;
DROP INDEX IF EXISTS idx_ad_conversions_ad_id;
DROP INDEX IF EXISTS idx_ad_conversions_order_id;
DROP INDEX IF EXISTS idx_ad_conversions_converted_at;
DROP INDEX IF EXISTS idx_ad_conversions_platform;
DROP INDEX IF EXISTS idx_conversion_events_user_id;
DROP INDEX IF EXISTS idx_conversion_events_platform;
DROP INDEX IF EXISTS idx_conversion_events_status;
DROP INDEX IF EXISTS idx_conversion_events_event_time;
DROP INDEX IF EXISTS idx_conversion_events_order_id;
DROP INDEX IF EXISTS idx_ai_patterns_global_pattern_type;
DROP INDEX IF EXISTS idx_ai_patterns_global_category;
DROP INDEX IF EXISTS idx_ai_patterns_global_confidence;
DROP INDEX IF EXISTS idx_ai_patterns_account_user_id;
DROP INDEX IF EXISTS idx_ai_patterns_account_pattern_type;
DROP INDEX IF EXISTS idx_ai_patterns_account_confidence;