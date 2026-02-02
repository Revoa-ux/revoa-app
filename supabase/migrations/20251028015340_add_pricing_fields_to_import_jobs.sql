/*
  # Add Pricing Fields to Import Jobs
  
  1. Changes
    - Add `amazon_price` column (decimal) - Admin-provided Amazon price
    - Add `aliexpress_price` column (decimal) - Admin-provided AliExpress price  
    - Add `suggested_retail_price` column (decimal) - Admin-provided retail price suggestion
    
  2. Notes
    - These fields allow admins to manually specify prices instead of scraping
    - AI agent will use these values if provided, otherwise attempt to scrape
    - Supports the hybrid workflow where admin provides product data upfront
*/

-- Add pricing columns if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'import_jobs' AND column_name = 'amazon_price'
  ) THEN
    ALTER TABLE public.import_jobs ADD COLUMN amazon_price decimal(10,2);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'import_jobs' AND column_name = 'aliexpress_price'
  ) THEN
    ALTER TABLE public.import_jobs ADD COLUMN aliexpress_price decimal(10,2);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'import_jobs' AND column_name = 'suggested_retail_price'
  ) THEN
    ALTER TABLE public.import_jobs ADD COLUMN suggested_retail_price decimal(10,2);
  END IF;
END $$;