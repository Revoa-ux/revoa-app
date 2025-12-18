/*
  # Add Flow Continuation System

  ## Overview
  Enables flows to chain together seamlessly so one flow can continue into another.
  For example: Shipping Issue → Damage Report → Replacement Request

  ## Changes
  1. Add next_flow_suggestions to completion node metadata
  2. Add flow_continuation_history table to track flow chains
  3. Add helper function to suggest next flows based on context

  ## Flow Continuation Logic
  - Each completion node can suggest 1+ follow-up flows
  - System tracks which flows have run in a thread
  - UI presents continuation options when a flow completes
  - User can choose to continue or end the conversation

  ## Security
  - Same RLS as existing flow tables
  - Users can only see their own flow continuations
  - Admins can see continuations for assigned users
*/

-- Create flow_continuation_history table to track flow chains
CREATE TABLE IF NOT EXISTS flow_continuation_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES chat_threads(id) ON DELETE CASCADE,
  from_session_id uuid REFERENCES thread_flow_sessions(id) ON DELETE CASCADE,
  to_session_id uuid REFERENCES thread_flow_sessions(id) ON DELETE CASCADE,
  continued_at timestamptz DEFAULT now()
);

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_flow_continuation_thread
  ON flow_continuation_history(thread_id);

-- Enable RLS
ALTER TABLE flow_continuation_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for flow_continuation_history

-- Users can view their own flow continuations
CREATE POLICY "Users can view own flow continuations"
  ON flow_continuation_history
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chat_threads ct
      JOIN chats c ON c.id = ct.chat_id
      WHERE ct.id = flow_continuation_history.thread_id
      AND c.user_id = auth.uid()
    )
  );

-- Admins can view continuations for assigned users
CREATE POLICY "Admins can view assigned user flow continuations"
  ON flow_continuation_history
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chat_threads ct
      JOIN chats c ON c.id = ct.chat_id
      JOIN user_assignments ua ON ua.user_id = c.user_id
      WHERE ct.id = flow_continuation_history.thread_id
      AND ua.admin_id = auth.uid()
    )
  );

-- Users can insert their own continuations
CREATE POLICY "Users can insert own flow continuations"
  ON flow_continuation_history
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM chat_threads ct
      JOIN chats c ON c.id = ct.chat_id
      WHERE ct.id = thread_id
      AND c.user_id = auth.uid()
    )
  );

-- Create function to get suggested next flows based on completed flow
CREATE OR REPLACE FUNCTION get_suggested_next_flows(
  p_thread_id uuid,
  p_current_flow_id uuid
)
RETURNS TABLE (
  flow_id uuid,
  flow_name text,
  flow_description text,
  flow_category text,
  reason text
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_flow_category text;
  v_flow_state jsonb;
  v_completed_categories text[];
BEGIN
  -- Get current flow category
  SELECT category INTO v_flow_category
  FROM bot_flows
  WHERE id = p_current_flow_id;

  -- Get all completed flow categories in this thread
  SELECT array_agg(DISTINCT bf.category) INTO v_completed_categories
  FROM thread_flow_sessions tfs
  JOIN bot_flows bf ON bf.id = tfs.flow_id
  WHERE tfs.thread_id = p_thread_id
  AND tfs.completed_at IS NOT NULL;

  -- Suggest flows based on the current flow category
  RETURN QUERY
  SELECT
    bf.id,
    bf.name,
    bf.description,
    bf.category,
    CASE bf.category
      -- If shipping issue, might lead to damage or wrong item
      WHEN 'damage' THEN 'Package arrived but is damaged'
      WHEN 'wrong_item' THEN 'Wrong item was shipped'
      WHEN 'missing_items' THEN 'Some items are missing'

      -- If damage was reported, might need replacement or refund
      WHEN 'replacement' THEN 'Request replacement for damaged item'
      WHEN 'refund' THEN 'Request refund instead of replacement'

      -- If defective, might escalate to return
      WHEN 'return' THEN 'Process return for defective item'

      -- If wrong item, might need return process
      WHEN 'return' THEN 'Return wrong item received'

      ELSE 'Continue with this flow'
    END as reason
  FROM bot_flows bf
  WHERE bf.is_active = true
  AND bf.category != v_flow_category -- Don't suggest the same flow again
  AND bf.category NOT IN (SELECT unnest(COALESCE(v_completed_categories, ARRAY[]::text[]))) -- Don't suggest already completed flows
  AND (
    -- Shipping can lead to damage, wrong item, or missing items
    (v_flow_category = 'shipping' AND bf.category IN ('damage', 'wrong_item', 'missing_items'))
    OR
    -- Damage can lead to replacement or refund
    (v_flow_category = 'damage' AND bf.category IN ('replacement', 'refund'))
    OR
    -- Defective can lead to return or replacement
    (v_flow_category = 'defective' AND bf.category IN ('return', 'replacement', 'refund'))
    OR
    -- Wrong item can lead to return
    (v_flow_category = 'wrong_item' AND bf.category = 'return')
    OR
    -- Missing items might need refund
    (v_flow_category = 'missing_items' AND bf.category IN ('refund', 'replacement'))
    OR
    -- Cancel/modify might need to process refund
    (v_flow_category = 'cancel_modify' AND bf.category = 'refund')
  )
  LIMIT 3;
END;
$$;
