/*
  # Create Two-Phase Sync System for Facebook Ads
  
  1. New Tables
    - `sync_jobs`
      - Tracks overall sync jobs for ad accounts
      - Stores phase information (Phase 1: recent 90 days, Phase 2: historical backfill)
      - Tracks sync type (initial, incremental, manual)
      - Stores date ranges and completion timestamps
      - Progress metadata for real-time updates
    
    - `sync_job_chunks`
      - Tracks individual API call chunks within a sync job
      - Enables retry logic and error handling per chunk
      - Stores chunk type (structure, campaign_metrics, adset_metrics, ad_metrics)
      - Tracks date ranges and entity batching info
  
  2. Security
    - Enable RLS on both tables
    - Users can only view their own sync jobs
    - Service role can manage all sync operations
  
  3. Indexes
    - Optimize queries by account_id and status
    - Optimize chunk queries by job_id
*/

-- Create sync_jobs table
CREATE TABLE IF NOT EXISTS sync_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ad_account_id uuid NOT NULL REFERENCES ad_accounts(id) ON DELETE CASCADE,
  
  -- Sync configuration
  sync_phase text NOT NULL CHECK (sync_phase IN ('recent_90_days', 'historical_backfill')),
  sync_type text NOT NULL CHECK (sync_type IN ('initial', 'incremental', 'manual')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'failed', 'cancelled')),
  
  -- Date ranges
  recent_start_date date,
  recent_end_date date,
  historical_start_date date,
  historical_end_date date,
  
  -- Progress tracking
  total_chunks integer DEFAULT 0,
  completed_chunks integer DEFAULT 0,
  failed_chunks integer DEFAULT 0,
  progress_percentage integer DEFAULT 0,
  
  -- Current processing state
  current_chunk_type text CHECK (current_chunk_type IN ('structure', 'campaign_metrics', 'adset_metrics', 'ad_metrics')),
  current_entity_offset integer DEFAULT 0,
  
  -- Completion tracking
  phase_1_completed_at timestamptz,
  phase_2_completed_at timestamptz,
  
  -- Metadata
  total_campaigns_synced integer DEFAULT 0,
  total_adsets_synced integer DEFAULT 0,
  total_ads_synced integer DEFAULT 0,
  estimated_completion_time timestamptz,
  
  -- Error tracking
  error_message text,
  error_count integer DEFAULT 0,
  
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  started_at timestamptz,
  completed_at timestamptz
);

-- Create sync_job_chunks table
CREATE TABLE IF NOT EXISTS sync_job_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_job_id uuid NOT NULL REFERENCES sync_jobs(id) ON DELETE CASCADE,
  
  -- Chunk configuration
  chunk_type text NOT NULL CHECK (chunk_type IN ('structure', 'campaign_metrics', 'adset_metrics', 'ad_metrics')),
  chunk_order integer NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'failed', 'skipped')),
  
  -- Entity batching
  entity_offset integer DEFAULT 0,
  entity_limit integer DEFAULT 50,
  
  -- Date range for metrics
  start_date date,
  end_date date,
  
  -- Processing results
  entities_processed integer DEFAULT 0,
  metrics_synced integer DEFAULT 0,
  
  -- Retry logic
  retry_count integer DEFAULT 0,
  max_retries integer DEFAULT 3,
  last_error text,
  
  -- Timing
  estimated_duration_seconds integer,
  actual_duration_seconds integer,
  
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  started_at timestamptz,
  completed_at timestamptz
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_sync_jobs_user_id ON sync_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_sync_jobs_ad_account_id ON sync_jobs(ad_account_id);
CREATE INDEX IF NOT EXISTS idx_sync_jobs_status ON sync_jobs(status);
CREATE INDEX IF NOT EXISTS idx_sync_jobs_sync_phase ON sync_jobs(sync_phase);
CREATE INDEX IF NOT EXISTS idx_sync_jobs_created_at ON sync_jobs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_sync_job_chunks_sync_job_id ON sync_job_chunks(sync_job_id);
CREATE INDEX IF NOT EXISTS idx_sync_job_chunks_status ON sync_job_chunks(status);
CREATE INDEX IF NOT EXISTS idx_sync_job_chunks_chunk_order ON sync_job_chunks(sync_job_id, chunk_order);

