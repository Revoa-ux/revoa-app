/*
  # Fix Default Subscription Status for New Installations

  1. Problem
    - When a Shopify store installs the app, the sync trigger defaults to:
      - subscription_status = 'ACTIVE'
      - current_tier = 'startup'
    - This is incorrect - the store should show "No Plan Selected" until they actually select a plan

  2. Solution
    - Change defaults to use NULL for current_tier (indicates no plan selected)
    - Change default subscription_status to 'PENDING' (not active until they select a plan)
    - Update sync trigger to not assume a plan exists

  3. Changes
    - Update sync_shopify_installation_to_stores function
    - Fix existing stores that have installation but no actual Shopify subscription
*/

-- Update the sync function to not default to 'startup' tier
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
    user_id,
    store_url,
    access_token,
    scopes,
    current_tier,
    subscription_status,
    connected_at,
    updated_at
  ) VALUES (
    NEW.id,
    NEW.user_id,
    NEW.store_url,
    NEW.access_token,
    NEW.scopes,
    v_current_tier,
    v_subscription_status,
    COALESCE(NEW.installed_at, NOW()),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    user_id = EXCLUDED.user_id,
    store_url = EXCLUDED.store_url,
    access_token = EXCLUDED.access_token,
    scopes = EXCLUDED.scopes,
    subscription_status = EXCLUDED.subscription_status,
    updated_at = NOW();

  RETURN NEW;
END;
$$;

-- Fix existing stores that have no Shopify subscription but show as ACTIVE with startup tier
UPDATE shopify_stores ss
SET 
  subscription_status = 'PENDING',
  current_tier = NULL,
  updated_at = NOW()
WHERE ss.shopify_subscription_id IS NULL
  AND ss.subscription_status = 'ACTIVE'
  AND EXISTS (
    SELECT 1 FROM shopify_installations si 
    WHERE si.id = ss.id 
    AND si.uninstalled_at IS NULL
  );

COMMENT ON FUNCTION sync_shopify_installation_to_stores IS 
'Syncs shopify_installations to shopify_stores. 
New installations without a Shopify subscription are marked as PENDING with no tier.
Only marks as ACTIVE if an actual Shopify subscription ID exists.';