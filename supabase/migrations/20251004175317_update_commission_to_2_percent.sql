/*
  # Update Default Commission Rate to 2%

  1. Changes
    - Update default commission_rate from 3% to 2% in suppliers table
    - Update any existing suppliers with 3% to 2%

  2. Notes
    - 2% commission better accounts for supplier expenses
    - Supplier marks up 10% for profit, platform takes 2% of total
*/

-- Update default commission rate to 2%
ALTER TABLE suppliers 
  ALTER COLUMN commission_rate SET DEFAULT 2.00;

-- Update existing suppliers that have the old 3% rate to 2%
UPDATE suppliers 
SET commission_rate = 2.00 
WHERE commission_rate = 3.00;

-- Add comment explaining the commission structure
COMMENT ON COLUMN suppliers.commission_rate IS 'Platform commission percentage (default 2%). Supplier marks up products 10% for their profit, platform takes 2% of total transaction value.';
