/*
  # Clear Ad Metrics for Re-sync with Daily Breakdown
  
  1. Purpose
    - Clear existing ad_metrics data that was stored with aggregated totals
    - This allows for a fresh sync with daily breakdowns from Facebook
    
  2. What This Does
    - Deletes all existing records from ad_metrics table
    - Keeps the table structure intact
    - Allows re-sync to populate with proper daily data
    
  3. Important Notes
    - After running this, you MUST re-sync your Facebook Ads account
    - The new sync will fetch daily breakdowns for the last 3 years
    - This will enable proper date filtering on the dashboard
*/

-- Clear all existing ad metrics data
DELETE FROM ad_metrics;

-- Log the cleanup
DO $$ 
BEGIN 
  RAISE NOTICE 'Ad metrics cleared. Ready for re-sync with daily breakdown data.';
END $$;
