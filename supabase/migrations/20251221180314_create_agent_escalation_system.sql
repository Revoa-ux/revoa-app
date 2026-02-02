/*
  # Agent Escalation System

  ## Overview
  Creates a smart escalation system that automatically notifies agents when they need
  to take external actions (contact carrier, factory, logistics, etc.) based on
  conversational flow outcomes.

  ## Changes

  1. **chat_threads table additions**
     - requires_agent_action (boolean) - Simple flag: needs agent attention or not
     - escalation_type (text) - What action is needed (contact_carrier, contact_factory, etc.)
     - escalated_at (timestamptz) - When escalation was triggered
     - escalation_context (jsonb) - Flow data (days without tracking, order value, etc.)
     - agent_acknowledged (boolean) - Whether admin has viewed the escalated thread
     - agent_acknowledged_at (timestamptz) - When admin acknowledged

  2. **thread_escalation_history table**
     - Complete audit trail of all escalations
     - Tracks status changes and admin actions
     - Helps with analytics and accountability

  3. **Escalation Types**
     - contact_carrier_investigation - 7+ days no tracking
     - file_carrier_claim - Lost or damaged packages
     - contact_factory_claim - Defective items within warranty
     - factory_exception_approval - Outside warranty period
     - contact_logistics_customs - Customs holds/rejections
     - contact_carrier_intercept - Cancel/redirect shipped orders
     - high_value_approval - High-value refunds
     - delivery_verification_needed - Delivered but not received
     - return_investigation - Return processing issues

  4. **Auto-notification system**
     - Creates notifications for assigned admins
     - Updates thread timestamp to bump to top of conversation list
     - Provides context for agent action
*/

-- Add escalation fields to chat_threads
DO $$
BEGIN
  -- requires_agent_action flag
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chat_threads' AND column_name = 'requires_agent_action'
  ) THEN
    ALTER TABLE chat_threads ADD COLUMN requires_agent_action boolean DEFAULT false;
  END IF;

  -- escalation_type
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chat_threads' AND column_name = 'escalation_type'
  ) THEN
    ALTER TABLE chat_threads ADD COLUMN escalation_type text;
  END IF;

  -- escalated_at
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chat_threads' AND column_name = 'escalated_at'
  ) THEN
    ALTER TABLE chat_threads ADD COLUMN escalated_at timestamptz;
  END IF;

  -- escalation_context
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chat_threads' AND column_name = 'escalation_context'
  ) THEN
    ALTER TABLE chat_threads ADD COLUMN escalation_context jsonb DEFAULT '{}'::jsonb;
  END IF;

  -- agent_acknowledged
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chat_threads' AND column_name = 'agent_acknowledged'
  ) THEN
    ALTER TABLE chat_threads ADD COLUMN agent_acknowledged boolean DEFAULT false;
  END IF;

  -- agent_acknowledged_at
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chat_threads' AND column_name = 'agent_acknowledged_at'
  ) THEN
    ALTER TABLE chat_threads ADD COLUMN agent_acknowledged_at timestamptz;
  END IF;
END $$;

-- Create index for escalated threads
CREATE INDEX IF NOT EXISTS idx_chat_threads_requires_agent_action
  ON chat_threads(requires_agent_action, escalated_at DESC)
  WHERE requires_agent_action = true;

-- Create thread_escalation_history table
CREATE TABLE IF NOT EXISTS thread_escalation_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES chat_threads(id) ON DELETE CASCADE,
  escalation_type text NOT NULL,
  triggered_by_node text,
  context_data jsonb DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'acknowledged', 'investigating', 'resolved')),
  assigned_to_admin uuid REFERENCES auth.users(id),
  resolved_at timestamptz,
  resolution_notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for history
CREATE INDEX IF NOT EXISTS idx_escalation_history_thread_id ON thread_escalation_history(thread_id);
CREATE INDEX IF NOT EXISTS idx_escalation_history_assigned_admin ON thread_escalation_history(assigned_to_admin);
CREATE INDEX IF NOT EXISTS idx_escalation_history_status ON thread_escalation_history(status) WHERE status IN ('pending', 'acknowledged');

-- Enable RLS on escalation history
ALTER TABLE thread_escalation_history ENABLE ROW LEVEL SECURITY;

-- Admins can view escalation history for their assigned chats
CREATE POLICY "Admins can view escalation history for assigned chats"
  ON thread_escalation_history
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chat_threads ct
      JOIN chats c ON c.id = ct.chat_id
      WHERE ct.id = thread_escalation_history.thread_id
      AND c.admin_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_super_admin = true
    )
  );

-- Admins can update escalation history for their assigned chats
CREATE POLICY "Admins can update escalation history for assigned chats"
  ON thread_escalation_history
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chat_threads ct
      JOIN chats c ON c.id = ct.chat_id
      WHERE ct.id = thread_escalation_history.thread_id
      AND c.admin_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_super_admin = true
    )
  );

