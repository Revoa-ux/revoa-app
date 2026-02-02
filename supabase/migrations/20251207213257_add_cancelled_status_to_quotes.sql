/*
  # Add Cancelled Status to Product Quotes

  1. Schema Changes
    - Add 'cancelled' to the allowed status values in product_quotes table
  
  2. Purpose
    - Enable soft-delete functionality for quotes
    - Users can cancel quotes instead of hard-deleting them
    - Maintain audit trail of cancelled quotes for admins
*/

-- Update the status constraint to include 'cancelled'
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
  'synced_with_shopify',
  'cancelled'
));
