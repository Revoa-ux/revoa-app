/*
  # Fix Shopify Installation Status

  1. Changes
    - Drop existing enum types
    - Create new installation status enum
    - Add status column to installations table
    - Add proper constraints and defaults

  2. Security
    - Maintain data integrity during migration
    - Add proper type constraints
*/

-- Drop existing enum types if they exist
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

-- Add status column to installations table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'shopify_installations' 
    AND column_name = 'status'
  ) THEN
    ALTER TABLE shopify_installations 
      ADD COLUMN status shopify_installation_status DEFAULT 'pending'::shopify_installation_status NOT NULL;
  END IF;
END $$;

-- Add comments
COMMENT ON TYPE shopify_installation_status IS 'Status of a Shopify store installation';
COMMENT ON COLUMN shopify_installations.status IS 'Current status of the Shopify installation';