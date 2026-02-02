/*
  # Add Missing Foreign Key Indexes - Part 2

  This migration adds indexes for foreign keys - second batch.

  ## Tables Updated
  - factory_orders
  - flow_continuation_history
  - funnel_metrics
  - google_ads_ad_schedules
  - google_ads_audiences
  - google_ads_bid_adjustment_history
  - google_ads_locations
  - google_ads_placements
  - import_jobs
  - invoice_actions
  - invoice_factory_allocations
  - invoice_generation_logs
  - invoice_generation_settings
  - invoice_line_items
  - invoices
*/

-- factory_orders indexes
CREATE INDEX IF NOT EXISTS idx_factory_orders_created_by 
  ON public.factory_orders(created_by);

-- flow_continuation_history indexes
CREATE INDEX IF NOT EXISTS idx_flow_continuation_history_from_session_id 
  ON public.flow_continuation_history(from_session_id);

CREATE INDEX IF NOT EXISTS idx_flow_continuation_history_to_session_id 
  ON public.flow_continuation_history(to_session_id);

-- funnel_metrics indexes
CREATE INDEX IF NOT EXISTS idx_funnel_metrics_ad_account_id 
  ON public.funnel_metrics(ad_account_id);

-- google_ads_ad_schedules indexes
CREATE INDEX IF NOT EXISTS idx_google_ads_ad_schedules_ad_account_id 
  ON public.google_ads_ad_schedules(ad_account_id);

-- google_ads_audiences indexes
CREATE INDEX IF NOT EXISTS idx_google_ads_audiences_ad_account_id 
  ON public.google_ads_audiences(ad_account_id);

-- google_ads_bid_adjustment_history indexes
CREATE INDEX IF NOT EXISTS idx_google_ads_bid_adjustment_history_ad_account_id 
  ON public.google_ads_bid_adjustment_history(ad_account_id);

-- google_ads_locations indexes
CREATE INDEX IF NOT EXISTS idx_google_ads_locations_ad_account_id 
  ON public.google_ads_locations(ad_account_id);

-- google_ads_placements indexes
CREATE INDEX IF NOT EXISTS idx_google_ads_placements_ad_account_id 
  ON public.google_ads_placements(ad_account_id);

-- import_jobs indexes
CREATE INDEX IF NOT EXISTS idx_import_jobs_created_by 
  ON public.import_jobs(created_by);

CREATE INDEX IF NOT EXISTS idx_import_jobs_triggered_by 
  ON public.import_jobs(triggered_by);

-- invoice_actions indexes
CREATE INDEX IF NOT EXISTS idx_invoice_actions_performed_by_id 
  ON public.invoice_actions(performed_by_id);

-- invoice_factory_allocations indexes
CREATE INDEX IF NOT EXISTS idx_invoice_factory_allocations_factory_order_id 
  ON public.invoice_factory_allocations(factory_order_id);

-- invoice_generation_logs indexes
CREATE INDEX IF NOT EXISTS idx_invoice_generation_logs_invoice_id 
  ON public.invoice_generation_logs(invoice_id);

CREATE INDEX IF NOT EXISTS idx_invoice_generation_logs_triggered_by_admin_id 
  ON public.invoice_generation_logs(triggered_by_admin_id);

CREATE INDEX IF NOT EXISTS idx_invoice_generation_logs_user_id 
  ON public.invoice_generation_logs(user_id);

-- invoice_generation_settings indexes
CREATE INDEX IF NOT EXISTS idx_invoice_generation_settings_paused_by_admin_id 
  ON public.invoice_generation_settings(paused_by_admin_id);

-- invoice_line_items indexes
CREATE INDEX IF NOT EXISTS idx_invoice_line_items_invoice_id 
  ON public.invoice_line_items(invoice_id);

-- invoices indexes
CREATE INDEX IF NOT EXISTS idx_invoices_generation_log_id 
  ON public.invoices(generation_log_id);

CREATE INDEX IF NOT EXISTS idx_invoices_supplier_id 
  ON public.invoices(supplier_id);
