/*
  # Add Missing Shopify Indexes

  1. Changes
    - Add index on shopify_installations.user_id
    - Add index on shopify_app_subscriptions.subscription_id
    - Add index on shopify_app_installations.app_id

  2. Performance
    - Improve query performance for user-related lookups
    - Optimize subscription and installation queries
*/

-- Add missing indexes
CREATE INDEX IF NOT EXISTS idx_shopify_installations_user_id 
  ON shopify_installations(user_id);

CREATE INDEX IF NOT EXISTS idx_app_subscriptions_subscription_id 
  ON shopify_app_subscriptions(subscription_id);

CREATE INDEX IF NOT EXISTS idx_app_installations_app_id 
  ON shopify_app_installations(app_id);