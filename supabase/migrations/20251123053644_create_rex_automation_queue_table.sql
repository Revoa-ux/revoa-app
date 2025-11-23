/*
  # Create Rex Automation Queue Table

  1. New Tables
    - `rex_automation_queue`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `insight_id` (text, reference to the insight that generated this)
      - `queue_type` (text, 'action' or 'rule')
      - `queue_data` (jsonb, stores the action/rule configuration)
      - `source_description` (text, human-readable description)
      - `entity_name` (text, the ad/campaign/set name)
      - `platform` (text, facebook/google/tiktok)
      - `status` (text, 'queued', 'processing', 'completed', 'failed')
      - `created_at` (timestamptz)
      - `expires_at` (timestamptz, auto-cleanup after 7 days)
      - `completed_at` (timestamptz, nullable)

  2. Security
    - Enable RLS on `rex_automation_queue` table
    - Add policies for authenticated users to manage their own queue items

  3. Indexes
    - Index on user_id for fast lookups
    - Index on status for filtering
    - Index on expires_at for cleanup queries
*/

-- Create rex_automation_queue table
CREATE TABLE IF NOT EXISTS rex_automation_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  insight_id text,
  queue_type text NOT NULL CHECK (queue_type IN ('action', 'rule')),
  queue_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  source_description text NOT NULL,
  entity_name text,
  platform text,
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'completed', 'failed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  completed_at timestamptz,
  error_message text
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_rex_automation_queue_user_id ON rex_automation_queue(user_id);
CREATE INDEX IF NOT EXISTS idx_rex_automation_queue_status ON rex_automation_queue(status);
CREATE INDEX IF NOT EXISTS idx_rex_automation_queue_expires_at ON rex_automation_queue(expires_at);
CREATE INDEX IF NOT EXISTS idx_rex_automation_queue_created_at ON rex_automation_queue(created_at DESC);

-- Enable RLS
ALTER TABLE rex_automation_queue ENABLE ROW LEVEL SECURITY;

-- Policies for rex_automation_queue
CREATE POLICY "Users can view own queue items"
  ON rex_automation_queue
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own queue items"
  ON rex_automation_queue
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own queue items"
  ON rex_automation_queue
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own queue items"
  ON rex_automation_queue
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Function to cleanup expired queue items
CREATE OR REPLACE FUNCTION cleanup_expired_automation_queue()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM rex_automation_queue
  WHERE expires_at < now()
    AND status IN ('queued', 'completed', 'failed');
END;
$$;

-- Create a scheduled job to run cleanup (this would typically be done via pg_cron or external scheduler)
-- For now, we just provide the function that can be called
COMMENT ON FUNCTION cleanup_expired_automation_queue IS 'Cleanup expired automation queue items. Should be run periodically via external scheduler.';
