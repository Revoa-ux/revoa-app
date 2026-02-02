/*
  # Add Platform Column to Automation Templates

  1. Changes
    - Adds `platform` column to `ad_automation_rule_templates` table
    - Defaults to 'facebook' for backward compatibility
    - Allows templates to be platform-specific

  2. Security
    - No RLS changes needed
*/

ALTER TABLE ad_automation_rule_templates 
ADD COLUMN IF NOT EXISTS platform text DEFAULT 'facebook';

CREATE INDEX IF NOT EXISTS idx_ad_automation_rule_templates_platform 
ON ad_automation_rule_templates(platform);
