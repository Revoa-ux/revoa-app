/*
  # Add Review Underperformer Suggestion Type
  
  1. Changes
    - Adds 'review_underperformer' to rex_suggestion_type enum
    - This type is used for campaigns that have high spend but low ROAS
    - Helps identify campaigns that need attention or budget reallocation
*/

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'review_underperformer' AND enumtypid = 'rex_suggestion_type'::regtype) THEN
    ALTER TYPE rex_suggestion_type ADD VALUE IF NOT EXISTS 'review_underperformer';
  END IF;
END $$;
