/*
  # Create Conversational Flow System

  ## Overview
  This migration creates a comprehensive conversational flow system that enables
  interactive, step-by-step guidance for merchants through complex scenarios
  (returns, damages, refunds, etc.). The system uses a state machine architecture
  with JSON-based flow definitions for maintainability and flexibility.

  ## New Tables

  ### `bot_flows`
  Stores flow definitions (decision trees) for different conversation categories.
  - `id` (uuid, primary key)
  - `category` (text) - Flow category (return, damage, defective, refund, cancel)
  - `name` (text) - Human-readable flow name
  - `description` (text) - What this flow helps with
  - `flow_definition` (jsonb) - Complete flow structure with nodes and edges
  - `version` (integer) - Flow version for tracking changes
  - `is_active` (boolean) - Whether this flow is currently in use
  - `created_by` (uuid) - Admin who created the flow
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### `thread_flow_sessions`
  Tracks active flow sessions for each thread, storing merchant progress and responses.
  - `id` (uuid, primary key)
  - `thread_id` (uuid, foreign key to chat_threads)
  - `flow_id` (uuid, foreign key to bot_flows)
  - `current_node_id` (text) - Current step in the flow
  - `flow_state` (jsonb) - Merchant responses and collected data
  - `started_at` (timestamptz)
  - `last_interaction_at` (timestamptz)
  - `completed_at` (timestamptz) - When flow finished
  - `is_active` (boolean) - Whether flow is currently active

  ### `flow_responses`
  Individual responses for analytics and history.
  - `id` (uuid, primary key)
  - `session_id` (uuid, foreign key to thread_flow_sessions)
  - `node_id` (text) - Which step was answered
  - `response_value` (jsonb) - The merchant's response
  - `responded_at` (timestamptz)

  ### `flow_analytics`
  Aggregated analytics for flow optimization.
  - `id` (uuid, primary key)
  - `flow_id` (uuid, foreign key to bot_flows)
  - `node_id` (text)
  - `total_views` (integer)
  - `total_responses` (integer)
  - `completion_count` (integer)
  - `average_time_seconds` (numeric)
  - `last_updated` (timestamptz)

  ## Security
  - Enable RLS on all tables
  - Merchants can view and interact with their own flow sessions
  - Admins can manage flows and view all analytics
  - Super admins can create and edit flow definitions

  ## Indexes
  - Fast lookups for active sessions by thread
  - Efficient flow definition queries by category
  - Response history queries by session
*/

-- Create bot_flows table
CREATE TABLE IF NOT EXISTS bot_flows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL,
  name text NOT NULL,
  description text NOT NULL,
  flow_definition jsonb NOT NULL,
  version integer NOT NULL DEFAULT 1,
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create thread_flow_sessions table
CREATE TABLE IF NOT EXISTS thread_flow_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES chat_threads(id) ON DELETE CASCADE,
  flow_id uuid NOT NULL REFERENCES bot_flows(id) ON DELETE CASCADE,
  current_node_id text NOT NULL,
  flow_state jsonb DEFAULT '{}'::jsonb,
  started_at timestamptz DEFAULT now(),
  last_interaction_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  is_active boolean DEFAULT true
);

-- Create flow_responses table
CREATE TABLE IF NOT EXISTS flow_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES thread_flow_sessions(id) ON DELETE CASCADE,
  node_id text NOT NULL,
  response_value jsonb NOT NULL,
  responded_at timestamptz DEFAULT now()
);

-- Create flow_analytics table
CREATE TABLE IF NOT EXISTS flow_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flow_id uuid NOT NULL REFERENCES bot_flows(id) ON DELETE CASCADE,
  node_id text NOT NULL,
  total_views integer DEFAULT 0,
  total_responses integer DEFAULT 0,
  completion_count integer DEFAULT 0,
  average_time_seconds numeric DEFAULT 0,
  last_updated timestamptz DEFAULT now(),
  UNIQUE(flow_id, node_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_bot_flows_category ON bot_flows(category) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_bot_flows_active ON bot_flows(is_active);
CREATE INDEX IF NOT EXISTS idx_thread_flow_sessions_thread ON thread_flow_sessions(thread_id);
CREATE INDEX IF NOT EXISTS idx_thread_flow_sessions_active ON thread_flow_sessions(thread_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_flow_responses_session ON flow_responses(session_id);
CREATE INDEX IF NOT EXISTS idx_flow_analytics_flow ON flow_analytics(flow_id);

-- Enable Row Level Security
ALTER TABLE bot_flows ENABLE ROW LEVEL SECURITY;
ALTER TABLE thread_flow_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE flow_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE flow_analytics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for bot_flows

-- Anyone can view active flows
CREATE POLICY "Anyone can view active bot flows"
  ON bot_flows
  FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Only super admins can insert flows
CREATE POLICY "Super admins can insert bot flows"
  ON bot_flows
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND is_super_admin = true
    )
  );

