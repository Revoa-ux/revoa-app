/*
  # Ad Product COGS Linkage System

  This migration adds the infrastructure to link ads to products and display true profit/COGS in the Ad Manager.

  ## 1. New Columns on `ads` Table
    - `destination_url` (text) - The URL where the ad sends traffic
    - `landing_page_url` (text) - Parsed/normalized landing page URL
    - `linked_shopify_product_ids` (text[]) - Array of Shopify product IDs this ad promotes

  ## 2. New Table: `ad_product_mappings`
    - Links ads to products with COGS data
    - Enables proactive profit calculation before conversions
    - Supports multiple products per ad (collection pages)

  ## 3. New Columns on `ad_metrics`
    - `estimated_cogs` - Estimated COGS based on product mappings
    - `estimated_profit` - Revenue - Spend - Estimated COGS
    - `profit_margin` - Profit margin percentage

  ## Security
    - RLS enabled on ad_product_mappings
    - Users can only access their own mappings
*/

-- Add destination URL columns to ads table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ads' AND column_name = 'destination_url'
  ) THEN
    ALTER TABLE ads ADD COLUMN destination_url text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ads' AND column_name = 'landing_page_url'
  ) THEN
    ALTER TABLE ads ADD COLUMN landing_page_url text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ads' AND column_name = 'linked_shopify_product_ids'
  ) THEN
    ALTER TABLE ads ADD COLUMN linked_shopify_product_ids text[];
  END IF;
END $$;

-- Create ad_product_mappings table
CREATE TABLE IF NOT EXISTS ad_product_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ad_id uuid NOT NULL REFERENCES ads(id) ON DELETE CASCADE,
  ad_account_id uuid REFERENCES ad_accounts(id) ON DELETE CASCADE,
  
  -- Shopify product information
  shopify_product_id text NOT NULL,
  shopify_variant_id text,
  product_name text,
  variant_name text,
  
  -- COGS data (from shopify_variant_mappings or order_line_items)
  unit_cogs numeric(10,2),
  cogs_source text, -- 'variant_mapping', 'order_average', 'manual'
  
  -- Selling price for margin calculation
  selling_price numeric(10,2),
  
  -- Mapping metadata
  mapping_method text NOT NULL DEFAULT 'url_parse', -- 'url_parse', 'manual', 'utm', 'conversion_history'
  confidence_score numeric(3,2) DEFAULT 0.80,
  
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(ad_id, shopify_product_id, shopify_variant_id)
);

-- Add indexes for ad_product_mappings
CREATE INDEX IF NOT EXISTS idx_ad_product_mappings_user_id ON ad_product_mappings(user_id);
CREATE INDEX IF NOT EXISTS idx_ad_product_mappings_ad_id ON ad_product_mappings(ad_id);
CREATE INDEX IF NOT EXISTS idx_ad_product_mappings_shopify_product ON ad_product_mappings(shopify_product_id);

-- Enable RLS on ad_product_mappings
ALTER TABLE ad_product_mappings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ad_product_mappings
CREATE POLICY "Users can view their own ad product mappings"
  ON ad_product_mappings
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own ad product mappings"
  ON ad_product_mappings
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own ad product mappings"
  ON ad_product_mappings
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own ad product mappings"
  ON ad_product_mappings
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Add profit columns to ad_metrics for faster queries
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ad_metrics' AND column_name = 'estimated_cogs'
  ) THEN
    ALTER TABLE ad_metrics ADD COLUMN estimated_cogs numeric(10,2) DEFAULT 0;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ad_metrics' AND column_name = 'estimated_profit'
  ) THEN
    ALTER TABLE ad_metrics ADD COLUMN estimated_profit numeric(10,2) DEFAULT 0;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ad_metrics' AND column_name = 'profit_margin'
  ) THEN
    ALTER TABLE ad_metrics ADD COLUMN profit_margin numeric(5,2) DEFAULT 0;
  END IF;
END $$;

-- Add index on destination_url for URL parsing queries
CREATE INDEX IF NOT EXISTS idx_ads_destination_url ON ads(destination_url) WHERE destination_url IS NOT NULL;

-- Function to update ad_product_mappings timestamp
CREATE OR REPLACE FUNCTION update_ad_product_mappings_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_ad_product_mappings_timestamp ON ad_product_mappings;
CREATE TRIGGER update_ad_product_mappings_timestamp
  BEFORE UPDATE ON ad_product_mappings
  FOR EACH ROW
  EXECUTE FUNCTION update_ad_product_mappings_timestamp();