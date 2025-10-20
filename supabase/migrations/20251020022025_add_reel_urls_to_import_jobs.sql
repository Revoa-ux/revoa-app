/*
  # Add reel_urls column to import_jobs

  1. Changes
    - Add `reel_urls` column (text[]) - Array of Instagram reel URLs to process
    
  2. Notes
    - Optional field - if empty, agent will use discovery mode
    - If provided, agent will process these specific URLs instead of discovering
*/

-- Add reel_urls column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'import_jobs' AND column_name = 'reel_urls'
  ) THEN
    ALTER TABLE public.import_jobs ADD COLUMN reel_urls text[];
  END IF;
END $$;
