/*
  # Atomic Status Change Tracking System

  ## Overview
  This migration implements bulletproof status change tracking to ensure no metrics are lost
  when ad entities transition between states (especially ACTIVE → PAUSED).

  ## Changes

  1. Enhanced Status Tracking Columns
    - Add `previous_status` to track the prior state
    - Add `status_changed_at` to timestamp status transitions
    - Add `last_final_sync_at` to track final sync before pause
    - Applied to: ad_campaigns, ad_sets, ads

  2. Status Change Audit Log
    - `ad_status_change_log` table tracks all status transitions
    - Stores old/new status, sync status, and timestamps
    - Critical for debugging and data integrity verification

  3. Automatic Status Change Detection
    - Trigger function automatically detects status changes
    - Logs every transition to audit table
    - Runs on UPDATE of status column

  ## Security
  - Enable RLS on audit log table
  - Users can view their own status change history
  - Service role has full access for sync operations
*/

-- Add status tracking columns to ad_campaigns
DO $$
BEGIN
  -- previous_status: Stores the status before the current change
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ad_campaigns' AND column_name = 'previous_status'
  ) THEN
    ALTER TABLE ad_campaigns ADD COLUMN previous_status text;
  END IF;

  -- status_changed_at: Timestamp when status last changed
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ad_campaigns' AND column_name = 'status_changed_at'
  ) THEN
    ALTER TABLE ad_campaigns ADD COLUMN status_changed_at timestamptz;
  END IF;

  -- last_final_sync_at: When we last did a final sync before pause
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ad_campaigns' AND column_name = 'last_final_sync_at'
  ) THEN
    ALTER TABLE ad_campaigns ADD COLUMN last_final_sync_at timestamptz;
  END IF;
END $$;

-- Add status tracking columns to ad_sets
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ad_sets' AND column_name = 'previous_status'
  ) THEN
    ALTER TABLE ad_sets ADD COLUMN previous_status text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ad_sets' AND column_name = 'status_changed_at'
  ) THEN
    ALTER TABLE ad_sets ADD COLUMN status_changed_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ad_sets' AND column_name = 'last_final_sync_at'
  ) THEN
    ALTER TABLE ad_sets ADD COLUMN last_final_sync_at timestamptz;
  END IF;
END $$;

-- Add status tracking columns to ads
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ads' AND column_name = 'previous_status'
  ) THEN
    ALTER TABLE ads ADD COLUMN previous_status text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ads' AND column_name = 'status_changed_at'
  ) THEN
    ALTER TABLE ads ADD COLUMN status_changed_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ads' AND column_name = 'last_final_sync_at'
  ) THEN
    ALTER TABLE ads ADD COLUMN last_final_sync_at timestamptz;
  END IF;
END $$;

-- Create status change audit log table
CREATE TABLE IF NOT EXISTS ad_status_change_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Entity identification
  entity_type text NOT NULL CHECK (entity_type IN ('campaign', 'adset', 'ad')),
  entity_id uuid NOT NULL,
  platform_entity_id text NOT NULL,

  -- Ad account context
  ad_account_id uuid NOT NULL REFERENCES ad_accounts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Status transition details
  old_status text NOT NULL,
  new_status text NOT NULL,

  -- Sync tracking
  final_sync_completed boolean DEFAULT false,
  final_sync_attempted_at timestamptz,
  final_sync_error text,

  -- Metadata
  platform text NOT NULL DEFAULT 'facebook',
  change_detected_during_sync boolean DEFAULT true,
  sync_job_id uuid REFERENCES sync_jobs(id) ON DELETE SET NULL,

  -- Additional context
  metadata jsonb DEFAULT '{}',

  -- Timestamps
  created_at timestamptz DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_status_log_entity ON ad_status_change_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_status_log_user_id ON ad_status_change_log(user_id);
CREATE INDEX IF NOT EXISTS idx_status_log_ad_account_id ON ad_status_change_log(ad_account_id);
CREATE INDEX IF NOT EXISTS idx_status_log_created_at ON ad_status_change_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_status_log_transitions ON ad_status_change_log(old_status, new_status);
CREATE INDEX IF NOT EXISTS idx_status_log_final_sync ON ad_status_change_log(final_sync_completed) WHERE NOT final_sync_completed;

-- Enable RLS
ALTER TABLE ad_status_change_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own status changes"
  ON ad_status_change_log FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all status changes"
  ON ad_status_change_log FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Function to automatically log status changes
CREATE OR REPLACE FUNCTION log_ad_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ad_account_id uuid;
  v_user_id uuid;
  v_platform text;
  v_platform_entity_id text;
