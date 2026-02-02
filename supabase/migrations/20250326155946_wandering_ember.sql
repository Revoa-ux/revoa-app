/*
  # Add Invoice History Table

  1. New Tables
    - `invoices`
      - Track invoices and their status
    - `user_invoice_history`
      - Track user's invoice history
      - Store invoice details and status

  2. Security
    - Enable RLS
    - Add policies for secure access
*/

-- Create invoices table first
CREATE TABLE IF NOT EXISTS invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  amount numeric(20,2) NOT NULL,
  due_date timestamptz NOT NULL,
  status text NOT NULL CHECK (status IN ('pending', 'paid', 'overdue')),
  file_url text NOT NULL,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Enable RLS on invoices
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- Create user invoice history table
CREATE TABLE IF NOT EXISTS user_invoice_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  invoice_id uuid REFERENCES invoices(id) ON DELETE CASCADE,
  amount numeric(20,2) NOT NULL,
  status text NOT NULL CHECK (status IN ('pending', 'paid', 'overdue')),
  due_date timestamptz NOT NULL,
  file_url text NOT NULL,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Enable RLS on user_invoice_history
ALTER TABLE user_invoice_history ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for invoices
CREATE POLICY "Users can view their own invoices"
  ON invoices
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Team members can manage invoices"
  ON invoices
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid()
      AND is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid()
      AND is_admin = true
    )
  );

-- Create RLS policies for user_invoice_history
CREATE POLICY "Users can view their own invoice history"
  ON user_invoice_history
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Team members can manage invoice history"
  ON user_invoice_history
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid()
      AND is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid()
      AND is_admin = true
    )
  );

-- Create indexes
CREATE INDEX idx_invoices_user_id ON invoices(user_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_due_date ON invoices(due_date);

CREATE INDEX idx_user_invoice_history_user_id ON user_invoice_history(user_id);
CREATE INDEX idx_user_invoice_history_invoice_id ON user_invoice_history(invoice_id);
CREATE INDEX idx_user_invoice_history_status ON user_invoice_history(status);
CREATE INDEX idx_user_invoice_history_due_date ON user_invoice_history(due_date);

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_invoices_updated_at
  BEFORE UPDATE ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_user_invoice_history_updated_at
  BEFORE UPDATE ON user_invoice_history
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Add helpful comments
COMMENT ON TABLE invoices IS 'Stores invoice records and their current status';
COMMENT ON TABLE user_invoice_history IS 'Tracks invoice history for each user';
COMMENT ON COLUMN invoices.status IS 'Current status of the invoice';
COMMENT ON COLUMN user_invoice_history.status IS 'Status of the invoice at this point in history';