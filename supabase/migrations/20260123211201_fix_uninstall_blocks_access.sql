/*
  # Fix Uninstall to Properly Block Access

  1. Problem
    - When user uninstalls app, shopify_installations.status = 'uninstalled'
    - But subscription_status stays 'ACTIVE' in shopify_stores
    - User can still access app features after uninstalling (CRITICAL BUG!)
  
  2. Solution
    - Update sync trigger to set subscription_status = 'CANCELLED' when uninstalled
    - Ensures access is immediately blocked
  
  3. Changes
    - Modify sync_shopify_installation_to_stores() function
    - Add logic: uninstalled status → CANCELLED subscription_status
    - Maintains Shopify App Store compliance
  
  4. Security
    - Prevents unauthorized access after uninstall
    - Required for Shopify App Store approval
*/

-- Update the sync function to properly handle uninstall
CREATE OR REPLACE FUNCTION sync_shopify_installation_to_stores()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_subscription_status text;
  v_current_tier text;
BEGIN
  -- Determine subscription_status based on installation status
  IF NEW.status::text = 'uninstalled' THEN
    -- Uninstalled = block access immediately
    v_subscription_status := 'CANCELLED';
  ELSE
    -- For installed/pending, preserve existing subscription_status or default to ACTIVE
    SELECT subscription_status INTO v_subscription_status
    FROM shopify_stores 
    WHERE id = NEW.id;
    
    v_subscription_status := COALESCE(v_subscription_status, 'ACTIVE');
  END IF;

  -- Preserve existing tier, or default to startup
  SELECT current_tier INTO v_current_tier
  FROM shopify_stores 
  WHERE id = NEW.id;
  
  v_current_tier := COALESCE(v_current_tier, 'startup');

  -- Insert or update shopify_stores record
  INSERT INTO shopify_stores (
    id,
    store_url,
    access_token,
    scopes,
    status,
    current_tier,
    subscription_status,
    monthly_order_count,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.store_url,
    NEW.access_token,
    NEW.scopes,
    CASE 
      WHEN NEW.status::text = 'installed' THEN 'active'
      WHEN NEW.status::text = 'uninstalled' THEN 'inactive'
      ELSE 'pending'
    END,
    v_current_tier,
    v_subscription_status,
    COALESCE((SELECT monthly_order_count FROM shopify_stores WHERE id = NEW.id), 0),
    NEW.created_at,
    NEW.updated_at
  )
  ON CONFLICT (id) 
  DO UPDATE SET
    store_url = EXCLUDED.store_url,
    access_token = EXCLUDED.access_token,
    scopes = EXCLUDED.scopes,
    status = EXCLUDED.status,
    subscription_status = EXCLUDED.subscription_status,
    updated_at = EXCLUDED.updated_at;
  
  RETURN NEW;
END;
$$;

-- Test the fix: simulate what happens when user uninstalls
-- (This is just for verification, no actual changes)
COMMENT ON FUNCTION sync_shopify_installation_to_stores IS 
'Syncs shopify_installations to shopify_stores. 
When status=uninstalled, sets subscription_status=CANCELLED to block access.
When status=installed/pending, preserves existing subscription_status.';
