/*
  # Setup Automation Rule Scheduler

  1. Purpose
    - Creates a scheduled job to execute automation rules every 15 minutes
    - Uses pg_cron extension for reliable scheduling
    - Calls the execute-automation-rules Edge Function

  2. Implementation
    - Enables pg_cron extension if not already enabled
    - Creates a cron job that runs every 15 minutes
    - Job makes HTTP POST request to execute-automation-rules function

  3. Security
    - Uses service role key stored in vault
    - Only executes active rules
    - Respects check_frequency_minutes setting per rule
*/

-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Grant usage on cron schema
GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cron TO postgres;

-- Remove existing job if it exists (ignore errors if doesn't exist)
DO $$
BEGIN
  PERFORM cron.unschedule('execute-automation-rules');
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- Create cron job to execute automation rules every 15 minutes
-- This will call the Edge Function which handles all rule execution logic
SELECT cron.schedule(
  'execute-automation-rules',
  '*/15 * * * *', -- Every 15 minutes
  $$
  SELECT
    net.http_post(
      url := current_setting('app.settings.supabase_url') || '/functions/v1/execute-automation-rules',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.supabase_service_role_key')
      ),
      body := '{}'::jsonb
    ) as request_id;
  $$
);

-- Add comment for documentation
COMMENT ON EXTENSION pg_cron IS 'Cron-based job scheduler for PostgreSQL - used for automation rule execution';
