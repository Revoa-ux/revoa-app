/*
  # Add Missing Foreign Key Indexes - Part 3

  This migration adds indexes for foreign keys - third batch.

  ## Tables Updated
  - issue_notifications
  - marketplace_transactions
  - messages
  - order_line_items
  - order_operation_permissions
  - payment_intents
  - pending_payment_confirmations
  - platform_action_logs
  - pre_shipment_issues
  - pre_shipment_resolutions
  - product_approval_history
  - product_cogs_updates
  - product_import_logs
  - product_quotes
  - products
*/

-- issue_notifications indexes
CREATE INDEX IF NOT EXISTS idx_issue_notifications_issue_id 
  ON public.issue_notifications(issue_id);

-- marketplace_transactions indexes
CREATE INDEX IF NOT EXISTS idx_marketplace_transactions_supplier_id 
  ON public.marketplace_transactions(supplier_id);

-- messages indexes
CREATE INDEX IF NOT EXISTS idx_messages_deleted_by 
  ON public.messages(deleted_by);

CREATE INDEX IF NOT EXISTS idx_messages_status_updated_by 
  ON public.messages(status_updated_by);

-- order_line_items indexes
CREATE INDEX IF NOT EXISTS idx_order_line_items_product_id 
  ON public.order_line_items(product_id);

CREATE INDEX IF NOT EXISTS idx_order_line_items_shopify_order 
  ON public.order_line_items(shopify_order_id);

CREATE INDEX IF NOT EXISTS idx_order_line_items_user_id 
  ON public.order_line_items(user_id);

-- order_operation_permissions indexes
CREATE INDEX IF NOT EXISTS idx_order_operation_permissions_created_by_super_admin_id 
  ON public.order_operation_permissions(created_by_super_admin_id);

-- payment_intents indexes
CREATE INDEX IF NOT EXISTS idx_payment_intents_supplier_id 
  ON public.payment_intents(supplier_id);

CREATE INDEX IF NOT EXISTS idx_payment_intents_user_id 
  ON public.payment_intents(user_id);

-- pending_payment_confirmations indexes
CREATE INDEX IF NOT EXISTS idx_pending_payment_confirmations_user_id 
  ON public.pending_payment_confirmations(user_id);

-- platform_action_logs indexes
CREATE INDEX IF NOT EXISTS idx_platform_action_logs_rollback_action_id 
  ON public.platform_action_logs(rollback_action_id);

-- pre_shipment_issues indexes
CREATE INDEX IF NOT EXISTS idx_pre_shipment_issues_chat_thread_id 
  ON public.pre_shipment_issues(chat_thread_id);

CREATE INDEX IF NOT EXISTS idx_pre_shipment_issues_detected_by_admin_id 
  ON public.pre_shipment_issues(detected_by_admin_id);

CREATE INDEX IF NOT EXISTS idx_pre_shipment_issues_flow_session_id 
  ON public.pre_shipment_issues(flow_session_id);

-- pre_shipment_resolutions indexes
CREATE INDEX IF NOT EXISTS idx_pre_shipment_resolutions_issue_id 
  ON public.pre_shipment_resolutions(issue_id);

CREATE INDEX IF NOT EXISTS idx_pre_shipment_resolutions_resolved_by_id 
  ON public.pre_shipment_resolutions(resolved_by_id);

CREATE INDEX IF NOT EXISTS idx_pre_shipment_resolutions_substitute_line_item_id 
  ON public.pre_shipment_resolutions(substitute_line_item_id);

-- product_approval_history indexes
CREATE INDEX IF NOT EXISTS idx_product_approval_history_reviewed_by 
  ON public.product_approval_history(reviewed_by);

-- product_cogs_updates indexes
CREATE INDEX IF NOT EXISTS idx_product_cogs_updates_updated_by_admin_id 
  ON public.product_cogs_updates(updated_by_admin_id);

CREATE INDEX IF NOT EXISTS idx_product_cogs_updates_variant_id 
  ON public.product_cogs_updates(variant_id);

-- product_import_logs indexes
CREATE INDEX IF NOT EXISTS idx_product_import_logs_imported_by 
  ON public.product_import_logs(imported_by);

-- product_quotes indexes
CREATE INDEX IF NOT EXISTS idx_product_quotes_last_edited_by 
  ON public.product_quotes(last_edited_by);

-- products indexes
CREATE INDEX IF NOT EXISTS idx_products_approved_by 
  ON public.products(approved_by);

CREATE INDEX IF NOT EXISTS idx_products_supplier_id 
  ON public.products(supplier_id);
