/*
  # Add Batch Quote Support

  1. Changes
    - Add `batch_id` column to `product_quotes` table for grouping quotes from bulk submissions
    - Add `source_shopify_product_id` column to store original Shopify product ID for auto-linking
    - Add `source` column to track quote origin (onboarding, dashboard, landing_page)
    - Update auto-assignment function to keep batch quotes with same admin

  2. Security
    - No changes to existing RLS policies (columns inherit table policies)
*/

-- Add new columns to product_quotes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'product_quotes' AND column_name = 'batch_id'
  ) THEN
    ALTER TABLE product_quotes ADD COLUMN batch_id uuid DEFAULT NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'product_quotes' AND column_name = 'source_shopify_product_id'
  ) THEN
    ALTER TABLE product_quotes ADD COLUMN source_shopify_product_id text DEFAULT NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'product_quotes' AND column_name = 'source'
  ) THEN
    ALTER TABLE product_quotes ADD COLUMN source text DEFAULT 'dashboard' CHECK (source IN ('onboarding', 'dashboard', 'landing_page'));
  END IF;
END $$;

-- Create index for batch_id for faster grouping queries
CREATE INDEX IF NOT EXISTS idx_product_quotes_batch_id ON product_quotes(batch_id) WHERE batch_id IS NOT NULL;

-- Update auto-assignment function to handle batch quotes
CREATE OR REPLACE FUNCTION auto_assign_quote_to_admin()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_id uuid;
  existing_batch_admin uuid;
BEGIN
  -- If this quote is part of a batch, check if other quotes in the batch already have an admin
  IF NEW.batch_id IS NOT NULL THEN
    SELECT assigned_admin_id INTO existing_batch_admin
    FROM product_quotes
    WHERE batch_id = NEW.batch_id
    AND assigned_admin_id IS NOT NULL
    LIMIT 1;
    
    IF existing_batch_admin IS NOT NULL THEN
      NEW.assigned_admin_id := existing_batch_admin;
      RETURN NEW;
    END IF;
  END IF;

  -- Get the admin with the least number of pending quotes (round-robin by workload)
  SELECT au.user_id INTO admin_id
  FROM admin_users au
  WHERE au.role IN ('admin', 'super_admin')
  ORDER BY (
    SELECT COUNT(*)
    FROM product_quotes pq
    WHERE pq.assigned_admin_id = au.user_id
    AND pq.status IN ('quote_pending', 'quoted')
  )
  LIMIT 1;

  -- Assign the quote to the admin
  IF admin_id IS NOT NULL THEN
    NEW.assigned_admin_id := admin_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
