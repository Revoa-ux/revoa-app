/*
  # Add hybrid import fields to import_jobs
  
  1. Changes
    - Add `import_type` column (text, default 'autonomous') - Type: autonomous | hybrid
    - Add `product_name` column (text) - Manual product name input
    - Add `amazon_url` column (text) - Amazon product URL
    - Add `aliexpress_url` column (text) - AliExpress product URL
    - Add `sample_reel_url` column (text) - Single reference reel URL
    
  2. Notes
    - For hybrid imports, admins provide basic product info
    - AI agent enriches with: product data from Amazon/AliExpress, finds more reels, generates GIFs, writes descriptions
    - For autonomous imports, agent does full discovery
*/

-- Add hybrid import columns if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'import_jobs' AND column_name = 'import_type'
  ) THEN
    ALTER TABLE public.import_jobs ADD COLUMN import_type text NOT NULL DEFAULT 'autonomous' CHECK (import_type IN ('autonomous', 'hybrid'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'import_jobs' AND column_name = 'product_name'
  ) THEN
    ALTER TABLE public.import_jobs ADD COLUMN product_name text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'import_jobs' AND column_name = 'amazon_url'
  ) THEN
    ALTER TABLE public.import_jobs ADD COLUMN amazon_url text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'import_jobs' AND column_name = 'aliexpress_url'
  ) THEN
    ALTER TABLE public.import_jobs ADD COLUMN aliexpress_url text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'import_jobs' AND column_name = 'sample_reel_url'
  ) THEN
    ALTER TABLE public.import_jobs ADD COLUMN sample_reel_url text;
  END IF;
END $$;