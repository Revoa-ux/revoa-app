/*
  # Add Billing Interval Tracking for Shopify Managed Pricing

  ## Summary
  Add billing_interval field to track whether merchants are on monthly or annual plans.
  This is for tracking purposes only - actual billing is handled by Shopify Managed Pricing.

  ## Changes Made
  
  1. **shopify_stores table**
     - Add `billing_interval` column (monthly or annual)
     - Defaults to 'monthly' for existing records
  
  2. **subscription_history table**
     - Add `billing_interval` column to track interval changes over time
     - Defaults to 'monthly' for historical records

  ## Notes
  - This field is informational only for analytics and display
  - Actual billing mechanics are controlled by Shopify Managed Pricing
  - Webhook automatically detects and populates this field from plan names
*/

-- Add billing_interval to shopify_stores
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'shopify_stores'
    AND column_name = 'billing_interval'
  ) THEN
    ALTER TABLE shopify_stores 
    ADD COLUMN billing_interval text DEFAULT 'monthly' CHECK (billing_interval IN ('monthly', 'annual'));
    
    COMMENT ON COLUMN shopify_stores.billing_interval IS 'Billing interval (monthly or annual) - for display only, actual billing handled by Shopify';
  END IF;
END $$;

-- Add billing_interval to subscription_history
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'subscription_history'
    AND column_name = 'billing_interval'
  ) THEN
    ALTER TABLE subscription_history 
    ADD COLUMN billing_interval text DEFAULT 'monthly' CHECK (billing_interval IN ('monthly', 'annual'));
    
    COMMENT ON COLUMN subscription_history.billing_interval IS 'Billing interval at time of event - for tracking plan changes';
  END IF;
END $$;

-- Create index for filtering by billing interval (analytics)
CREATE INDEX IF NOT EXISTS idx_shopify_stores_billing_interval 
ON shopify_stores(billing_interval) 
WHERE billing_interval IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_subscription_history_billing_interval 
ON subscription_history(billing_interval) 
WHERE billing_interval IS NOT NULL;