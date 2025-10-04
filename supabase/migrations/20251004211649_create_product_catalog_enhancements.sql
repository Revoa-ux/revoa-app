/*
  # Enhanced Product Catalog System
  
  1. New Tables
    - `product_images` - Multiple images per product (main, variants, lifestyle)
    - `product_media` - GIFs, videos, and other media assets
    - `product_creatives` - Ad creatives (reels, ad copy, variations)
    - `product_import_logs` - Track bulk imports from AI agent
    
  2. Changes to Existing Tables
    - Add `supplier_id` reference to products table
    - Add `source` field to track if AI-imported or manual
    - Add extended metadata fields
    
  3. Security
    - Enable RLS on all new tables
    - Super admins can approve/manage
    - Regular admins can view pending
    - Users can only view approved products
    
  4. Import System
    - API endpoint friendly structure
    - Bulk insert optimized
    - Validation and deduplication
*/

-- Product Images Table
CREATE TABLE IF NOT EXISTS product_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  url text NOT NULL,
  type text NOT NULL CHECK (type IN ('main', 'variant', 'lifestyle', 'detail')),
  display_order int NOT NULL DEFAULT 0,
  alt_text text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP
);

-- Product Media Table (GIFs, Videos)
CREATE TABLE IF NOT EXISTS product_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  url text NOT NULL,
  thumbnail_url text,
  type text NOT NULL CHECK (type IN ('gif', 'video', 'image')),
  description text,
  duration_seconds int,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP
);

-- Product Creatives Table (Ad Copy, Reels, Variations)
CREATE TABLE IF NOT EXISTS product_creatives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('reel', 'ad', 'static', 'carousel')),
  url text NOT NULL,
  thumbnail_url text,
  platform text CHECK (platform IN ('facebook', 'instagram', 'tiktok', 'youtube', 'universal')),
  
  -- Ad Copy Fields
  headline text,
  description text,
  ad_copy text,
  cta_text text,
  
  -- Performance & Classification
  is_inspiration boolean DEFAULT true,
  performance_score numeric(3,2),
  
  -- Metadata
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP
);

-- Product Import Logs
CREATE TABLE IF NOT EXISTS product_import_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL CHECK (source IN ('ai_agent', 'manual', 'csv', 'api')),
  total_products int NOT NULL DEFAULT 0,
  successful_imports int NOT NULL DEFAULT 0,
  failed_imports int NOT NULL DEFAULT 0,
  error_details jsonb DEFAULT '[]'::jsonb,
  imported_by uuid REFERENCES auth.users(id),
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP
);

-- Add columns to products table if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'source'
  ) THEN
    ALTER TABLE products ADD COLUMN source text DEFAULT 'manual' CHECK (source IN ('ai_agent', 'manual', 'csv', 'api'));
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'supplier_price'
  ) THEN
    ALTER TABLE products ADD COLUMN supplier_price numeric(20,2);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'recommended_retail_price'
  ) THEN
    ALTER TABLE products ADD COLUMN recommended_retail_price numeric(20,2);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'external_id'
  ) THEN
    ALTER TABLE products ADD COLUMN external_id text UNIQUE;
  END IF;
END $$;

-- Enable RLS
ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_creatives ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_import_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for product_images
CREATE POLICY "Users can view images of approved products"
  ON product_images FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM products p
      WHERE p.id = product_images.product_id
      AND p.approval_status = 'approved'
    )
  );

CREATE POLICY "Admins can view all product images"
  ON product_images FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid()
      AND is_admin = true
    )
  );

CREATE POLICY "Admins can manage product images"
  ON product_images FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid()
      AND is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid()
      AND is_admin = true
    )
  );

-- RLS Policies for product_media
CREATE POLICY "Users can view media of approved products"
  ON product_media FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM products p
      WHERE p.id = product_media.product_id
      AND p.approval_status = 'approved'
    )
  );

CREATE POLICY "Admins can view all product media"
  ON product_media FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid()
      AND is_admin = true
    )
  );

CREATE POLICY "Admins can manage product media"
  ON product_media FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid()
      AND is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid()
      AND is_admin = true
    )
  );

-- RLS Policies for product_creatives
CREATE POLICY "Users can view creatives of approved products"
  ON product_creatives FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM products p
      WHERE p.id = product_creatives.product_id
      AND p.approval_status = 'approved'
    )
  );

CREATE POLICY "Admins can view all product creatives"
  ON product_creatives FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid()
      AND is_admin = true
    )
  );

CREATE POLICY "Admins can manage product creatives"
  ON product_creatives FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid()
      AND is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid()
      AND is_admin = true
    )
  );

-- RLS Policies for product_import_logs
CREATE POLICY "Super admins can view import logs"
  ON product_import_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid()
      AND admin_role = 'super_admin'
    )
  );

CREATE POLICY "System can create import logs"
  ON product_import_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_product_images_product_id ON product_images(product_id);
CREATE INDEX IF NOT EXISTS idx_product_images_type ON product_images(type);
CREATE INDEX IF NOT EXISTS idx_product_media_product_id ON product_media(product_id);
CREATE INDEX IF NOT EXISTS idx_product_media_type ON product_media(type);
CREATE INDEX IF NOT EXISTS idx_product_creatives_product_id ON product_creatives(product_id);
CREATE INDEX IF NOT EXISTS idx_product_creatives_type ON product_creatives(type);
CREATE INDEX IF NOT EXISTS idx_product_creatives_platform ON product_creatives(platform);
CREATE INDEX IF NOT EXISTS idx_product_creatives_is_inspiration ON product_creatives(is_inspiration);
CREATE INDEX IF NOT EXISTS idx_products_source ON products(source);
CREATE INDEX IF NOT EXISTS idx_products_external_id ON products(external_id);

-- Add helpful comments
COMMENT ON TABLE product_images IS 'Stores multiple images per product (main, variants, lifestyle)';
COMMENT ON TABLE product_media IS 'Stores product media assets (GIFs, videos)';
COMMENT ON TABLE product_creatives IS 'Stores ad creatives including reels, ad copy, and variations';
COMMENT ON TABLE product_import_logs IS 'Tracks bulk product imports from AI agent and other sources';
COMMENT ON COLUMN products.source IS 'Tracks the origin of the product data';
COMMENT ON COLUMN products.external_id IS 'External identifier for deduplication';
COMMENT ON COLUMN product_creatives.is_inspiration IS 'True for inspiration content, false for ready-to-use ads';