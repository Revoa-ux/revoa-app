/*
  # Add Stripe Session ID to Invoices

  1. Changes to `invoices` table
    - Add `stripe_session_id` column to track Stripe checkout sessions
    - This helps link payments to their Stripe checkout session for reconciliation

  2. Index
    - Add index on stripe_session_id for efficient lookups
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoices' AND column_name = 'stripe_session_id'
  ) THEN
    ALTER TABLE invoices ADD COLUMN stripe_session_id text;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_invoices_stripe_session_id ON invoices(stripe_session_id) WHERE stripe_session_id IS NOT NULL;
