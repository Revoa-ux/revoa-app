/*
  # Sync shopify_installations to shopify_stores automatically

  1. Problem
    - `shopify_installations` and `shopify_stores` tables got out of sync
    - Subscription service queries `shopify_stores` which can be empty
    - Causes features to be locked even when user has valid installation
  
  2. Solution
    - Create trigger to automatically sync installations to stores
    - Backfill any existing records that are missing
  
  3. Changes
    - Add function to sync installation to stores table
    - Add trigger on shopify_installations INSERT/UPDATE
    - Backfill existing installations missing from stores
  
  4. Security
    - Uses SECURITY DEFINER for proper permissions
    - Maintains same RLS policies on both tables
*/

-- Create function to sync shopify_installations to shopify_stores
CREATE OR REPLACE FUNCTION sync_shopify_installation_to_stores()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
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
    COALESCE((SELECT current_tier FROM shopify_stores WHERE id = NEW.id), 'startup'),
    COALESCE((SELECT subscription_status FROM shopify_stores WHERE id = NEW.id), 'ACTIVE'),
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
    updated_at = EXCLUDED.updated_at;
  
  RETURN NEW;
END;
$$;

-- Add trigger to shopify_installations
DROP TRIGGER IF EXISTS sync_installation_to_stores ON shopify_installations;
CREATE TRIGGER sync_installation_to_stores
  AFTER INSERT OR UPDATE ON shopify_installations
  FOR EACH ROW
  EXECUTE FUNCTION sync_shopify_installation_to_stores();

-- Backfill existing shopify_installations that are missing from shopify_stores
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
SELECT
  si.id,
  si.store_url,
  si.access_token,
  si.scopes,
  CASE 
    WHEN si.status::text = 'installed' THEN 'active'
    WHEN si.status::text = 'uninstalled' THEN 'inactive'
    ELSE 'pending'
  END as status,
  'startup' as current_tier,
  'ACTIVE' as subscription_status,
  0 as monthly_order_count,
  si.created_at,
  si.updated_at
FROM shopify_installations si
LEFT JOIN shopify_stores ss ON ss.id = si.id
WHERE ss.id IS NULL
  AND si.status::text IN ('installed', 'pending');
