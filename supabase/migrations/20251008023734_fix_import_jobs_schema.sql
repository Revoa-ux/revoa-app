/*
  # Fix Import Jobs Table Schema

  1. Changes
    - Add missing columns that the edge function expects:
      - source (text) - Where the job came from
      - triggered_by (uuid) - User who triggered the job
      - inputs (jsonb) - Input parameters
      - total_products, successful_imports, failed_imports, skipped_imports (integers)
      - github_run_id, github_run_url (text)
    - Make filename nullable
    - Update status constraint to include 'queued' and 'running'
*/

-- Add missing columns
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'import_jobs' AND column_name = 'source'
  ) THEN
    ALTER TABLE import_jobs ADD COLUMN source text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'import_jobs' AND column_name = 'triggered_by'
  ) THEN
    ALTER TABLE import_jobs ADD COLUMN triggered_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'import_jobs' AND column_name = 'inputs'
  ) THEN
    ALTER TABLE import_jobs ADD COLUMN inputs jsonb DEFAULT '{}'::jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'import_jobs' AND column_name = 'total_products'
  ) THEN
    ALTER TABLE import_jobs ADD COLUMN total_products integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'import_jobs' AND column_name = 'successful_imports'
  ) THEN
    ALTER TABLE import_jobs ADD COLUMN successful_imports integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'import_jobs' AND column_name = 'failed_imports'
  ) THEN
    ALTER TABLE import_jobs ADD COLUMN failed_imports integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'import_jobs' AND column_name = 'skipped_imports'
  ) THEN
    ALTER TABLE import_jobs ADD COLUMN skipped_imports integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'import_jobs' AND column_name = 'github_run_id'
  ) THEN
    ALTER TABLE import_jobs ADD COLUMN github_run_id text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'import_jobs' AND column_name = 'github_run_url'
  ) THEN
    ALTER TABLE import_jobs ADD COLUMN github_run_url text;
  END IF;
END $$;

-- Make filename nullable
ALTER TABLE import_jobs ALTER COLUMN filename DROP NOT NULL;

-- Drop old constraint and create new one
ALTER TABLE import_jobs DROP CONSTRAINT IF EXISTS import_jobs_status_check;
ALTER TABLE import_jobs ADD CONSTRAINT import_jobs_status_check 
  CHECK (status IN ('pending', 'queued', 'processing', 'running', 'completed', 'failed'));