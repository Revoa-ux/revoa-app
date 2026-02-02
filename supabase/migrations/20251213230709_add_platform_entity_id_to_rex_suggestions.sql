/*
  # Add platform_entity_id to Rex Suggestions

  1. Changes
    - Add `platform_entity_id` column to `rex_suggestions` table
    - This column stores the platform-specific ID (e.g., Facebook's campaign/adset/ad ID)
    - Enables row highlighting to match both Supabase UUIDs and platform IDs

  2. Purpose
    - Campaign data returns Supabase UUIDs as `id`
    - Creative/ad data returns platform IDs (e.g., "120215748285070512") as `id`
    - This column allows suggestions to be matched using either ID format
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'rex_suggestions' AND column_name = 'platform_entity_id'
  ) THEN
    ALTER TABLE rex_suggestions ADD COLUMN platform_entity_id text;
    COMMENT ON COLUMN rex_suggestions.platform_entity_id IS 'Platform-specific entity ID (e.g., Facebook campaign ID) for matching with ad manager rows';
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_rex_suggestions_platform_entity_id 
  ON rex_suggestions(platform_entity_id) 
  WHERE platform_entity_id IS NOT NULL;
