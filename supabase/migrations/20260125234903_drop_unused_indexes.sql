/*
  # Drop Unused Indexes

  This migration drops indexes that have been identified as unused by the database.
  These indexes consume storage and slow down write operations without providing query benefits.

  Note: These indexes have never been used since creation.
  
  ## Indexes Dropped
  - Google Ads related indexes (bid adjustments, keywords, audiences, placements, schedules, locations, metrics)
  - Shopify stores and subscription indexes
*/

-- Google Ads Bid Adjustments unused indexes
DROP INDEX IF EXISTS idx_bid_adjustments_entity;
DROP INDEX IF EXISTS idx_bid_adjustments_user;
DROP INDEX IF EXISTS idx_bid_adjustments_account;
DROP INDEX IF EXISTS idx_bid_adjustments_type;

-- Google Ads Keywords unused indexes
DROP INDEX IF EXISTS idx_keywords_user;
DROP INDEX IF EXISTS idx_keywords_ad_group;
DROP INDEX IF EXISTS idx_keywords_account;
DROP INDEX IF EXISTS idx_keywords_quality;
DROP INDEX IF EXISTS idx_keyword_metrics_date;
DROP INDEX IF EXISTS idx_keyword_metrics_keyword;

-- Google Ads Audiences unused indexes
DROP INDEX IF EXISTS idx_audiences_user;
DROP INDEX IF EXISTS idx_audiences_entity;
DROP INDEX IF EXISTS idx_audience_metrics_date;

-- Google Ads Placements unused indexes
DROP INDEX IF EXISTS idx_placements_user;
DROP INDEX IF EXISTS idx_placements_entity;
DROP INDEX IF EXISTS idx_placement_metrics_date;

-- Google Ads Schedules unused indexes
DROP INDEX IF EXISTS idx_schedules_campaign;
DROP INDEX IF EXISTS idx_schedules_user;

-- Google Ads Locations unused indexes
DROP INDEX IF EXISTS idx_locations_campaign;
DROP INDEX IF EXISTS idx_locations_user;
DROP INDEX IF EXISTS idx_location_metrics_date;

-- Google Ads Device Metrics unused indexes
DROP INDEX IF EXISTS idx_device_metrics_entity;
DROP INDEX IF EXISTS idx_device_metrics_date;
DROP INDEX IF EXISTS idx_device_metrics_user;

-- Google Ads Demographic Metrics unused indexes
DROP INDEX IF EXISTS idx_demographic_metrics_entity;
DROP INDEX IF EXISTS idx_demographic_metrics_date;
DROP INDEX IF EXISTS idx_demographic_metrics_user;

-- Google Ads Hourly Metrics unused indexes
DROP INDEX IF EXISTS idx_hourly_metrics_campaign;
DROP INDEX IF EXISTS idx_hourly_metrics_date;
DROP INDEX IF EXISTS idx_hourly_metrics_user;

-- Google Ads Bid History unused indexes
DROP INDEX IF EXISTS idx_bid_history_user;
DROP INDEX IF EXISTS idx_bid_history_entity;
DROP INDEX IF EXISTS idx_bid_history_date;

-- Automation Rule Templates unused index
DROP INDEX IF EXISTS idx_ad_automation_rule_templates_platform;

-- Shopify Stores unused indexes
DROP INDEX IF EXISTS idx_shopify_stores_billing_interval;
DROP INDEX IF EXISTS idx_shopify_stores_subscription_id;
DROP INDEX IF EXISTS idx_shopify_stores_last_verified;

-- Subscription History unused indexes
DROP INDEX IF EXISTS idx_subscription_history_billing_interval;
DROP INDEX IF EXISTS idx_subscription_history_created_at;
DROP INDEX IF EXISTS idx_subscription_history_event_type;

-- Monthly Order Counts unused index
DROP INDEX IF EXISTS idx_monthly_order_counts_store_date;

-- Pending App Store Installs unused indexes
DROP INDEX IF EXISTS idx_pending_installs_state_token;
DROP INDEX IF EXISTS idx_pending_installs_user_id;
DROP INDEX IF EXISTS idx_pending_installs_expires_at;
