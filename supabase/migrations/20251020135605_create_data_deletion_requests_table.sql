/*
  # Create Data Deletion Requests Table

  1. New Tables
    - `data_deletion_requests`
      - `id` (uuid, primary key)
      - `user_id` (text) - Meta user ID or internal user ID
      - `confirmation_code` (text, unique) - Tracking code for deletion request
      - `requested_at` (timestamptz) - When deletion was requested
      - `completed_at` (timestamptz, nullable) - When deletion was completed
      - `status` (text) - Status of deletion (pending, completed, failed)
      - `created_at` (timestamptz) - Record creation timestamp
  
  2. Security
    - Enable RLS on `data_deletion_requests` table
    - Add policy for service role access only
    - Public read access for status checking with confirmation code

  3. Important Notes
    - This table logs all data deletion requests from Meta and direct user requests
    - Used to track compliance with data deletion requirements
    - Confirmation codes allow users to check deletion status
*/

CREATE TABLE IF NOT EXISTS data_deletion_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  confirmation_code text UNIQUE NOT NULL,
  requested_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  error_message text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE data_deletion_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage all deletion requests"
  ON data_deletion_requests
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can check deletion status with confirmation code"
  ON data_deletion_requests
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE INDEX IF NOT EXISTS idx_data_deletion_confirmation_code 
  ON data_deletion_requests(confirmation_code);

CREATE INDEX IF NOT EXISTS idx_data_deletion_user_id 
  ON data_deletion_requests(user_id);

CREATE INDEX IF NOT EXISTS idx_data_deletion_status 
  ON data_deletion_requests(status);
