/*
  # Shopify Variant Mapping System

  1. New Tables
    - `shopify_variant_mappings`
      - Tracks the relationship between quote variants and Shopify variants
      - Enables proper SKU/price syncing and invoicing
      - Stores mapping metadata for audit trail

  2. Changes
    - Add `variant_mappings` JSONB column to `product_quotes` for complete mapping audit
    - Add `shopify_sync_status` enum for better tracking
    - Add indexes for fast lookups during invoicing

  3. Security
    - Enable RLS on `shopify_variant_mappings`
    - Only authenticated users can view their own mappings
    - Super admins can view all mappings
*/

-- Create enum for sync status
DO $$ BEGIN
  CREATE TYPE shopify_sync_status AS ENUM ('pending', 'synced', 'outdated', 'failed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create variant mappings table
CREATE TABLE IF NOT EXISTS shopify_variant_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Relationships
  quote_id uuid NOT NULL REFERENCES product_quotes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Quote variant info
  quote_variant_sku text NOT NULL,
  quote_variant_index integer NOT NULL,
  quote_unit_cost numeric(10, 2) NOT NULL,
  quote_pack_size integer NOT NULL,
  quote_shipping_rules jsonb DEFAULT '{}'::jsonb,
  
  -- Shopify product/variant info
  shopify_product_id text NOT NULL,
  shopify_variant_id text NOT NULL,
  shopify_variant_sku text,
  shopify_variant_title text,
  
  -- Sync metadata
  sync_status shopify_sync_status DEFAULT 'pending',
  last_synced_at timestamptz,
  sync_error text,
  
  -- Original Shopify data (for rollback)
  original_variant_data jsonb,
  
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Constraints
  UNIQUE(quote_id, quote_variant_index),
  UNIQUE(quote_id, quote_variant_sku)
);

-- Add variant_mappings column to product_quotes for audit trail
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'product_quotes' 
    AND column_name = 'variant_mappings'
  ) THEN
    ALTER TABLE product_quotes 
    ADD COLUMN variant_mappings jsonb DEFAULT '[]'::jsonb;
  END IF;
END $$;

-- Add shopify_sync_status to product_quotes if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'product_quotes' 
    AND column_name = 'shopify_sync_status'
  ) THEN
    ALTER TABLE product_quotes 
    ADD COLUMN shopify_sync_status shopify_sync_status DEFAULT 'pending';
  END IF;
END $$;

-- Add last_shopify_sync_at to product_quotes if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'product_quotes' 
    AND column_name = 'last_shopify_sync_at'
  ) THEN
    ALTER TABLE product_quotes 
    ADD COLUMN last_shopify_sync_at timestamptz;
  END IF;
END $$;

-- Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_variant_mappings_quote_id 
  ON shopify_variant_mappings(quote_id);

CREATE INDEX IF NOT EXISTS idx_variant_mappings_user_id 
  ON shopify_variant_mappings(user_id);

CREATE INDEX IF NOT EXISTS idx_variant_mappings_shopify_variant 
  ON shopify_variant_mappings(shopify_variant_id);

CREATE INDEX IF NOT EXISTS idx_variant_mappings_quote_sku 
  ON shopify_variant_mappings(quote_variant_sku);

CREATE INDEX IF NOT EXISTS idx_variant_mappings_sync_status 
  ON shopify_variant_mappings(sync_status);

-- Enable RLS
ALTER TABLE shopify_variant_mappings ENABLE ROW LEVEL SECURITY;

-- Policies for variant mappings
CREATE POLICY "Users can view their own variant mappings"
  ON shopify_variant_mappings
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own variant mappings"
  ON shopify_variant_mappings
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own variant mappings"
  ON shopify_variant_mappings
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own variant mappings"
  ON shopify_variant_mappings
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Super admin policies
CREATE POLICY "Super admins can view all variant mappings"
  ON shopify_variant_mappings
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_super_admin = true
    )
  );

-- Function to validate quote mappings
CREATE OR REPLACE FUNCTION validate_quote_mappings(p_quote_id uuid)
RETURNS TABLE (
  is_valid boolean,
  total_variants integer,
  mapped_variants integer,
  pending_variants integer,
  failed_variants integer,
  missing_skus text[]
) 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_total integer;
  v_mapped integer;
  v_pending integer;
  v_failed integer;
  v_missing text[];
BEGIN
  -- Count total quote variants
  SELECT 
    COALESCE(jsonb_array_length(variants), 0)
  INTO v_total
  FROM product_quotes
  WHERE id = p_quote_id;

  -- Count mapped variants
  SELECT COUNT(*) INTO v_mapped
  FROM shopify_variant_mappings
  WHERE quote_id = p_quote_id
  AND sync_status = 'synced';

  -- Count pending variants
  SELECT COUNT(*) INTO v_pending
  FROM shopify_variant_mappings
  WHERE quote_id = p_quote_id
  AND sync_status = 'pending';

  -- Count failed variants
  SELECT COUNT(*) INTO v_failed
  FROM shopify_variant_mappings
  WHERE quote_id = p_quote_id
  AND sync_status = 'failed';

  -- Find missing SKUs (variants in quote but not in mappings)
  SELECT ARRAY_AGG(DISTINCT variant->>'sku')
  INTO v_missing
  FROM product_quotes, jsonb_array_elements(variants) AS variant
  WHERE product_quotes.id = p_quote_id
  AND NOT EXISTS (
    SELECT 1 FROM shopify_variant_mappings
    WHERE quote_id = p_quote_id
    AND quote_variant_sku = variant->>'sku'
  );

  RETURN QUERY SELECT
    (v_mapped = v_total) as is_valid,
    v_total as total_variants,
    v_mapped as mapped_variants,
    v_pending as pending_variants,
    v_failed as failed_variants,
    COALESCE(v_missing, ARRAY[]::text[]) as missing_skus;
END;
$$;

-- Function to update mapping status
CREATE OR REPLACE FUNCTION update_variant_mapping_status(
  p_mapping_id uuid,
  p_status shopify_sync_status,
  p_error text DEFAULT NULL
)
RETURNS void
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE shopify_variant_mappings
  SET 
    sync_status = p_status,
    sync_error = p_error,
    last_synced_at = CASE WHEN p_status = 'synced' THEN now() ELSE last_synced_at END,
    updated_at = now()
  WHERE id = p_mapping_id;
END;
$$;

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_variant_mapping_timestamp()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_variant_mappings_timestamp ON shopify_variant_mappings;
CREATE TRIGGER update_variant_mappings_timestamp
  BEFORE UPDATE ON shopify_variant_mappings
  FOR EACH ROW
  EXECUTE FUNCTION update_variant_mapping_timestamp();