-- Function to trigger escalation
CREATE OR REPLACE FUNCTION trigger_thread_escalation(
  p_thread_id uuid,
  p_escalation_type text,
  p_triggered_by_node text,
  p_context_data jsonb DEFAULT '{}'::jsonb
)
RETURNS void
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_admin_id uuid;
  v_chat_id uuid;
  v_user_name text;
  v_order_number text;
  v_escalation_message text;
BEGIN
  -- Get chat and admin info
  SELECT ct.chat_id, c.admin_id, up.name
  INTO v_chat_id, v_admin_id, v_user_name
  FROM chat_threads ct
  JOIN chats c ON c.id = ct.chat_id
  LEFT JOIN user_profiles up ON up.id = c.user_id
  WHERE ct.id = p_thread_id;

  -- Update thread with escalation
  UPDATE chat_threads
  SET
    requires_agent_action = true,
    escalation_type = p_escalation_type,
    escalated_at = now(),
    escalation_context = p_context_data,
    agent_acknowledged = false,
    updated_at = now() -- Bump to top of conversation list
  WHERE id = p_thread_id;

  -- Create escalation history record
  INSERT INTO thread_escalation_history (
    thread_id,
    escalation_type,
    triggered_by_node,
    context_data,
    status,
    assigned_to_admin
  ) VALUES (
    p_thread_id,
    p_escalation_type,
    p_triggered_by_node,
    p_context_data,
    'pending',
    v_admin_id
  );

  -- Build escalation message based on type
  v_order_number := COALESCE(p_context_data->>'order_number', 'Unknown');

  v_escalation_message := CASE p_escalation_type
    WHEN 'contact_carrier_investigation' THEN
      v_user_name || ' needs you to contact carrier about 7+ days no tracking for Order #' || v_order_number
    WHEN 'file_carrier_claim' THEN
      v_user_name || ' needs you to file carrier claim for Order #' || v_order_number
    WHEN 'contact_factory_claim' THEN
      v_user_name || ' needs you to contact factory about defective item for Order #' || v_order_number
    WHEN 'factory_exception_approval' THEN
      v_user_name || ' needs you to review out-of-warranty exception for Order #' || v_order_number
    WHEN 'contact_logistics_customs' THEN
      v_user_name || ' needs you to contact logistics about customs issue for Order #' || v_order_number
    WHEN 'contact_carrier_intercept' THEN
      v_user_name || ' needs you to contact carrier to intercept/redirect Order #' || v_order_number
    WHEN 'high_value_approval' THEN
      v_user_name || ' needs you to review high-value request for Order #' || v_order_number
    WHEN 'delivery_verification_needed' THEN
      v_user_name || ' needs you to verify delivery status for Order #' || v_order_number
    WHEN 'return_investigation' THEN
      v_user_name || ' needs you to investigate return processing for Order #' || v_order_number
    ELSE
      v_user_name || ' needs your attention for Order #' || v_order_number
  END;

  -- Create notification for admin
  IF v_admin_id IS NOT NULL THEN
    INSERT INTO notifications (
      user_id,
      type,
      title,
      message,
      metadata
    ) VALUES (
      v_admin_id,
      'thread_escalation',
      'Action Needed',
      v_escalation_message,
      jsonb_build_object(
        'thread_id', p_thread_id,
        'chat_id', v_chat_id,
        'escalation_type', p_escalation_type,
        'context', p_context_data
      )
    );
  END IF;
END;
$$;

-- Function to acknowledge escalation
CREATE OR REPLACE FUNCTION acknowledge_thread_escalation(
  p_thread_id uuid
)
RETURNS void
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Update thread
  UPDATE chat_threads
  SET
    agent_acknowledged = true,
    agent_acknowledged_at = now()
  WHERE id = p_thread_id
  AND requires_agent_action = true;

  -- Update history
  UPDATE thread_escalation_history
  SET
    status = 'acknowledged',
    updated_at = now()
  WHERE thread_id = p_thread_id
  AND status = 'pending';
END;
$$;

-- Function to resolve escalation
CREATE OR REPLACE FUNCTION resolve_thread_escalation(
  p_thread_id uuid,
  p_resolution_notes text DEFAULT NULL
)
RETURNS void
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Clear escalation from thread
  UPDATE chat_threads
  SET
    requires_agent_action = false,
    escalation_type = NULL,
    escalation_context = '{}'::jsonb,
    agent_acknowledged = false,
    agent_acknowledged_at = NULL
  WHERE id = p_thread_id;

  -- Update history
  UPDATE thread_escalation_history
  SET
    status = 'resolved',
    resolved_at = now(),
    resolution_notes = p_resolution_notes,
    updated_at = now()
  WHERE thread_id = p_thread_id
  AND status IN ('pending', 'acknowledged', 'investigating');
END;
$$;

-- Create trigger to update escalation history timestamp
CREATE OR REPLACE FUNCTION update_escalation_history_updated_at()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_escalation_history_timestamp ON thread_escalation_history;
CREATE TRIGGER update_escalation_history_timestamp
  BEFORE UPDATE ON thread_escalation_history
  FOR EACH ROW
  EXECUTE FUNCTION update_escalation_history_updated_at();