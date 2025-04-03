/*
  # Add Authentication Tables

  1. New Tables
    - `auth_sessions`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `refresh_token` (text)
      - `user_agent` (text)
      - `ip_address` (text)
      - `expires_at` (timestamptz)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `auth_audit_logs`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `event_type` (text)
      - `ip_address` (text)
      - `user_agent` (text)
      - `metadata` (jsonb)
      - `created_at` (timestamptz)

    - `auth_rate_limits`
      - `id` (uuid, primary key)
      - `ip_address` (text)
      - `action` (text)
      - `attempts` (integer)
      - `blocked_until` (timestamptz)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Indexes
    - Optimized indexes for querying and filtering
    - Composite indexes for common query patterns

  3. Triggers
    - Updated timestamp trigger for sessions and rate limits
    - Audit logging trigger for authentication events

  4. Security
    - RLS policies for secure access
    - Only authenticated users can view their own data
*/

-- Create auth_sessions table
CREATE TABLE IF NOT EXISTS auth_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  refresh_token text,
  user_agent text,
  ip_address text,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for auth_sessions
CREATE INDEX IF NOT EXISTS idx_auth_sessions_user_id ON auth_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_expires_at ON auth_sessions(expires_at);

-- Create auth_audit_logs table
CREATE TABLE IF NOT EXISTS auth_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  ip_address text,
  user_agent text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for auth_audit_logs
CREATE INDEX IF NOT EXISTS idx_auth_audit_logs_user_id ON auth_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_audit_logs_created_at ON auth_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_auth_audit_logs_event_type ON auth_audit_logs(event_type);

-- Create auth_rate_limits table
CREATE TABLE IF NOT EXISTS auth_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address text NOT NULL,
  action text NOT NULL,
  attempts integer DEFAULT 1,
  blocked_until timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create unique constraint for ip_address and action combination
CREATE UNIQUE INDEX IF NOT EXISTS auth_rate_limits_ip_address_action_key ON auth_rate_limits(ip_address, action);

-- Create indexes for auth_rate_limits
CREATE INDEX IF NOT EXISTS idx_auth_rate_limits_blocked_until ON auth_rate_limits(blocked_until);
CREATE INDEX IF NOT EXISTS idx_auth_rate_limits_ip_action ON auth_rate_limits(ip_address, action);

-- Enable RLS on auth_sessions
ALTER TABLE auth_sessions ENABLE ROW LEVEL SECURITY;

-- Create policy for auth_sessions
CREATE POLICY "auth_sessions_read_policy" ON auth_sessions
  FOR SELECT TO authenticated
  USING (uid() = user_id);

-- Enable RLS on auth_audit_logs
ALTER TABLE auth_audit_logs ENABLE ROW LEVEL SECURITY;

-- Create policy for auth_audit_logs
CREATE POLICY "auth_audit_logs_read_policy" ON auth_audit_logs
  FOR SELECT TO authenticated
  USING (uid() = user_id);

-- Create updated_at trigger function if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    CREATE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = now();
      RETURN NEW;
    END;
    $$ language 'plpgsql';
  END IF;
END $$;

-- Create trigger for auth_sessions
CREATE TRIGGER update_auth_sessions_updated_at
  BEFORE UPDATE ON auth_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create trigger for auth_rate_limits
CREATE TRIGGER update_auth_rate_limits_updated_at
  BEFORE UPDATE ON auth_rate_limits
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create function for logging auth events
CREATE OR REPLACE FUNCTION log_auth_event(event_name text)
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO auth_audit_logs (
    user_id,
    event_type,
    ip_address,
    user_agent,
    metadata
  ) VALUES (
    NEW.user_id,
    event_name,
    NEW.ip_address,
    NEW.user_agent,
    jsonb_build_object(
      'session_id', NEW.id,
      'expires_at', NEW.expires_at
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for logging session creation
CREATE TRIGGER auth_session_created
  AFTER INSERT ON auth_sessions
  FOR EACH ROW
  EXECUTE FUNCTION log_auth_event('session_created');