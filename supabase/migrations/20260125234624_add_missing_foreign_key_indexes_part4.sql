/*
  # Add Missing Foreign Key Indexes - Part 4

  This migration adds indexes for foreign keys - final batch.

  ## Tables Updated
  - quote_revisions
  - rex_discovered_insights
  - rex_suggestion_interactions
  - rex_suggestions
  - shipping_rates_by_country
  - shopify_order_fulfillment
  - shopify_order_fulfillments
  - shopify_orders
  - sync_jobs
  - template_usage_log
  - thread_flow_sessions
  - user_invoice_history
*/

-- quote_revisions indexes
CREATE INDEX IF NOT EXISTS idx_quote_revisions_edited_by 
  ON public.quote_revisions(edited_by);

-- rex_discovered_insights indexes
CREATE INDEX IF NOT EXISTS idx_rex_discovered_insights_suggestion_id 
  ON public.rex_discovered_insights(suggestion_id);

-- rex_suggestion_interactions indexes
CREATE INDEX IF NOT EXISTS idx_rex_suggestion_interactions_suggestion_id 
  ON public.rex_suggestion_interactions(suggestion_id);

-- rex_suggestions indexes
CREATE INDEX IF NOT EXISTS idx_rex_suggestions_automation_rule_id 
  ON public.rex_suggestions(automation_rule_id);

-- shipping_rates_by_country indexes
CREATE INDEX IF NOT EXISTS idx_shipping_rates_by_country_created_by_admin_id 
  ON public.shipping_rates_by_country(created_by_admin_id);

-- shopify_order_fulfillment indexes
CREATE INDEX IF NOT EXISTS idx_shopify_order_fulfillment_invoice_id 
  ON public.shopify_order_fulfillment(invoice_id);

-- shopify_order_fulfillments indexes
CREATE INDEX IF NOT EXISTS idx_shopify_order_fulfillments_mabang_batch_id 
  ON public.shopify_order_fulfillments(mabang_batch_id);

-- shopify_orders indexes
CREATE INDEX IF NOT EXISTS idx_shopify_orders_exported_by_admin_id 
  ON public.shopify_orders(exported_by_admin_id);

-- sync_jobs indexes
CREATE INDEX IF NOT EXISTS idx_sync_jobs_ad_account_id 
  ON public.sync_jobs(ad_account_id);

-- template_usage_log indexes
CREATE INDEX IF NOT EXISTS idx_template_usage_log_order_id 
  ON public.template_usage_log(order_id);

CREATE INDEX IF NOT EXISTS idx_template_usage_log_product_id 
  ON public.template_usage_log(product_id);

CREATE INDEX IF NOT EXISTS idx_template_usage_log_template_id 
  ON public.template_usage_log(template_id);

CREATE INDEX IF NOT EXISTS idx_template_usage_log_thread_id 
  ON public.template_usage_log(thread_id);

-- thread_flow_sessions indexes
CREATE INDEX IF NOT EXISTS idx_thread_flow_sessions_flow_id 
  ON public.thread_flow_sessions(flow_id);

-- user_invoice_history indexes
CREATE INDEX IF NOT EXISTS idx_user_invoice_history_invoice_id 
  ON public.user_invoice_history(invoice_id);
