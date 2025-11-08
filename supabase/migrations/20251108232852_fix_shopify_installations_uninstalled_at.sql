/*
  # Fix Shopify Installations Uninstalled At

  ## Problem
  Some Shopify installations have `uninstalled_at` set even though they are still marked as 'installed'.
  This causes the app to not recognize them as active connections.

  ## Solution
  Clear `uninstalled_at` for any installations that have status='installed' but have uninstalled_at set.
  This will make them properly recognized as active connections.

  ## Important
  This is a data fix migration - it corrects inconsistent state in existing data.
*/

-- Clear uninstalled_at for any installations marked as 'installed'
UPDATE shopify_installations
SET uninstalled_at = NULL
WHERE status = 'installed'
  AND uninstalled_at IS NOT NULL;

-- Log how many were fixed
DO $$
DECLARE
  fixed_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO fixed_count
  FROM shopify_installations
  WHERE status = 'installed' AND uninstalled_at IS NULL;
  
  RAISE NOTICE 'Fixed Shopify installations. Now % installations are active.', fixed_count;
END $$;
