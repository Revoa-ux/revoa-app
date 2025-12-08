/*
  # Add Selling Price Management to Variant Mappings

  1. New Columns
    - `intended_selling_price` (decimal) - The selling price set by merchant during mapping
    - `price_synced_at` (timestamptz) - Timestamp when price was last synced to Shopify

  2. Changes
    - Add columns to track intended selling prices in variant mappings
    - Add index for performance on price sync tracking

  3. Purpose
    - Enable merchants to set and sync selling prices during variant mapping
    - Track when prices were last updated in Shopify
    - Support the enhanced variant mapping workflow with price management
*/

-- Add columns to track intended selling prices
ALTER TABLE shopify_variant_mappings
ADD COLUMN IF NOT EXISTS intended_selling_price DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS price_synced_at TIMESTAMPTZ;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_variant_mappings_price_synced
ON shopify_variant_mappings(price_synced_at)
WHERE price_synced_at IS NOT NULL;

-- Add comment explaining the columns
COMMENT ON COLUMN shopify_variant_mappings.intended_selling_price IS
'The selling price set by merchant during variant mapping. NULL means use Shopify current price.';

COMMENT ON COLUMN shopify_variant_mappings.price_synced_at IS
'Timestamp when the intended_selling_price was last synced to Shopify. NULL if never synced or no price change.';
