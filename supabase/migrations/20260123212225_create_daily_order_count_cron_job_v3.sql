/*
  # Create Daily Order Count Update Cron Job

  1. Purpose
    - Automatically update rolling 30-day order counts for all active stores
    - Check for tier limit warnings (80%, 95%, 100%)
    - Send notifications when users approach or exceed limits

  2. Schedule
    - Runs daily at 2:00 AM UTC
    - Updates all stores with ACTIVE or PENDING subscription status

  3. Implementation
    - Uses pg_cron to schedule the job
    - Calls the update-order-counts edge function
    - Edge function handles all business logic and notifications

  4. Monitoring
    - Check execution: SELECT * FROM cron.job WHERE jobname = 'update-daily-order-counts';
    - Check logs: SELECT * FROM cron.job_run_details WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'update-daily-order-counts') ORDER BY start_time DESC LIMIT 10;

  5. Manual Trigger (for testing)
    - SELECT net.http_post(url := current_setting('SUPABASE_URL', true) || '/functions/v1/update-order-counts', headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || current_setting('SUPABASE_SERVICE_ROLE_KEY', true)), body := '{}'::jsonb);
*/

-- Drop existing job if it exists (for idempotency)
DO $$
BEGIN
  PERFORM cron.unschedule('update-daily-order-counts');
EXCEPTION
  WHEN undefined_table THEN
    NULL; -- cron extension not available in local dev
  WHEN OTHERS THEN
    NULL; -- job doesn't exist
END $$;

-- Create the daily order count update job
-- Runs every day at 2:00 AM UTC
DO $$
BEGIN
  PERFORM cron.schedule(
    'update-daily-order-counts',
    '0 2 * * *',
    $CRON$
    SELECT net.http_post(
      url := current_setting('SUPABASE_URL', true) || '/functions/v1/update-order-counts',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('SUPABASE_SERVICE_ROLE_KEY', true)
      ),
      body := '{}'::jsonb
    ) as request_id;
    $CRON$
  );
EXCEPTION
  WHEN undefined_table THEN
    RAISE NOTICE 'pg_cron not available in local development. Job will be created in production.';
  WHEN undefined_function THEN
    RAISE NOTICE 'pg_cron schedule function not available. Job will be created in production.';
  WHEN OTHERS THEN
    RAISE WARNING 'Could not create cron job: %', SQLERRM;
END $$;