-- Only super admins can update flows
CREATE POLICY "Super admins can update bot flows"
  ON bot_flows
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND is_super_admin = true
    )
  );

-- RLS Policies for thread_flow_sessions

-- Users can view their own thread flow sessions
CREATE POLICY "Users can view own thread flow sessions"
  ON thread_flow_sessions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chat_threads ct
      JOIN chats c ON c.id = ct.chat_id
      WHERE ct.id = thread_flow_sessions.thread_id
      AND c.user_id = auth.uid()
    )
  );

-- Admins can view all sessions for their assigned users
CREATE POLICY "Admins can view assigned user flow sessions"
  ON thread_flow_sessions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chat_threads ct
      JOIN chats c ON c.id = ct.chat_id
      JOIN user_assignments ua ON ua.user_id = c.user_id
      WHERE ct.id = thread_flow_sessions.thread_id
      AND ua.admin_id = auth.uid()
    )
  );

-- Users can insert their own flow sessions
CREATE POLICY "Users can insert own thread flow sessions"
  ON thread_flow_sessions
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

-- Users can update their own flow sessions
CREATE POLICY "Users can update own thread flow sessions"
  ON thread_flow_sessions
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chat_threads ct
      JOIN chats c ON c.id = ct.chat_id
      WHERE ct.id = thread_flow_sessions.thread_id
      AND c.user_id = auth.uid()
    )
  );

-- RLS Policies for flow_responses

-- Users can view their own flow responses
CREATE POLICY "Users can view own flow responses"
  ON flow_responses
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM thread_flow_sessions tfs
      JOIN chat_threads ct ON ct.id = tfs.thread_id
      JOIN chats c ON c.id = ct.chat_id
      WHERE tfs.id = flow_responses.session_id
      AND c.user_id = auth.uid()
    )
  );

-- Admins can view responses for their assigned users
CREATE POLICY "Admins can view assigned user flow responses"
  ON flow_responses
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM thread_flow_sessions tfs
      JOIN chat_threads ct ON ct.id = tfs.thread_id
      JOIN chats c ON c.id = ct.chat_id
      JOIN user_assignments ua ON ua.user_id = c.user_id
      WHERE tfs.id = flow_responses.session_id
      AND ua.admin_id = auth.uid()
    )
  );

-- Users can insert their own responses
CREATE POLICY "Users can insert own flow responses"
  ON flow_responses
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM thread_flow_sessions tfs
      JOIN chat_threads ct ON ct.id = tfs.thread_id
      JOIN chats c ON c.id = ct.chat_id
      WHERE tfs.id = session_id
      AND c.user_id = auth.uid()
    )
  );

-- RLS Policies for flow_analytics

-- Anyone can view analytics
CREATE POLICY "Anyone can view flow analytics"
  ON flow_analytics
  FOR SELECT
  TO authenticated
  USING (true);

-- Only super admins can update analytics
CREATE POLICY "Super admins can manage flow analytics"
  ON flow_analytics
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND is_super_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND is_super_admin = true
    )
  );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_bot_flows_updated_at()
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

-- Create trigger for updated_at
CREATE TRIGGER update_bot_flows_timestamp
  BEFORE UPDATE ON bot_flows
  FOR EACH ROW
  EXECUTE FUNCTION update_bot_flows_updated_at();

-- Create function to track analytics
CREATE OR REPLACE FUNCTION increment_flow_analytics(
  p_flow_id uuid,
  p_node_id text,
  p_metric text,
  p_time_seconds numeric DEFAULT NULL
)
RETURNS void
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO flow_analytics (flow_id, node_id, total_views, total_responses, completion_count, average_time_seconds)
  VALUES (
    p_flow_id,
    p_node_id,
    CASE WHEN p_metric = 'view' THEN 1 ELSE 0 END,
    CASE WHEN p_metric = 'response' THEN 1 ELSE 0 END,
    CASE WHEN p_metric = 'completion' THEN 1 ELSE 0 END,
    COALESCE(p_time_seconds, 0)
  )
  ON CONFLICT (flow_id, node_id)
  DO UPDATE SET
    total_views = flow_analytics.total_views + CASE WHEN p_metric = 'view' THEN 1 ELSE 0 END,
    total_responses = flow_analytics.total_responses + CASE WHEN p_metric = 'response' THEN 1 ELSE 0 END,
    completion_count = flow_analytics.completion_count + CASE WHEN p_metric = 'completion' THEN 1 ELSE 0 END,
    average_time_seconds = CASE
      WHEN p_time_seconds IS NOT NULL THEN
        (flow_analytics.average_time_seconds * flow_analytics.completion_count + p_time_seconds) /
        (flow_analytics.completion_count + 1)
      ELSE flow_analytics.average_time_seconds
    END,
    last_updated = now();
END;
$$;