-- Enable RLS
ALTER TABLE sync_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_job_chunks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for sync_jobs

-- Users can view their own sync jobs
CREATE POLICY "Users can view own sync jobs"
  ON sync_jobs
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Service role can manage all sync jobs
CREATE POLICY "Service role can manage all sync jobs"
  ON sync_jobs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Users can insert their own sync jobs
CREATE POLICY "Users can create own sync jobs"
  ON sync_jobs
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own sync jobs
CREATE POLICY "Users can update own sync jobs"
  ON sync_jobs
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for sync_job_chunks

-- Users can view chunks for their own sync jobs
CREATE POLICY "Users can view own sync job chunks"
  ON sync_job_chunks
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM sync_jobs
      WHERE sync_jobs.id = sync_job_chunks.sync_job_id
      AND sync_jobs.user_id = auth.uid()
    )
  );

-- Service role can manage all chunks
CREATE POLICY "Service role can manage all chunks"
  ON sync_job_chunks
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Users can insert chunks for their own sync jobs
CREATE POLICY "Users can create own sync job chunks"
  ON sync_job_chunks
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sync_jobs
      WHERE sync_jobs.id = sync_job_chunks.sync_job_id
      AND sync_jobs.user_id = auth.uid()
    )
  );

-- Users can update chunks for their own sync jobs
CREATE POLICY "Users can update own sync job chunks"
  ON sync_job_chunks
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM sync_jobs
      WHERE sync_jobs.id = sync_job_chunks.sync_job_id
      AND sync_jobs.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sync_jobs
      WHERE sync_jobs.id = sync_job_chunks.sync_job_id
      AND sync_jobs.user_id = auth.uid()
    )
  );

-- Function to update sync job progress
CREATE OR REPLACE FUNCTION update_sync_job_progress()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update parent sync job progress
  UPDATE sync_jobs
  SET 
    completed_chunks = (
      SELECT COUNT(*) 
      FROM sync_job_chunks 
      WHERE sync_job_id = NEW.sync_job_id 
      AND status = 'completed'
    ),
    failed_chunks = (
      SELECT COUNT(*) 
      FROM sync_job_chunks 
      WHERE sync_job_id = NEW.sync_job_id 
      AND status = 'failed'
    ),
    progress_percentage = LEAST(100, GREATEST(0, 
      ROUND((SELECT COUNT(*)::numeric 
        FROM sync_job_chunks 
        WHERE sync_job_id = NEW.sync_job_id 
        AND status = 'completed'
      ) * 100.0 / NULLIF(total_chunks, 0))
    )),
    updated_at = now()
  WHERE id = NEW.sync_job_id;
  
  RETURN NEW;
END;
$$;

-- Trigger to auto-update sync job progress
DROP TRIGGER IF EXISTS trigger_update_sync_job_progress ON sync_job_chunks;
CREATE TRIGGER trigger_update_sync_job_progress
  AFTER UPDATE OF status ON sync_job_chunks
  FOR EACH ROW
  EXECUTE FUNCTION update_sync_job_progress();

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_sync_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Triggers for updated_at
DROP TRIGGER IF EXISTS trigger_sync_jobs_updated_at ON sync_jobs;
CREATE TRIGGER trigger_sync_jobs_updated_at
  BEFORE UPDATE ON sync_jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_sync_updated_at();

DROP TRIGGER IF EXISTS trigger_sync_job_chunks_updated_at ON sync_job_chunks;
CREATE TRIGGER trigger_sync_job_chunks_updated_at
  BEFORE UPDATE ON sync_job_chunks
  FOR EACH ROW
  EXECUTE FUNCTION update_sync_updated_at();
