/*
  # Create Quote Revisions Table

  1. New Tables
    - `quote_revisions`
      - `id` (uuid, primary key)
      - `quote_id` (uuid, foreign key to product_quotes)
      - `previous_variants` (jsonb - old pricing data)
      - `new_variants` (jsonb - updated pricing data)
      - `edited_by` (uuid - admin who made the edit)
      - `edit_reason` (text - reason for the change)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on `quote_revisions` table
    - Users can read revisions of their own quotes
    - Admins can read all revisions
    - Only admins can create revisions (enforced by application logic)

  3. Purpose
    - Maintain complete audit trail of all quote modifications
    - Allow users to see what changed when reviewing edits
    - Provide transparency and accountability
*/

-- Create quote_revisions table
CREATE TABLE IF NOT EXISTS quote_revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid NOT NULL REFERENCES product_quotes(id) ON DELETE CASCADE,
  previous_variants jsonb NOT NULL,
  new_variants jsonb NOT NULL,
  edited_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  edit_reason text,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_quote_revisions_quote_id ON quote_revisions(quote_id);
CREATE INDEX IF NOT EXISTS idx_quote_revisions_created_at ON quote_revisions(created_at DESC);

-- Enable RLS
ALTER TABLE quote_revisions ENABLE ROW LEVEL SECURITY;

-- Policy for users to read revisions of their own quotes
CREATE POLICY "Users can read own quote revisions"
  ON quote_revisions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM product_quotes pq
      WHERE pq.id = quote_revisions.quote_id
      AND pq.user_id = auth.uid()
    )
  );

-- Policy for admins to read all revisions
CREATE POLICY "Admins can read all quote revisions"
  ON quote_revisions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.user_id = auth.uid()
      AND up.is_admin = true
    )
  );

-- Policy for admins to create revisions
CREATE POLICY "Admins can create quote revisions"
  ON quote_revisions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.user_id = auth.uid()
      AND up.is_admin = true
    )
  );
