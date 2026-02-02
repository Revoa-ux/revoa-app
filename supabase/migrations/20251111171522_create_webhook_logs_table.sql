/*
  # Create webhook_logs table for idempotency

  1. New Tables
    - `webhook_logs`
      - `id` (uuid, primary key)
      - `webhook_id` (text, unique) - Shopify's X-Shopify-Webhook-Id header
      - `topic` (text) - Webhook topic (e.g., 'app/uninstalled', 'orders/create')
      - `shop_domain` (text) - Shop domain that triggered the webhook
      - `processed_at` (timestamptz) - When the webhook was processed
      - `created_at` (timestamptz) - When the record was created
  
  2. Security
    - Enable RLS on `webhook_logs` table
    - Add policy for service role to insert/select (webhooks use service role)
  
  3. Indexes
    - Index on `webhook_id` for fast duplicate detection
    - Index on `processed_at` for cleanup queries

  4. Purpose
    - Prevents duplicate webhook processing using X-Shopify-Webhook-Id
    - Provides audit trail of all webhooks received
    - Enables monitoring and debugging of webhook delivery
*/

-- Create webhook_logs table
CREATE TABLE IF NOT EXISTS webhook_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id text UNIQUE NOT NULL,
  topic text NOT NULL,
  shop_domain text NOT NULL,
  processed_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_webhook_logs_webhook_id ON webhook_logs(webhook_id);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_processed_at ON webhook_logs(processed_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_shop_domain ON webhook_logs(shop_domain);

-- Enable RLS
ALTER TABLE webhook_logs ENABLE ROW LEVEL SECURITY;

-- Policy for service role (used by edge functions)
CREATE POLICY "Service role can manage webhook logs"
  ON webhook_logs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Add cleanup function to remove old webhook logs (keep 48 hours)
CREATE OR REPLACE FUNCTION cleanup_old_webhook_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM webhook_logs
  WHERE processed_at < now() - interval '48 hours';
END;
$$;

-- Comment on table
COMMENT ON TABLE webhook_logs IS 'Tracks processed webhooks for idempotency and audit trail. Automatically cleaned up after 48 hours.';