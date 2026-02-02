/*
  # Fix Sync Function Column Mismatch

  1. Problem
    - Previous migration created sync function referencing columns that don't exist in shopify_stores
    - shopify_stores doesn't have user_id or connected_at columns

  2. Solution
    - Update sync function to only use columns that exist in shopify_stores
*/

CREATE OR REPLACE FUNCTION sync_shopify_installation_to_stores()
RETURNS TRIGGER
SET search_path = public
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_subscription_status text;
  v_current_tier text;
  v_shopify_subscription_id text;
BEGIN
  -- Check if uninstalled
  IF NEW.uninstalled_at IS NOT NULL THEN
    v_subscription_status := 'CANCELLED';
    v_current_tier := NULL;
    v_shopify_subscription_id := NULL;
  ELSE
    -- For installed/pending, check if there's an existing Shopify subscription
    SELECT subscription_status, current_tier, shopify_subscription_id 
    INTO v_subscription_status, v_current_tier, v_shopify_subscription_id
    FROM shopify_stores 
    WHERE id = NEW.id;
    
    -- Only mark as ACTIVE if there's an actual Shopify subscription ID
    IF v_shopify_subscription_id IS NOT NULL THEN
      -- Preserve existing status
      v_subscription_status := COALESCE(v_subscription_status, 'ACTIVE');
      v_current_tier := v_current_tier; -- Keep existing tier
    ELSE
      -- No subscription selected yet - use PENDING with no tier
      v_subscription_status := 'PENDING';
      v_current_tier := NULL;
    END IF;
  END IF;

  INSERT INTO shopify_stores (
    id,
    store_url,
    access_token,
    scopes,
    current_tier,
    subscription_status,
    updated_at
  ) VALUES (
    NEW.id,
    NEW.store_url,
    NEW.access_token,
    NEW.scopes,
    v_current_tier,
    v_subscription_status,
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    store_url = EXCLUDED.store_url,
    access_token = EXCLUDED.access_token,
    scopes = EXCLUDED.scopes,
    subscription_status = EXCLUDED.subscription_status,
    updated_at = NOW();

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION sync_shopify_installation_to_stores IS 
'Syncs shopify_installations to shopify_stores. 
New installations without a Shopify subscription are marked as PENDING with no tier.
Only marks as ACTIVE if an actual Shopify subscription ID exists.';