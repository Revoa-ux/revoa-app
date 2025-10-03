/*
  # Create Product Quotes Table

  1. New Tables
    - `product_quotes`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `assigned_admin_id` (uuid, foreign key to auth.users)
      - `product_url` (text)
      - `product_name` (text)
      - `platform` (text - 'aliexpress', 'amazon', 'other')
      - `status` (text - 'quote_pending', 'quoted', 'rejected', 'expired', 'accepted', 'synced_with_shopify')
      - `variants` (jsonb - array of pricing options)
      - `expires_at` (timestamptz)
      - `shopify_product_id` (text, nullable)
      - `shopify_status` (text, nullable - 'pending', 'synced')
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `product_quotes` table
    - Add policy for users to read their own quotes
    - Add policy for users to create quotes
    - Add policy for users to update their own quotes (status changes)
    - Add policy for admins to read all quotes
    - Add policy for admins to update all quotes
*/

-- Create product_quotes table
CREATE TABLE IF NOT EXISTS product_quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_admin_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  product_url text NOT NULL,
  product_name text NOT NULL,
  platform text NOT NULL CHECK (platform IN ('aliexpress', 'amazon', 'other')),
  status text NOT NULL DEFAULT 'quote_pending' CHECK (
    status IN ('quote_pending', 'quoted', 'rejected', 'expired', 'accepted', 'synced_with_shopify')
  ),
  variants jsonb DEFAULT '[]'::jsonb,
  expires_at timestamptz,
  shopify_product_id text,
  shopify_status text CHECK (shopify_status IN ('pending', 'synced')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_product_quotes_user_id ON product_quotes(user_id);
CREATE INDEX IF NOT EXISTS idx_product_quotes_assigned_admin_id ON product_quotes(assigned_admin_id);
CREATE INDEX IF NOT EXISTS idx_product_quotes_status ON product_quotes(status);

-- Enable RLS
ALTER TABLE product_quotes ENABLE ROW LEVEL SECURITY;

-- Policy for users to read their own quotes
CREATE POLICY "Users can read own quotes"
  ON product_quotes
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy for users to create quotes
CREATE POLICY "Users can create quotes"
  ON product_quotes
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Policy for users to update their own quotes (limited fields)
CREATE POLICY "Users can update own quotes status"
  ON product_quotes
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy for admins to read all quotes
CREATE POLICY "Admins can read all quotes"
  ON product_quotes
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = auth.uid()
      AND admin_users.role IN ('super_admin', 'admin')
    )
  );

-- Policy for admins to update all quotes
CREATE POLICY "Admins can update all quotes"
  ON product_quotes
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = auth.uid()
      AND admin_users.role IN ('super_admin', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = auth.uid()
      AND admin_users.role IN ('super_admin', 'admin')
    )
  );

-- Function to auto-assign quotes to admins (round-robin)
CREATE OR REPLACE FUNCTION auto_assign_quote_to_admin()
RETURNS TRIGGER AS $$
DECLARE
  admin_id uuid;
BEGIN
  -- Get the admin with the least number of pending quotes
  SELECT au.user_id INTO admin_id
  FROM admin_users au
  WHERE au.role IN ('admin', 'super_admin')
  ORDER BY (
    SELECT COUNT(*)
    FROM product_quotes pq
    WHERE pq.assigned_admin_id = au.user_id
    AND pq.status IN ('quote_pending', 'quoted')
  )
  LIMIT 1;

  -- Assign the quote to the admin
  IF admin_id IS NOT NULL THEN
    NEW.assigned_admin_id := admin_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-assign quotes on creation
DROP TRIGGER IF EXISTS trigger_auto_assign_quote ON product_quotes;
CREATE TRIGGER trigger_auto_assign_quote
  BEFORE INSERT ON product_quotes
  FOR EACH ROW
  EXECUTE FUNCTION auto_assign_quote_to_admin();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_product_quotes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at on changes
DROP TRIGGER IF EXISTS trigger_update_product_quotes_updated_at ON product_quotes;
CREATE TRIGGER trigger_update_product_quotes_updated_at
  BEFORE UPDATE ON product_quotes
  FOR EACH ROW
  EXECUTE FUNCTION update_product_quotes_updated_at();
