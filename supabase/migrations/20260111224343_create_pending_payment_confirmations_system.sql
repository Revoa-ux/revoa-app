/*
  # Create Pending Payment Confirmations System

  1. New Tables
    - `pending_payment_confirmations`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `invoice_id` (uuid, references invoices)
      - `amount` (numeric, payment amount)
      - `wise_pay_link` (text, Wise payment URL)
      - `payment_reference` (text, optional reference number)
      - `status` (text, 'pending' | 'confirmed' | 'cancelled' | 'expired')
      - `opened_at` (timestamptz, when user opened Wise link)
      - `confirmed_at` (timestamptz, when user confirmed payment)
      - `cancelled_at` (timestamptz, when user cancelled)
      - `reminder_sent_at` (timestamptz, when reminder email was sent)
      - `reminder_count` (integer, number of reminders sent)
      - `expires_at` (timestamptz, when this pending confirmation expires)
      - `metadata` (jsonb, additional data)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `pending_payment_confirmations` table
    - Add policies for users to manage their own confirmations
    - Add policies for super admins to view all confirmations

  3. Indexes
    - Index on user_id for fast lookups
    - Index on status for filtering
    - Index on invoice_id for lookups by invoice
*/

-- Create pending_payment_confirmations table
CREATE TABLE IF NOT EXISTS pending_payment_confirmations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invoice_id uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  amount numeric NOT NULL CHECK (amount > 0),
  wise_pay_link text NOT NULL,
  payment_reference text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'expired')),
  opened_at timestamptz,
  confirmed_at timestamptz,
  cancelled_at timestamptz,
  reminder_sent_at timestamptz,
  reminder_count integer NOT NULL DEFAULT 0,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours'),
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE pending_payment_confirmations ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_pending_payment_confirmations_user_id 
  ON pending_payment_confirmations(user_id);

CREATE INDEX IF NOT EXISTS idx_pending_payment_confirmations_status 
  ON pending_payment_confirmations(status);

CREATE INDEX IF NOT EXISTS idx_pending_payment_confirmations_invoice_id 
  ON pending_payment_confirmations(invoice_id);

CREATE INDEX IF NOT EXISTS idx_pending_payment_confirmations_status_expires 
  ON pending_payment_confirmations(status, expires_at) 
  WHERE status = 'pending';

-- Users can view their own pending confirmations
CREATE POLICY "Users can view own pending payment confirmations"
  ON pending_payment_confirmations
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can insert their own pending confirmations
CREATE POLICY "Users can create own pending payment confirmations"
  ON pending_payment_confirmations
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own pending confirmations (e.g., confirm or cancel)
CREATE POLICY "Users can update own pending payment confirmations"
  ON pending_payment_confirmations
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Super admins can view all pending confirmations
CREATE POLICY "Super admins can view all pending payment confirmations"
  ON pending_payment_confirmations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.is_super_admin = true
    )
  );

-- Super admins can update all pending confirmations
CREATE POLICY "Super admins can update all pending payment confirmations"
  ON pending_payment_confirmations
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.is_super_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.is_super_admin = true
    )
  );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_pending_payment_confirmations_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS trigger_pending_payment_confirmations_updated_at ON pending_payment_confirmations;
CREATE TRIGGER trigger_pending_payment_confirmations_updated_at
  BEFORE UPDATE ON pending_payment_confirmations
  FOR EACH ROW
  EXECUTE FUNCTION update_pending_payment_confirmations_updated_at();

-- Create function to expire old pending confirmations
CREATE OR REPLACE FUNCTION expire_pending_payment_confirmations()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  expired_count integer;
BEGIN
  UPDATE pending_payment_confirmations
  SET status = 'expired',
      updated_at = now()
  WHERE status = 'pending'
    AND expires_at < now();
  
  GET DIAGNOSTICS expired_count = ROW_COUNT;
  RETURN expired_count;
END;
$$;

-- Add wise_pay_link column to invoices if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoices' AND column_name = 'wise_pay_link'
  ) THEN
    ALTER TABLE invoices ADD COLUMN wise_pay_link text;
  END IF;
END $$;
