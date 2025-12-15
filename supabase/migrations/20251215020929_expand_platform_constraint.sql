/*
  # Expand Platform Constraint for Product Quotes
  
  1. Changes
    - Updates the platform CHECK constraint to include '1688' and 'alibaba'
    - These platforms are sent from the landing page quote form
  
  2. Background
    - The landing page (revoa.app) sends quote_platform with values: 
      AliExpress, Amazon, 1688, Alibaba, Other
    - The members app needs to accept all these platform values
*/

-- Drop the existing constraint
ALTER TABLE product_quotes DROP CONSTRAINT IF EXISTS product_quotes_platform_check;

-- Add the updated constraint with 1688 and alibaba
ALTER TABLE product_quotes ADD CONSTRAINT product_quotes_platform_check 
  CHECK (platform = ANY (ARRAY['aliexpress'::text, 'amazon'::text, '1688'::text, 'alibaba'::text, 'other'::text]));
