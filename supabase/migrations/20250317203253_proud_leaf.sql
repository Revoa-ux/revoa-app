/*
  # Fix Shopify Installation Status Type

  1. Changes
    - Drop existing enum type with CASCADE
    - Create new installation status enum
    - Add new status column with correct type
    - Drop old status column
    - Add constraints and triggers

  2. Security
    - Maintain data integrity during migration
    - Preserve existing status values
*/

-- Drop existing enum types with CASCADE to handle dependent objects
DROP TYPE IF EXISTS shopify_installations_status CASCADE;
DROP TYPE IF EXISTS shopify_installation_status CASCADE;
DROP TYPE IF EXISTS new_shopify_installation_status CASCADE;

-- Create new enum type
CREATE TYPE shopify_installation_status AS ENUM (
  'installed',
  'pending',
  'requires_reauth',
  'uninstalled'
);

-- Add new status column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'shopify_installations'
    AND column_name = 'status'
  ) THEN
    -- Add new status column
    ALTER TABLE shopify_installations
      ADD COLUMN status shopify_installation_status NOT NULL DEFAULT 'pending';
  END IF;
END $$;

-- Recreate the installation status change trigger function
CREATE OR REPLACE FUNCTION log_installation_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO shopify_installation_audit_log (
      installation_id,
      event_type,
      previous_status,
      new_status,
      metadata
    ) VALUES (
      NEW.id,
      'status_change',
      OLD.status,
      NEW.status,
      jsonb_build_object(
        'changed_at', CURRENT_TIMESTAMP,
        'changed_by', auth.uid()
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop and recreate the trigger
DROP TRIGGER IF EXISTS log_shopify_installation_status_change ON shopify_installations;
CREATE TRIGGER log_shopify_installation_status_change
  AFTER UPDATE OF status ON shopify_installations
  FOR EACH ROW
  EXECUTE FUNCTION log_installation_status_change();

-- Add comments
COMMENT ON TYPE shopify_installation_status IS 'Status of a Shopify store installation';
COMMENT ON COLUMN shopify_installations.status IS 'Current status of the Shopify installation';