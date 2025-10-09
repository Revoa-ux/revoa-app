/*
  # Add mode and niche columns to import_jobs

  1. Changes
    - Add `mode` column (text, default 'real') - Execution mode: real | demo
    - Add `niche` column (text, default 'all') - Product niche filter
    - Add `started_at` column (timestamptz) - When job started executing
    - Add `finished_at` column (timestamptz) - When job finished
    - Add `error_text` column (text) - Error details if failed
    - Rename `created_by` to match user reference pattern
    - Update status values to match new schema: queued | running | succeeded | failed
*/

-- Add new columns if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'import_jobs' AND column_name = 'mode'
  ) THEN
    ALTER TABLE public.import_jobs ADD COLUMN mode text NOT NULL DEFAULT 'real';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'import_jobs' AND column_name = 'niche'
  ) THEN
    ALTER TABLE public.import_jobs ADD COLUMN niche text DEFAULT 'all';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'import_jobs' AND column_name = 'started_at'
  ) THEN
    ALTER TABLE public.import_jobs ADD COLUMN started_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'import_jobs' AND column_name = 'finished_at'
  ) THEN
    ALTER TABLE public.import_jobs ADD COLUMN finished_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'import_jobs' AND column_name = 'error_text'
  ) THEN
    ALTER TABLE public.import_jobs ADD COLUMN error_text text;
  END IF;
END $$;