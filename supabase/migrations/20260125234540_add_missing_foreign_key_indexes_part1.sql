/*
  # Add Missing Foreign Key Indexes - Part 1

  This migration adds indexes for foreign keys that were identified as lacking covering indexes.
  Proper indexing on foreign keys improves JOIN performance and DELETE cascades.

  ## Tables Updated (first batch)
  - ad_accounts
  - ad_automation_actions_history
  - ad_conversions
  - ad_insights
  - ad_performance_alerts
  - ad_status_change_log
  - admin_users
  - ai_patterns_account
  - automated_issue_rules
  - bot_flows
  - chat_threads
  - conversation_tag_assignments
  - conversion_events
  - email_template_sends
  - enriched_conversions
*/

-- ad_accounts indexes
CREATE INDEX IF NOT EXISTS idx_ad_accounts_shopify_store_id 
  ON public.ad_accounts(shopify_store_id);

CREATE INDEX IF NOT EXISTS idx_ad_accounts_store_id 
  ON public.ad_accounts(store_id);

-- ad_automation_actions_history indexes
CREATE INDEX IF NOT EXISTS idx_ad_automation_actions_history_execution_id 
  ON public.ad_automation_actions_history(execution_id);

-- ad_conversions indexes
CREATE INDEX IF NOT EXISTS idx_ad_conversions_ad_id 
  ON public.ad_conversions(ad_id);

CREATE INDEX IF NOT EXISTS idx_ad_conversions_user_id 
  ON public.ad_conversions(user_id);

-- ad_insights indexes
CREATE INDEX IF NOT EXISTS idx_ad_insights_ad_account_id 
  ON public.ad_insights(ad_account_id);

-- ad_performance_alerts indexes
CREATE INDEX IF NOT EXISTS idx_ad_performance_alerts_ad_account_id 
  ON public.ad_performance_alerts(ad_account_id);

-- ad_status_change_log indexes
CREATE INDEX IF NOT EXISTS idx_ad_status_change_log_sync_job_id 
  ON public.ad_status_change_log(sync_job_id);

CREATE INDEX IF NOT EXISTS idx_ad_status_change_log_user_id 
  ON public.ad_status_change_log(user_id);

-- admin_users indexes
CREATE INDEX IF NOT EXISTS idx_admin_users_user_id 
  ON public.admin_users(user_id);

-- ai_patterns_account indexes
CREATE INDEX IF NOT EXISTS idx_ai_patterns_account_user_id 
  ON public.ai_patterns_account(user_id);

-- automated_issue_rules indexes
CREATE INDEX IF NOT EXISTS idx_automated_issue_rules_created_by_id 
  ON public.automated_issue_rules(created_by_id);

-- bot_flows indexes
CREATE INDEX IF NOT EXISTS idx_bot_flows_created_by 
  ON public.bot_flows(created_by);

-- chat_threads indexes
CREATE INDEX IF NOT EXISTS idx_chat_threads_closed_by_user_id 
  ON public.chat_threads(closed_by_user_id);

CREATE INDEX IF NOT EXISTS idx_chat_threads_created_by_user_id 
  ON public.chat_threads(created_by_user_id);

CREATE INDEX IF NOT EXISTS idx_chat_threads_line_item_id 
  ON public.chat_threads(line_item_id);

-- conversation_tag_assignments indexes
CREATE INDEX IF NOT EXISTS idx_conversation_tag_assignments_tag_id 
  ON public.conversation_tag_assignments(tag_id);

-- conversion_events indexes
CREATE INDEX IF NOT EXISTS idx_conversion_events_order_id 
  ON public.conversion_events(order_id);

CREATE INDEX IF NOT EXISTS idx_conversion_events_user_id 
  ON public.conversion_events(user_id);

-- email_template_sends indexes
CREATE INDEX IF NOT EXISTS idx_email_template_sends_template_id 
  ON public.email_template_sends(template_id);

-- enriched_conversions indexes
CREATE INDEX IF NOT EXISTS idx_enriched_conversions_ad_set_id 
  ON public.enriched_conversions(ad_set_id);
