/*
  # Normalize Status Values to Uppercase

  ## Summary
  Updates all status values in ad_campaigns, ad_sets, and ads tables to uppercase
  to maintain consistency with Facebook Ads API and enable proper toggle functionality.

  ## Changes
  1. Update ad_campaigns table
     - Convert lowercase/mixed-case status values to uppercase
     - Map 'unknown' → 'UNKNOWN', 'active' → 'ACTIVE', 'paused' → 'PAUSED', etc.

  2. Update ad_sets table
     - Convert lowercase/mixed-case status values to uppercase
     - Maintain consistent format across all records

  3. Update ads table
     - Convert lowercase/mixed-case status values to uppercase
     - Ensure toggle switch displays correctly

  ## Rationale
  - Facebook Ads API returns uppercase status values (ACTIVE, PAUSED, etc.)
  - Toggle functionality expects uppercase values for proper rendering
  - Previous sync function was incorrectly converting to lowercase
  - This migration fixes existing data while sync function is updated
*/

-- Update ad_campaigns status to uppercase
UPDATE ad_campaigns
SET status = UPPER(status)
WHERE status IS NOT NULL;

-- Update ad_sets status to uppercase
UPDATE ad_sets
SET status = UPPER(status)
WHERE status IS NOT NULL;

-- Update ads status to uppercase
UPDATE ads
SET status = UPPER(status)
WHERE status IS NOT NULL;

-- Log the changes
DO $$
DECLARE
  campaigns_updated INTEGER;
  adsets_updated INTEGER;
  ads_updated INTEGER;
BEGIN
  SELECT COUNT(*) INTO campaigns_updated FROM ad_campaigns WHERE status IS NOT NULL;
  SELECT COUNT(*) INTO adsets_updated FROM ad_sets WHERE status IS NOT NULL;
  SELECT COUNT(*) INTO ads_updated FROM ads WHERE status IS NOT NULL;

  RAISE NOTICE 'Status normalization complete:';
  RAISE NOTICE '  - ad_campaigns: % records processed', campaigns_updated;
  RAISE NOTICE '  - ad_sets: % records processed', adsets_updated;
  RAISE NOTICE '  - ads: % records processed', ads_updated;
END $$;