BEGIN
  -- Only log if status actually changed
  IF OLD.status IS DISTINCT FROM NEW.status THEN

    -- Get context based on entity type
    IF TG_TABLE_NAME = 'ad_campaigns' THEN
      SELECT ad_account_id INTO v_ad_account_id FROM ad_campaigns WHERE id = NEW.id;
      SELECT user_id, platform INTO v_user_id, v_platform FROM ad_accounts WHERE id = v_ad_account_id;
      v_platform_entity_id := NEW.platform_campaign_id;

      -- Update previous_status and timestamp on the campaign
      NEW.previous_status := OLD.status;
      NEW.status_changed_at := now();

    ELSIF TG_TABLE_NAME = 'ad_sets' THEN
      SELECT ac.ad_account_id INTO v_ad_account_id
      FROM ad_campaigns ac
      WHERE ac.id = NEW.campaign_id;
      SELECT user_id, platform INTO v_user_id, v_platform FROM ad_accounts WHERE id = v_ad_account_id;
      v_platform_entity_id := NEW.platform_ad_set_id;

      -- Update previous_status and timestamp on the ad set
      NEW.previous_status := OLD.status;
      NEW.status_changed_at := now();

    ELSIF TG_TABLE_NAME = 'ads' THEN
      SELECT ac.ad_account_id INTO v_ad_account_id
      FROM ad_campaigns ac
      JOIN ad_sets ads ON ads.campaign_id = ac.id
      WHERE ads.id = NEW.ad_set_id;
      SELECT user_id, platform INTO v_user_id, v_platform FROM ad_accounts WHERE id = v_ad_account_id;
      v_platform_entity_id := NEW.platform_ad_id;

      -- Update previous_status and timestamp on the ad
      NEW.previous_status := OLD.status;
      NEW.status_changed_at := now();
    END IF;

    -- Insert audit log entry
    INSERT INTO ad_status_change_log (
      entity_type,
      entity_id,
      platform_entity_id,
      ad_account_id,
      user_id,
      old_status,
      new_status,
      platform,
      final_sync_completed,
      metadata
    ) VALUES (
      CASE TG_TABLE_NAME
        WHEN 'ad_campaigns' THEN 'campaign'
        WHEN 'ad_sets' THEN 'adset'
        WHEN 'ads' THEN 'ad'
      END,
      NEW.id,
      v_platform_entity_id,
      v_ad_account_id,
      v_user_id,
      OLD.status,
      NEW.status,
      v_platform,
      false, -- Will be updated by sync handler
      jsonb_build_object(
        'old_status', OLD.status,
        'new_status', NEW.status,
        'entity_name', NEW.name
      )
    );

  END IF;

  RETURN NEW;
END;
$$;

-- Create triggers for automatic status change logging
DROP TRIGGER IF EXISTS trigger_log_campaign_status_change ON ad_campaigns;
CREATE TRIGGER trigger_log_campaign_status_change
  BEFORE UPDATE OF status ON ad_campaigns
  FOR EACH ROW
  EXECUTE FUNCTION log_ad_status_change();

DROP TRIGGER IF EXISTS trigger_log_adset_status_change ON ad_sets;
CREATE TRIGGER trigger_log_adset_status_change
  BEFORE UPDATE OF status ON ad_sets
  FOR EACH ROW
  EXECUTE FUNCTION log_ad_status_change();

DROP TRIGGER IF EXISTS trigger_log_ad_status_change ON ads;
CREATE TRIGGER trigger_log_ad_status_change
  BEFORE UPDATE OF status ON ads
  FOR EACH ROW
  EXECUTE FUNCTION log_ad_status_change();

-- Function to get entities needing final sync (called by sync handler)
CREATE OR REPLACE FUNCTION get_entities_needing_final_sync(
  p_ad_account_id uuid,
  p_entity_type text DEFAULT NULL
)
RETURNS TABLE (
  log_id uuid,
  entity_type text,
  entity_id uuid,
  platform_entity_id text,
  old_status text,
  new_status text,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    l.id,
    l.entity_type,
    l.entity_id,
    l.platform_entity_id,
    l.old_status,
    l.new_status,
    l.created_at
  FROM ad_status_change_log l
  WHERE l.ad_account_id = p_ad_account_id
    AND l.final_sync_completed = false
    AND (p_entity_type IS NULL OR l.entity_type = p_entity_type)
    AND l.old_status IN ('ACTIVE', 'active')
    AND l.new_status IN ('PAUSED', 'paused', 'DELETED', 'deleted')
  ORDER BY l.created_at ASC;
END;
$$;

-- Function to mark final sync as completed
CREATE OR REPLACE FUNCTION mark_final_sync_completed(
  p_log_id uuid,
  p_success boolean DEFAULT true,
  p_error text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE ad_status_change_log
  SET
    final_sync_completed = p_success,
    final_sync_attempted_at = now(),
    final_sync_error = p_error
  WHERE id = p_log_id;

  -- Also update the entity's last_final_sync_at if successful
  IF p_success THEN
    UPDATE ad_campaigns
    SET last_final_sync_at = now()
    WHERE id = (SELECT entity_id FROM ad_status_change_log WHERE id = p_log_id AND entity_type = 'campaign');

    UPDATE ad_sets
    SET last_final_sync_at = now()
    WHERE id = (SELECT entity_id FROM ad_status_change_log WHERE id = p_log_id AND entity_type = 'adset');

    UPDATE ads
    SET last_final_sync_at = now()
    WHERE id = (SELECT entity_id FROM ad_status_change_log WHERE id = p_log_id AND entity_type = 'ad');
  END IF;
END;
$$;