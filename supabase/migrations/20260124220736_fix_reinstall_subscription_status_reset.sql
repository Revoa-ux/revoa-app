/*
  # Fix Reinstall Subscription Status Not Resetting

  1. Problem
    - When user reinstalls app after uninstalling:
      - shopify_installations.status correctly becomes 'installed'
      - But shopify_stores.subscription_status stays 'CANCELLED'
    - This blocks user from using the app even with valid installation
    - Cause: sync trigger preserves existing subscription_status

  2. Solution
    - Update trigger to reset subscription_status to 'PENDING' when:
      - Installation status is 'installed' AND
      - Existing subscription_status is 'CANCELLED' or 'EXPIRED'
    - 'PENDING' allows app access while waiting for Shopify webhook to confirm subscription

  3. Changes
    - Modify sync_shopify_installation_to_stores() function
    - Add reinstall detection logic
    - Reset subscription_status for reinstalls

  4. Security
    - Users can only access after reinstalling (valid OAuth)
    - Shopify webhooks will update to proper status
*/

-- Update the sync function to handle reinstalls properly
CREATE OR REPLACE FUNCTION sync_shopify_installation_to_stores()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_subscription_status text;
  v_current_tier text;
  v_existing_status text;
BEGIN
  -- Get existing subscription_status if any
  SELECT subscription_status INTO v_existing_status
  FROM shopify_stores 
  WHERE id = NEW.id;

  -- Determine subscription_status based on installation status
  IF NEW.status::text = 'uninstalled' THEN
    -- Uninstalled = block access immediately
    v_subscription_status := 'CANCELLED';
  ELSIF NEW.status::text = 'installed' AND v_existing_status IN ('CANCELLED', 'EXPIRED') THEN
    -- REINSTALL DETECTED: Reset to PENDING so user can access app
    -- Shopify webhook will update to ACTIVE once subscription is confirmed
    v_subscription_status := 'PENDING';
  ELSE
    -- For new installs or active subscriptions, preserve existing or default to ACTIVE
    v_subscription_status := COALESCE(v_existing_status, 'ACTIVE');
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

-- Fix the current revoatest store that is stuck in CANCELLED state
-- This is a one-time fix for existing affected stores
UPDATE shopify_stores ss
SET 
  subscription_status = 'PENDING',
  updated_at = NOW()
FROM shopify_installations si
WHERE ss.id = si.id
  AND si.status = 'installed'
  AND si.uninstalled_at IS NULL
  AND ss.subscription_status IN ('CANCELLED', 'EXPIRED');

COMMENT ON FUNCTION sync_shopify_installation_to_stores IS 
'Syncs shopify_installations to shopify_stores. 
When status=uninstalled: sets subscription_status=CANCELLED.
When status=installed AND existing status is CANCELLED/EXPIRED: resets to PENDING (reinstall).
Otherwise preserves existing subscription_status or defaults to ACTIVE.';
