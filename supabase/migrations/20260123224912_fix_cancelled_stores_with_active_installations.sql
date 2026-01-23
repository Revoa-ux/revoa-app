/*
  # Fix Stores with Active Installations but CANCELLED Status
  
  1. Problem
    - Some stores have subscription_status = 'CANCELLED' even though installation is active
    - This causes "No active subscription" banner to show incorrectly
    - Happens when stores were created before proper syncing or for test accounts
  
  2. Solution
    - Update stores with CANCELLED status to ACTIVE if installation is still active
    - Only affects stores where uninstalled_at IS NULL (installation still active)
  
  3. Changes
    - Update subscription_status to ACTIVE for stores with active installations
    - Set default tier to 'startup' if no subscription exists
    - Update last_verified_at timestamp
*/

-- Update stores with CANCELLED status but active installations
UPDATE shopify_stores ss
SET 
  subscription_status = 'ACTIVE',
  current_tier = COALESCE(ss.current_tier, 'startup'),
  last_verified_at = NOW(),
  updated_at = NOW()
WHERE ss.subscription_status = 'CANCELLED'
  AND EXISTS (
    SELECT 1 FROM shopify_installations si
    WHERE si.id = ss.id
      AND si.uninstalled_at IS NULL
  );

-- Add comment
COMMENT ON COLUMN shopify_stores.subscription_status IS 'Subscription status synced from Shopify. ACTIVE status is default for active installations until Shopify subscription webhook received.';