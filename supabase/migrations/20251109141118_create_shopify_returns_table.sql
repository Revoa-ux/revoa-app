/*
  # Create Shopify Returns Tracking Table

  1. New Tables
    - `shopify_returns`
      - `id` (uuid, primary key) - Unique identifier for the return record
      - `user_id` (uuid, foreign key) - Links to the user who owns this return
      - `shopify_order_id` (text) - The Shopify order ID this return is for
      - `shopify_return_id` (text, unique) - The unique Shopify return ID
      - `return_amount` (numeric) - Total amount refunded to customer
      - `return_reason` (text, nullable) - Optional reason for the return
      - `returned_at` (timestamptz) - When the return was processed
      - `refund_line_items` (jsonb, nullable) - Details of returned items
      - `created_at` (timestamptz) - When this record was created
      - `updated_at` (timestamptz) - When this record was last updated

  2. Security
    - Enable RLS on `shopify_returns` table
    - Add policy for users to read their own returns
    - Add policy for authenticated users to manage their own returns

  3. Indexes
    - Index on user_id for fast user lookups
    - Index on shopify_order_id for order-based queries
    - Index on returned_at for time-based analytics
*/

-- Create shopify_returns table
CREATE TABLE IF NOT EXISTS shopify_returns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shopify_order_id text NOT NULL,
  shopify_return_id text NOT NULL UNIQUE,
  return_amount numeric NOT NULL DEFAULT 0,
  return_reason text,
  returned_at timestamptz NOT NULL,
  refund_line_items jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_shopify_returns_user_id ON shopify_returns(user_id);
CREATE INDEX IF NOT EXISTS idx_shopify_returns_order_id ON shopify_returns(shopify_order_id);
CREATE INDEX IF NOT EXISTS idx_shopify_returns_returned_at ON shopify_returns(returned_at);
CREATE INDEX IF NOT EXISTS idx_shopify_returns_return_id ON shopify_returns(shopify_return_id);

-- Enable RLS
ALTER TABLE shopify_returns ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own returns
CREATE POLICY "Users can view own returns"
  ON shopify_returns
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own returns
CREATE POLICY "Users can insert own returns"
  ON shopify_returns
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own returns
CREATE POLICY "Users can update own returns"
  ON shopify_returns
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own returns
CREATE POLICY "Users can delete own returns"
  ON shopify_returns
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_shopify_returns_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_shopify_returns_updated_at
  BEFORE UPDATE ON shopify_returns
  FOR EACH ROW
  EXECUTE FUNCTION update_shopify_returns_updated_at();