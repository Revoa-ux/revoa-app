/*
  # Add Payment Reconciliation Fields

  1. New Columns on `invoices`
    - `amount_received` (numeric) - Actual amount received from merchant
    - `remaining_amount` (numeric) - Amount still owed (for partial payments)
    - `payment_reference` (text) - Wire transfer reference number or Stripe payment ID
    - `balance_credit_applied` (numeric) - Balance credit deducted from invoice total

  2. Changes
    - Add 'partially_paid' to valid invoice statuses
    - Add index on status for faster filtering

  3. Security
    - No RLS changes needed (existing policies cover new columns)
*/

-- Add payment reconciliation columns to invoices
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoices' AND column_name = 'amount_received'
  ) THEN
    ALTER TABLE invoices ADD COLUMN amount_received numeric DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoices' AND column_name = 'remaining_amount'
  ) THEN
    ALTER TABLE invoices ADD COLUMN remaining_amount numeric DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoices' AND column_name = 'payment_reference'
  ) THEN
    ALTER TABLE invoices ADD COLUMN payment_reference text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoices' AND column_name = 'balance_credit_applied'
  ) THEN
    ALTER TABLE invoices ADD COLUMN balance_credit_applied numeric DEFAULT 0;
  END IF;
END $$;

-- Add index on invoices status for faster filtering
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);

-- Add index on invoices user_id and status for combined queries
CREATE INDEX IF NOT EXISTS idx_invoices_user_status ON invoices(user_id, status);

-- Add comment explaining the payment reconciliation fields
COMMENT ON COLUMN invoices.amount_received IS 'Actual amount received from merchant payment';
COMMENT ON COLUMN invoices.remaining_amount IS 'Amount still owed for partial payments';
COMMENT ON COLUMN invoices.payment_reference IS 'Wire transfer reference or Stripe payment ID';
COMMENT ON COLUMN invoices.balance_credit_applied IS 'Balance credit deducted from invoice total';