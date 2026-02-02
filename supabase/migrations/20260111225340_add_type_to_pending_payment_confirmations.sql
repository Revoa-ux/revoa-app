/*
  # Add Type Column to Pending Payment Confirmations

  1. Changes
    - Make `invoice_id` nullable to support wallet top-ups
    - Add `type` column to distinguish between 'invoice_payment' and 'wallet_topup'
    - Add `description` column for display purposes
    
  2. Notes
    - Existing records will be updated to have type = 'invoice_payment'
    - Wallet top-ups won't have an invoice_id
*/

-- Make invoice_id nullable
ALTER TABLE pending_payment_confirmations 
  ALTER COLUMN invoice_id DROP NOT NULL;

-- Add type column with default for existing records
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pending_payment_confirmations' AND column_name = 'type'
  ) THEN
    ALTER TABLE pending_payment_confirmations 
      ADD COLUMN type text NOT NULL DEFAULT 'invoice_payment' 
      CHECK (type IN ('invoice_payment', 'wallet_topup'));
  END IF;
END $$;

-- Add description column for display purposes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pending_payment_confirmations' AND column_name = 'description'
  ) THEN
    ALTER TABLE pending_payment_confirmations 
      ADD COLUMN description text;
  END IF;
END $$;

-- Update existing records to have type = 'invoice_payment'
UPDATE pending_payment_confirmations
SET type = 'invoice_payment'
WHERE type IS NULL;

-- Create index on type for filtering
CREATE INDEX IF NOT EXISTS idx_pending_payment_confirmations_type 
  ON pending_payment_confirmations(type);
