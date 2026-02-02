/*
  # Add Quote Reacceptance Fields

  1. Schema Changes
    - Add 'pending_reacceptance' status to product_quotes
    - Add tracking fields for quote edits:
      - last_edited_at: timestamp of last edit
      - last_edited_by: admin who made the edit
      - edit_reason: reason for the edit
      - original_variants: backup of original pricing before any edits

  2. Purpose
    - Enable admins to edit active quotes
    - Require user re-acceptance after edits
    - Maintain audit trail of changes
*/

-- Add new status for pending re-acceptance
ALTER TABLE product_quotes 
DROP CONSTRAINT IF EXISTS product_quotes_status_check;

ALTER TABLE product_quotes 
ADD CONSTRAINT product_quotes_status_check 
CHECK (status IN (
  'quote_pending', 
  'quoted', 
  'rejected', 
  'expired', 
  'accepted', 
  'pending_reacceptance',
  'synced_with_shopify'
));

-- Add fields for tracking edits
ALTER TABLE product_quotes 
ADD COLUMN IF NOT EXISTS last_edited_at timestamptz,
ADD COLUMN IF NOT EXISTS last_edited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS edit_reason text,
ADD COLUMN IF NOT EXISTS original_variants jsonb;

-- Create index for filtering quotes needing reacceptance
CREATE INDEX IF NOT EXISTS idx_product_quotes_pending_reacceptance 
  ON product_quotes(user_id, status) 
  WHERE status = 'pending_reacceptance';
