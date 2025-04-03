/*
  # Create error reports table

  1. New Tables
    - `error_reports`
      - `id` (uuid, primary key)
      - `timestamp` (timestamptz, not null)
      - `email` (text, not null)
      - `error_message` (text, not null)
      - `error_code` (text)
      - `console_errors` (text[])
      - `device_info` (jsonb, not null)
      - `network_info` (jsonb, not null)
      - `retry_attempt` (integer, not null)
      - `metadata` (jsonb)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      - `browser` (jsonb, not null)

  2. Security
    - Enable RLS
    - Add policies for authenticated users
*/

-- Create error_reports table if it doesn't exist
CREATE TABLE IF NOT EXISTS error_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp timestamptz NOT NULL,
  email text NOT NULL,
  error_message text NOT NULL,
  error_code text,
  console_errors text[],
  device_info jsonb NOT NULL DEFAULT '{}'::jsonb,
  network_info jsonb NOT NULL DEFAULT '{}'::jsonb,
  retry_attempt integer NOT NULL DEFAULT 0,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  browser jsonb NOT NULL DEFAULT '{}'::jsonb
);

-- Enable RLS
ALTER TABLE error_reports ENABLE ROW LEVEL SECURITY;

-- Create policies if they don't exist
DO $$ 
BEGIN
  -- Insert policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'error_reports' 
    AND policyname = 'Enable insert access for authenticated users on error_reports'
  ) THEN
    CREATE POLICY "Enable insert access for authenticated users on error_reports"
      ON error_reports
      FOR INSERT
      TO authenticated
      WITH CHECK (true);
  END IF;

  -- Select policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'error_reports' 
    AND policyname = 'Enable read access for authenticated users on error_reports'
  ) THEN
    CREATE POLICY "Enable read access for authenticated users on error_reports"
      ON error_reports
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END $$;

-- Create updated_at trigger if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_error_reports_updated_at'
  ) THEN
    CREATE TRIGGER update_error_reports_updated_at
      BEFORE UPDATE ON error_reports
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Create indexes if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'error_reports' AND indexname = 'idx_error_reports_email'
  ) THEN
    CREATE INDEX idx_error_reports_email ON error_reports (email);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'error_reports' AND indexname = 'idx_error_reports_error_code'
  ) THEN
    CREATE INDEX idx_error_reports_error_code ON error_reports (error_code);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'error_reports' AND indexname = 'idx_error_reports_retry_attempt'
  ) THEN
    CREATE INDEX idx_error_reports_retry_attempt ON error_reports (retry_attempt);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'error_reports' AND indexname = 'idx_error_reports_timestamp'
  ) THEN
    CREATE INDEX idx_error_reports_timestamp ON error_reports ("timestamp" DESC);
  END IF;
END $$;